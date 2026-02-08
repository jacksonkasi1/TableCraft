import type { Request, Response, NextFunction, Router } from 'express';
import {
  createEngines,
  createTableEngine,
  parseRequest,
  checkAccess,
  getExportMeta,
  TableConfig,
  TableDefinition,
  EngineContext,
  TableEngine,
} from '@tablecraft/engine';

export interface ExpressAdapterOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: TableDefinition[] | Record<string, TableDefinition>;
  /**
   * Extract context from the Express request.
   * Typically reads from `req.user`, `req.headers`, etc.
   */
  getContext?: (req: Request) => EngineContext | Promise<EngineContext>;
}

/**
 * Creates an Express middleware for dynamic `:table` routes.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createExpressMiddleware } from '@tablecraft/adapter-express';
 *
 * const app = express();
 * const tablecraft = createExpressMiddleware({ db, schema, configs });
 *
 * app.get('/api/data/:table', tablecraft);
 * ```
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

      const engine = engines[tableName];
      if (!engine) {
        res.status(404).json({ error: `Unknown resource '${tableName}'` });
        return;
      }

      const config = engine.getConfig();

      // Context
      const context = options.getContext
        ? await options.getContext(req)
        : {};

      // Access control
      if (!checkAccess(config, context)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Parse query string
      const params = parseRequest(req.query as unknown as Record<string, string | string[] | undefined>);

      // Export
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

      // Normal query
      const result = await engine.query(params, context);
      res.setHeader('X-Total-Count', String(result.meta.total));
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Creates a handler for a single table — no `:table` param needed.
 *
 * @example
 * ```ts
 * const usersHandler = createExpressHandler({ db, schema, config: usersConfig });
 * app.get('/api/users', usersHandler);
 * ```
 */
export function createExpressHandler(options: {
  db: unknown;
  schema: Record<string, unknown>;
  config: TableDefinition;
  getContext?: (req: Request) => EngineContext | Promise<EngineContext>;
}) {
  const { db, schema, config, getContext } = options;
  const engine = createTableEngine({ db, schema, config });

  return async function handler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = getContext ? await getContext(req) : {};

      // Need to cast to TableConfig because getConfig() returns TableConfig
      // but we only have TableDefinition initially. 
      // Actually createTableEngine returns a TableEngine whose getConfig() returns TableConfig.
      // So engine.getConfig() is type-safe.
      const actualConfig = engine.getConfig();

      if (!checkAccess(actualConfig, context)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const params = parseRequest(req.query as unknown as Record<string, string | string[] | undefined>);

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
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Creates an Express middleware for dynamic `:table` routes.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createExpressMiddleware } from '@tablecraft/adapter-express';
 *
 * const app = express();
 * const tablecraft = createExpressMiddleware({ db, schema, configs });
 *
 * app.get('/api/data/:table', tablecraft);
 * ```
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

      const engine = engines[tableName];
      if (!engine) {
        res.status(404).json({ error: `Unknown resource '${tableName}'` });
        return;
      }

      const config = engine.getConfig();

      // Context
      const context = options.getContext
        ? await options.getContext(req)
        : {};

      // Access control
      if (!checkAccess(config, context)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Parse query string
      const params = parseRequest(req.query as unknown as Record<string, string | string[] | undefined>);

      // Export
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

      // Normal query
      const result = await engine.query(params, context);
      res.setHeader('X-Total-Count', String(result.meta.total));
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Creates a handler for a single table — no `:table` param needed.
 *
 * @example
 * ```ts
 * const usersHandler = createExpressHandler({ db, schema, config: usersConfig });
 * app.get('/api/users', usersHandler);
 * ```
 */
export function createExpressHandler(options: {
  db: unknown;
  schema: Record<string, unknown>;
  config: TableDefinition;
  getContext?: (req: Request) => EngineContext | Promise<EngineContext>;
}) {
  const { db, schema, config, getContext } = options;
  const engine = createTableEngine({ db, schema, config });

  return async function handler(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const context = getContext ? await getContext(req) : {};

      if (!checkAccess(config, context)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const params = parseRequest(req.query as unknown as Record<string, string | string[] | undefined>);

      if (params.export) {
        const allowed = config.export?.formats ?? ['csv', 'json'];
        if (!(config.export?.enabled ?? true) || !allowed.includes(params.export)) {
          res.status(400).json({ error: `Export format '${params.export}' not allowed` });
          return;
        }

        const body = await engine.exportData(params, context);
        const { contentType, filename } = getExportMeta(config.name, params.export);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(body);
        return;
      }

      const result = await engine.query(params, context);
      res.setHeader('X-Total-Count', String(result.meta.total));
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
