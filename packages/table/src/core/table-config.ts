import type { TableConfig } from "../types";

/**
 * Default table configuration.
 */
const defaultConfig: TableConfig = {
  enableRowSelection: true,
  enableKeyboardNavigation: false,
  enableClickRowSelect: false,
  enablePagination: true,
  enableSearch: true,
  enableDateFilter: true,
  enableColumnVisibility: true,
  enableExport: true,
  enableUrlState: true,
  enableColumnResizing: true,
  enableToolbar: true,
  size: "default",
  columnResizingTableId: undefined,
  searchPlaceholder: undefined,
  defaultSortBy: undefined,
  defaultSortOrder: "desc",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 30, 40, 50],
  allowExportNewColumns: true,
};

/**
 * Hook to provide table configuration.
 * Merges defaults with overrides.
 */
export function useTableConfig(
  overrideConfig?: Partial<TableConfig>
): TableConfig {
  return { ...defaultConfig, ...overrideConfig };
}

export { defaultConfig };