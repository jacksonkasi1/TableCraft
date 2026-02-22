import type {
  ClientOptions,
  TableCraftClient,
  TableClient,
  QueryParams,
  QueryResult,
  TableMetadata,
} from './types';
import { createAxiosFetchAdapter, isAxiosInstance } from './axios-adapter';
import type { MinimalResponse } from './axios-adapter';

/**
 * Creates a type-safe client for TableCraft APIs.
 */
export function createClient(options: ClientOptions): TableCraftClient {
  const { baseUrl } = options;
  
  let customFetch: (url: string, options?: RequestInit) => Promise<MinimalResponse | Response>;
  
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
            const isNullary = filter.operator === 'isNull' || filter.operator === 'isNotNull';
            const filterValue = filter.value;
            // Skip if the filter value itself is null/undefined and it's not a nullary operator
            if (!isNullary && (filterValue === null || filterValue === undefined)) continue;

            // Serialize arrays as comma-separated (the backend parser splits on comma
            // and auto-wraps scalars for array operators like `in`/`notIn`)
            const serialized = isNullary
              ? 'true'
              : Array.isArray(filterValue)
                ? filterValue.join(',')
                : String(filterValue);
            if (filter.operator && filter.operator !== 'eq') {
              url.searchParams.set(`filter[${field}][${filter.operator}]`, serialized);
            } else {
              url.searchParams.set(`filter[${field}]`, serialized);
            }
          } else {
            // Simple: { status: 'active' } or array
            const serialized = Array.isArray(value)
              ? value.join(',')
              : String(value);
            url.searchParams.set(`filter[${field}]`, serialized);
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
