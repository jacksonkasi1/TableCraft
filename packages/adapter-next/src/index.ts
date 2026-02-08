import {
  createEngines,
  parseRequest,
  checkAccess as defaultCheckAccess,
  getExportMeta,
  TableConfig,
  ConfigInput,
  EngineContext,
} from '@tablecraft/engine';

export interface NextHandlerOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: ConfigInput[] | Record<string, ConfigInput>;
  /**
   * Extract context (tenantId, user, etc.) from the incoming request.
   * Called on every request before the query runs.
   */
  getContext?: (request: Request) => EngineContext | Promise<EngineContext>;
  /**
   * Override built-in access check with your own logic.
   * Return true to allow, false to deny.
   */
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    request: Request
  ) => boolean | Promise<boolean>;
}

/**
 * Creates a Next.js App Router GET handler for dynamic `[table]` routes.
 *
 * @example
 * ```ts
 * // app/api/data/[table]/route.ts
 * import { createNextHandler } from '@tablecraft/adapter-next';
 * import { db } from '@/db';
 * import * as schema from '@/db/schema';
 * import { configs } from '@/tablecraft.config';
 *
 * const handler = createNextHandler({ db, schema, configs });
 * export const GET = handler;
 * ```
 */
export function createNextHandler(options: NextHandlerOptions) {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });

  return async function GET(
    request: Request,
    routeContext: { params: Promise<{ table: string }> | { table: string } }
  ): Promise<Response> {
    try {
      // Resolve params (Next.js 15 makes params async)
      const resolved = await Promise.resolve(routeContext.params);
      const tableName = resolved.table;

      const engine = engines[tableName];
      if (!engine) {
        return Response.json(
          { error: `Unknown resource '${tableName}'` },
          { status: 404 }
        );
      }

      const config = engine.getConfig();

      // --- Context ---
      const context = options.getContext
        ? await options.getContext(request)
        : {};

      // --- Access control ---
      const hasAccess = options.checkAccess
        ? await options.checkAccess(config, context, request)
        : defaultCheckAccess(config, context);

      if (!hasAccess) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      // --- Parse URL ---
      const url = new URL(request.url);
      const params = parseRequest(url.searchParams);

      // --- Export mode ---
      if (params.export) {
        const allowed = config.export?.formats ?? ['csv', 'json'];
        const enabled = config.export?.enabled ?? true;

        if (!enabled || !allowed.includes(params.export)) {
          return Response.json(
            { error: `Export format '${params.export}' is not allowed` },
            { status: 400 }
          );
        }

        const body = await engine.exportData(params, context);
        const { contentType, filename } = getExportMeta(tableName, params.export);

        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }

      // --- Normal query ---
      const result = await engine.query(params, context);

      return Response.json(result, {
        status: 200,
        headers: {
          'X-Total-Count': String(result.meta.total),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('[tablecraft/next]', err);
      return Response.json({ error: message }, { status: 500 });
    }
  };
}

/**
 * Creates a handler for a single, known table (no dynamic route needed).
 *
 * @example
 * ```ts
 * // app/api/users/route.ts
 * import { createNextRouteHandler } from '@tablecraft/adapter-next';
 * export const GET = createNextRouteHandler({ db, schema, config: usersConfig });
 * ```
 */
export function createNextRouteHandler(options: {
  db: unknown;
  schema: Record<string, unknown>;
  config: ConfigInput;
  getContext?: (request: Request) => EngineContext | Promise<EngineContext>;
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    request: Request
  ) => boolean | Promise<boolean>;
}) {
  const { db, schema, config, getContext, checkAccess } = options;

  // Reuse the multi-table handler with a single config
  const handler = createNextHandler({
    db,
    schema,
    configs: [config],
    getContext,
    checkAccess,
  });

  return async function GET(request: Request): Promise<Response> {
    // Simulate the dynamic route param
    // We resolve the name from the config input
    const resolvedConfig = 'toConfig' in config 
      ? (config as any).toConfig() 
      : (config as TableConfig);
    return handler(request, { params: { table: resolvedConfig.name } });
  };
}
