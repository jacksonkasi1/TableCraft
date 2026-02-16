// ─── Main Component ───
export { DataTable } from "./data-table";

// ─── UI Components ───
export { DataTableColumnHeader } from "./column-header";
export { DataTablePagination } from "./pagination";
export { DataTableToolbar } from "./toolbar";
export { DataTableViewOptions } from "./view-options";
export { DataTableExport } from "./export";
export { DataTableResizer } from "./resizer";
export { ExpandIcon } from "./expand-icon";

// ─── Adapters ───
export { createTableCraftAdapter } from "./auto/tablecraft-adapter";
export type { TableCraftAdapterOptions } from "./auto/tablecraft-adapter";
export { createRestAdapter } from "./auto/rest-adapter";
export type { RestAdapterOptions } from "./auto/rest-adapter";
export { createStaticAdapter } from "./auto/static-adapter";
export type { StaticAdapterOptions } from "./auto/static-adapter";

// ─── Auto-generation ───
export { generateColumns } from "./auto/auto-columns";
export { generateFilterConfig } from "./auto/auto-filters";
export type { FilterConfig } from "./auto/auto-filters";
export { useAutoColumns } from "./auto/use-auto-columns";

// ─── Core Hooks ───
export { useTableData } from "./core/use-table-data";
export type { UseTableDataReturn } from "./core/use-table-data";
export { useUrlState } from "./core/use-url-state";
export { useTableConfig, defaultConfig } from "./core/table-config";
export { useTableColumnResize } from "./core/use-column-resize";
export { createConditionalStateHook } from "./core/use-conditional-state";

// ─── Cell Renderers ───
export {
  resolveRenderer,
  defaultRenderers,
  TextRenderer,
  NumberRenderer,
  DateRenderer,
  BooleanRenderer,
  BadgeRenderer,
  LinkRenderer,
  ImageRenderer,
  ProgressRenderer,
  TagsRenderer,
  ActionsRenderer,
} from "./renderers";

// ─── Utilities ───
export { cn } from "./utils/cn";
export { preprocessSearch } from "./utils/search";
export { isDeepEqual, debounce, resetUrlState } from "./utils/deep-utils";
export { exportToCSV, exportToExcel, exportData } from "./utils/export-utils";
export { formatDate, validateDateString, parseDateFromUrl } from "./utils/date-format";
export {
  extractDefaultColumnSizes,
  initializeColumnSizes,
  trackColumnResizing,
  cleanupColumnResizing,
} from "./utils/column-sizing";
export { createKeyboardNavigationHandler } from "./utils/keyboard-navigation";
export { hiddenColumns } from "./types";

// ─── Types ───
export type {
  TableConfig,
  QueryParams,
  QueryResult,
  DataAdapter,
  ColumnMetadata,
  FilterMetadata,
  AggregationMetadata,
  IncludeMetadata,
  TableMetadata,
  CellRendererProps,
  CellRenderer,
  ColumnMetadataForRenderer,
  ExportableData,
  DataTransformFunction,
  ExportConfig,
  DataTableProps,
  ToolbarContext,
} from "./types";