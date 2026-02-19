import { describe, it, expect, vi } from 'vitest';
import { createTableCraftAdapter } from '../src/auto/tablecraft-adapter';

describe('createTableCraftAdapter', () => {
  it('should create adapter with query method', () => {
    const adapter = createTableCraftAdapter({
      baseUrl: '/api/data',
      table: 'users',
    });
    
    expect(adapter).toBeDefined();
    expect(adapter.query).toBeTypeOf('function');
    expect(adapter.meta).toBeTypeOf('function');
    expect(adapter.export).toBeTypeOf('function');
  });
});

describe('createTableCraftAdapter with axios', () => {
  it('should work with axios instance', async () => {
    const mockResponse = {
      data: [{ id: 1, name: 'Alice' }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    };

    const mockAxios = {
      request: vi.fn().mockImplementation(({ url }: { url: string }) => {
        if (url && url.endsWith('/_meta')) {
          return Promise.resolve({
            data: { name: 'users', columns: [], capabilities: {}, filters: [] },
            status: 200,
            statusText: 'OK',
            headers: {},
          });
        }
        return Promise.resolve({
          data: mockResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
        });
      }),
      get: vi.fn(),
    };

    const adapter = createTableCraftAdapter({
      baseUrl: '/api/data',
      table: 'users',
      axios: mockAxios as any,
    });

    const result = await adapter.query({ page: 1, pageSize: 10, search: '', sort: '', sortOrder: 'asc', filters: {}, dateRange: { from: '', to: '' } });

    expect(mockAxios.request).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('Alice');
  });

  it('should pass headers to axios', async () => {
    const mockAxios = {
      request: vi.fn().mockImplementation(({ url }: { url: string }) => {
        if (url && url.endsWith('/_meta')) {
          return Promise.resolve({
            data: { name: 'users', columns: [], capabilities: {}, filters: [] },
            status: 200,
            statusText: 'OK',
            headers: {},
          });
        }
        return Promise.resolve({
          data: { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } },
          status: 200,
          statusText: 'OK',
          headers: {},
        });
      }),
      get: vi.fn(),
    };

    const adapter = createTableCraftAdapter({
      baseUrl: '/api/data',
      table: 'users',
      axios: mockAxios as any,
      headers: { Authorization: 'Bearer token123' },
    });

    await adapter.query({ page: 1, pageSize: 10, search: '', sort: '', sortOrder: 'asc', filters: {}, dateRange: { from: '', to: '' } });

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
          data: { error: 'Not found' },
          status: 404,
          statusText: 'Not Found',
          headers: {},
        },
      }),
      get: vi.fn(),
    };

    const adapter = createTableCraftAdapter({
      baseUrl: '/api/data',
      table: 'users',
      axios: mockAxios as any,
    });

    // Both _meta and query requests will fail; adapter swallows _meta error, surfaces query error
    await expect(adapter.query({ page: 1, pageSize: 10, search: '', sort: '', sortOrder: 'asc', filters: {}, dateRange: { from: '', to: '' } })).rejects.toThrow('Not found');
    expect(mockAxios.request).toHaveBeenCalledTimes(2);
  });

  it('should handle axios errors without response', async () => {
    const mockAxios = {
      request: vi.fn().mockRejectedValue({
        message: 'Network error',
      }),
      get: vi.fn(),
    };

    const adapter = createTableCraftAdapter({
      baseUrl: '/api/data',
      table: 'users',
      axios: mockAxios as any,
    });

    // Both _meta and query requests will fail; adapter swallows _meta error, surfaces query error
    await expect(adapter.query({ page: 1, pageSize: 10, search: '', sort: '', sortOrder: 'asc', filters: {}, dateRange: { from: '', to: '' } })).rejects.toThrow('Network error');
    expect(mockAxios.request).toHaveBeenCalledTimes(2);
  });

  it('should prefer axios over fetch when both provided', async () => {
    const mockAxios = {
      request: vi.fn().mockImplementation(({ url }: { url: string }) => {
        if (url && url.endsWith('/_meta')) {
          return Promise.resolve({
            data: { name: 'users', columns: [], capabilities: {}, filters: [] },
            status: 200,
            statusText: 'OK',
            headers: {},
          });
        }
        return Promise.resolve({
          data: { data: [{ id: 1 }], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } },
          status: 200,
          statusText: 'OK',
          headers: {},
        });
      }),
      get: vi.fn(),
    };

    const mockFetch = vi.fn();

    const adapter = createTableCraftAdapter({
      baseUrl: '/api/data',
      table: 'users',
      axios: mockAxios as any,
      fetch: mockFetch as any,
    });

    await adapter.query({ page: 1, pageSize: 10, search: '', sort: '', sortOrder: 'asc', filters: {}, dateRange: { from: '', to: '' } });

    expect(mockAxios.request).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
