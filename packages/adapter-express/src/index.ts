import type { Request, Response, NextFunction } from 'express';
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

export interface ExpressAdapterOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: ConfigInput[] | Record<string, ConfigInput>;
  /**
   * Extract context from the Express request.
   * Typically reads from `req.user`, `req.headers`, etc.
   */
  getContext?: (req: Request) => EngineContext | Promise<EngineContext>;
  /**
   * Override built-in access check with your own logic.
   */
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    req: Request
  ) => boolean | Promise<boolean>;
}

/**
 * Creates an Express middleware for dynamic `:table` routes.
 */
export function createExpressMiddleware(options: ExpressAdapterOptions) {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });

  return async function tablecraftMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tableName = req.params.table as string;
      if (!tableName) {
        res.status(400).json({ error: 'Missing :table route parameter' });
        return;
      }

      // ─── Metadata endpoint: GET /api/data/users/_meta ───
      if (tableName.endsWith('/_meta') || tableName.endsWith('_meta')) {
        const actualName = tableName.replace(/\/?_meta$/, '');
        const engine = engines[actualName];
        if (!engine) {
          res.status(404).json({ error: `Unknown resource '${actualName}'` });
          return;
        }

        const context = options.getContext
          ? await options.getContext(req)
          : {};
        const metadata = engine.getMetadata(context);
        res.json(metadata);
        return;
      }

      const engine = engines[tableName];
      if (!engine) {
        res.status(404).json({ error: `Unknown resource '${tableName}'` });
        return;
      }

      const config = engine.getConfig();

      const context = options.getContext
        ? await options.getContext(req)
        : {};

      const hasAccess = options.checkAccess
        ? await options.checkAccess(config, context, req)
        : defaultCheckAccess(config, context);

      if (!hasAccess) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const params = parseRequest(req.query as Record<string, string | string[] | undefined>);

      if (params.export) {
        const allowed = config.export?.formats ?? ['csv', 'json'];
        const enabled = config.export?.enabled ?? true;

        if (!enabled || !allowed.includes(params.export)) {
          res.status(400).json({ error: `Export format '${params.export}' not allowed` });
          return;
        }

        const body = await engine.exportData(params, context);
        const { contentType, filename } = getExportMeta(tableName, params.export);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(body);
        return;
      }

      const result = await engine.query(params, context);
      res.setHeader('X-Total-Count', String(result.meta.total));
      res.json(result);
    } catch (err: unknown) {
      if (err instanceof TableCraftError && err.statusCode < 500) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  };
}

/**
 * Creates a handler for a single table — no `:table` param needed.
 */
export function createExpressHandler(options: {
  db: unknown;
  schema: Record<string, unknown>;
  config: ConfigInput;
  getContext?: (req: Request) => EngineContext | Promise<EngineContext>;
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    req: Request
  ) => boolean | Promise<boolean>;
}) {
  const { db, schema, config, getContext, checkAccess } = options;
  const engine = createTableEngine({ db, schema, config });

  return async function handler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = getContext ? await getContext(req) : {};
      const actualConfig = engine.getConfig();

      const hasAccess = checkAccess
        ? await checkAccess(actualConfig, context, req)
        : defaultCheckAccess(actualConfig, context);

      if (!hasAccess) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const params = parseRequest(req.query as Record<string, string | string[] | undefined>);

      if (params.export) {
        const allowed = actualConfig.export?.formats ?? ['csv', 'json'];
        if (!(actualConfig.export?.enabled ?? true) || !allowed.includes(params.export)) {
          res.status(400).json({ error: `Export format '${params.export}' not allowed` });
          return;
        }

        const body = await engine.exportData(params, context);
        const { contentType, filename } = getExportMeta(actualConfig.name, params.export);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(body);
        return;
      }

      const result = await engine.query(params, context);
      res.setHeader('X-Total-Count', String(result.meta.total));
      res.json(result);
    } catch (err: unknown) {
      if (err instanceof TableCraftError && err.statusCode < 500) {
        res.status(err.statusCode).json({ error: err.message });
      } else {
        next(err);
      }
    }
  };
}
