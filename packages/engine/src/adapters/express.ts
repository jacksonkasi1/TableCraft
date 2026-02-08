import { createEngines } from '../engine';
import { parseRequest } from '../utils/requestParser';
import { TableConfig } from '../types/table';
import { EngineContext } from '../types/engine';

export interface ExpressHandlerOptions {
  db: any;
  schema: Record<string, unknown>;
  configs: TableConfig[] | Record<string, TableConfig>;
  /** Extract context from express req */
  getContext?: (req: any) => EngineContext | Promise<EngineContext>;
}

/**
 * Creates an Express middleware/router handler.
 *
 * Usage:
 * ```ts
 * import { createExpressMiddleware } from '@tablecraft/engine/adapters/express';
 * const middleware = createExpressMiddleware({ db, schema, configs });
 * app.get('/api/:table', middleware);
 * ```
 */
export function createExpressMiddleware(options: ExpressHandlerOptions) {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });

  return async function middleware(req: any, res: any, next: any): Promise<void> {
    try {
      const tableName = req.params?.table;
      if (!tableName) {
        res.status(400).json({ error: 'Missing table parameter' });
        return;
      }

      const engine = engines[tableName];
      if (!engine) {
        res.status(404).json({ error: `Table '${tableName}' not found` });
        return;
      }

      const config = engine.getConfig();
      const context = options.getContext
        ? await options.getContext(req)
        : {};

      // Access control
      if (config.access) {
        if (!checkAccess(config, context)) {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
      }

      // Parse query params
      const params = parseRequest(req.query ?? {});

      // Export mode
      if (params.export) {
        const exportEnabled = config.export?.enabled ?? true;
        const allowedFormats = config.export?.formats ?? ['csv', 'json'];

        if (!exportEnabled || !allowedFormats.includes(params.export)) {
          res.status(400).json({ error: `Export format '${params.export}' not allowed` });
          return;
        }

        const exportStr = await engine.exportData(params, context);
        const contentType =
          params.export === 'csv' ? 'text/csv' : 'application/json';

        res.setHeader('Content-Type', contentType);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${tableName}.${params.export}"`
        );
        res.send(exportStr);
        return;
      }

      // Normal query
      const result = await engine.query(params, context);
      res.json(result);
    } catch (err: any) {
      console.error('[tablecraft] Express handler error:', err);
      if (next) {
        next(err);
      } else {
        res.status(500).json({ error: err.message ?? 'Internal server error' });
      }
    }
  };
}

function checkAccess(config: TableConfig, context: EngineContext): boolean {
  if (!config.access) return true;

  const userRoles = context.user?.roles ?? [];
  const userPerms = context.user?.permissions ?? [];

  if (config.access.roles && config.access.roles.length > 0) {
    const hasRole = config.access.roles.some((r: string) => userRoles.includes(r));
    if (!hasRole) return false;
  }

  if (config.access.permissions && config.access.permissions.length > 0) {
    const hasPerm = config.access.permissions.some((p: string) => userPerms.includes(p));
    if (!hasPerm) return false;
  }

  return true;
}
