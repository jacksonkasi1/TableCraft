export interface ColumnMeta {
  name: string;
  type: string;
  label: string;
  hidden: boolean;
  sortable: boolean;
  filterable: boolean;
  computed?: boolean;
  source?: 'base' | 'join' | 'computed' | 'subquery';
  options?: Array<{ value: string | number | boolean; label: string }>;
  operators: string[];
}

export interface FilterMeta {
  field: string;
  type: string;
  label: string;
  operators: string[];
  options?: Array<{ value: string | number | boolean; label: string }>;
}

export interface TableMetadata {
  name: string;
  dateRangeColumn: string | null;
  dateColumns: string[];
  columns: ColumnMeta[];
  filters: FilterMeta[];
  staticFilters: string[];
}

export interface CodegenOptions {
  url: string;
  outputDir: string;
  prefix?: string;
  headers?: Record<string, string>;
  tables?: string[];
}

export interface GeneratedFile {
  filename: string;
  content: string;
}

export interface GeneratedTable {
  tableName: string;
  filename: string;
  rowType: string;
  filtersType: string;
  columnType: string;
  adapterFunction: string;
  content: string;
}