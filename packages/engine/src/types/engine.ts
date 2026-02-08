import { Operator, TableConfig } from './table';

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
  export?: 'csv' | 'json';
  includeDeleted?: boolean;
}

export interface EngineMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EngineResult<T = Record<string, unknown>> {
  data: T[];
  meta: EngineMeta;
  aggregations?: Record<string, number>;
}

/** Result shape for grouped queries (GROUP BY) */
export interface GroupedResult {
  data: Record<string, unknown>[];
  meta: { total: number };
  aggregations: Record<string, number>;
}

export interface EngineContext {
  tenantId?: string | number;
  user?: {
    id: string | number;
    roles?: string[];
    permissions?: string[];
  };
  [key: string]: unknown;
}

export interface EngineOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: TableConfig[] | Record<string, TableConfig>;
}

export interface TableEngine {
  query(params?: EngineParams, context?: EngineContext): Promise<EngineResult>;
  queryGrouped(params?: EngineParams, context?: EngineContext): Promise<GroupedResult>;
  queryRecursive(params?: EngineParams, context?: EngineContext): Promise<EngineResult>;
  count(params?: EngineParams, context?: EngineContext): Promise<number>;
  exportData(params?: EngineParams, context?: EngineContext): Promise<string>;
  getConfig(): TableConfig;
}
