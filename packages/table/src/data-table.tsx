import type {
  ColumnDef,
  ColumnResizeMode,
  ColumnSizingState,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "./components/checkbox";
import { cn } from "./utils/cn";

import type { DataTableProps, ExportableData, TableContext } from "./types";
import { useTableConfig } from "./core/table-config";
import { useTableData } from "./core/use-table-data";
import { useTableColumnResize } from "./core/use-column-resize";
import { useAutoColumns } from "./auto/use-auto-columns";
import { DataTablePagination } from "./pagination";
import { DataTableToolbar } from "./toolbar";
import { DataTableResizer } from "./resizer";
import {
  initializeColumnSizes,
  trackColumnResizing,
  cleanupColumnResizing,
} from "./utils/column-sizing";

export function DataTable<T extends Record<string, unknown>>({
  adapter,
  columns: manualColumns,
  renderers,
  config: configOverrides,
  exportConfig,
  idField = "id" as keyof T,
  onRowClick,
  hiddenColumns,
  startToolbarContent,
  startToolbarPlacement,
  toolbarContent,
  renderToolbar,
  className,
  pageSizeOptions: pageSizeOptionsProp,
  columnOverrides,
  actions,
}: DataTableProps<T>) {
  const tableConfig = useTableConfig(configOverrides);

  const tableId = tableConfig.columnResizingTableId || "tablecraft-default";

  // ─── Core data hook ───
  const {
    data,
    meta,
    isLoading,
    isError,
    error,
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    dateRange,
    columnVisibility: urlColumnVisibility,
    setPage,
    setPageSize,
    setSearch,
    setSortBy,
    setSortOrder,
    setDateRange,
    setColumnVisibility: setUrlColumnVisibility,
  } = useTableData(adapter, tableConfig);

  // ─── Auto-columns from metadata ───
  const {
    columns: autoColumns,
    metadata,
    isLoadingMeta,
  } = useAutoColumns(adapter, manualColumns, renderers);

  // Dynamically determine if date filter should be enabled
  const dateFilterEnabled = useMemo(() => {
    // 1. Explicit override takes precedence
    if (configOverrides?.enableDateFilter !== undefined) {
      return configOverrides.enableDateFilter;
    }
    // 2. Fallback to metadata capability
    return !!metadata?.dateRangeColumn;
  }, [configOverrides?.enableDateFilter, metadata?.dateRangeColumn]);

  const effectiveConfig = useMemo(() => ({
    ...tableConfig,
    enableDateFilter: dateFilterEnabled,
  }), [tableConfig, dateFilterEnabled]);

  // ─── Table context ref (for column override & action closures) ───
  // Using a ref so memoized column cells always read the latest context
  // without needing to be in the dependency array.
  const tableContextRef = useRef<TableContext<T>>({
    selectedRows: [],
    selectedIds: [],
    totalSelected: 0,
    search: "",
    dateRange: { from: "", to: "" },
    allData: [],
  });

  // ─── Apply column overrides & inject action column ───
  const resolvedColumns = useMemo(() => {
    // Start with auto-generated or manual columns
    let cols = [...autoColumns];

    // Apply columnOverrides: replace cell renderer for matching columns
    if (columnOverrides) {
      cols = cols.map((col) => {
        const accessorKey = (col as { accessorKey?: string }).accessorKey;
        // Skip columns without accessorKey (e.g., selection, actions, group columns)
        if (!accessorKey || !(accessorKey in columnOverrides)) return col;
        const overrideFn = columnOverrides[accessorKey as keyof T];
        if (!overrideFn) return col;
        return {
          ...col,
          cell: ({ getValue, row }: { getValue: () => unknown; row: { original: T } }) => {
            return overrideFn({
              value: getValue() as T[keyof T],
              row: row.original,
              table: tableContextRef.current,
            });
          },
        };
      });
    }

    // Prepend selection column if enabled
    if (tableConfig.enableRowSelection) {
      const selectColumn: ColumnDef<T, unknown> = {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              (table.getIsAllPageRowsSelected() && !!table.getRowModel().rows.length) ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
        maxSize: 40,
      };
      cols = [selectColumn, ...cols];
    }

    // Append action column if actions prop is provided
    if (actions) {
      const actionColumn: ColumnDef<T, unknown> = {
        id: "__actions",
        header: () => null,
        cell: ({ row }) =>
          actions({
            row: row.original,
            table: tableContextRef.current,
          }),
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 48,
        maxSize: 48,
      };
      cols = [...cols, actionColumn];
    }

    return cols;
  }, [autoColumns, tableConfig.enableRowSelection, columnOverrides, actions]);

  // ─── Column resize ───
  const { columnSizing, setColumnSizing, resetColumnSizing } =
    useTableColumnResize(tableId, tableConfig.enableColumnResizing);

  // ─── Row selection ───
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // ─── Column order ───
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // Load column order from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tablecraft-column-order-${tableId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((item: unknown) => typeof item === "string")) {
          setColumnOrder(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [tableId]);

  // ─── Sorting state for TanStack ───
  const sorting: SortingState = useMemo(
    () => (sortBy ? [{ id: sortBy, desc: sortOrder === "desc" }] : []),
    [sortBy, sortOrder]
  );

  // ─── Merge hiddenColumns with column visibility ───
  const effectiveColumnVisibility = useMemo(() => {
    const base = { ...urlColumnVisibility };
    if (hiddenColumns?.length) {
      for (const col of hiddenColumns) {
        base[String(col)] = false;
      }
    }
    return base;
  }, [urlColumnVisibility, hiddenColumns]);

  // ─── Selection helpers ───
  const totalSelectedItems = useMemo(
    () => Object.keys(rowSelection).length,
    [rowSelection]
  );

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const getSelectedItems = useCallback(async () => {
    if (totalSelectedItems === 0) return [];

    const selectedIds = Object.keys(rowSelection);
    const itemsOnPage = data.filter(
      (item) => rowSelection[String(item[idField])]
    );
    const idsOnPage = new Set(itemsOnPage.map((item) => String(item[idField])));
    const idsToFetch = selectedIds.filter((id) => !idsOnPage.has(id));

    if (idsToFetch.length === 0 || !adapter.queryByIds) {
      return itemsOnPage;
    }

    try {
      const fetched = await adapter.queryByIds(idsToFetch);
      return [...itemsOnPage, ...fetched];
    } catch {
      return itemsOnPage;
    }
  }, [data, rowSelection, totalSelectedItems, adapter, idField]);

  const getAllItems = useCallback((): T[] => data, [data]);

  // ─── Pagination state for TanStack ───
  const pagination = useMemo(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize]
  );

  // ─── Event handlers ───
  const handleSortingChange = useCallback(
    (updaterOrValue: SortingState | ((prev: SortingState) => SortingState)) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;

      if (newSorting.length > 0) {
        setSortBy(newSorting[0].id);
        setSortOrder(newSorting[0].desc ? "desc" : "asc");
      }
    },
    [sorting, setSortBy, setSortOrder]
  );

  const handlePaginationChange = useCallback(
    (
      updaterOrValue:
        | { pageIndex: number; pageSize: number }
        | ((prev: { pageIndex: number; pageSize: number }) => {
          pageIndex: number;
          pageSize: number;
        })
    ) => {
      const newPagination =
        typeof updaterOrValue === "function"
          ? updaterOrValue({ pageIndex: page - 1, pageSize })
          : updaterOrValue;

      if (newPagination.pageSize !== pageSize) {
        setPageSize(newPagination.pageSize);
        setPage(1);
        return;
      }

      if (newPagination.pageIndex + 1 !== page) {
        setPage(newPagination.pageIndex + 1);
      }
    },
    [page, pageSize, setPage, setPageSize]
  );

  const handleColumnSizingChange = useCallback(
    (
      updaterOrValue:
        | ColumnSizingState
        | ((prev: ColumnSizingState) => ColumnSizingState)
    ) => {
      if (typeof updaterOrValue === "function") {
        setColumnSizing((current: ColumnSizingState) => updaterOrValue(current));
      } else {
        setColumnSizing(updaterOrValue);
      }
    },
    [setColumnSizing]
  );

  const handleColumnOrderChange = useCallback(
    (updaterOrValue: string[] | ((prev: string[]) => string[])) => {
      const newOrder =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnOrder)
          : updaterOrValue;
      setColumnOrder(newOrder);
      try {
        localStorage.setItem(
          `tablecraft-column-order-${tableId}`,
          JSON.stringify(newOrder)
        );
      } catch {
        // ignore
      }
    },
    [columnOrder, tableId]
  );

  const resetColumnOrder = useCallback(() => {
    setColumnOrder([]);
    try {
      localStorage.removeItem(`tablecraft-column-order-${tableId}`);
    } catch {
      // ignore
    }
  }, [tableId]);

  // ─── Row click handler ───
  const handleRowClick = useCallback(
    (event: React.MouseEvent, rowData: T, rowIndex: number) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'button, a, input, select, textarea, [role="button"], [role="link"]'
        )
      ) {
        return;
      }
      onRowClick?.(rowData, rowIndex);
    },
    [onRowClick]
  );

  // ─── Table container ref ───
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // ─── Table instance ref (for keyboard navigation) ───
  const tableRef = useRef<ReturnType<typeof useReactTable<T>> | null>(null);

  // ─── Keyboard navigation ───
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!tableRef.current) return;
      const table = tableRef.current;
      if (
        (e.key === " " || e.key === "Enter") &&
        !(e.target as HTMLElement).matches(
          'input, button, [role="button"], [contenteditable="true"]'
        )
      ) {
        e.preventDefault();

        const focusedElement = document.activeElement;
        if (
          focusedElement &&
          (focusedElement.getAttribute("role") === "row" ||
            focusedElement.getAttribute("role") === "gridcell")
        ) {
          const rowElement =
            focusedElement.getAttribute("role") === "row"
              ? focusedElement
              : focusedElement.closest('[role="row"]');

          if (rowElement) {
            const rowId =
              rowElement.getAttribute("data-row-index") || rowElement.id;
            if (rowId) {
              const rowIndex = Number.parseInt(rowId.replace(/^row-/, ""), 10);
              const row = table.getRowModel().rows[rowIndex];
              if (row) {
                if (e.key === " ") {
                  row.toggleSelected();
                } else if (e.key === "Enter" && onRowClick) {
                  onRowClick(row.original as T, rowIndex);
                }
              }
            }
          }
        }
      }
    },
    [onRowClick]
  );

  // ─── Table instance ───
  const tableOptions = useMemo(
    () => ({
      data,
      columns: resolvedColumns,
      state: {
        sorting,
        columnVisibility: effectiveColumnVisibility,
        rowSelection,
        columnFilters: [] as ColumnFiltersState,
        pagination,
        columnSizing,
        columnOrder,
      },
      meta: {
        isLoadingColumns: isLoadingMeta,
      },
      columnResizeMode: "onChange" as ColumnResizeMode,
      onColumnSizingChange: handleColumnSizingChange,
      onColumnOrderChange: handleColumnOrderChange,
      pageCount: meta.totalPages ?? 0,
      enableRowSelection: tableConfig.enableRowSelection,
      enableColumnResizing: tableConfig.enableColumnResizing,
      getRowId: (row: T) => String(row[idField]),
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
      onRowSelectionChange: setRowSelection,
      onSortingChange: handleSortingChange,
      onColumnVisibilityChange: setUrlColumnVisibility as (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void,
      onPaginationChange: handlePaginationChange,
      getCoreRowModel: getCoreRowModel<T>(),
      getFilteredRowModel: getFilteredRowModel<T>(),
      getPaginationRowModel: getPaginationRowModel<T>(),
      getSortedRowModel: getSortedRowModel<T>(),
      getFacetedRowModel: getFacetedRowModel<T>(),
      getFacetedUniqueValues: getFacetedUniqueValues<T>(),
    }),
    [
      data,
      resolvedColumns,
      sorting,
      effectiveColumnVisibility,
      rowSelection,
      pagination,
      columnSizing,
      columnOrder,
      handleColumnSizingChange,
      handleColumnOrderChange,
      meta.totalPages,
      tableConfig.enableRowSelection,
      tableConfig.enableColumnResizing,
      handleSortingChange,
      setUrlColumnVisibility,
      handlePaginationChange,
      idField,
      isLoadingMeta,
    ]
  );

  const table = useReactTable<T>(tableOptions);

  // Update table ref for keyboard navigation
  tableRef.current = table;

  // ─── Column sizing init ───
  useEffect(() => {
    initializeColumnSizes(
      resolvedColumns as ColumnDef<T, unknown>[],
      tableId,
      setColumnSizing
    );
  }, [resolvedColumns, tableId, setColumnSizing]);

  // ─── Track resize state on body ───
  useEffect(() => {
    const isResizingAny = table
      .getHeaderGroups()
      .some((hg) => hg.headers.some((h) => h.column.getIsResizing()));
    trackColumnResizing(isResizingAny);
    return () => cleanupColumnResizing();
  }, [table]);

  // ─── Sync sorting with table ───
  useEffect(() => {
    table.setSorting(sorting);
  }, [table, sorting]);

  // ─── Skeleton headers (for preserving column widths during loading) ───
  const skeletonHeaders = table.getHeaderGroups()[0]?.headers ?? [];

  // ─── Render toolbar content ───
  const selectedRows = useMemo(
    () => data.filter((item) => rowSelection[String(item[idField])]),
    [data, rowSelection, idField]
  );
  const selectedIds = useMemo(
    () => Object.keys(rowSelection),
    [rowSelection]
  );

  const toolbarContext = {
    selectedRows,
    selectedIds,
    totalSelected: totalSelectedItems,
    clearSelection,
    search,
    setSearch,
    dateRange,
    setDateRange,
  };

  // ─── Keep tableContextRef in sync every render ───
  // This runs synchronously before render, so column cells always see fresh values.
  tableContextRef.current = {
    selectedRows,
    selectedIds,
    totalSelected: totalSelectedItems,
    search,
    dateRange,
    allData: data,
  };

  const customToolbar = renderToolbar
    ? renderToolbar(toolbarContext)
    : toolbarContent;

  const resolvedStartToolbarContent =
    typeof startToolbarContent === "function"
      ? startToolbarContent(toolbarContext)
      : startToolbarContent;

  // ─── Error state ───
  if (isError) {
    return (
      <div
        className="my-4 rounded-md border border-destructive/50 bg-destructive/10 p-4"
        role="alert"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <h5 className="font-medium text-destructive">Error</h5>
        </div>
        <p className="mt-1 text-sm text-destructive/80">
          Failed to load data:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  const pageSizeOpts =
    pageSizeOptionsProp ??
    tableConfig.pageSizeOptions ?? [10, 20, 30, 40, 50];

  return (
    <div className={cn("space-y-4", className)}>
      {tableConfig.enableToolbar && (
        <DataTableToolbar
          table={table as unknown as ReturnType<typeof useReactTable<ExportableData>>}
          search={search}
          dateRange={{ from: dateRange.from, to: dateRange.to }}
          setSearch={setSearch}
          setDateRange={setDateRange}
          totalSelectedItems={totalSelectedItems}
          clearSelection={clearSelection}
          getSelectedItems={getSelectedItems as () => Promise<ExportableData[]>}
          getAllItems={getAllItems as () => ExportableData[]}
          config={effectiveConfig}
          exportConfig={exportConfig as import("./types").ExportConfig<ExportableData>}
          resetColumnSizing={() => {
            resetColumnSizing();
            setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
          }}
          resetColumnOrder={resetColumnOrder}
          customToolbarContent={customToolbar}
          startToolbarContent={resolvedStartToolbarContent}
          startToolbarPlacement={startToolbarPlacement}
          hiddenColumns={hiddenColumns as string[]}
        />
      )}

      <div
        ref={tableContainerRef}
        className="overflow-y-auto rounded-md border"
        aria-label="Data table"
        onKeyDown={
          tableConfig.enableKeyboardNavigation ? handleKeyDown : undefined
        }
      >
        <div data-slot="table-container" className="relative w-full overflow-x-auto">
          <table
            data-slot="table"
            className={cn(
              "w-full caption-bottom text-sm",
              tableConfig.enableColumnResizing && "resizable-table"
            )}
          >
            <thead data-slot="table-header" className="[&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  data-slot="table-row"
                  className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      data-slot="table-head"
                      colSpan={header.colSpan}
                      scope="col"
                      className="text-foreground h-10 px-4 text-left align-middle font-medium whitespace-nowrap relative group/th [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
                      style={{ width: header.getSize() }}
                      data-column-resizing={header.column.getIsResizing() ? "true" : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      {tableConfig.enableColumnResizing &&
                        header.column.getCanResize() && (
                          <DataTableResizer header={header} table={table} />
                        )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr
                    key={`loading-${i}`}
                    data-slot="table-row"
                    className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
                  >
                    {skeletonHeaders.map((header) => (
                      <td
                        key={`skeleton-${i}-${header.id}`}
                        data-slot="table-cell"
                        className="align-middle whitespace-nowrap px-4 py-2 text-left"
                        style={{ width: header.getSize() }}
                      >
                        <div className="h-6 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    id={`row-${rowIndex}`}
                    data-slot="table-row"
                    data-row-index={rowIndex}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    tabIndex={0}
                    aria-selected={row.getIsSelected()}
                    className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
                    onClick={(event) => {
                      if (tableConfig.enableClickRowSelect) {
                        row.toggleSelected();
                      }
                      if (onRowClick) {
                        handleRowClick(event, row.original, rowIndex);
                      }
                    }}
                    style={{
                      cursor: onRowClick ? "pointer" : undefined,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        data-slot="table-cell"
                        className="align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] px-4 py-2 truncate max-w-0 text-left"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr data-slot="table-row">
                  <td
                    data-slot="table-cell"
                    colSpan={resolvedColumns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {tableConfig.enablePagination && (
        <DataTablePagination
          table={table}
          totalItems={meta.total ?? 0}
          totalSelectedItems={totalSelectedItems}
          pageSizeOptions={pageSizeOpts}
          size={tableConfig.size}
        />
      )}
    </div>
  );
}
