export interface AxiosLike {
  request<T = unknown>(config: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    data?: unknown;
    signal?: AbortSignal;
  }): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }>;
  get<T = unknown>(
    url: string,
    config?: {
      headers?: Record<string, string>;
      params?: Record<string, unknown>;
      signal?: AbortSignal;
    }
  ): Promise<{ data: T; status: number; statusText: string; headers: Record<string, string> }>;
}

export interface ClientOptions {
  /** Base URL of your API. Example: "/api/data" or "https://api.example.com/data" */
  baseUrl: string;
  /** Custom fetch function. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Axios instance (or any compatible object). If provided, takes precedence over fetch. */
  axios?: AxiosLike;
  /** Default headers for every request (auth tokens, etc.) */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string | string[];
  filters?: Record<string, unknown>;
  search?: string;
  select?: string[];
  distinct?: boolean;
  includeDeleted?: boolean;
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  meta: {
    total: number | null;
    page: number;
    pageSize: number;
    totalPages: number | null;
    nextCursor?: string | null;
    countMode?: string;
  };
  aggregations?: Record<string, number>;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  label: string;
  hidden: boolean;
  sortable: boolean;
  filterable: boolean;
  /** Whether this column is computed (SQL expression, not a real DB column) */
  computed?: boolean;
  /** Where the column comes from */
  source?: 'base' | 'join' | 'computed' | 'subquery';
  /** For join columns — which joined table this came from */
  joinTable?: string;
  format?: string;
  align?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  options?: { value: string | number | boolean; label: string; color?: string }[];
  datePresets?: string[];
  operators: string[];
}

export interface FilterMetadata {
  field: string;
  type: string;
  label: string;
  operators: string[];
  options?: { value: string | number | boolean; label: string; color?: string }[];
  datePresets?: string[];
}

export interface AggregationMetadata {
  alias: string;
  type: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field: string;
}

export interface IncludeMetadata {
  as: string;
  table: string;
  columns?: string[];
  nested?: IncludeMetadata[];
}

export interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  capabilities: {
    search: boolean;
    searchFields: string[];
    export: boolean;
    exportFormats: string[];
    pagination: {
      enabled: boolean;
      defaultPageSize: number;
      maxPageSize: number;
      cursor: boolean;
    };
    sort: {
      enabled: boolean;
      defaultSort: { field: string; order: string }[];
    };
    /** Whether queryGrouped() is available */
    groupBy: boolean;
    /** Which fields can be grouped by */
    groupByFields: string[];
    /** Whether queryRecursive() is available */
    recursive: boolean;
  };
  filters: FilterMetadata[];
  /** Aggregations returned in the response (sum, avg, count, etc.) */
  aggregations: AggregationMetadata[];
  /** Nested relations fetched via include (User → Orders → Items) */
  includes: IncludeMetadata[];
  /** Fields that are pre-filtered server-side (static filters, backend conditions) */
  staticFilters: string[];
}

export interface TableClient<T = Record<string, unknown>> {
  /** Fetch rows */
  query(params?: QueryParams): Promise<QueryResult<T>>;
  /** Fetch table metadata (columns, filters, capabilities) */
  meta(): Promise<TableMetadata>;
  /** Get row count */
  count(params?: QueryParams): Promise<number>;
  /** Export data as string */
  export(format: 'csv' | 'json', params?: QueryParams): Promise<string>;
  /** Build the URL without fetching (for debugging) */
  buildUrl(params?: QueryParams): string;
}

export interface TableCraftClient {
  /** Get a client for a specific table */
  table<T = Record<string, unknown>>(name: string): TableClient<T>;
}
