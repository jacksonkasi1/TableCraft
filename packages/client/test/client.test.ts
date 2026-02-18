import { describe, it, expect, vi } from 'vitest';
import { createClient } from '../src/client';

describe('createClient', () => {
  it('should create a client with table method', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const users = tc.table('users');
    expect(users).toBeDefined();
    expect(users.query).toBeTypeOf('function');
    expect(users.meta).toBeTypeOf('function');
    expect(users.buildUrl).toBeTypeOf('function');
  });

  it('should build correct URL with no params', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl();
    expect(url).toContain('/api/data/users');
  });

  it('should build URL with page and pageSize', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl({ page: 2, pageSize: 25 });
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=25');
  });

  it('should build URL with sort', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl({ sort: ['-createdAt', 'name'] });
    expect(url).toContain('sort=-createdAt%2Cname');
  });

  it('should build URL with simple filters', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl({
      filters: { status: 'active' },
    });
    expect(url).toContain('filter%5Bstatus%5D=active');
  });

  it('should build URL with operator filters', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl({
      filters: { age: { operator: 'gte', value: 18 } },
    });
    expect(url).toContain('filter%5Bage%5D%5Bgte%5D=18');
  });

  it('should build URL with search', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl({ search: 'john' });
    expect(url).toContain('search=john');
  });

  it('should build URL with select', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl({ select: ['id', 'name', 'email'] });
    expect(url).toContain('select=id%2Cname%2Cemail');
  });

  it('should build URL with cursor', () => {
    const tc = createClient({ baseUrl: '/api/data' });
    const url = tc.table('users').buildUrl({ cursor: 'abc123' });
    expect(url).toContain('cursor=abc123');
  });

  it('should fetch data with mocked fetch', async () => {
    const mockResponse = {
      data: [{ id: 1, name: 'Alice' }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const tc = createClient({ baseUrl: '/api/data', fetch: mockFetch as any });
    const result = await tc.table('users').query();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alice');
  });

  it('should throw on error response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found', code: 'NOT_FOUND' }),
    });

    const tc = createClient({ baseUrl: '/api/data', fetch: mockFetch as any });

    await expect(tc.table('users').query()).rejects.toThrow('Not found');
  });

  it('should pass custom headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], meta: {} }),
    });

    const tc = createClient({
      baseUrl: '/api/data',
      fetch: mockFetch as any,
      headers: { Authorization: 'Bearer token123' },
    });

    await tc.table('users').query();

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token123');
  });

  it('should support async headers function', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], meta: {} }),
    });

    const tc = createClient({
      baseUrl: '/api/data',
      fetch: mockFetch as any,
      headers: async () => ({ Authorization: 'Bearer dynamic' }),
    });

    await tc.table('users').query();
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer dynamic');
  });
});

describe('createClient with axios', () => {
  it('should work with axios instance', async () => {
    const mockResponse = {
      data: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    };

    const mockAxios = {
      request: vi.fn().mockResolvedValue({
        data: mockResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
      }),
      get: vi.fn(),
    };

    const tc = createClient({ baseUrl: '/api/data', axios: mockAxios as any });
    const result = await tc.table('users').query();

    expect(mockAxios.request).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alice');
  });

  it('should pass headers to axios', async () => {
    const mockAxios = {
      request: vi.fn().mockResolvedValue({
        data: { data: [], meta: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
      }),
      get: vi.fn(),
    };

    const tc = createClient({
      baseUrl: '/api/data',
      axios: mockAxios as any,
      headers: { Authorization: 'Bearer token123' },
    });

    await tc.table('users').query();

    expect(mockAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token123',
        }),
      })
    );
  });

  it('should handle axios error responses', async () => {
    const mockAxios = {
      request: vi.fn().mockRejectedValue({
        response: {
          data: { error: 'Not found', code: 'NOT_FOUND' },
          status: 404,
          statusText: 'Not Found',
          headers: {},
        },
      }),
      get: vi.fn(),
    };

    const tc = createClient({ baseUrl: '/api/data', axios: mockAxios as any });

    await expect(tc.table('users').query()).rejects.toThrow('Not found');
  });

  it('should handle axios errors without response', async () => {
    const mockAxios = {
      request: vi.fn().mockRejectedValue({
        message: 'Network error',
      }),
      get: vi.fn(),
    };

    const tc = createClient({ baseUrl: '/api/data', axios: mockAxios as any });

    await expect(tc.table('users').query()).rejects.toThrow('Network error');
  });

  it('should fetch metadata with axios', async () => {
    const mockMeta = {
      name: 'users',
      columns: [
        { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true, operators: ['eq'] },
        { name: 'name', type: 'string', label: 'Name', hidden: false, sortable: true, filterable: true, operators: ['eq', 'contains'] },
      ],
      capabilities: {
        search: true,
        searchFields: ['name'],
        export: true,
        exportFormats: ['csv', 'json'],
        pagination: { enabled: true, defaultPageSize: 10, maxPageSize: 100, cursor: false },
        sort: { enabled: true, defaultSort: [] },
        groupBy: false,
        groupByFields: [],
        recursive: false,
      },
      filters: [],
      aggregations: [],
      includes: [],
      staticFilters: [],
    };

    const mockAxios = {
      request: vi.fn().mockResolvedValue({
        data: mockMeta,
        status: 200,
        statusText: 'OK',
        headers: {},
      }),
      get: vi.fn(),
    };

    const tc = createClient({ baseUrl: '/api/data', axios: mockAxios as any });
    const meta = await tc.table('users').meta();

    expect(meta.name).toBe('users');
    expect(meta.columns).toHaveLength(2);
  });

  it('should prefer axios over fetch when both provided', async () => {
    const mockAxios = {
      request: vi.fn().mockResolvedValue({
        data: { data: [{ id: 1 }], meta: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
      }),
      get: vi.fn(),
    };

    const mockFetch = vi.fn();

    const tc = createClient({
      baseUrl: '/api/data',
      axios: mockAxios as any,
      fetch: mockFetch as any,
    });

    await tc.table('users').query();

    expect(mockAxios.request).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
