import { Operator, TableConfig } from './table';

// --- Request Params ---

export interface FilterParam {
  operator: Operator;
  value: unknown;
}

export interface SortParam {
  field: string;
  order: 'asc' | 'desc';
}

export interface EngineParams {
  filters?: Record<string, FilterParam>;
  search?: string;
  sort?: SortParam[];
  page?: number;
  pageSize?: number;
  /** Cursor for cursor-based pagination */
  cursor?: string;
  /** Select specific fields: ?select=id,name,email */
  select?: string[];
  /** DISTINCT query */
  distinct?: boolean;
  export?: 'csv' | 'json';
  includeDeleted?: boolean;
}

// --- Response ---

export interface EngineMeta {
  total: number | null; // null when count is skipped
  page: number;
  pageSize: number;
  totalPages: number | null;
  /** Cursor for next page (cursor-based pagination) */
  nextCursor?: string | null;
  /** Whether count is exact or estimated */
  countMode?: 'exact' | 'estimated' | 'none';
}

export interface EngineResult<T = Record<string, unknown>> {
  data: T[];
  meta: EngineMeta;
  aggregations?: Record<string, number>;
}

export interface GroupedResult {
  data: Record<string, unknown>[];
  meta: { total: number };
  aggregations: Record<string, number>;
}

// --- Context ---

export interface EngineContext {
  tenantId?: string | number;
  user?: {
    id: string | number;
    roles?: string[];
    permissions?: string[];
  };
  [key: string]: unknown;
}

// --- Hooks ---

export interface EngineHooks {
  /** Called before building the query. Can modify params. */
  beforeQuery?: (params: EngineParams, context: EngineContext) => EngineParams | Promise<EngineParams>;
  /** Called after query execution, before formatting. Can modify raw data. */
  afterQuery?: (data: Record<string, unknown>[], params: EngineParams, context: EngineContext) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>;
  /** Called on any error. Can transform or rethrow. */
  onError?: (error: Error, params: EngineParams, context: EngineContext) => Error | Promise<Error>;
}

// --- Debug ---

export interface QueryDebugInfo {
  sql: string;
  params: unknown[];
  duration: number;
  timestamp: number;
}

import { TableMetadata } from '../core/metadataBuilder';

// --- Count Mode ---

export type CountMode = 'exact' | 'estimated' | 'none';

// --- Engine Interface ---

export interface TableEngine {
  query(params?: EngineParams, context?: EngineContext): Promise<EngineResult>;
  queryGrouped(params?: EngineParams, context?: EngineContext): Promise<GroupedResult>;
  queryRecursive(params?: EngineParams, context?: EngineContext): Promise<EngineResult>;
  count(params?: EngineParams, context?: EngineContext): Promise<number>;
  exportData(params?: EngineParams, context?: EngineContext): Promise<string>;
  /** Returns the built SQL without executing — for debugging */
  explain(params?: EngineParams, context?: EngineContext): Promise<QueryDebugInfo>;
  getMetadata(context?: EngineContext): TableMetadata;
  getConfig(): TableConfig;
}

// --- Factory Options ---

export interface EngineOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: TableConfig[] | Record<string, TableConfig>;
}
