import type { DataAdapter, QueryParams, QueryResult, TableMetadata } from "../types";

export interface TableCraftAdapterOptions {
  /** Base URL of your TableCraft API. Example: "/api/data" */
  baseUrl: string;
  /** Table name. Example: "users" */
  table: string;
  /** Default headers for every request (auth tokens, etc.) */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Custom fetch function. Defaults to global fetch. */
  fetch?: typeof fetch;
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
  const customFetch = options.fetch ?? globalThis.fetch;

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