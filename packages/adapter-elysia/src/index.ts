import { Elysia } from 'elysia';
import {
  createEngines,
  createTableEngine,
  parseRequest,
  checkAccess,
  getExportMeta,
  TableConfig,
  EngineContext,
} from '@tablecraft/engine';

export interface ElysiaAdapterOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: TableConfig[] | Record<string, TableConfig>;
  /**
   * Extract context from the Elysia context.
   * Access headers, store, etc.
   */
  getContext?: (ctx: { request: Request; store: Record<string, unknown> }) => EngineContext | Promise<EngineContext>;
}

/**
 * Creates an Elysia plugin with a `/:table` route.
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia';
 * import { createElysiaPlugin } from '@tablecraft/adapter-elysia';
 *
 * const app = new Elysia()
 *   .use(createElysiaPlugin({ db, schema, configs }))
 *   .listen(3000);
 * ```
 */
export function createElysiaPlugin(options: ElysiaAdapterOptions) {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });

  return new Elysia({ prefix: '/api/data' }).get(
    '/:table',
    async ({ params, request, store, set }) => {
      const tableName = params.table;

      const engine = engines[tableName];
      if (!engine) {
        set.status = 404;
        return { error: `Unknown resource '${tableName}'` };
      }

      const config = engine.getConfig();

      const context = options.getContext
        ? await options.getContext({ request, store: store as Record<string, unknown> })
        : {};

      if (!checkAccess(config, context)) {
        set.status = 403;
        return { error: 'Forbidden' };
      }

      const url = new URL(request.url);
      const reqParams = parseRequest(url.searchParams);

      // Export
      if (reqParams.export) {
        const allowed = config.export?.formats ?? ['csv', 'json'];
        const enabled = config.export?.enabled ?? true;

        if (!enabled || !allowed.includes(reqParams.export)) {
          set.status = 400;
          return { error: `Export format '${reqParams.export}' not allowed` };
        }

        const body = await engine.exportData(reqParams, context);
        const { contentType, filename } = getExportMeta(tableName, reqParams.export);

        set.headers['Content-Type'] = contentType;
        set.headers['Content-Disposition'] = `attachment; filename="${filename}"`;
        return body;
      }

      // Query
      const result = await engine.query(reqParams, context);
      set.headers['X-Total-Count'] = String(result.meta.total);
      return result;
    }
  );
}

/**
 * Creates an Elysia handler for a single table.
 */
export function createElysiaHandler(options: {
  db: unknown;
  schema: Record<string, unknown>;
  config: TableConfig;
  getContext?: (ctx: { request: Request; store: Record<string, unknown> }) => EngineContext | Promise<EngineContext>;
}) {
  const { db, schema, config, getContext } = options;
  const engine = createTableEngine({ db, schema, config });

  return async ({ request, store, set }: { request: Request; store: Record<string, unknown>; set: any }) => {
    const context = getContext
      ? await getContext({ request, store })
      : {};

    if (!checkAccess(config, context)) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    const url = new URL(request.url);
    const params = parseRequest(url.searchParams);

    if (params.export) {
      const allowed = config.export?.formats ?? ['csv', 'json'];
      if (!(config.export?.enabled ?? true) || !allowed.includes(params.export)) {
        set.status = 400;
        return { error: `Export format '${params.export}' not allowed` };
      }

      const body = await engine.exportData(params, context);
      const { contentType, filename } = getExportMeta(config.name, params.export);
      set.headers['Content-Type'] = contentType;
      set.headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      return body;
    }

    const result = await engine.query(params, context);
    set.headers['X-Total-Count'] = String(result.meta.total);
    return result;
  };
}
