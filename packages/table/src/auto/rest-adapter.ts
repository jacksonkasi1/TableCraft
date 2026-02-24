import type { DataAdapter, QueryParams, QueryResult, TableMetadata } from "../types";

export interface RestAdapterOptions<T> {
  /** Function that fetches data given table params */
  queryFn: (params: QueryParams) => Promise<QueryResult<T>>;
  /** Function to fetch specific items by IDs (for cross-page export) */
  queryByIdsFn?: (ids: (string | number)[], options?: { sortBy?: string; sortOrder?: "asc" | "desc" }) => Promise<T[]>;
  /** Function to fetch table metadata (enables auto-columns) */
  metaFn?: () => Promise<TableMetadata>;
}

/**
 * Creates a DataAdapter for any REST API.
 * You provide the data fetching logic, the table handles the rest.
 *
 * @example
 * ```ts
 * const adapter = createRestAdapter({
 *   queryFn: async (params) => {
 *     const res = await fetch(`/api/users?page=${params.page}&limit=${params.pageSize}`);
 *     const json = await res.json();
 *     return {
 *       data: json.results,
 *       meta: {
 *         total: json.count,
 *         page: params.page,
 *         pageSize: params.pageSize,
 *         totalPages: Math.ceil(json.count / params.pageSize),
 *       },
 *     };
 *   },
 * });
 * ```
 */
export function createRestAdapter<T = Record<string, unknown>>(
  options: RestAdapterOptions<T>
): DataAdapter<T> {
  return {
    query: options.queryFn,
    queryByIds: options.queryByIdsFn,
    meta: options.metaFn,
  };
}