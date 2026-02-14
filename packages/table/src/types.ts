import type { ColumnDef } from "@tanstack/react-table";

// ─────────────────────────────────────────────
// Table Configuration
// ─────────────────────────────────────────────

export interface TableConfig {
  /** Enable/disable row selection checkboxes */
  enableRowSelection: boolean;
  /** Enable/disable keyboard navigation (arrow keys) */
  enableKeyboardNavigation: boolean;
  /** Enable/disable clicking a row to select it */
  enableClickRowSelect: boolean;
  /** Enable/disable pagination controls */
  enablePagination: boolean;
  /** Enable/disable search input */
  enableSearch: boolean;
  /** Enable/disable date range filter */
  enableDateFilter: boolean;
  /** Enable/disable column visibility toggle */
  enableColumnVisibility: boolean;
  /** Enable/disable export dropdown */
  enableExport: boolean;
  /** Enable/disable URL state persistence */
  enableUrlState: boolean;
  /** Enable/disable column resizing */
  enableColumnResizing: boolean;
  /** Enable/disable toolbar */
  enableToolbar: boolean;
  /** Size variant for buttons/inputs: 'sm' | 'default' | 'lg' */
  size: "sm" | "default" | "lg";
  /** Unique ID for storing column sizing in localStorage */
  columnResizingTableId?: string;
  /** Custom placeholder text for search input */
  searchPlaceholder?: string;
  /** Default sort column (should match column accessorKey) */
  defaultSortBy?: string;
  /** Default sort direction */
  defaultSortOrder?: "asc" | "desc";
  /** Default page size */
  defaultPageSize?: number;
  /** Page size options for the selector */
  pageSizeOptions?: number[];
  /** Allow exporting new columns created by transform function */
  allowExportNewColumns: boolean;
}

// ─────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────

export interface QueryParams {
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  sortOrder: "asc" | "desc";
  filters: Record<string, unknown>;
  dateRange: { from: string; to: string };
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  meta: {
    total: number | null;
    page: number;
    pageSize: number;
    totalPages: number | null;
    countMode?: 'exact' | 'estimated';
  };
}

// ─────────────────────────────────────────────
// Data Adapter — the bridge to any backend
// ─────────────────────────────────────────────

export interface DataAdapter<T = Record<string, unknown>> {
  /** Fetch data given current table params */
  query(params: QueryParams): Promise<QueryResult<T>>;
  /** Fetch items by IDs (for cross-page selection/export) */
  queryByIds?(ids: (string | number)[]): Promise<T[]>;
  /** Fetch table metadata (enables auto-column generation) */
  meta?(): Promise<TableMetadata>;
  /** Export data in a format */
  export?(format: "csv" | "json", params?: Partial<QueryParams>): Promise<string>;
}

// ─────────────────────────────────────────────
// Table Metadata (mirrors @tablecraft/client types)
// ─────────────────────────────────────────────

export interface ColumnMetadata {
  name: string;
  type: string;
  label: string;
  hidden: boolean;
  sortable: boolean;
  filterable: boolean;
  computed?: boolean;
  source?: "base" | "join" | "computed" | "subquery";
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
  type: "count" | "sum" | "avg" | "min" | "max";
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
    groupBy: boolean;
    groupByFields: string[];
    recursive: boolean;
  };
  filters: FilterMetadata[];
  aggregations: AggregationMetadata[];
  includes: IncludeMetadata[];
  staticFilters: string[];
}

// ─────────────────────────────────────────────
// Cell Renderer
// ─────────────────────────────────────────────

export interface CellRendererProps<T = unknown> {
  value: T;
  row: Record<string, unknown>;
  column: ColumnMetadataForRenderer;
}

export type CellRenderer<T = unknown> = React.ComponentType<CellRendererProps<T>>;

export interface ColumnMetadataForRenderer {
  name: string;
  type: string;
  format?: string;
  align?: string;
  options?: { value: string | number | boolean; label: string; color?: string }[];
}

// ─────────────────────────────────────────────
// Export Config
// ─────────────────────────────────────────────

export type DataTransformFunction<T> = (row: T) => Record<string, unknown>;

export interface ExportConfig<T = Record<string, unknown>> {
  entityName: string;
  columnMapping?: Record<string, string>;
  columnWidths?: Array<{ wch: number }>;
  headers?: string[];
  transformFunction?: DataTransformFunction<T>;
  enableCsv?: boolean;
  enableExcel?: boolean;
}

// ─────────────────────────────────────────────
// Main DataTable Props
// ─────────────────────────────────────────────

export interface DataTableProps<T extends Record<string, unknown>> {
  /** Data adapter — the bridge to your backend */
  adapter: DataAdapter<T>;
  /** Manual column definitions (skip auto-generation from metadata) */
  columns?: ColumnDef<T, unknown>[];
  /** Cell renderer overrides: columnType or columnName → Component */
  renderers?: Record<string, CellRenderer>;
  /** Table configuration overrides */
  config?: Partial<TableConfig>;
  /** Export configuration */
  exportConfig?: ExportConfig<T>;
  /** ID field for row tracking (default: 'id') */
  idField?: keyof T;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Custom toolbar content (rendered at the start of the toolbar) */
  startToolbarContent?: React.ReactNode | ((ctx: ToolbarContext<T>) => React.ReactNode);
  /** Custom toolbar content (rendered after built-in controls) */
  toolbarContent?: React.ReactNode;
  /** Render custom toolbar with selection context */
  renderToolbar?: (ctx: ToolbarContext<T>) => React.ReactNode;
  /** className for outer wrapper */
  className?: string;
  /** Custom page size options */
  pageSizeOptions?: number[];
}

export interface ToolbarContext<T> {
  selectedRows: T[];
  selectedIds: string[];
  totalSelected: number;
  clearSelection: () => void;
  search: string;
  setSearch: (value: string | ((prev: string) => string)) => void;
  dateRange: { from: string; to: string };
  setDateRange: (
    value:
      | { from: string; to: string }
      | ((prev: { from: string; to: string }) => { from: string; to: string })
  ) => void;
}

// ─────────────────────────────────────────────
// Exportable data type for export utils
// ─────────────────────────────────────────────

export type ExportableData = Record<string, string | number | boolean | null | undefined>;
