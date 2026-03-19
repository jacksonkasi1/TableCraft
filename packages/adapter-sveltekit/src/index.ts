// ** import types
import type { Handle, RequestEvent, RequestHandler } from '@sveltejs/kit';

// ** import apis
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

export interface SvelteKitHandlerOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: ConfigInput[] | Record<string, ConfigInput>;
  /**
   * Enable the optional `/_tables` discovery endpoint.
   * Keep this disabled unless you intentionally want to expose the registry.
   */
  enableDiscovery?: boolean;
  /**
   * Extract context from SvelteKit's RequestEvent.
   * Use `event.locals`, cookies, headers, etc.
   */
  getContext?: (event: RequestEvent) => EngineContext | Promise<EngineContext>;
  /**
   * Override built-in access control logic.
   */
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    event: RequestEvent
  ) => boolean | Promise<boolean>;
}

export interface SvelteKitRouteOptions {
  db: unknown;
  schema: Record<string, unknown>;
  config: ConfigInput;
  getContext?: (event: RequestEvent) => EngineContext | Promise<EngineContext>;
  checkAccess?: (
    config: TableConfig,
    context: EngineContext,
    event: RequestEvent
  ) => boolean | Promise<boolean>;
}

export interface SvelteKitHandleOptions extends SvelteKitHandlerOptions {
  /**
   * Mount prefix intercepted by `hooks.server.ts`.
   * Examples: `/api`, `/api/data`
   */
  prefix?: string;
}

export interface SvelteKitHandlers {
  GET: RequestHandler;
  metaGET: RequestHandler;
  tablesGET: RequestHandler;
}

export interface SvelteKitRouteHandlers {
  GET: RequestHandler;
  metaGET: RequestHandler;
}

const DEFAULT_PREFIX = '/api/data';

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

function errorResponse(error: unknown): Response {
  if (error instanceof TableCraftError) {
    if (error.statusCode >= 500) {
      console.error('[tablecraft/sveltekit]', error);
    }
    return json({ error: error.message }, { status: error.statusCode });
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  console.error('[tablecraft/sveltekit]', error);
  return json({ error: message }, { status: 500 });
}

async function resolveContext(
  getContext: SvelteKitHandlerOptions['getContext'] | SvelteKitRouteOptions['getContext'],
  event: RequestEvent
): Promise<EngineContext> {
  return getContext ? await getContext(event) : {};
}

function getTableParam(event: RequestEvent): string | null {
  return typeof event.params.table === 'string' && event.params.table.length > 0
    ? event.params.table
    : null;
}

function normalizePathPrefix(prefix: string): string {
  const trimmed = prefix.trim();

  if (trimmed === '') {
    throw new Error('SvelteKit adapter prefix cannot be empty');
  }

  if (trimmed === '/') {
    throw new Error('SvelteKit adapter prefix cannot be root /');
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/g, '');
}

async function hasTableAccess(
  config: TableConfig,
  context: EngineContext,
  event: RequestEvent,
  checkAccess: SvelteKitHandlerOptions['checkAccess'] | SvelteKitRouteOptions['checkAccess']
): Promise<boolean> {
  return checkAccess
    ? await checkAccess(config, context, event)
    : defaultCheckAccess(config, context);
}

function stripPrefix(pathname: string, prefix: string): string | null {
  const normalizedPath = pathname.replace(/\/+$/g, '') || '/';

  if (prefix === '/') {
    return normalizedPath.slice(1);
  }

  if (normalizedPath === prefix) {
    return null;
  }

  if (!normalizedPath.startsWith(`${prefix}/`)) {
    return null;
  }

  return normalizedPath.slice(prefix.length + 1);
}

type RouteTarget =
  | { kind: 'discovery' }
  | { kind: 'meta'; tableName: string }
  | { kind: 'query'; tableName: string };

function resolveRouteTarget(rawTableParam: string): RouteTarget {
  const normalized = rawTableParam.replace(/^\/+|\/+$/g, '');

  if (normalized === '_tables') {
    return { kind: 'discovery' };
  }

  if (normalized.endsWith('/_meta')) {
    return {
      kind: 'meta',
      tableName: normalized.slice(0, -'/_meta'.length),
    };
  }

  return { kind: 'query', tableName: normalized };
}

async function handleMetadataRequest(
  engine: ReturnType<typeof createTableEngine>,
  event: RequestEvent,
  getContext: SvelteKitHandlerOptions['getContext'] | SvelteKitRouteOptions['getContext'],
  checkAccess: SvelteKitHandlerOptions['checkAccess'] | SvelteKitRouteOptions['checkAccess']
): Promise<Response> {
  const context = await resolveContext(getContext, event);

  if (!(await hasTableAccess(engine.getConfig(), context, event, checkAccess))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  return json(engine.getMetadata(context));
}

async function handleDiscoveryRequest(
  engines: Record<string, ReturnType<typeof createTableEngine>>,
  event: RequestEvent,
  options: SvelteKitHandlerOptions
): Promise<Response> {
  if (!options.enableDiscovery) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const context = await resolveContext(options.getContext, event);

  if (options.checkAccess) {
    const hasDiscoveryAccess = await options.checkAccess(
      { name: '_tables' } as TableConfig,
      context,
      event
    );

    if (!hasDiscoveryAccess) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const tableNames = await Promise.all(
    Object.entries(engines).map(async ([tableName, engine]) => {
      const hasAccess = await hasTableAccess(
        engine.getConfig(),
        context,
        event,
        options.checkAccess
      );

      return hasAccess ? tableName : null;
    })
  );

  return json(tableNames.filter((tableName): tableName is string => tableName !== null));
}

async function handleQueryRequest(
  engine: ReturnType<typeof createTableEngine>,
  tableName: string,
  event: RequestEvent,
  getContext: SvelteKitHandlerOptions['getContext'] | SvelteKitRouteOptions['getContext'],
  checkAccess: SvelteKitHandlerOptions['checkAccess'] | SvelteKitRouteOptions['checkAccess']
): Promise<Response> {
  const context = await resolveContext(getContext, event);
  const config = engine.getConfig();

  if (!(await hasTableAccess(config, context, event, checkAccess))) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const params = parseRequest(new URL(event.request.url).searchParams);

  if (params.export) {
    const allowed = config.export?.formats ?? ['csv', 'json'];
    const enabled = config.export?.enabled ?? true;

    if (!enabled || !allowed.includes(params.export)) {
      return json(
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

  const result = await engine.query(params, context);

  return json(result, {
    status: 200,
    headers: {
      'X-Total-Count': String(result.meta.total),
    },
  });
}

async function dispatchRequest(
  engines: Record<string, ReturnType<typeof createTableEngine>>,
  rawTableParam: string | null,
  event: RequestEvent,
  options: SvelteKitHandlerOptions
): Promise<Response> {
  if (!rawTableParam) {
    return json({ error: 'Missing route param: table' }, { status: 400 });
  }

  const target = resolveRouteTarget(rawTableParam);

  if (target.kind === 'discovery') {
    return handleDiscoveryRequest(engines, event, options);
  }

  if (!target.tableName) {
    return json({ error: 'Unknown resource' }, { status: 404 });
  }

  const engine = engines[target.tableName];
  if (!engine) {
    return json({ error: `Unknown resource '${target.tableName}'` }, { status: 404 });
  }

  if (target.kind === 'meta') {
    return handleMetadataRequest(engine, event, options.getContext, options.checkAccess);
  }

  return handleQueryRequest(
    engine,
    target.tableName,
    event,
    options.getContext,
    options.checkAccess
  );
}

/**
 * Creates SvelteKit handlers for:
 * - `src/routes/api/data/[table]/+server.ts`
 * - `src/routes/api/data/[table]/_meta/+server.ts`
 * - `src/routes/api/data/_tables/+server.ts` (optional)
 */
export function createSvelteKitHandlers(
  options: SvelteKitHandlerOptions
): SvelteKitHandlers {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });

  const GET: RequestHandler = async (event) => {
    try {
      return await dispatchRequest(engines, getTableParam(event), event, options);
    } catch (error: unknown) {
      return errorResponse(error);
    }
  };

  const metaGET: RequestHandler = async (event) => {
    try {
      const tableName = getTableParam(event);
      if (!tableName) {
        return json({ error: 'Missing route param: table' }, { status: 400 });
      }

      const engine = engines[tableName];
      if (!engine) {
        return json({ error: `Unknown resource '${tableName}'` }, { status: 404 });
      }

      return await handleMetadataRequest(engine, event, options.getContext, options.checkAccess);
    } catch (error: unknown) {
      return errorResponse(error);
    }
  };

  const tablesGET: RequestHandler = async (event) => {
    try {
      return await handleDiscoveryRequest(engines, event, options);
    } catch (error: unknown) {
      return errorResponse(error);
    }
  };

  return { GET, metaGET, tablesGET };
}

export function createSvelteKitHandler(
  options: SvelteKitHandlerOptions
): RequestHandler {
  return createSvelteKitHandlers(options).GET;
}

export function createSvelteKitMetaHandler(
  options: SvelteKitHandlerOptions
): RequestHandler {
  return createSvelteKitHandlers(options).metaGET;
}

export function createSvelteKitDiscoveryHandler(
  options: SvelteKitHandlerOptions
): RequestHandler {
  return createSvelteKitHandlers(options).tablesGET;
}

export function createSvelteKitHandle(
  options: SvelteKitHandleOptions
): Handle {
  const engines = createEngines({
    db: options.db,
    schema: options.schema,
    configs: options.configs,
  });
  const prefix = normalizePathPrefix(options.prefix ?? DEFAULT_PREFIX);

  return async ({ event, resolve }) => {
    const pathname = new URL(event.request.url).pathname;
    const rawTableParam = stripPrefix(pathname, prefix);

    if (rawTableParam === null) {
      return resolve(event);
    }

    if (event.request.method !== 'GET') {
      return new Response(null, {
        status: 405,
        headers: {
          Allow: 'GET',
        },
      });
    }

    try {
      return await dispatchRequest(engines, rawTableParam, event, options);
    } catch (error: unknown) {
      return errorResponse(error);
    }
  };
}

/**
 * Creates SvelteKit handlers for a single known table:
 * - `src/routes/api/users/+server.ts`
 * - `src/routes/api/users/_meta/+server.ts`
 */
export function createSvelteKitRouteHandlers(
  options: SvelteKitRouteOptions
): SvelteKitRouteHandlers {
  const engine = createTableEngine({
    db: options.db,
    schema: options.schema,
    config: options.config,
  });

  const config = engine.getConfig();

  const GET: RequestHandler = async (event) => {
    try {
      return await handleQueryRequest(
        engine,
        config.name,
        event,
        options.getContext,
        options.checkAccess
      );
    } catch (error: unknown) {
      return errorResponse(error);
    }
  };

  const metaGET: RequestHandler = async (event) => {
    try {
      return await handleMetadataRequest(engine, event, options.getContext, options.checkAccess);
    } catch (error: unknown) {
      return errorResponse(error);
    }
  };

  return { GET, metaGET };
}

export function createSvelteKitRouteHandler(
  options: SvelteKitRouteOptions
): RequestHandler {
  return createSvelteKitRouteHandlers(options).GET;
}

export function createSvelteKitRouteMetaHandler(
  options: SvelteKitRouteOptions
): RequestHandler {
  return createSvelteKitRouteHandlers(options).metaGET;
}
