// ** import core packages
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createEngines,
  createTableEngine,
  parseRequest,
  defaultCheckAccess,
  getExportMeta,
  MockTableCraftError,
  mockState
} = vi.hoisted(() => {
  class MockTableCraftError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 500) {
      super(message);
      this.statusCode = statusCode;
    }
  }

  return {
    createEngines: vi.fn(),
    createTableEngine: vi.fn(),
    parseRequest: vi.fn(),
    defaultCheckAccess: vi.fn(),
    getExportMeta: vi.fn(),
    MockTableCraftError,
    mockState: { base: '' }
  };
});

vi.mock('@tablecraft/engine', () => ({
  createEngines,
  createTableEngine,
  parseRequest,
  checkAccess: defaultCheckAccess,
  getExportMeta,
  TableCraftError: MockTableCraftError,
}));

vi.mock('$app/paths', () => ({
  get base() { return mockState.base; }
}));

import {
  createSvelteKitHandle,
  createSvelteKitHandlers,
  createSvelteKitRouteHandlers,
} from '../src/index';

function createEvent(urlStr: string, params: Record<string, string> = {}) {
  const url = new URL(urlStr);
  return {
    request: new Request(url),
    url,
    params,
    locals: {},
  } as any;
}

describe('@tablecraft/adapter-sveltekit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.base = '';
    parseRequest.mockReturnValue({ page: 1 });
    defaultCheckAccess.mockReturnValue(true);
    getExportMeta.mockReturnValue({
      contentType: 'text/csv',
      filename: 'users.csv',
    });
  });

  it('returns query results for a dynamic table route', async () => {
    const engine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(async () => ({
        data: [{ id: 1 }],
        meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
      })),
      exportData: vi.fn(),
      getMetadata: vi.fn(),
    };

    createEngines.mockReturnValue({ users: engine });

    const handlers = createSvelteKitHandlers({
      db: {},
      schema: {},
      configs: [],
    });

    const response = await handlers.GET(
      createEvent('https://example.test/api/data/users?page=1', { table: 'users' })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Total-Count')).toBe('1');
    await expect(response.json()).resolves.toEqual({
      data: [{ id: 1 }],
      meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
    });
    expect(parseRequest).toHaveBeenCalledOnce();
    expect(engine.query).toHaveBeenCalledWith({ page: 1 }, {});
  });

  it('returns metadata for the companion _meta route', async () => {
    const engine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(),
      exportData: vi.fn(),
      getMetadata: vi.fn(() => ({ columns: [{ name: 'id' }] })),
    };

    createEngines.mockReturnValue({ users: engine });

    const handlers = createSvelteKitHandlers({
      db: {},
      schema: {},
      configs: [],
      getContext: async () => ({ tenantId: 'tenant_1' }),
    });

    const response = await handlers.metaGET(
      createEvent('https://example.test/api/data/users/_meta', { table: 'users' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      columns: [{ name: 'id' }],
    });
    expect(engine.getMetadata).toHaveBeenCalledWith({ tenantId: 'tenant_1' });
  });

  it('blocks metadata for unauthorized users', async () => {
    const engine = {
      getConfig: vi.fn(() => ({ name: 'users', access: { roles: ['admin'] } })),
      query: vi.fn(),
      exportData: vi.fn(),
      getMetadata: vi.fn(() => ({ columns: [{ name: 'secret' }] })),
    };

    createEngines.mockReturnValue({ users: engine });
    defaultCheckAccess.mockReturnValue(false);

    const handlers = createSvelteKitHandlers({
      db: {},
      schema: {},
      configs: [],
    });

    const response = await handlers.metaGET(
      createEvent('https://example.test/api/data/users/_meta', { table: 'users' })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(engine.getMetadata).not.toHaveBeenCalled();
  });

  it('dispatches metadata and discovery from a single catch-all handler', async () => {
    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(),
      exportData: vi.fn(),
      getMetadata: vi.fn(() => ({ columns: [{ name: 'email' }] })),
    };

    createEngines.mockReturnValue({ users: usersEngine });

    const handlers = createSvelteKitHandlers({
      db: {},
      schema: {},
      configs: [],
      enableDiscovery: true,
    });

    const metaResponse = await handlers.GET(
      createEvent('https://example.test/api/data/users/_meta', { table: 'users/_meta' })
    );
    expect(metaResponse.status).toBe(200);
    await expect(metaResponse.json()).resolves.toEqual({
      columns: [{ name: 'email' }],
    });

    const tablesResponse = await handlers.GET(
      createEvent('https://example.test/api/data/_tables', { table: '_tables' })
    );
    expect(tablesResponse.status).toBe(200);
    await expect(tablesResponse.json()).resolves.toEqual(['users']);
  });

  it('intercepts matching hook prefixes and passes through non-matching requests', async () => {
    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(async () => ({
        data: [{ id: 7 }],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      })),
      exportData: vi.fn(),
      getMetadata: vi.fn(),
    };

    createEngines.mockReturnValue({ users: usersEngine });

    const handle = createSvelteKitHandle({
      db: {},
      schema: {},
      configs: [],
      prefix: '/api',
    });

    const resolve = vi.fn(async () => new Response('resolved', { status: 200 }));

    const apiResponse = await handle({
      event: createEvent('https://example.test/api/users'),
      resolve,
    } as any);

    expect(apiResponse.status).toBe(200);
    await expect(apiResponse.json()).resolves.toEqual({
      data: [{ id: 7 }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    });
    expect(resolve).not.toHaveBeenCalled();

    const pageResponse = await handle({
      event: createEvent('https://example.test/dashboard'),
      resolve,
    } as any);

    expect(pageResponse.status).toBe(200);
    await expect(pageResponse.text()).resolves.toBe('resolved');
    expect(resolve).toHaveBeenCalledOnce();
  });

  it('strips base path if present', async () => {
    mockState.base = '/myapp';

    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(async () => ({
        data: [{ id: 8 }],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      })),
      exportData: vi.fn(),
      getMetadata: vi.fn(),
    };

    createEngines.mockReturnValue({ users: usersEngine });

    const handle = createSvelteKitHandle({
      db: {},
      schema: {},
      configs: [],
      prefix: '/api',
    });

    const resolve = vi.fn(async () => new Response('resolved', { status: 200 }));

    const apiResponse = await handle({
      event: createEvent('https://example.test/myapp/api/users'),
      resolve,
    } as any);

    expect(apiResponse.status).toBe(200);
    await expect(apiResponse.json()).resolves.toEqual({
      data: [{ id: 8 }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('does not strip base path if it is a prefix of another folder', async () => {
    mockState.base = '/app';

    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(async () => ({
        data: [{ id: 8 }],
        meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
      })),
      exportData: vi.fn(),
      getMetadata: vi.fn(),
    };

    createEngines.mockReturnValue({ users: usersEngine });

    const handle = createSvelteKitHandle({
      db: {},
      schema: {},
      configs: [],
      prefix: '/api',
    });

    const resolve = vi.fn(async () => new Response('resolved', { status: 200 }));

    // /apple is NOT under /app
    const apiResponse = await handle({
      event: createEvent('https://example.test/apple/api/users'),
      resolve,
    } as any);

    // Should passthrough
    expect(apiResponse.status).toBe(200);
    await expect(apiResponse.text()).resolves.toBe('resolved');
    expect(resolve).toHaveBeenCalledOnce();
  });

  it('serves metadata through the hook prefix and rejects non-GET methods', async () => {
    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(),
      exportData: vi.fn(),
      getMetadata: vi.fn(() => ({ columns: [{ name: 'id' }] })),
    };

    createEngines.mockReturnValue({ users: usersEngine });

    const handle = createSvelteKitHandle({
      db: {},
      schema: {},
      configs: [],
      prefix: '/api',
    });

    const metaResponse = await handle({
      event: createEvent('https://example.test/api/users/_meta'),
      resolve: vi.fn(),
    } as any);

    expect(metaResponse.status).toBe(200);
    await expect(metaResponse.json()).resolves.toEqual({
      columns: [{ name: 'id' }],
    });

    const postResponse = await handle({
      event: {
        ...createEvent('https://example.test/api/users'),
        request: new Request('https://example.test/api/users', { method: 'POST' }),
      },
      resolve: vi.fn(),
    } as any);

    expect(postResponse.status).toBe(405);
    expect(postResponse.headers.get('Allow')).toBe('GET');
  });

  it('returns export responses for single-table routes', async () => {
    const engine = {
      getConfig: vi.fn(() => ({
        name: 'users',
        export: { enabled: true, formats: ['csv'] },
      })),
      query: vi.fn(),
      exportData: vi.fn(async () => 'id\n1'),
      getMetadata: vi.fn(),
    };

    createTableEngine.mockReturnValue(engine);
    parseRequest.mockReturnValue({ export: 'csv' });

    const handlers = createSvelteKitRouteHandlers({
      db: {},
      schema: {},
      config: { name: 'users' } as any,
    });

    const response = await handlers.GET(createEvent('https://example.test/api/users?export=csv'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain(
      'attachment; filename="users.csv"'
    );
    await expect(response.text()).resolves.toBe('id\n1');
    expect(engine.exportData).toHaveBeenCalledWith({ export: 'csv' }, {});
  });

  it('guards the discovery route unless enabled', async () => {
    createEngines.mockReturnValue({ users: {} });

    const handlers = createSvelteKitHandlers({
      db: {},
      schema: {},
      configs: [],
    });

    const response = await handlers.tablesGET(createEvent('https://example.test/api/data/_tables'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Not found' });
  });

  it('filters discovery results to accessible tables', async () => {
    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
    };
    const adminEngine = {
      getConfig: vi.fn(() => ({ name: 'adminUsers', access: { roles: ['admin'] } })),
    };

    createEngines.mockReturnValue({ users: usersEngine, adminUsers: adminEngine });
    defaultCheckAccess.mockImplementation((config) => config.name === 'users');

    const handlers = createSvelteKitHandlers({
      db: {},
      schema: {},
      configs: [],
      enableDiscovery: true,
    });

    const response = await handlers.tablesGET(createEvent('https://example.test/api/data/_tables'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(['users']);
  });

  it('rejects root prefixes for hook mode', () => {
    expect(() =>
      createSvelteKitHandle({
        db: {},
        schema: {},
        configs: [],
        prefix: '/',
      })
    ).toThrow('SvelteKit adapter prefix cannot be root /');

    expect(() =>
      createSvelteKitHandle({
        db: {},
        schema: {},
        configs: [],
        prefix: '   ',
      })
    ).toThrow('SvelteKit adapter prefix cannot be empty');
  });

  it('returns 400 when the table param is missing for GET', async () => {
    const handlers = createSvelteKitHandlers({ db: {}, schema: {}, configs: [] });
    const response = await handlers.GET(createEvent('https://example.test/api/data'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing route param: table' });
  });

  it('returns 404 for unknown table in GET', async () => {
    const handlers = createSvelteKitHandlers({ db: {}, schema: {}, configs: [] });
    const response = await handlers.GET(createEvent('https://example.test/api/data/unknown', { table: 'unknown' }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toHaveProperty('error');
  });

  it('returns 404 for unknown table in metaGET', async () => {
    const handlers = createSvelteKitHandlers({ db: {}, schema: {}, configs: [] });
    const response = await handlers.metaGET(createEvent('https://example.test/api/data/unknown/_meta', { table: 'unknown' }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toHaveProperty('error');
  });

  it('returns 404 for unknown table in createSvelteKitHandle', async () => {
    createEngines.mockReturnValue({});
    const handle = createSvelteKitHandle({ db: {}, schema: {}, configs: [], prefix: '/api/data' });
    const response = await handle({
      event: createEvent('https://example.test/api/data/unknown'),
      resolve: vi.fn(),
    } as any);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toHaveProperty('error');
  });

  it('normalizes prefix values in createSvelteKitHandle (default, trailing slashes)', async () => {
    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(async () => ({
        data: [{ id: 1 }],
        meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
      })),
      exportData: vi.fn(),
      getMetadata: vi.fn(),
    };
    createEngines.mockReturnValue({ users: usersEngine });

    // default prefix
    const defaultHandle = createSvelteKitHandle({ db: {}, schema: {}, configs: [] });
    const defaultResponse = await defaultHandle({
      event: createEvent('https://example.test/api/data/users'),
      resolve: vi.fn(),
    } as any);
    expect(defaultResponse.status).toBe(200);

    // trailing slashes and whitespace
    const apiPrefixHandle = createSvelteKitHandle({ db: {}, schema: {}, configs: [], prefix: '  /api/  ' });
    const apiPrefixResponse = await apiPrefixHandle({
      event: createEvent('https://example.test/api/users'),
      resolve: vi.fn(),
    } as any);
    expect(apiPrefixResponse.status).toBe(200);

    // Non-matching path should pass through for these prefixes
    const passThroughEvent = createEvent('https://example.test/other/path', {
      table: 'users',
    });

    const passThroughResponse = await apiPrefixHandle({
      event: passThroughEvent,
      resolve: vi.fn(async () => new Response('next', { status: 200 })),
    } as any);
    expect(passThroughResponse.status).toBe(200);
    await expect(passThroughResponse.text()).resolves.toBe('next');
  });

  it('applies discovery access control via createSvelteKitHandle', async () => {
    const usersEngine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
    };
    createEngines.mockReturnValue({ users: usersEngine });
    
    const checkAccess = vi.fn().mockResolvedValue(false);
    const handle = createSvelteKitHandle({
      db: {}, schema: {}, configs: [],
      prefix: '/api/data',
      enableDiscovery: true,
      checkAccess,
    });

    const response = await handle({
      event: createEvent('https://example.test/api/data/_tables'),
      resolve: vi.fn(),
    } as any);

    expect(checkAccess).toHaveBeenCalled();
    expect(response.status).toBe(403);
  });

  it('decodes URL-encoded table names in hook mode', async () => {
    const engine = {
      getConfig: vi.fn(() => ({ name: 'my table' })),
      query: vi.fn(async () => ({ data: [], meta: { total: 0, page: 1, pageSize: 25, totalPages: 0 } })),
    };
    createEngines.mockReturnValue({ 'my table': engine });

    const handle = createSvelteKitHandle({
      db: {}, schema: {}, configs: [], prefix: '/api',
    });

    const response = await handle({
      event: createEvent('https://example.test/api/my%20table'),
      resolve: vi.fn(),
    } as any);

    expect(response.status).toBe(200);
  });

  it('returns 403 when a custom checkAccess denies access in multi-table handle()', async () => {
    const engine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(async () => ({
        data: [{ id: 1 }],
        meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
      })),
      exportData: vi.fn(),
      getMetadata: vi.fn(),
    };

    createEngines.mockReturnValue({ users: engine });
    const checkAccess = vi.fn().mockResolvedValue(false);

    const handle = createSvelteKitHandle({
      db: {}, schema: {}, configs: [],
      checkAccess,
    });

    const response = await handle({
      event: createEvent('https://example.test/api/data/users'),
      resolve: vi.fn(),
    } as any);

    expect(checkAccess).toHaveBeenCalled();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('returns 403 when a custom checkAccess denies access in single-table route handlers', async () => {
    const engine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
      query: vi.fn(async () => ({
        data: [{ id: 1 }],
        meta: { total: 1, page: 1, pageSize: 25, totalPages: 1 },
      })),
      exportData: vi.fn(),
      getMetadata: vi.fn(),
    };

    createTableEngine.mockReturnValue(engine);
    const checkAccess = vi.fn().mockResolvedValue(false);

    const handlers = createSvelteKitRouteHandlers({
      db: {}, schema: {}, config: { name: 'users' } as any,
      checkAccess,
    });

    const response = await handlers.GET(createEvent('https://example.test/api/users'));

    expect(checkAccess).toHaveBeenCalled();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('applies discovery access control via createSvelteKitHandle when discovery is disabled', async () => {
    const engine = {
      getConfig: vi.fn(() => ({ name: 'users' })),
    };
    createEngines.mockReturnValue({ users: engine });
    const checkAccess = vi.fn().mockResolvedValue(true);

    const handle = createSvelteKitHandle({
      db: {}, schema: {}, configs: [], prefix: '/api/data',
      enableDiscovery: false,
      checkAccess,
    });

    const resolve = vi.fn().mockResolvedValue(new Response('next', { status: 200 }));
    const response = await handle({
      event: createEvent('https://example.test/api/data/_tables'),
      resolve,
    } as any);

    expect(checkAccess).not.toHaveBeenCalled();
    // In our implementation, handleDiscoveryRequest returns 404 when disabled
    expect(response.status).toBe(404);
  });

  it('returns 400 when export is requested but disabled for the table', async () => {
    const engine = {
      getConfig: vi.fn(() => ({
        name: 'users',
        export: { enabled: false, formats: ['csv'] },
      })),
    };
    createTableEngine.mockReturnValue(engine);
    parseRequest.mockReturnValue({ export: 'csv' });

    const handlers = createSvelteKitRouteHandlers({
      db: {}, schema: {}, config: { name: 'users' } as any,
    });

    const response = await handlers.GET(createEvent('https://example.test/api/users?export=csv'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty('error');
  });

  it('returns 400 when export is requested with unsupported format', async () => {
    const engine = {
      getConfig: vi.fn(() => ({
        name: 'users',
        export: { enabled: true, formats: ['csv'] },
      })),
    };
    createTableEngine.mockReturnValue(engine);
    parseRequest.mockReturnValue({ export: 'json' });

    const handlers = createSvelteKitRouteHandlers({
      db: {}, schema: {}, config: { name: 'users' } as any,
    });

    const response = await handlers.GET(createEvent('https://example.test/api/users?export=json'));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty('error');
  });

  it('supports exports via multi-table SvelteKit handle', async () => {
    const engine = {
      getConfig: vi.fn(() => ({
        name: 'users',
        export: { enabled: true, formats: ['csv'] },
      })),
      exportData: vi.fn(async () => 'id\n1'),
    };
    createEngines.mockReturnValue({ users: engine });
    parseRequest.mockReturnValue({ export: 'csv' });

    const handle = createSvelteKitHandle({ db: {}, schema: {}, configs: [] });
    const response = await handle({
      event: createEvent('https://example.test/api/data/users?export=csv'),
      resolve: vi.fn(),
    } as any);

    expect(engine.exportData).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
  });

  it('uses errorResponse and appropriate status when getExportMeta fails', async () => {
    const engine = {
      getConfig: vi.fn(() => ({
        name: 'users',
        export: { enabled: true, formats: ['csv'] },
      })),
      exportData: vi.fn(async () => 'id\n1'),
    };
    createTableEngine.mockReturnValue(engine);
    parseRequest.mockReturnValue({ export: 'csv' });
    getExportMeta.mockImplementation(() => {
      throw new Error('boom');
    });

    const handlers = createSvelteKitRouteHandlers({
      db: {}, schema: {}, config: { name: 'users' } as any,
    });

    const response = await handlers.GET(createEvent('https://example.test/api/users?export=csv'));
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
