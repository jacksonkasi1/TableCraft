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
  export?: 'csv' | 'json';
  includeDeleted?: boolean;
}

// --- Response ---

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

// --- Context (injected per-request) ---

export interface EngineContext {
  tenantId?: string | number;
  user?: {
    id: string | number;
    roles?: string[];
    permissions?: string[];
  };
  [key: string]: unknown;
}

// --- Factory Options ---

export interface EngineOptions {
  db: unknown;
  schema: Record<string, unknown>;
  configs: TableConfig[] | Record<string, TableConfig>;
}

// --- Engine Interface ---

export interface TableEngine {
  query(params?: EngineParams, context?: EngineContext): Promise<EngineResult>;
  count(params?: EngineParams, context?: EngineContext): Promise<number>;
  exportData(params: EngineParams, context?: EngineContext): Promise<string>;
  getConfig(): TableConfig;
}
