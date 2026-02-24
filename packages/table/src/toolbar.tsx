import type { Table } from "@tanstack/react-table";
import { useEffect, useState, useRef } from "react";
import { X, Settings, Undo2, CheckSquare, MoveHorizontal, EyeOff, Search } from "lucide-react";
import type { TableConfig, ExportConfig, ExportableData, StartToolbarPlacement } from "./types";
import { DataTableViewOptions } from "./view-options";
import { DataTableExport } from "./export";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/popover";
import { CalendarDatePicker } from "./components/calendar-date-picker";
import { resetUrlState } from "./utils/deep-utils";
import { cn } from "./utils/cn";

const getInputSizeClass = (size: "sm" | "default" | "lg") => {
  switch (size) {
    case "sm": return "h-8";
    case "lg": return "h-10";
    default: return "h-9";
  }
};

const getButtonSizeClass = (size: "sm" | "default" | "lg", isIcon = false) => {
  if (isIcon) {
    switch (size) {
      case "sm": return "h-8 w-8 p-0";
      case "lg": return "h-10 w-10 p-0";
      default: return "h-9 w-9 p-0";
    }
  }
  switch (size) {
    case "sm": return "h-8 px-3";
    case "lg": return "h-10 px-4";
    default: return "h-9 px-3";
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
  exportConfig?: ExportConfig<TData, string>;
  resetColumnSizing?: () => void;
  resetColumnOrder?: () => void;
  columnMapping?: Record<string, string>;
  customToolbarContent?: React.ReactNode;
  startToolbarContent?: React.ReactNode;
  /**
   * Controls where `startToolbarContent` is rendered in the left toolbar area.
   * - `'before-search'` — before the search input
   * - `'after-search'`  — after search, before the date filter. 
   *                       NOTE: If `enableSearch` is false, this renders in the same visual position as `'before-search'`.
   * - `'after-date'`    — after the date filter (default)
   * @default 'after-date'
   */
  startToolbarPlacement?: StartToolbarPlacement;
  hiddenColumns?: string[];
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
  startToolbarContent,
  startToolbarPlacement = 'after-date',
  hiddenColumns,
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
  const parseDateFromUrl = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };

  const [dates, setDates] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: parseDateFromUrl(dateRange.from),
    to: parseDateFromUrl(dateRange.to),
  });

  useEffect(() => {
    setDates({
      from: parseDateFromUrl(dateRange.from),
      to: parseDateFromUrl(dateRange.to),
    });
  }, [dateRange.from, dateRange.to]);

  const datesModified = !!dateRange.from || !!dateRange.to;
  const tableFiltered = table.getState().columnFilters.length > 0;
  const isFiltered = tableFiltered || !!localSearch || datesModified;

  const handleResetFilters = () => {
    table.resetColumnFilters();
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    isLocallyUpdating.current = false;
    setLocalSearch("");
    setSearch("");
    setDates({ from: undefined, to: undefined });
    setDateRange({ from: "", to: "" });
    if (config.enableUrlState) resetUrlState();
  };

  const allItems = getAllItems();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          {startToolbarPlacement === 'before-search' && startToolbarContent}

          {config.enableSearch && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder={config.searchPlaceholder || `Search ${entityName}...`}
                value={localSearch}
                onChange={handleSearchChange}
                className={cn(
                  "w-[150px] lg:w-[250px] rounded-md border border-input bg-background pl-9 pr-3 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "transition-colors",
                  getInputSizeClass(config.size)
                )}
              />
            </div>
          )}

          {startToolbarPlacement === 'after-search' && startToolbarContent}

          {config.enableDateFilter && (
            <CalendarDatePicker
              date={{
                from: dates.from,
                to: dates.to,
              }}
              onDateSelect={(range) => {
                setDates({ from: range.from, to: range.to });
                setDateRange({
                  from: range.from.toISOString(),
                  to: range.to.toISOString(),
                });
              }}
              variant="outline"
              className={getInputSizeClass(config.size)}
            />
          )}

          {startToolbarPlacement === 'after-date' && startToolbarContent}
        </div>

        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className={cn(
              getButtonSizeClass(config.size),
              "inline-flex items-center justify-center rounded-md text-sm font-medium",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "cursor-pointer"
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
            exportConfig={exportConfig}
            tableConfig={config}
          />
        )}

        {config.enableColumnVisibility && (
          <DataTableViewOptions
            table={table}
            columnMapping={columnMapping}
            size={config.size}
            hiddenColumns={hiddenColumns}
            onResetColumnOrder={resetColumnOrder}
          />
        )}

        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                getButtonSizeClass(config.size, true),
                "inline-flex items-center justify-center rounded-md border border-input bg-background",
                "hover:bg-accent hover:text-accent-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "cursor-pointer"
              )}
              title="Table Settings"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Open table settings</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-60" align="end">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Table Settings</h4>
              </div>

              <div className="grid gap-2">
                {config.enableColumnResizing && resetColumnSizing && (
                  <button
                    className={cn(
                      "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                      getButtonSizeClass(config.size),
                      "justify-start w-full"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      resetColumnSizing();
                    }}
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Reset Column Sizes
                  </button>
                )}
                {resetColumnOrder && (
                  <button
                    className={cn(
                      "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                      getButtonSizeClass(config.size),
                      "justify-start w-full"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      resetColumnOrder();
                    }}
                  >
                    <MoveHorizontal className="mr-2 h-4 w-4" />
                    Reset Column Order
                  </button>
                )}
                {config.enableRowSelection && (
                  <button
                    className={cn(
                      "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                      getButtonSizeClass(config.size),
                      "justify-start w-full"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      table.resetRowSelection();
                      clearSelection();
                    }}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Clear Selection
                  </button>
                )}
                {!table.getIsAllColumnsVisible() && (
                  <button
                    className={cn(
                      "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                      getButtonSizeClass(config.size),
                      "justify-start w-full"
                    )}
                    onClick={() => table.resetColumnVisibility()}
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Show All Columns
                  </button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
