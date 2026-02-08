import { createEngines } from '../engine';
import { parseRequest } from '../utils/requestParser';
import { TableConfig } from '../types/table';
import { EngineContext } from '../types/engine';

export interface NextHandlerOptions {
  db: any;
  schema: Record<string, unknown>;
  configs: TableConfig[] | Record<string, TableConfig>;
  /** Extract context (tenantId, user) from the request */
  getContext?: (request: Request) => EngineContext | Promise<EngineContext>;
}

/**
 * Creates a Next.js App Router route handler.
 *
 * Usage in `app/api/[table]/route.ts`:
 * ```ts
 * import { createNextHandler } from '@tablecraft/engine/adapters/next';
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

  return async function handler(
    request: Request,
    routeContext: { params: Promise<{ table: string }> | { table: string } }
  ): Promise<Response> {
    try {
      const resolvedParams = await Promise.resolve(routeContext.params);
      const tableName = resolvedParams.table;

      const engine = engines[tableName];
      if (!engine) {
        return Response.json(
          { error: `Table '${tableName}' not found` },
          { status: 404 }
        );
      }

      // Access control
      const config = engine.getConfig();
      const context = options.getContext
        ? await options.getContext(request)
        : {};

      if (config.access) {
        if (!checkAccess(config, context)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // Parse URL params
      const url = new URL(request.url);
      const params = parseRequest(url.searchParams);

      // Export mode
      if (params.export) {
        const exportEnabled = config.export?.enabled ?? true;
        const allowedFormats = config.export?.formats ?? ['csv', 'json'];

        if (!exportEnabled || !allowedFormats.includes(params.export)) {
          return Response.json(
            { error: `Export format '${params.export}' not allowed` },
            { status: 400 }
          );
        }

        const exportStr = await engine.exportData(params, context);
        const contentType =
          params.export === 'csv' ? 'text/csv' : 'application/json';

        return new Response(exportStr, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${tableName}.${params.export}"`,
          },
        });
      }

      // Normal query
      const result = await engine.query(params, context);
      return Response.json(result);
    } catch (err: any) {
      console.error('[tablecraft] Handler error:', err);
      return Response.json(
        { error: err.message ?? 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

function checkAccess(config: TableConfig, context: EngineContext): boolean {
  if (!config.access) return true;

  const userRoles = context.user?.roles ?? [];
  const userPerms = context.user?.permissions ?? [];

  if (config.access.roles && config.access.roles.length > 0) {
    const hasRole = config.access.roles.some((r) => userRoles.includes(r));
    if (!hasRole) return false;
  }

  if (config.access.permissions && config.access.permissions.length > 0) {
    const hasPerm = config.access.permissions.some((p) => userPerms.includes(p));
    if (!hasPerm) return false;
  }

  return true;
}
