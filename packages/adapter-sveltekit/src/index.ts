// ** import types
import type { Handle, RequestEvent, RequestHandler } from '@sveltejs/kit';

// ** import core packages
import { base } from '$app/paths';

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

/**
 * Options for configuring SvelteKit route-based handlers.
 */
export interface SvelteKitHandlerOptions {
  /** Database connection object */
  db: unknown;
  /** Database schema */
  schema: Record<string, unknown>;
  /** Table configurations to expose */
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

/**
 * Options for configuring single-table SvelteKit route handlers.
 */
export interface SvelteKitRouteOptions {
  /** Database connection object */
  db: unknown;
  /** Database schema */
  schema: Record<string, unknown>;
  /** Single table configuration to expose */
  config: ConfigInput;
  /**
   * Extract context from SvelteKit's RequestEvent.
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

/**
 * Options for configuring the SvelteKit hook-based handle.
 */
export interface SvelteKitHandleOptions extends SvelteKitHandlerOptions {
  /**
   * Mount prefix intercepted by `hooks.server.ts`.
   * Examples: `/api`, `/api/data`
   */
  prefix?: string;
}

/**
 * Collection of SvelteKit handlers for multiple tables.
 */
export interface SvelteKitHandlers {
  /** Main query handler for table endpoints */
  GET: RequestHandler;
  /** Metadata handler for _meta endpoints */
  metaGET: RequestHandler;
  /** Discovery handler for _tables endpoint */
  tablesGET: RequestHandler;
}

/**
 * Collection of SvelteKit handlers for a single table.
 */
export interface SvelteKitRouteHandlers {
  /** Main query handler */
  GET: RequestHandler;
  /** Metadata handler */
  metaGET: RequestHandler;
}

const DEFAULT_PREFIX = '/api/data';

/**
 * Returns a standardized JSON response format
 * @param data - The data to serialize
 * @param init - Optional response initialization options
 * @returns A generic Response object formatted as JSON
 */
function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

/**
 * Normalizes error handling logic and returns standard JSON error responses.
 * @param error - The caught error
 * @returns A JSON response with a 500 status (or custom status for TableCraftError)
 */
function errorResponse(error: unknown): Response {
  if (error instanceof TableCraftError) {
    if (error.statusCode >= 500) {
      console.error('[tablecraft/sveltekit]', error);
    }
    return json({ error: error.message }, { status: error.statusCode });
  }

  console.error('[tablecraft/sveltekit]', error);
  return json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * Resolves context for a given request using the configured getContext function.
 * @param getContext - The context extractor function from options
 * @param event - The current SvelteKit RequestEvent
 * @returns The resolved EngineContext or an empty object
 */
async function resolveContext(
  getContext: SvelteKitHandlerOptions['getContext'] | SvelteKitRouteOptions['getContext'],
  event: RequestEvent
): Promise<EngineContext> {
  return getContext ? await getContext(event) : {};
}

/**
 * Safely extracts the 'table' parameter from the SvelteKit request event.
 * @param event - The current SvelteKit RequestEvent
 * @returns The table parameter string or null if missing
 */
function getTableParam(event: RequestEvent): string | null {
  return typeof event.params.table === 'string' && event.params.table.length > 0
    ? event.params.table
    : null;
}

/**
 * Normalizes a path prefix string to ensure it has a leading slash and no trailing slash.
 * @param prefix - The raw prefix string
 * @returns The normalized prefix string
 * @throws Error if the prefix is empty or explicitly the root '/'
 */
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

/**
 * Validates access to a table configuration using the configured checkAccess function or default logic.
 * @param config - The TableConfig to evaluate
 * @param context - The current EngineContext
 * @param event - The SvelteKit RequestEvent
 * @param checkAccess - Optional custom access checker function
 * @returns A boolean resolving to true if access is granted
 */
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

/**
 * Strips the configured prefix from a pathname, returning the remaining segment.
 * If running inside SvelteKit, attempts to strip the base path if configured.
 * @param pathname - The full URL pathname
 * @param prefix - The normalized prefix string
 * @returns The remaining path segment (e.g., 'table/_meta') or null if it doesn't match the prefix
 */
function stripPrefix(pathname: string, prefix: string): string | null {
  let cleanPathname = pathname;
  if (base && cleanPathname.startsWith(base)) {
    const nextChar = cleanPathname[base.length];
    if (nextChar === undefined || nextChar === '/') {
      cleanPathname = cleanPathname.slice(base.length);
    }
  }

  const normalizedPath = cleanPathname.replace(/\/+$/g, '') || '/';

  if (normalizedPath === prefix) {
    return null;
  }

  if (!normalizedPath.startsWith(`${prefix}/`)) {
    return null;
  }

  return normalizedPath.slice(prefix.length + 1);
}

/**
 * Represents the target operation resolved from the URL path.
 */
type RouteTarget =
  | { kind: 'discovery' }
  | { kind: 'meta'; tableName: string }
  | { kind: 'query'; tableName: string };

/**
 * Resolves a raw string table parameter into a structured route target format.
 * Matches endpoints against discovery `_tables`, metadata `[table]/_meta`, and plain queries.
 * @param rawTableParam - Raw string parameter extracted from the URL
 * @returns The structured route target (discovery, meta, or query)
 */
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

/**
 * Internal route handler for `/meta` requests to return table configuration schema.
 * Only returns schema if the user has correct permissions.
 */
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

/**
 * Internal route handler for the discovery `_tables` endpoint.
 * Requires `enableDiscovery` to be set to true.
 * Filters the list of available engines by user access permissions before returning them.
 */
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
      { name: '_tables', access: { roles: [] } } as unknown as TableConfig,
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

/**
 * Internal route handler for table queries.
 * Validates access, handles data exports (csv/json), and returns paginated query payloads.
 */
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

  const params = parseRequest(event.url.searchParams);

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

    // RFC 5987 encoding for safe filenames in Content-Disposition
    const safeAsciiFilename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const encodedFilename = encodeURIComponent(filename);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  }

  const result = await engine.query(params, context);
  const headers: Record<string, string> = {};
  
  if (result.meta.total !== null && result.meta.total !== undefined) {
    headers['X-Total-Count'] = String(result.meta.total);
  }

  return json(result, {
    status: 200,
    headers,
  });
}

/**
 * Central routing and dispatch function that directs incoming requests
 * to either discovery, metadata, or query processors.
 */
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

/**
 * Extracts a single query handler for table operations.
 * Returns the `GET` handler from `createSvelteKitHandlers`.
 * Warning: Unless using `createSvelteKitHandlers`, this creates a separate engine instance.
 * @deprecated Use `const { GET } = createSvelteKitHandlers(options)` instead.
 */
export function createSvelteKitHandler(
  options: SvelteKitHandlerOptions
): RequestHandler {
  return createSvelteKitHandlers(options).GET;
}

/**
 * Extracts a single metadata handler.
 * Returns the `metaGET` handler from `createSvelteKitHandlers`.
 * Warning: Unless using `createSvelteKitHandlers`, this creates a separate engine instance.
 * @deprecated Use `const { metaGET } = createSvelteKitHandlers(options)` instead.
 */
export function createSvelteKitMetaHandler(
  options: SvelteKitHandlerOptions
): RequestHandler {
  return createSvelteKitHandlers(options).metaGET;
}

/**
 * Extracts a single discovery handler.
 * Returns the `tablesGET` handler from `createSvelteKitHandlers`.
 * Warning: Unless using `createSvelteKitHandlers`, this creates a separate engine instance.
 * @deprecated Use `const { tablesGET } = createSvelteKitHandlers(options)` instead.
 */
export function createSvelteKitDiscoveryHandler(
  options: SvelteKitHandlerOptions
): RequestHandler {
  return createSvelteKitHandlers(options).tablesGET;
}

/**
 * Creates a SvelteKit Handle for use in `hooks.server.ts`.
 * Automatically intercepts requests matching the configured prefix
 * and passes through non-matching requests to `resolve`.
 */
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
    let rawTableParam = stripPrefix(event.url.pathname, prefix);

    if (rawTableParam === null) {
      return resolve(event);
    }

    try {
      rawTableParam = decodeURIComponent(rawTableParam);
    } catch {
      return json({ error: 'Malformed URI parameter: table' }, { status: 400 });
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

/**
 * Extracts the single-table query handler.
 * Returns the `GET` handler from `createSvelteKitRouteHandlers`.
 */
export function createSvelteKitRouteHandler(
  options: SvelteKitRouteOptions
): RequestHandler {
  return createSvelteKitRouteHandlers(options).GET;
}

/**
 * Extracts the single-table metadata handler.
 * Returns the `metaGET` handler from `createSvelteKitRouteHandlers`.
 */
export function createSvelteKitRouteMetaHandler(
  options: SvelteKitRouteOptions
): RequestHandler {
  return createSvelteKitRouteHandlers(options).metaGET;
}
