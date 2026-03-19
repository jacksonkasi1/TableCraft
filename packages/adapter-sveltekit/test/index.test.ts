// ** import core packages
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createEngines = vi.fn();
const createTableEngine = vi.fn();
const parseRequest = vi.fn();
const defaultCheckAccess = vi.fn();
const getExportMeta = vi.fn();

class MockTableCraftError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

vi.mock('@tablecraft/engine', () => ({
  createEngines,
  createTableEngine,
  parseRequest,
  checkAccess: defaultCheckAccess,
  getExportMeta,
  TableCraftError: MockTableCraftError,
}));

import {
  createSvelteKitHandle,
  createSvelteKitHandlers,
  createSvelteKitRouteHandlers,
} from '../src/index';

function createEvent(url: string, params: Record<string, string> = {}) {
  return {
    request: new Request(url),
    params,
    locals: {},
  } as any;
}

describe('@tablecraft/adapter-sveltekit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(response.headers.get('Content-Disposition')).toBe(
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
});
