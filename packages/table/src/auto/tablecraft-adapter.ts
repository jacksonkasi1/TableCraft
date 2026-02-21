import type { DataAdapter, QueryParams, QueryResult, TableMetadata } from "../types";
import { isAxiosInstance, createAxiosFetchAdapter, type MinimalResponse } from "@tablecraft/client";

// ─── Filter type helpers ──────────────────────────────────────────────────────

/**
 * Extracts the `value` type from a generated Filters interface field.
 * e.g. `{ operator: 'eq' | 'gt'; value: number }` → `number`
 */
type FilterValueOf<F> = F extends { value: infer V } ? V : never;

/**
 * A single custom filter value for one field.
 * Accepts three forms (all auto-handled by the adapter):
 *
 * 1. **Full form** — type-safe operator + value from the generated Filters type
 *    `{ operator: 'gte', value: 100 }`
 *
 * 2. **Scalar shorthand** — just the value; adapter wraps it as `{ operator: 'eq', value }`
 *    `'shipped'` / `true` / `42`
 *
 * 3. **Omit** — `null`, `undefined`, or `false` remove the filter from the request entirely
 *    `null` / `undefined` / `false`
 */
type CustomFilterEntry<F> =
  | F                        // full { operator, value } form — type-safe operators & value
  | FilterValueOf<F>         // scalar shorthand (value only, implies 'eq')
  | { operator: 'isNull' | 'isNotNull' }  // null-check operators (no value needed)
  | null
  | undefined
  | false;

/**
 * Type-safe `customFilters` map.
 *
 * Pass your generated `XxxFilters` type as the second generic to get full type safety:
 * - Keys are constrained to `keyof TFilters`
 * - Each value accepts the full operator form, a scalar shorthand, or a falsy omit
 *
 * Without `TFilters` (or with the untyped `createTableCraftAdapter<Row>()` form),
 * falls back to `Record<string, CustomFilterValue>` — still works, just untyped.
 */
export type CustomFilters<TFilters> = [TFilters] extends [never]
  ? Record<string, CustomFilterValue>
  : {
      [K in keyof TFilters]?: CustomFilterEntry<TFilters[K]>;
    };

/**
 * Untyped fallback for when no Filters type is provided.
 * @internal
 */
export type CustomFilterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { operator: string; value: string | number | boolean | null };

export interface TableCraftAdapterOptions<TFilters = never> {
  /** Base URL of your TableCraft API. Example: "/api/data" */
  baseUrl: string;
  /** Table name. Example: "users" */
  table: string;
  /** Default headers for every request (auth tokens, etc.) */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** Custom fetch function. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Axios instance (or any compatible object). If provided, takes precedence over fetch. */
  axios?: unknown;
  /**
   * Type-safe custom filters merged into every query.
   *
   * Pass your generated `XxxFilters` as the second generic for full type safety:
   * ```ts
   * createTableCraftAdapter<OrdersRow, OrdersFilters>({
   *   customFilters: {
   *     status: 'shipped',                       // scalar → implicit 'eq'
   *     total: { operator: 'gte', value: 100 },  // full form — operators are type-checked
   *     role: null,                              // omitted from request
   *   },
   * })
   * ```
   *
   * Falsy values (`false`, `null`, `undefined`, `""`, `0`) are automatically
   * excluded — no need to manually guard or delete keys.
   */
  customFilters?: CustomFilters<TFilters>;
}

/**
 * Creates a DataAdapter that talks directly to a TableCraft backend.
 * This is the "native" adapter — zero config beyond baseUrl + table name.
 *
 * @example Basic usage:
 * ```ts
 * const adapter = createTableCraftAdapter<OrdersRow>({
 *   baseUrl: '/api/data',
 *   table: 'orders',
 * });
 * ```
 *
 * @example Type-safe custom filters (pass your generated Filters type as second generic):
 * ```ts
 * const adapter = createTableCraftAdapter<OrdersRow, OrdersFilters>({
 *   baseUrl: '/api/engine',
 *   table: 'orders',
 *   customFilters: {
 *     status: 'shipped',                       // scalar → implicit 'eq'
 *     total: { operator: 'gte', value: 100 },  // full form, operators type-checked
 *     role: null,                              // omitted from the request
 *   },
 * });
 * ```
 */
export function createTableCraftAdapter<T = Record<string, unknown>, TFilters = never>(
  options: TableCraftAdapterOptions<TFilters>
): DataAdapter<T> {
  const { baseUrl, table: tableName } = options;
  
  let customFetch: (url: string, options?: RequestInit) => Promise<MinimalResponse | Response>;
  
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
          const filterValue = filter.value;
          // Skip if the filter value itself is null/undefined
          if (filterValue === null || filterValue === undefined) continue;
          if (filter.operator && filter.operator !== "eq") {
            // Serialize arrays as comma-separated (the backend parser splits on comma)
            const serialized = Array.isArray(filterValue)
              ? filterValue.join(",")
              : String(filterValue);
            url.searchParams.set(`filter[${field}][${filter.operator}]`, serialized);
          } else {
            const serialized = Array.isArray(filterValue)
              ? filterValue.join(",")
              : String(filterValue);
            url.searchParams.set(`filter[${field}]`, serialized);
          }
        } else {
          const serialized = Array.isArray(value)
            ? value.join(",")
            : String(value);
          url.searchParams.set(`filter[${field}]`, serialized);
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

  function applyCustomFilters(params: QueryParams): QueryParams {
    const { customFilters } = options;
    if (!customFilters) return params;

    const merged: Record<string, unknown> = { ...(params.filters ?? {}) };

    for (const [key, val] of Object.entries(customFilters)) {
      // Falsy primitives (false, null, undefined, "", 0) → remove the filter
      if (val === false || val === null || val === undefined || val === "" || val === 0) {
        delete merged[key];
      } else if (typeof val === "object") {
        // { operator, value } form — pass through as-is
        merged[key] = val;
      } else {
        // Scalar truthy value (string, number, boolean true)
        merged[key] = { operator: "eq", value: val };
      }
    }

    return { ...params, filters: merged };
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
      
      const url = buildQueryUrl(applyCustomFilters(params), dateRangeCol);
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
      const url = new URL(buildQueryUrl(applyCustomFilters(fullParams), dateRangeCol));
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