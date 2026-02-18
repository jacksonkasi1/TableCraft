import type {
  ClientOptions,
  TableCraftClient,
  TableClient,
  QueryParams,
  QueryResult,
  TableMetadata,
} from './types';

interface AxiosRequestConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  data?: unknown;
  signal?: AbortSignal;
}

interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

interface AxiosInstance {
  request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

function isAxiosInstance(value: unknown): value is AxiosInstance {
  return typeof value === 'object' && value !== null && typeof (value as AxiosInstance).request === 'function';
}

function createAxiosFetchAdapter(axios: AxiosInstance) {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const headers = options?.headers as Record<string, string> | undefined;
    const method = options?.method || 'GET';
    
    try {
      const response = await axios.request({
        url,
        method,
        headers,
        data: options?.body,
        signal: options?.signal ?? undefined,
      });
      
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers),
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      } as Response;
    } catch (error: unknown) {
      const axiosError = error as { response?: AxiosResponse<{ error?: string; code?: string; details?: unknown }>; message?: string };
      
      if (axiosError.response) {
        return {
          ok: false,
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          headers: new Headers(axiosError.response.headers),
          json: async () => axiosError.response?.data ?? { error: 'Request failed' },
          text: async () => JSON.stringify(axiosError.response?.data ?? { error: 'Request failed' }),
        } as Response;
      }
      
      throw new Error(axiosError.message ?? 'Request failed');
    }
  };
}

/**
 * Creates a type-safe client for TableCraft APIs.
 */
export function createClient(options: ClientOptions): TableCraftClient {
  const { baseUrl } = options;
  
  let customFetch: (url: string, options?: RequestInit) => Promise<Response>;
  
  if (options.axios && isAxiosInstance(options.axios)) {
    customFetch = createAxiosFetchAdapter(options.axios);
  } else if (options.fetch) {
    customFetch = options.fetch;
  } else {
    customFetch = globalThis.fetch;
  }

  async function resolveHeaders(): Promise<Record<string, string>> {
    if (!options.headers) return {};
    if (typeof options.headers === 'function') {
      return await options.headers();
    }
    return options.headers;
  }

  async function request<T>(url: string): Promise<T> {
    const headers = await resolveHeaders();

    const response = await customFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body.error ?? `Request failed: ${response.status}`);
      (err as any).status = response.status;
      (err as any).code = body.code;
      (err as any).details = body.details;
      throw err;
    }

    return response.json();
  }

  async function requestText(url: string): Promise<string> {
    const headers = await resolveHeaders();

    const response = await customFetch(url, {
      method: 'GET',
      headers: { ...headers },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    return response.text();
  }

  function table<T = Record<string, unknown>>(name: string): TableClient<T> {
    const tableUrl = `${baseUrl.replace(/\/$/, '')}/${name}`;

    function buildUrl(params?: QueryParams): string {
      const url = new URL(tableUrl, globalThis.location?.origin ?? 'http://localhost');
      if (!params) return url.toString();

      if (params.page != null) url.searchParams.set('page', String(params.page));
      if (params.pageSize != null) url.searchParams.set('pageSize', String(params.pageSize));
      if (params.cursor) url.searchParams.set('cursor', params.cursor);

      // Sort
      if (params.sort) {
        const sortArr = Array.isArray(params.sort) ? params.sort : [params.sort];
        url.searchParams.set('sort', sortArr.join(','));
      }

      // Filters
      if (params.filters) {
        for (const [field, value] of Object.entries(params.filters)) {
          if (value === null || value === undefined) continue;

          if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            // { operator: 'gte', value: 100 }
            const filter = value as { operator?: string; value?: unknown };
            if (filter.operator && filter.operator !== 'eq') {
              url.searchParams.set(`filter[${field}][${filter.operator}]`, String(filter.value));
            } else {
              url.searchParams.set(`filter[${field}]`, String(filter.value ?? filter));
            }
          } else {
            // Simple: { status: 'active' }
            url.searchParams.set(`filter[${field}]`, String(value));
          }
        }
      }

      // Search
      if (params.search) url.searchParams.set('search', params.search);

      // Select
      if (params.select?.length) url.searchParams.set('select', params.select.join(','));

      // Distinct
      if (params.distinct) url.searchParams.set('distinct', 'true');

      // Include deleted
      if (params.includeDeleted) url.searchParams.set('includeDeleted', 'true');

      return url.toString();
    }

    return {
      async query(params?: QueryParams): Promise<QueryResult<T>> {
        const url = buildUrl(params);
        return request<QueryResult<T>>(url);
      },

      async meta(): Promise<TableMetadata> {
        return request<TableMetadata>(`${tableUrl}/_meta`);
      },

      async count(params?: QueryParams): Promise<number> {
        const result = await this.query({ ...params, pageSize: 1, select: ['id'] });
        return result.meta.total ?? 0;
      },

      async export(format: 'csv' | 'json', params?: QueryParams): Promise<string> {
        const url = buildUrl({ ...params, export: format } as any);
        const fullUrl = new URL(url);
        fullUrl.searchParams.set('export', format);
        return requestText(fullUrl.toString());
      },

      buildUrl,
    };
  }

  return { table };
}
