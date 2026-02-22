import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  createEngines,
  createTableEngine,
  parseRequest,
  checkAccess as defaultCheckAccess,
  getExportMeta,
  TableConfig,
  ConfigInput,
  EngineContext,
  TableCraftError,
} from '@tablecraft/engine';

export interface HonoAdapterOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: ConfigInput[] | Record<string, ConfigInput>;
  /**
   * Enable the /_tables discovery endpoint (default: false).
   * This endpoint exposes all registered table names.
   * Enable only in development or when you have proper access controls.
   */
  enableDiscovery?: boolean;
  /**
   * Extract context from Hono's Context object.
   * Use `c.get('user')`, `c.req.header(...)`, etc.
   */
  getContext?: (c: Context) => EngineContext | Promise<EngineContext>;
  /**
   * Override built-in access check with your own logic.
   */
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    c: Context
  ) => boolean | Promise<boolean>;
}

/**
 * Creates a Hono sub-app with a `/:table` route.
 */
export function createHonoApp(options: HonoAdapterOptions): Hono {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });

  const app = new Hono();

  if (options.enableDiscovery) {
    app.get('/_tables', async (c) => {
      try {
        const context = options.getContext
          ? await options.getContext(c)
          : {};
        
        if (options.checkAccess) {
          const hasAccess = await options.checkAccess(
            { name: '_tables' } as TableConfig,
            context,
            c
          );
          if (!hasAccess) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }
        
        return c.json(Object.keys(engines));
      } catch (err: unknown) {
        const statusCode = err instanceof TableCraftError ? err.statusCode : 500;
        const message = err instanceof Error ? err.message : 'Internal server error';
        return c.json({ error: message }, statusCode as ContentfulStatusCode);
      }
    });
  }

  app.get('/:table/_meta', async (c) => {
    try {
      const tableName = c.req.param('table');

      const engine = engines[tableName];
      if (!engine) {
        return c.json({ error: `Unknown resource '${tableName}'` }, 404);
      }

      const context = options.getContext
        ? await options.getContext(c)
        : {};
      const metadata = engine.getMetadata(context);
      return c.json(metadata);
    } catch (err: unknown) {
      const statusCode = err instanceof TableCraftError ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Internal server error';
      return c.json({ error: message }, statusCode as ContentfulStatusCode);
    }
  });

  app.get('/:table', async (c) => {
    const tableName = c.req.param('table');

    const engine = engines[tableName];
    if (!engine) {
      return c.json({ error: `Unknown resource '${tableName}'` }, 404);
    }

    try {
      const config = engine.getConfig();

      // Context
      const context = options.getContext
        ? await options.getContext(c)
        : {};

      // Access control
      const hasAccess = options.checkAccess
        ? await options.checkAccess(config, context, c)
        : defaultCheckAccess(config, context);

      if (!hasAccess) {
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
    } catch (err: unknown) {
      const statusCode = err instanceof TableCraftError ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Internal server error';
      return c.json({ error: message }, statusCode as any);
    }
  });

  return app;
}

/**
 * Creates a Hono handler for a single table.
 */
export function createHonoHandler(options: {
  db: unknown;
  schema: Record<string, unknown>;
  config: ConfigInput;
  getContext?: (c: Context) => EngineContext | Promise<EngineContext>;
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    c: Context
  ) => boolean | Promise<boolean>;
}) {
  const { db, schema, config, getContext, checkAccess } = options;
  const engine = createTableEngine({ db, schema, config });

  return async function handler(c: Context) {
    try {
      const context = getContext ? await getContext(c) : {};
      const actualConfig = engine.getConfig();

      const hasAccess = checkAccess
        ? await checkAccess(actualConfig, context, c)
        : defaultCheckAccess(actualConfig, context);

      if (!hasAccess) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const params = parseRequest(
        Object.fromEntries(new URL(c.req.url).searchParams)
      );

      if (params.export) {
        const allowed = actualConfig.export?.formats ?? ['csv', 'json'];
        if (!(actualConfig.export?.enabled ?? true) || !allowed.includes(params.export)) {
          return c.json({ error: `Export format '${params.export}' not allowed` }, 400);
        }

        const body = await engine.exportData(params, context);
        const { contentType, filename } = getExportMeta(actualConfig.name, params.export);
        c.header('Content-Disposition', `attachment; filename="${filename}"`);
        return c.body(body, 200, { 'Content-Type': contentType });
      }

      const result = await engine.query(params, context);
      c.header('X-Total-Count', String(result.meta.total));
      return c.json(result);
    } catch (err: unknown) {
      const statusCode = err instanceof TableCraftError ? err.statusCode : 500;
      const message = err instanceof Error ? err.message : 'Internal server error';
      return c.json({ error: message }, statusCode as any);
    }
  };
}
