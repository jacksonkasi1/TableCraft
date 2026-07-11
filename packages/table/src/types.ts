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
// Row Grouping Types
// ─────────────────────────────────────────────

export type RowGroupingAggregation =
  | "sum"
  | "min"
  | "max"
  | "mean"
  | "median"
  | "unique"
  | "uniqueCount"
  | "count"
  | "extent";

/**
 * Configuration for row grouping behaviour.
 *
 * **Performance note**: this object is used as a `useMemo` dependency inside
 * `DataTable`.  If you pass it as an inline object literal the reference
 * changes on every parent render, which busts the `aggregationFns` memo and,
 * transitively, the `resolvedColumns` memo — causing all columns to
 * re-resolve on every render.  Stabilise the value with `useMemo` or define
 * it outside the component:
 *
 * ```ts
 * // Outside component or in useMemo:
 * const groupingConfig = useMemo(
 *   () => ({ defaultExpanded: true, aggregations: { salary: 'sum' } }),
 *   []
 * );
 * <DataTable rowGroupingConfig={groupingConfig} ... />
 * ```
 */
export interface RowGroupingConfig<T extends Record<string, unknown>> {
  /**
   * Start all groups expanded when the table mounts.
   * @default false
   */
  defaultExpanded?: boolean;
  /**
   * Per-column aggregate functions to display in the group-header row.
   * @example { salary: "sum", headcount: "count" }
   */
  aggregations?: Partial<Record<keyof T & string, RowGroupingAggregation>>;
  /**
   * Optional custom renderer for the group-header cell content.
   * Return null or undefined to fall back to the default "ColumnLabel: value (n rows)" format.
   */
  renderGroupCell?: (props: {
    columnId: string;
    value: unknown;
    leafRowCount: number;
  }) => ReactNode;
}

export interface OnRowGroupExpandInfo {
  /** The column ID that was grouped */
  columnId: string;
  /** The grouped value (e.g. "Engineering") */
  value: unknown;
  /** Whether the group was just expanded (true) or collapsed (false) */
  isExpanded: boolean;
  /** Zero-based depth level in a multi-level grouping */
  depth: number;
}

// ─────────────────────────────────────────────
// Grouping Imperative API (exposed via groupingRef prop)
// ─────────────────────────────────────────────

/**
 * Imperative handle exposed when you pass a `groupingRef` to `<DataTable>`.
 * Mirrors the programmatic control API from simple-table v2.1.0.
 *
 * @example
 * const ref = useRef<TableGroupingAPI>(null);
 * <DataTable groupingRef={ref} rowGrouping={["department", "team"]} ... />
 *
 * // In an event handler:
 * ref.current?.expandAll();
 * ref.current?.expandDepth(0);   // expand top-level groups only
 * ref.current?.collapseDepth(1); // collapse second-level groups
 */
export interface TableGroupingAPI {
  /** Expand all groups at all depths */
  expandAll(): void;
  /** Collapse all groups at all depths */
  collapseAll(): void;
  /**
   * Expand all group rows at a specific depth (0-indexed).
   * depth 0 = top-level groups, depth 1 = second-level groups, etc.
   */
  expandDepth(depth: number): void;
  /**
   * Collapse all group rows at a specific depth (0-indexed).
   */
  collapseDepth(depth: number): void;
  /**
   * Toggle expansion for all group rows at a specific depth.
   * If ALL groups at that depth are expanded, collapses them.
   * Otherwise, expands them all.
   */
  toggleDepth(depth: number): void;
  /**
   * Explicitly set which depths are expanded.
   * Replaces the current expansion state for group rows.
   * @example ref.current?.setExpandedDepths(new Set([0, 2])); // only depths 0 and 2
   */
  setExpandedDepths(depths: Set<number>): void;
  /**
   * Get the set of depths that currently have at least one expanded group row.
   */
  getExpandedDepths(): Set<number>;
  /**
   * Get the column accessor key that defines the grouping at a given depth.
   * @example getGroupingProperty(0) // "department"
   * @example getGroupingProperty(1) // "team"
   */
  getGroupingProperty(depth: number): string | undefined;
  /**
   * Get the depth index for a given grouping property name.
   * Returns -1 if the property is not in the rowGrouping array.
   * @example getGroupingDepth("department") // 0
   * @example getGroupingDepth("team")       // 1
   */
  getGroupingDepth(property: string): number;
}

// ─────────────────────────────────────────────
// Table Configuration
// ─────────────────────────────────────────────

export interface TableConfig {
  /** Default expanded state for rows */
  defaultExpanded?: boolean | Record<string, boolean>;
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
  /** Removes the outer border and rounded corners from the table wrapper (useful for nested sub-tables) */
  removeOuterBorder?: boolean;
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
  /**
   * Show "Expand All / Collapse All" buttons in the toolbar when rowGrouping is active.
   * @default true
   */
  enableRowGroupingControls?: boolean;
  /**
   * When true, the table keeps showing previous rows during a refetch instead
   * of swapping to the loading skeleton. Useful when the host swaps the
   * adapter to push fresh data (e.g. lazy-tree expansion) and a skeleton flash
   * would be jarring.
   * @default false
   */
  keepPreviousData?: boolean;
}

export type StartToolbarPlacement = 'before-search' | 'after-search' | 'after-date';

/**
 * Anchor positions for `endToolbarContent` (right-side toolbar cluster).
 * The anchor is a *position*, not a dependency — it still renders even if the
 * referenced built-in is disabled.  Order of built-ins on the right (when
 * enabled): grouping-controls → export → view-options → settings.
 *
 * - `'before-grouping'`  — first thing on the right (after `customToolbarContent`)
 * - `'after-grouping'`   — between grouping controls and export
 * - `'before-export'`    — same visual slot as `'after-grouping'` when grouping is hidden
 * - `'after-export'`     — between export and view-options
 * - `'before-view'`      — same as `'after-export'` when export is hidden
 * - `'after-view'`       — between view-options and settings  *(default)*
 * - `'before-settings'`  — alias of `'after-view'`
 * - `'after-settings'`   — last (rightmost) — after the settings popover
 */
export type EndToolbarPlacement =
  | 'before-grouping'
  | 'after-grouping'
  | 'before-export'
  | 'after-export'
  | 'before-view'
  | 'after-view'
  | 'before-settings'
  | 'after-settings';

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
  /**
   * Fetch data given current table params.
   *
   * The optional `options.signal` is the table's `AbortSignal` and is fired
   * whenever query params change (or the consumer unmounts). Implementations
   * SHOULD pass it through to any underlying `fetch` so stale requests are
   * cancelled. Adapters that resolve synchronously (e.g. in-memory data)
   * MAY ignore it, but must still accept the argument for type compatibility.
   */
  query(
    params: QueryParams,
    options?: { signal?: AbortSignal },
  ): Promise<QueryResult<T>>;
  /** Fetch items by IDs (for cross-page selection/export) */
  queryByIds?(ids: (string | number)[], options?: { sortBy?: string; sortOrder?: "asc" | "desc" }): Promise<T[]>;
  /** Subscribe to cache-only data revisions that should repaint without a network refetch. */
  subscribe?(listener: () => void): () => void;
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
  meta?: Record<string, unknown>;
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
  /** Expand all row groups (no-op when rowGrouping is not active) */
  expandAllGroups?: () => void;
  /** Collapse all row groups (no-op when rowGrouping is not active) */
  collapseAllGroups?: () => void;
  /** Expand all group rows at a specific depth index (0 = top-level) */
  expandDepth?: (depth: number) => void;
  /** Collapse all group rows at a specific depth index */
  collapseDepth?: (depth: number) => void;
  /** Toggle expansion for all group rows at a specific depth */
  toggleDepth?: (depth: number) => void;
  /** Get the column key at a given grouping depth index */
  getGroupingProperty?: (depth: number) => string | undefined;
  /** Get the depth index of a given column key (-1 if not grouped by it) */
  getGroupingDepth?: (property: string) => number;
  /** True when rowGrouping prop is non-empty */
  isRowGroupingActive?: boolean;
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
  meta?: Record<string, unknown>;
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
   * Independent from removeHeaders — you can rename any column.
   * @example { createdAt: 'Order Date', vatAmount: 'VAT (₹)' }
   */
  columnMapping?: Partial<Record<KnownStringKeys<T>, string>>;
  /** Column widths for Excel export (matched by index with headers) */
  columnWidths?: Array<{ wch: number }>;
  /**
   * Columns to exclude from the export. All other visible columns are included.
   * Much simpler than listing every column you want — just hide 1-2 you don't need.
   * @example ['deletedAt', 'tenantId']
   */
  removeHeaders?: Array<KnownStringKeys<T>>;
  /**
   * Transform each row before exporting.
   * Use this to format values (e.g. boolean → "Yes"/"No", date formatting).
   */
  transformFunction?: DataTransformFunction<T>;
  /** Enable CSV export option (default: true) */
  enableCsv?: boolean;
  /** Enable Excel/XLSX export option (default: true) */
  enableExcel?: boolean;
}

/**
 * Helper for type-safe export config with full autocomplete.
 *
 * @example
 * const exportConfig = defineExportConfig<OrdersRow>()({
 *   entityName: 'orders',
 *   removeHeaders: ['deletedAt', 'tenantId'],
 *   columnMapping: { createdAt: 'Order Date' },
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
  /** Function to render the expanded sub-row content */
  renderSubRow?: (props: { row: T; table: TableContext<T> }) => React.ReactNode;
  /** Allow developers to control exactly WHICH rows can expand (Optional, defaults to all if renderSubRow is provided) */
  getRowCanExpand?: (row: T) => boolean;
  /**
   * Returns child rows for a given row — enables tree/hierarchical data.
   * The table renders children inline with depth-based indentation.
   * @example getSubRows={(row) => row.children as T[]}
   */
  getSubRows?: (row: T) => T[] | undefined;
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
    * // Including system columns (expand, select checkbox, actions):
    * defaultColumnOrder={defaultColumnOrder<OrdersColumn>(['__expand', 'select', 'status', 'email', '__actions'])}
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
  /**
   * Custom toolbar content — injected into the right toolbar area without
   * disturbing the position of any built-in control.
   * Use `endToolbarPlacement` to choose which slot to render into.
   *
   * Receives the same `ToolbarContext` as `startToolbarContent` when passed
   * as a function, so you can read selection / search / date-range state.
   *
   * @example
   * <DataTable
   *   endToolbarContent={(ctx) => (
   *     <Button onClick={() => doSomething(ctx.selectedIds)}>
   *       Bulk action ({ctx.totalSelected})
   *     </Button>
   *   )}
   *   endToolbarPlacement="before-export"
   * />
   */
  endToolbarContent?: React.ReactNode | ((ctx: ToolbarContext<T>) => React.ReactNode);
  /**
   * Where to inject `endToolbarContent` on the right side. See
   * {@link EndToolbarPlacement} for available slots.
   * @default 'after-view'
   */
  endToolbarPlacement?: EndToolbarPlacement;
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
  /**
   * Column IDs to group flat data by — creates collapsible group-header rows.
   * First element = outermost group, last element = innermost group.
   * @example rowGrouping={["department", "team"]}
   */
  rowGrouping?: (keyof T & string)[];

  /**
   * Fine-grained configuration for row grouping behaviour.
   * Only relevant when `rowGrouping` is set.
   */
  rowGroupingConfig?: RowGroupingConfig<T>;

  /**
   * Callback fired when a group row is expanded or collapsed.
   */
  onRowGroupExpand?: (info: OnRowGroupExpandInfo) => void;
  /**
   * Callback fired when a tree (non-grouped) sub-row is expanded or collapsed.
   * Use this to lazy-load children when a row is first expanded.
   *
   * @example
   * onRowExpand={({ row, isExpanded }) => {
   *   if (isExpanded && row.children === undefined) fetchChildren(row.id);
   * }}
   */
  onRowExpand?: (info: {
    row: T;
    rowId: string;
    depth: number;
    isExpanded: boolean;
  }) => void;
  /**
   * Imperative ref that exposes programmatic grouping controls.
   * Attach this to a `useRef<TableGroupingAPI>()` to call methods like
   * `expandAll()`, `expandDepth(0)`, `collapseDepth(1)`, `toggleDepth(n)`, etc.
   *
   * @example
   * const groupRef = useRef<TableGroupingAPI>(null);
   * <DataTable groupingRef={groupRef} rowGrouping={["department"]} ... />
   * // Then: groupRef.current?.expandDepth(0);
   */
  groupingRef?: React.RefObject<TableGroupingAPI | null>;
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
