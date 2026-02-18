import type { DataAdapter, QueryParams, QueryResult, TableMetadata } from "../types";

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

export interface TableCraftAdapterOptions {
  /** Base URL of your TableCraft API. Example: "/api/data" */
  baseUrl: string;
  /** Table name. Example: "users" */
  table: string;
  /** Default headers for every request (auth tokens, etc.) */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Custom fetch function. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Axios instance. If provided, takes precedence over fetch. */
  axios?: unknown;
}

/**
 * Creates a DataAdapter that talks directly to a TableCraft backend.
 * This is the "native" adapter — zero config beyond baseUrl + table name.
 *
 * @example
 * ```ts
 * const adapter = createTableCraftAdapter({
 *   baseUrl: '/api/data',
 *   table: 'users',
 * });
 * <DataTable adapter={adapter} />
 * ```
 */
export function createTableCraftAdapter<T = Record<string, unknown>>(
  options: TableCraftAdapterOptions
): DataAdapter<T> {
  const { baseUrl, table: tableName } = options;
  
  let customFetch: (url: string, options?: RequestInit) => Promise<Response>;
  
  if (options.axios && isAxiosInstance(options.axios)) {
    customFetch = createAxiosFetchAdapter(options.axios);
  } else if (options.fetch) {
    customFetch = options.fetch;
  } else {
    customFetch = globalThis.fetch;
  }

  const tableUrl = `${baseUrl.replace(/\/$/, "")}/${tableName}`;

  let cachedMetadata: TableMetadata | null = null;

  async function resolveHeaders(): Promise<Record<string, string>> {
    if (!options.headers) return {};
    if (typeof options.headers === "function") {
      return await options.headers();
    }
    return options.headers;
  }

  async function request<R>(url: string): Promise<R> {
    const headers = await resolveHeaders();
    const response = await customFetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body.error ?? `Request failed: ${response.status}`);
      (err as unknown as Record<string, unknown>).status = response.status;
      throw err;
    }

    return response.json();
  }

  function buildQueryUrl(params: QueryParams, dateRangeColumn: string | null | undefined): string {
    const url = new URL(tableUrl, globalThis.location?.origin ?? "http://localhost");

    if (params.page) url.searchParams.set("page", String(params.page));
    if (params.pageSize) url.searchParams.set("pageSize", String(params.pageSize));

    if (params.sort) {
      const sortStr = params.sortOrder === "desc" ? `-${params.sort}` : params.sort;
      url.searchParams.set("sort", sortStr);
    }

    if (params.search) {
      url.searchParams.set("search", params.search);
    }

    if (params.filters) {
      for (const [field, value] of Object.entries(params.filters)) {
        if (value === null || value === undefined) continue;
        if (typeof value === "object" && !Array.isArray(value)) {
          const filter = value as { operator?: string; value?: unknown };
          if (filter.operator && filter.operator !== "eq") {
            url.searchParams.set(`filter[${field}][${filter.operator}]`, String(filter.value));
          } else {
            url.searchParams.set(`filter[${field}]`, String(filter.value ?? value));
          }
        } else {
          url.searchParams.set(`filter[${field}]`, String(value));
        }
      }
    }

    if (dateRangeColumn && params.dateRange?.from) {
      url.searchParams.set(`filter[${dateRangeColumn}][gte]`, params.dateRange.from);
    }
    if (dateRangeColumn && params.dateRange?.to) {
      url.searchParams.set(`filter[${dateRangeColumn}][lte]`, params.dateRange.to);
    }

    return url.toString();
  }

  return {
    async query(params: QueryParams): Promise<QueryResult<T>> {
      let dateRangeCol: string | null | undefined = cachedMetadata?.dateRangeColumn ?? 'createdAt';
      
      if (!cachedMetadata) {
        try {
          cachedMetadata = await request<TableMetadata>(`${tableUrl}/_meta`);
          dateRangeCol = cachedMetadata?.dateRangeColumn ?? 'createdAt';
        } catch (error) {
          console.warn(`[TableCraft] Could not fetch metadata for "${tableName}"; date filtering will use fallback column "createdAt".`, error);
        }
      }
      
      const url = buildQueryUrl(params, dateRangeCol);
      const result = await request<{
        data: T[];
        meta: {
          total: number | null;
          page: number;
          pageSize: number;
          totalPages: number | null;
        };
      }>(url);

      return {
        data: result.data,
        meta: result.meta,
      };
    },

    async meta(): Promise<TableMetadata> {
      if (!cachedMetadata) {
        cachedMetadata = await request<TableMetadata>(`${tableUrl}/_meta`);
      }
      return cachedMetadata;
    },

    async export(format: "csv" | "json", params?: Partial<QueryParams>): Promise<string> {
      let dateRangeCol: string | null | undefined = cachedMetadata?.dateRangeColumn ?? 'createdAt';
      
      if (!cachedMetadata) {
        try {
          cachedMetadata = await request<TableMetadata>(`${tableUrl}/_meta`);
          dateRangeCol = cachedMetadata?.dateRangeColumn ?? 'createdAt';
        } catch (error) {
          console.warn(`[TableCraft] Could not fetch metadata for "${tableName}"; date filtering will use fallback column "createdAt".`, error);
        }
      }
      
      const fullParams: QueryParams = {
        page: 1,
        pageSize: 10000,
        search: "",
        sort: "",
        sortOrder: "asc",
        filters: {},
        dateRange: { from: "", to: "" },
        ...params,
      };
      const url = new URL(buildQueryUrl(fullParams, dateRangeCol));
      url.searchParams.set("export", format);

      const headers = await resolveHeaders();
      const response = await customFetch(url.toString(), {
        method: "GET",
        headers: { ...headers },
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      return response.text();
    },
  };
}