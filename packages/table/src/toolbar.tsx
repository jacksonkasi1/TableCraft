import type { Table } from "@tanstack/react-table";
import { useEffect, useState, useRef, useCallback } from "react";
import { X, Settings, Undo2, CheckSquare, MoveHorizontal, EyeOff } from "lucide-react";
import type { TableConfig, ExportConfig, ExportableData } from "./types";
import { DataTableViewOptions } from "./view-options";
import { DataTableExport } from "./export";
import { resetUrlState } from "./utils/deep-utils";
import { cn } from "./utils/cn";

const getInputSizeClass = (size: "sm" | "default" | "lg") => {
  switch (size) {
    case "sm": return "h-8";
    case "lg": return "h-11";
    default: return "h-9";
  }
};

const getButtonSizeClass = (size: "sm" | "default" | "lg", isIcon = false) => {
  if (isIcon) {
    switch (size) {
      case "sm": return "h-8 w-8";
      case "lg": return "h-11 w-11";
      default: return "h-9 w-9";
    }
  }
  switch (size) {
    case "sm": return "h-8 px-3";
    case "lg": return "h-11 px-5";
    default: return "h-9 px-4";
  }
};

interface DataTableToolbarProps<TData extends ExportableData> {
  table: Table<TData>;
  search: string;
  dateRange: { from: string; to: string };
  setSearch: (value: string | ((prev: string) => string)) => void;
  setDateRange: (
    value:
      | { from: string; to: string }
      | ((prev: { from: string; to: string }) => { from: string; to: string })
  ) => void;
  totalSelectedItems: number;
  clearSelection: () => void;
  getSelectedItems?: () => Promise<TData[]>;
  getAllItems: () => TData[];
  config: TableConfig;
  exportConfig?: ExportConfig<TData>;
  resetColumnSizing?: () => void;
  resetColumnOrder?: () => void;
  columnMapping?: Record<string, string>;
  customToolbarContent?: React.ReactNode;
}

export function DataTableToolbar<TData extends ExportableData>({
  table,
  search,
  dateRange,
  setSearch,
  setDateRange,
  totalSelectedItems,
  clearSelection,
  getSelectedItems,
  getAllItems,
  config,
  exportConfig,
  resetColumnSizing,
  resetColumnOrder,
  columnMapping,
  customToolbarContent,
}: DataTableToolbarProps<TData>) {
  const entityName = exportConfig?.entityName || "items";

  // Local debounced search
  const [localSearch, setLocalSearch] = useState(search);
  const isLocallyUpdating = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLocallyUpdating.current) return;
    if (search !== localSearch) setLocalSearch(search);
  }, [search, localSearch]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    isLocallyUpdating.current = true;
    setLocalSearch(value);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(() => {
      setSearch(value.trim());
      searchTimerRef.current = null;
      setTimeout(() => {
        isLocallyUpdating.current = false;
      }, 100);
    }, 500);
  };

  // Date filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setDateFrom(dateRange.from);
    setDateTo(dateRange.to);
  }, [dateRange.from, dateRange.to]);

  const handleDateChange = useCallback(() => {
    setDateRange({ from: dateFrom, to: dateTo });
  }, [dateFrom, dateTo, setDateRange]);

  const datesModified = !!dateRange.from || !!dateRange.to;
  const tableFiltered = table.getState().columnFilters.length > 0;
  const isFiltered = tableFiltered || !!localSearch || datesModified;

  // Settings popover
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleResetFilters = () => {
    table.resetColumnFilters();
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    isLocallyUpdating.current = false;
    setLocalSearch("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setDateRange({ from: "", to: "" });
    if (config.enableUrlState) resetUrlState();
  };

  const allItems = getAllItems();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {config.enableSearch && (
          <input
            placeholder={config.searchPlaceholder || `Search ${entityName}...`}
            value={localSearch}
            onChange={handleSearchChange}
            className={cn(
              "w-[150px] lg:w-[250px] rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              getInputSizeClass(config.size)
            )}
          />
        )}

        {config.enableDateFilter && (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onBlur={handleDateChange}
              className={cn(
                "rounded-md border border-input bg-background px-2 text-sm",
                getInputSizeClass(config.size)
              )}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onBlur={handleDateChange}
              className={cn(
                "rounded-md border border-input bg-background px-2 text-sm",
                getInputSizeClass(config.size)
              )}
            />
          </div>
        )}

        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className={cn(
              getButtonSizeClass(config.size),
              "inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer"
            )}
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {customToolbarContent}

        {config.enableExport && (
          <DataTableExport
            table={table}
            data={allItems}
            selectedCount={totalSelectedItems}
            getSelectedItems={getSelectedItems}
            exportConfig={exportConfig as ExportConfig<ExportableData>}
            tableConfig={config}
          />
        )}

        {config.enableColumnVisibility && (
          <DataTableViewOptions
            table={table}
            columnMapping={columnMapping}
            size={config.size}
          />
        )}

        {/* Settings */}
        <div className="relative">
          <button
            className={cn(
              getButtonSizeClass(config.size, true),
              "inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
            )}
            title="Table Settings"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <Settings className="h-4 w-4" />
          </button>

          {settingsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSettingsOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-md border bg-popover p-4 shadow-md">
                <div className="space-y-2 mb-3">
                  <h4 className="font-medium leading-none">Table Settings</h4>
                </div>
                <div className="grid gap-2">
                  {config.enableColumnResizing && resetColumnSizing && (
                    <button
                      className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        resetColumnSizing();
                        setSettingsOpen(false);
                      }}
                    >
                      <Undo2 className="mr-2 h-4 w-4" />
                      Reset Column Sizes
                    </button>
                  )}
                  {resetColumnOrder && (
                    <button
                      className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        resetColumnOrder();
                        setSettingsOpen(false);
                      }}
                    >
                      <MoveHorizontal className="mr-2 h-4 w-4" />
                      Reset Column Order
                    </button>
                  )}
                  {config.enableRowSelection && (
                    <button
                      className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        table.resetRowSelection();
                        clearSelection();
                        setSettingsOpen(false);
                      }}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Clear Selection
                    </button>
                  )}
                  {!table.getIsAllColumnsVisible() && (
                    <button
                      className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => {
                        table.resetColumnVisibility();
                        setSettingsOpen(false);
                      }}
                    >
                      <EyeOff className="mr-2 h-4 w-4" />
                      Show All Columns
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}