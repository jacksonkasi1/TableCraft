import type { ColumnDef, RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    isLoadingColumns?: boolean;
  }
}

// ─────────────────────────────────────────────
// Type-safe Column Helper
// ─────────────────────────────────────────────

/**
 * Use this with generated *Column types for type-safe hiddenColumns.
 * @example
 * import type { ProductsColumn } from './generated/products';
 *
 * <DataTable
 *   hiddenColumns={hiddenColumns<ProductsColumn>(['id', 'metadata'])}
 * />
 */
export function hiddenColumns<C extends string>(columns: C[]): C[] {
  return columns;
}

/**
 * Use this with generated *Column types for type-safe defaultColumnOrder.
 * Mirrors the `hiddenColumns` helper — fix `C` to your generated column union type
 * to get full autocomplete and compile-time safety.
 *
 * @example
 * import type { OrdersColumn } from './generated/orders';
 * import { defaultColumnOrder } from '@tablecraft/table';
 *
 * <DataTable
 *   defaultColumnOrder={defaultColumnOrder<OrdersColumn>(['status', 'email', 'total', 'createdAt'])}
 * />
 */
export function defaultColumnOrder<C extends string>(columns: C[]): C[] {
  return columns;
}

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

export type StartToolbarPlacement = 'before-search' | 'after-search' | 'after-date';

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
  queryByIds?(ids: (string | number)[], options?: { sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<T[]>;
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
  dateRangeColumn?: string | null;
  dateColumns?: string[];
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
// Table Context — shared by columnOverrides & actions
// ─────────────────────────────────────────────

/**
 * Rich context object passed to columnOverrides and actions render functions.
 * Gives access to selection state, search, date range, and current page data.
 */
export interface TableContext<T> {
  /** Rows selected on the current page (and cross-page if queryByIds was used) */
  selectedRows: T[];
  /** IDs of all selected rows (string keys from idField) */
  selectedIds: string[];
  /** Total number of selected rows */
  totalSelected: number;
  /** Current search query string */
  search: string;
  /** Current date range filter */
  dateRange: { from: string; to: string };
  /** All rows on the current page */
  allData: T[];
}

// ─────────────────────────────────────────────
// Column Overrides — type-safe per-column renderers
// ─────────────────────────────────────────────

/**
 * Type-safe map of column rendering overrides.
 *
 * Keys are constrained to `keyof T` — TypeScript will error on non-existent column names.
 * Use `defineColumnOverrides<T>()` for full per-key value type inference at the call site.
 *
 * @example
 * // With helper — value is precisely typed per column:
 * columnOverrides={defineColumnOverrides<ProductsRow>()({
 *   price: ({ value }) => <span>${value.toFixed(2)}</span>,  // value: number ✓
 *   name:  ({ value }) => <strong>{value}</strong>,          // value: string ✓
 * })}
 *
 * // Inline — value is `unknown`, use Number()/String() etc:
 * columnOverrides={{ price: ({ value }) => <span>{Number(value).toFixed(2)}</span> }}
 */
export type ColumnOverrides<T> = {
  [K in keyof T]?: (ctx: {
    /** The column value — use defineColumnOverrides<T>() for precise per-key typing */
    value: unknown;
    /** The full row data, typed as T */
    row: T;
    /** Table context: selection, search, all current page data */
    table: TableContext<T>;
  }) => ReactNode;
};

/**
 * Helper function for type-safe column overrides with full per-key value inference.
 *
 * TypeScript's variance rules require `value: unknown` in the stored `ColumnOverrides<T>` type.
 * This curried identity function infers `value` as `T[K]` for each key at the call site,
 * then widens the result to `ColumnOverrides<T>` — giving you precise types while writing,
 * without the variance error.
 *
 * Pattern: `defineColumnOverrides<T>()({ ... })` — the double-call is intentional:
 * the first call fixes `T`, the second call infers each key's value type.
 *
 * @example
 * columnOverrides={defineColumnOverrides<ProductsRow>()({
 *   price:      ({ value }) => <span>${value.toFixed(2)}</span>,  // value: number ✓
 *   name:       ({ value }) => <strong>{value.toUpperCase()}</strong>, // value: string ✓
 *   isArchived: ({ value }) => <Badge>{value ? 'Yes' : 'No'}</Badge>,  // value: boolean ✓
 * })}
 */
export function defineColumnOverrides<T>() {
  return function <K extends keyof T>(
    overrides: {
      [P in K]?: (ctx: {
        value: T[P];
        row: T;
        table: TableContext<T>;
      }) => ReactNode;
    }
  ): ColumnOverrides<T> {
    return overrides as ColumnOverrides<T>;
  };
}


// Actions Column — optional last column
// ─────────────────────────────────────────────

/**
 * Render function for the optional "Actions" column (last column in the table).
 * Receives the current row and full table context.
 *
 * @example
 * actions={({ row, table }) => (
 *   <DropdownMenu>
 *     <DropdownMenuTrigger asChild>
 *       <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
 *     </DropdownMenuTrigger>
 *     <DropdownMenuContent align="end">
 *       <DropdownMenuItem onClick={() => edit(row.id)}>Edit</DropdownMenuItem>
 *       <DropdownMenuItem>Selected: {table.totalSelected}</DropdownMenuItem>
 *     </DropdownMenuContent>
 *   </DropdownMenu>
 * )}
 */
export type ActionsRender<T> = (ctx: {
  /** The full row data, typed as T */
  row: T;
  /** Table context: selection, search, all current page data */
  table: TableContext<T>;
}) => ReactNode;

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

/**
 * Extracts only the explicitly declared string keys from a type,
 * stripping any index signature (e.g. from `Record<string, unknown>`).
 * This enables proper autocomplete even when T extends Record<string, unknown>.
 */
type KnownStringKeys<T> = Extract<
  keyof { [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K] },
  string
>;

export interface ExportConfig<T = Record<string, unknown>> {
  /** Display name used in filenames and toast messages (e.g. "orders") */
  entityName: string;
  /**
   * Map column keys to human-readable header names for the export file.
   * Keys are type-safe — only valid column names from T are accepted.
   * @example { createdAt: 'Order Date', vatAmount: 'VAT (₹)' }
   */
  columnMapping?: Partial<Record<KnownStringKeys<T>, string>>;
  /** Column widths for Excel export (matched by index with headers) */
  columnWidths?: Array<{ wch: number }>;
  /**
   * Columns to include in the export. Only these columns will appear in the file.
   * Type-safe — only valid column names from T are accepted.
   * If omitted, all visible columns are exported.
   * @example ['id', 'status', 'email', 'total']
   */
  headers?: Array<KnownStringKeys<T>>;
  /**
   * Transform each row before exporting.
   * Use this to format values (e.g. boolean → "Yes"/"No", date formatting).
   * Can also add computed columns (requires `allowExportNewColumns: true`).
   */
  transformFunction?: DataTransformFunction<T>;
  /** Enable CSV export option (default: true) */
  enableCsv?: boolean;
  /** Enable Excel/XLSX export option (default: true) */
  enableExcel?: boolean;
}

/**
 * Helper function for type-safe export configuration with full autocomplete.
 *
 * Similar to `defineColumnOverrides<T>()` — the double-call pattern
 * fixes `T` first, then infers column keys for headers and columnMapping.
 *
 * @example
 * import { defineExportConfig } from '@tablecraft/table';
 * import type { OrdersRow } from './generated/orders';
 *
 * const exportConfig = defineExportConfig<OrdersRow>()({
 *   entityName: 'orders',
 *   headers: ['id', 'status', 'email', 'total', 'createdAt'],
 *   columnMapping: { createdAt: 'Order Date', vatAmount: 'VAT (₹)' },
 *   transformFunction: (row) => ({
 *     ...row,
 *     createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '',
 *   }),
 * });
 */
export function defineExportConfig<T>() {
  return function (
    config: ExportConfig<T>
  ): ExportConfig<T> {
    return config;
  };
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
  /**
   * Columns to hide from the table UI.
   * Data is still received from the API - just not displayed.
   * @example hiddenColumns={['id', 'tenantId', 'metadata']}
   */
  hiddenColumns?: string[];
  /**
   * Default column order (array of column IDs).
   * Applied on first mount when no saved order exists in localStorage.
   * When the user clicks "Reset Column Order", the table resets to this order
   * instead of the natural column definition order.
   *
    * Use the `defaultColumnOrder<C>()` helper with your generated `*Column` type
    * for full autocomplete and compile-time safety — mirrors the `hiddenColumns` helper.
    *
    * @example
    * import type { OrdersColumn } from './generated/orders';
    * import { defaultColumnOrder } from '@tablecraft/table';
    *
    * // Type-safe with generated column union — full autocomplete:
    * defaultColumnOrder={defaultColumnOrder<OrdersColumn>(['status', 'email', 'total', 'createdAt'])}
    *
    * // Including system columns (select checkbox, actions):
    * defaultColumnOrder={defaultColumnOrder<OrdersColumn>(['select', 'status', 'email', '__actions'])}
    */
  defaultColumnOrder?: string[];
  /**
   * Custom toolbar content — injected into the left toolbar area.
   * Use `startToolbarPlacement` to control where it renders (default: `'after-date'`).
   */
  startToolbarContent?: React.ReactNode | ((ctx: ToolbarContext<T>) => React.ReactNode);
  /**
   * Controls where `startToolbarContent` is rendered in the left toolbar area.
   * - `'before-search'` — before the search input
   * - `'after-search'`  — after search, before the date filter. 
   *                       NOTE: If `enableSearch` is false, this renders in the same visual position as `'before-search'`.
   * - `'after-date'`    — after the date filter (default)
   * @default 'after-date'
   */
  startToolbarPlacement?: StartToolbarPlacement;
  /** Custom toolbar content (rendered after built-in controls) */
  toolbarContent?: React.ReactNode;
  /** Render custom toolbar with selection context */
  renderToolbar?: (ctx: ToolbarContext<T>) => React.ReactNode;
  /** className for outer wrapper */
  className?: string;
  /** Custom page size options */
  pageSizeOptions?: number[];
  /**
   * Type-safe per-column rendering overrides.
   * Keys must be valid column names from T — TypeScript errors on non-existent keys.
   * Each override receives { value, row, table } where value is typed to the column's type.
   *
   * @example
   * columnOverrides={{
   *   price: ({ value, row }) => <span>${value.toFixed(2)}</span>,
   *   status: ({ value, table }) => <Badge>{value} ({table.totalSelected} selected)</Badge>,
   * }}
   */
  columnOverrides?: ColumnOverrides<T>;
  /**
   * Adds a fixed "Actions" column as the last column in the table.
   * Receives { row, table } — row is typed as T, table has selection/search context.
   * By default the column is not shown; it only appears when this prop is provided.
   *
   * @example
   * actions={({ row, table }) => (
   *   <DropdownMenu>
   *     <DropdownMenuTrigger asChild>
   *       <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
   *     </DropdownMenuTrigger>
   *     <DropdownMenuContent align="end">
   *       <DropdownMenuItem onClick={() => handleEdit(row.id)}>Edit</DropdownMenuItem>
   *     </DropdownMenuContent>
   *   </DropdownMenu>
   * )}
   */
  actions?: ActionsRender<T>;
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
