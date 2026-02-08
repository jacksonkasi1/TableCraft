import { Hono } from 'hono';
import type { Context } from 'hono';
import {
  createEngines,
  createTableEngine,
  parseRequest,
  checkAccess,
  getExportMeta,
  TableConfig,
  TableDefinition,
  EngineContext,
} from '@tablecraft/engine';

export interface HonoAdapterOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: TableDefinition[] | Record<string, TableDefinition>;
  /**
   * Extract context from Hono's Context object.
   * Use `c.get('user')`, `c.req.header(...)`, etc.
   */
  getContext?: (c: Context) => EngineContext | Promise<EngineContext>;
}

/**
 * Creates a Hono sub-app with a `/:table` route.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { createHonoApp } from '@tablecraft/adapter-hono';
 *
 * const app = new Hono();
 * const tablecraft = createHonoApp({ db, schema, configs });
 *
 * app.route('/api/data', tablecraft);
 * ```
 */
export function createHonoApp(options: HonoAdapterOptions): Hono {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });

  const app = new Hono();

  app.get('/:table', async (c) => {
    const tableName = c.req.param('table');

    const engine = engines[tableName];
    if (!engine) {
      return c.json({ error: `Unknown resource '${tableName}'` }, 404);
    }

    const config = engine.getConfig();

    // Context
    const context = options.getContext
      ? await options.getContext(c)
      : {};

    // Access control
    if (!checkAccess(config, context)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Parse query
    const params = parseRequest(
      Object.fromEntries(new URL(c.req.url).searchParams)
    );

    // Export
    if (params.export) {
      const allowed = config.export?.formats ?? ['csv', 'json'];
      const enabled = config.export?.enabled ?? true;

      if (!enabled || !allowed.includes(params.export)) {
        return c.json({ error: `Export format '${params.export}' not allowed` }, 400);
      }

      const body = await engine.exportData(params, context);
      const { contentType, filename } = getExportMeta(tableName, params.export);

      c.header('Content-Disposition', `attachment; filename="${filename}"`);
      return c.body(body, 200, { 'Content-Type': contentType });
    }

    // Query
    const result = await engine.query(params, context);
    c.header('X-Total-Count', String(result.meta.total));
    return c.json(result);
  });

  return app;
}

/**
 * Creates a Hono handler for a single table.
 *
 * @example
 * ```ts
 * import { createHonoHandler } from '@tablecraft/adapter-hono';
 *
 * app.get('/api/users', createHonoHandler({ db, schema, config: usersConfig }));
 * ```
 */
export function createHonoHandler(options: {
  db: unknown;
  schema: Record<string, unknown>;
  config: TableDefinition;
  getContext?: (c: Context) => EngineContext | Promise<EngineContext>;
}) {
  const { db, schema, config, getContext } = options;
  const engine = createTableEngine({ db, schema, config });

  return async function handler(c: Context) {
    try {
      const context = getContext ? await getContext(c) : {};

      if (!checkAccess(config, context)) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const params = parseRequest(
        Object.fromEntries(new URL(c.req.url).searchParams)
      );

      if (params.export) {
        const allowed = config.export?.formats ?? ['csv', 'json'];
        if (!(config.export?.enabled ?? true) || !allowed.includes(params.export)) {
          return c.json({ error: `Export format '${params.export}' not allowed` }, 400);
        }

        const body = await engine.exportData(params, context);
        const { contentType, filename } = getExportMeta(config.name, params.export);
        c.header('Content-Disposition', `attachment; filename="${filename}"`);
        return c.body(body, 200, { 'Content-Type': contentType });
      }

      const result = await engine.query(params, context);
      c.header('X-Total-Count', String(result.meta.total));
      return c.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return c.json({ error: message }, 500);
    }
  };
}
