import type {
  Row,
  ColumnDef,
  ColumnResizeMode,
  ColumnSizingState,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ExpandedState,
  GroupingState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getExpandedRowModel,
  getGroupedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React, { Fragment, useEffect, useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "./components/checkbox";
import { ExpandIcon, GroupRowChevron, GroupRowBadge } from "./expand-icon";
import { cn } from "./utils/cn";

import type { DataTableProps, ExportableData, TableContext, ExportConfig } from "./types";
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

/** Validate that an adapter returned exactly the selected row IDs. */
export function validateSelectedRows<T extends Record<string, unknown>>(
  rows: T[],
  selectedIds: ReadonlySet<string>,
  idField: keyof T,
): T[] {
  const returnedIds = rows.map((row) => String(row[idField]));
  const returnedIdSet = new Set(returnedIds);
  const missingIds = [...selectedIds].filter((id) => !returnedIdSet.has(id));
  const unexpectedIds = [...returnedIdSet].filter((id) => !selectedIds.has(id));
  const counts = new Map<string, number>();
  for (const id of returnedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const duplicateIds = [...counts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  if (missingIds.length || unexpectedIds.length || duplicateIds.length) {
    throw new Error(
      "Adapter returned an invalid selected-row set. " +
      `Missing IDs: ${missingIds.join(", ") || "none"}; ` +
      `unexpected IDs: ${unexpectedIds.join(", ") || "none"}; ` +
      `duplicate IDs: ${duplicateIds.join(", ") || "none"}`,
    );
  }
  return rows;
}

export function DataTable<T extends Record<string, unknown>>({
  adapter,
  columns: manualColumns,
  renderers,
  config: configOverrides,
  exportConfig,
  idField = "id" as keyof T,
  onRowClick,
  hiddenColumns,
  defaultColumnOrder,
  startToolbarContent,
  startToolbarPlacement,
  endToolbarContent,
  endToolbarPlacement,
  toolbarContent,
  renderToolbar,
  className,
  pageSizeOptions: pageSizeOptionsProp,
  columnOverrides,
  actions,
  renderSubRow,
  getRowCanExpand,
  getSubRows,
  rowGrouping,
  rowGroupingConfig,
  onRowGroupExpand,
  onRowExpand,
  groupingRef,
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

  // ─── Row grouping aggregation map ───
  const aggregationFns = useMemo(() => {
    if (!rowGrouping?.length || !rowGroupingConfig?.aggregations) return {} as Record<string, string>;
    return rowGroupingConfig.aggregations as Record<string, string>;
  }, [rowGrouping, rowGroupingConfig]);

  // ─── Apply column overrides & inject action column ───
  const resolvedColumns = useMemo(() => {
    // Start with auto-generated or manual columns
    let cols = [...autoColumns];

    // Prepend selection column if enabled
    if (tableConfig.enableRowSelection) {
      const selectColumn: ColumnDef<T, unknown> = {
        id: "select",
        size: 40,
        minSize: 40,
        maxSize: 40,
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
          row.getIsGrouped() ? null : (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className="translate-y-[2px]"
            />
          )
        ),
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
      };
      cols = [selectColumn, ...cols];
    }

    // Prepend expand column if renderSubRow is provided
    // (Doing this after selectColumn ensures __expand is at index 0 and select is at index 1)
    if (renderSubRow) {
      const expandColumn: ColumnDef<T, unknown> = {
        id: "__expand",
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableResizing: false,
        enableSorting: false,
        enableHiding: false,
        header: () => null,
        cell: ({ row }) => <ExpandIcon row={row} />,
      };
      cols = [expandColumn, ...cols];
    }

    // Inject aggregation functions for row grouping
    const aggKeys = Object.keys(aggregationFns);
    if (aggKeys.length > 0) {
      cols = cols.map((col) => {
        const accessorKeyForAgg = (col as { accessorKey?: string }).accessorKey;
        if (accessorKeyForAgg && aggregationFns[accessorKeyForAgg]) {
          col = { ...col, aggregationFn: aggregationFns[accessorKeyForAgg] } as typeof col;
        }
        return col;
      });
    }

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

    // Append action column if actions prop is provided
    if (actions) {
      const actionColumn: ColumnDef<T, unknown> = {
        id: "__actions",
        header: () => null,
        cell: ({ row }) => row.getIsGrouped() ? null :
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
  }, [autoColumns, tableConfig.enableRowSelection, columnOverrides, actions, renderSubRow, aggregationFns]);

  // ─── Column resize ───
  const { columnSizing, setColumnSizing, resetColumnSizing } =
    useTableColumnResize(tableId, tableConfig.enableColumnResizing);

  // ─── Row selection ───
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  // ─── Expanded state ───
  const [expanded, setExpanded] = useState<ExpandedState>(() => {
    // Only honour config.defaultExpanded when the consumer explicitly provided it.
    // defaultConfig.defaultExpanded is `false`, so checking the merged
    // tableConfig value would always shadow the rowGroupingConfig path below.
    if (configOverrides?.defaultExpanded !== undefined) {
      if (configOverrides.defaultExpanded === false) return {};
      return configOverrides.defaultExpanded as ExpandedState;
    }
    // Row grouping default
    if (rowGroupingConfig?.defaultExpanded) return true;
    return {};
  });

  // ─── Row grouping state ───
  const [grouping, setGrouping] = useState<GroupingState>(
    () => rowGrouping ?? []
  );
  const previousGroupingPropRef = useRef<readonly string[]>(rowGrouping ?? []);

  // Sync grouping state if rowGrouping prop changes
  useEffect(() => {
    const next = rowGrouping ?? [];
    const previous = previousGroupingPropRef.current;
    if (
      previous.length === next.length &&
      previous.every((column, index) => column === next[index])
    ) {
      return;
    }
    previousGroupingPropRef.current = [...next];
    setGrouping(next);
    setExpanded({});
    prevExpandedIdsRef.current = new Set();
  });

  // ─── Dev warning: manualPagination + rowGrouping conflict ───
  // The table internally sets manualPagination:true, so the adapter returns
  // one page of rows at a time.  Client-side grouping (getGroupedRowModel)
  // then groups ONLY those rows, so any group whose members span multiple
  // pages will appear as separate partial groups with wrong leaf counts on
  // each page.
  useEffect(() => {
    const NODE_ENV = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
      .process?.env?.NODE_ENV;
    if (
      NODE_ENV !== "production" &&
      rowGrouping?.length &&
      tableConfig.enablePagination
    ) {
      console.warn(
        "[TableCraft] Row grouping + pagination: groups may be split across pages. " +
        "Consider setting config={{ enablePagination: false }} or using a large pageSize when rowGrouping is active."
      );
    }
  }, [rowGrouping, tableConfig.enablePagination]);

  // ─── Fire onRowGroupExpand / onRowExpand callbacks ───
  const prevExpandedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const wantsGroup = !!onRowGroupExpand && !!rowGrouping?.length;
    const wantsTree = !!onRowExpand;
    if ((!wantsGroup && !wantsTree) || !tableRef.current) {
      prevExpandedIdsRef.current = new Set();
      return;
    }
    const tableInstance = tableRef.current;
    const candidateRows = rowGrouping?.length
      ? tableInstance.getGroupedRowModel().flatRows
      : tableInstance.getCoreRowModel().flatRows;
    const candidates = new Map(candidateRows.map((row) => [row.id, row]));
    const currentIds = new Set<string>();
    if (expanded === true) {
      for (const row of candidateRows) {
        if (row.getCanExpand()) currentIds.add(row.id);
      }
    } else {
      for (const [rowId, isOpen] of Object.entries(expanded)) {
        if (isOpen && candidates.has(rowId)) currentIds.add(rowId);
      }
    }
    const previousIds = prevExpandedIdsRef.current;

    const fire = (rowId: string, isExpanded: boolean) => {
      try {
        const row = candidates.get(rowId) ?? tableInstance.getRow(rowId);
        if (!row) return;
        if (row.getIsGrouped()) {
          if (wantsGroup) {
            onRowGroupExpand!({
              columnId: row.groupingColumnId ?? "",
              value: row.groupingValue,
              isExpanded,
              depth: row.depth,
            });
          }
        } else if (wantsTree) {
          onRowExpand!({
            row: row.original,
            rowId: row.id,
            depth: row.depth,
            isExpanded,
          });
        }
      } catch { /* row may not exist */ }
    };

    for (const rowId of currentIds) {
      if (!previousIds.has(rowId)) fire(rowId, true);
    }
    for (const rowId of previousIds) {
      if (!currentIds.has(rowId) && candidates.has(rowId)) fire(rowId, false);
    }
    prevExpandedIdsRef.current = currentIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // ─── Column order ───
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const columnOrderRef = useRef<string[]>(columnOrder);
  columnOrderRef.current = columnOrder;

  /**
   * Pins system columns to fixed positions regardless of what order is stored or passed:
   * - '__expand' always first (if renderSubRow is provided)
   * - 'select' always second (if row selection is enabled)
   * - '__actions' always last (if actions column is present)
   * Developer-defined defaultColumnOrder should only list data columns.
   */
  const normalizeColumnOrder = useCallback((order: string[]): string[] => {
    const without = order.filter((id) => id !== "select" && id !== "__actions" && id !== "__expand");
    const result: string[] = [];
    if (renderSubRow) result.push("__expand");
    if (tableConfig.enableRowSelection) result.push("select");
    result.push(...without);
    if (actions) result.push("__actions");
    return result;
  }, [tableConfig.enableRowSelection, actions, renderSubRow]);

  // Load column order from localStorage; fall back to defaultColumnOrder if no saved order
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tablecraft-column-order-${tableId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((item: unknown) => typeof item === "string")) {
          setColumnOrder(normalizeColumnOrder(parsed));
          return;
        }
      }
    } catch {
      // ignore
    }
    // No saved order — use defaultColumnOrder if provided
    if (defaultColumnOrder && defaultColumnOrder.length > 0) {
      setColumnOrder(normalizeColumnOrder(defaultColumnOrder));
    }
  }, [tableId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: defaultColumnOrder and normalizeColumnOrder are intentionally excluded — read once on mount.
  // Assumes enableRowSelection and actions are stable for the component's lifetime.
  // If they change after mount, you must include them (and normalizeColumnOrder) in the
  // dependencies and re-run setColumnOrder accordingly.

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

  const handleSetSearch = useCallback(
    (v: string | ((prev: string) => string)) => {
      setRowSelection({});
      setSearch(v);
    },
    [setSearch]
  );

  // When getSubRows is provided, flatten the tree so export and selection
  // can reach every node, not just the top-level rows the adapter returned.
  const flattenTree = useCallback((rows: T[]): T[] => {
    if (!getSubRows) return rows;
    const result: T[] = [];
    const walk = (nodes: T[]) => {
      for (const node of nodes) {
        result.push(node);
        const children = getSubRows(node);
        if (children?.length) walk(children as T[]);
      }
    };
    walk(rows);
    return result;
  }, [getSubRows]);

  const getSelectedItems = useCallback(async () => {
    if (totalSelectedItems === 0) return [];

    const selectedIds = new Set(Object.keys(rowSelection));
    const allRows = flattenTree(data);
    const itemsOnPage = allRows.filter((item) => selectedIds.has(String(item[idField])));
    const idsOnPage = new Set(itemsOnPage.map((item) => String(item[idField])));
    const idsToFetch = [...selectedIds].filter((id) => !idsOnPage.has(id));

    if (idsToFetch.length === 0) {
      return itemsOnPage;
    }

    if (!adapter.queryByIds) {
      throw new Error(
        `Cannot export ${selectedIds.size} selected rows: ${idsToFetch.length} ` +
        "rows are not loaded and this adapter does not support queryByIds",
      );
    }

    // Cross-page export: fetch ALL selected IDs sorted via the backend.
    const fetchedAllSorted = await adapter.queryByIds([...selectedIds], { sortBy, sortOrder });
    return validateSelectedRows(fetchedAllSorted, selectedIds, idField);
  }, [data, rowSelection, totalSelectedItems, adapter, idField, sortBy, sortOrder, flattenTree]);

  const getAllItems = useCallback((): T[] => flattenTree(data), [data, flattenTree]);

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
      const raw =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnOrderRef.current)
          : updaterOrValue;
      const newOrder = normalizeColumnOrder(raw);
      setColumnOrder(newOrder);
      columnOrderRef.current = newOrder;
      try {
        localStorage.setItem(
          `tablecraft-column-order-${tableId}`,
          JSON.stringify(newOrder)
        );
      } catch {
        // ignore
      }
    },
    [tableId, normalizeColumnOrder]
  );

  // Note: Consumers must pass a stable reference for defaultColumnOrder
  // (hoist to module scope, use useMemo, or use the provided defaultColumnOrder<C>() helper)
  // so resetColumnOrder and downstream children are not recreated every render.
  const resetColumnOrder = useCallback(() => {
    const base = defaultColumnOrder && defaultColumnOrder.length > 0 ? defaultColumnOrder : [];
    const resetTo = normalizeColumnOrder(base);
    setColumnOrder(resetTo);
    try {
      if (base.length > 0) {
        // Persist the defaultColumnOrder as the saved state so it survives reload
        localStorage.setItem(`tablecraft-column-order-${tableId}`, JSON.stringify(resetTo));
      } else {
        localStorage.removeItem(`tablecraft-column-order-${tableId}`);
      }
    } catch {
      // ignore
    }
  }, [tableId, defaultColumnOrder, normalizeColumnOrder]);

  // ─── Row click handler ───
  const handleRowClick = useCallback(
    (event: React.MouseEvent, rowData: T, rowIndex: number) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'button, a, input, select, textarea, [role="button"], [role="link"], ' +
          '[contenteditable="true"]'
        )
      ) {
        return;
      }
      onRowClick?.(rowData, rowIndex);
    },
    [onRowClick]
  );

  const isInteractiveTarget = useCallback((target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest(
      'button, a, input, select, textarea, [role="button"], [role="link"], ' +
      '[contenteditable="true"]'
    ), []);

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
        if (focusedElement) {
          // <tr> has *implicit* role="row" — getAttribute returns null for it,
          // so we match by tagName as well as an explicit role attribute.
          let rowElement: Element | null = null;
          if (
            focusedElement.tagName === "TR" ||
            focusedElement.getAttribute("role") === "row"
          ) {
            rowElement = focusedElement;
          } else if (focusedElement.getAttribute("role") === "gridcell") {
            rowElement =
              focusedElement.closest("tr") ??
              focusedElement.closest('[role="row"]');
          }

          if (rowElement) {
            const rowId =
              rowElement.getAttribute("data-row-index") || rowElement.id;
            if (rowId) {
              const rowIndex = Number.parseInt(rowId.replace(/^row-/, ""), 10);
              const row = table.getRowModel().rows[rowIndex];
              if (row) {
                if (row.getIsGrouped()) {
                  // Group rows toggle expansion; they are never selectable.
                  row.toggleExpanded();
                } else if (e.key === " ") {
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
        expanded,
        grouping,
      },
      meta: {
        isLoadingColumns: isLoadingMeta,
      },
      columnResizeMode: "onChange" as ColumnResizeMode,
      onColumnSizingChange: handleColumnSizingChange,
      onColumnOrderChange: handleColumnOrderChange,
      pageCount: meta.totalPages ?? 0,
      enableRowSelection: (row: Row<T>) =>
        tableConfig.enableRowSelection && !row.getIsGrouped(),
      enableColumnResizing: tableConfig.enableColumnResizing,
      getRowId: (row: T) => String(row[idField]),
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
      groupedColumnMode: false as const,
      getSubRows: getSubRows ? (row: T) => getSubRows(row) : undefined,
      onRowSelectionChange: setRowSelection,
      onSortingChange: handleSortingChange,
      onColumnVisibilityChange: setUrlColumnVisibility as (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void,
      onPaginationChange: handlePaginationChange,
      // Row model pipeline — must follow TanStack v8 order:
      // Core → Filtered → Grouped → Sorted → Expanded → Pagination
      getCoreRowModel: getCoreRowModel<T>(),
      getFilteredRowModel: getFilteredRowModel<T>(),
      getGroupedRowModel: rowGrouping?.length ? getGroupedRowModel() : undefined,
      getSortedRowModel: getSortedRowModel<T>(),
      getFacetedRowModel: getFacetedRowModel<T>(),
      getFacetedUniqueValues: getFacetedUniqueValues<T>(),
      onExpandedChange: setExpanded,
      getExpandedRowModel: getExpandedRowModel(),
      getPaginationRowModel: getPaginationRowModel<T>(),
      onGroupingChange: setGrouping,
      getRowCanExpand: (row: Row<T>) => {
        // Group rows created by getGroupedRowModel MUST always be expandable,
        // regardless of the host's getRowCanExpand prop or the presence of
        // renderSubRow.  Without this guard, getCanExpand() returns false for
        // every group row which breaks getToggleExpandedHandler() and any
        // other caller that respects canExpand (keyboard nav, expand-all, etc).
        if (row.getIsGrouped()) return true;
        if (getRowCanExpand) return getRowCanExpand(row.original);
        return row.subRows.length > 0 || !!renderSubRow;
      },
    }),
    [
      data,
      resolvedColumns,
      expanded,
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
      getRowCanExpand,
      renderSubRow,
      getSubRows,
      grouping,
      setGrouping,
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
    () => flattenTree(data).filter((item) => rowSelection[String(item[idField])]),
    [data, rowSelection, idField, flattenTree]
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
    setSearch: handleSetSearch,
    dateRange,
    setDateRange,
  };

  // ─── Row grouping depth helpers ───
  const collectGroupRowsAtDepth = useCallback(
    (rows: Row<T>[], targetDepth: number, acc: Row<T>[] = []): Row<T>[] => {
      for (const row of rows) {
        if (!row.getIsGrouped()) continue;
        if (row.depth === targetDepth) {
          acc.push(row);
        } else if (row.depth < targetDepth && row.subRows?.length) {
          collectGroupRowsAtDepth(row.subRows, targetDepth, acc);
        }
      }
      return acc;
    },
    [] // no deps — pure function over its arguments
  );

  const expandDepth = useCallback(
    (depth: number) => {
      if (!rowGrouping?.length) return;
      const groupedRows = table.getGroupedRowModel().rows;
      const targets = collectGroupRowsAtDepth(groupedRows, depth);
      if (!targets.length) return;
      setExpanded((prev) => {
        // prev === true means "all rows expanded" already includes our targets.
        // Returning a fresh object would collapse every other depth — preserve
        // the boolean state instead.
        if (prev === true) return prev;
        const base =
          typeof prev === "boolean" ? {} : { ...(prev as Record<string, boolean>) };
        for (const row of targets) base[row.id] = true;
        return base;
      });
    },
    [rowGrouping, table, collectGroupRowsAtDepth]
  );

  const collapseDepth = useCallback(
    (depth: number) => {
      if (!rowGrouping?.length) return;
      const groupedRows = table.getGroupedRowModel().rows;
      const targets = collectGroupRowsAtDepth(groupedRows, depth);
      if (!targets.length) return;
      const targetIds = new Set(targets.map((r) => r.id));
      setExpanded((prev) => {
        if (typeof prev === "boolean") {
          const allGroupIds = new Set<string>();
          const collectAll = (rows: Row<T>[]) => {
            for (const r of rows) {
              if (r.getIsGrouped()) {
                allGroupIds.add(r.id);
                if (r.subRows?.length) collectAll(r.subRows);
              }
            }
          };
          collectAll(table.getGroupedRowModel().rows);
          const map: Record<string, boolean> = {};
          for (const id of allGroupIds) map[id] = !targetIds.has(id);
          return map;
        }
        const next = { ...(prev as Record<string, boolean>) };
        for (const id of targetIds) delete next[id];
        return next;
      });
    },
    [rowGrouping, table, collectGroupRowsAtDepth]
  );

  const toggleDepth = useCallback(
    (depth: number) => {
      if (!rowGrouping?.length) return;
      const groupedRows = table.getGroupedRowModel().rows;
      const targets = collectGroupRowsAtDepth(groupedRows, depth);
      if (!targets.length) return;
      const expandedState =
        typeof expanded === "boolean"
          ? targets.map(() => expanded)
          : targets.map((r) => !!(expanded as Record<string, boolean>)[r.id]);
      const allExpanded = expandedState.every(Boolean);
      if (allExpanded) {
        collapseDepth(depth);
      } else {
        expandDepth(depth);
      }
    },
    [rowGrouping, table, collectGroupRowsAtDepth, expanded, expandDepth, collapseDepth]
  );

  const setExpandedDepths = useCallback(
    (depths: Set<number>) => {
      if (!rowGrouping?.length) return;
      const newExpanded: Record<string, boolean> = {};
      const visit = (rows: Row<T>[]) => {
        for (const row of rows) {
          if (!row.getIsGrouped()) continue;
          newExpanded[row.id] = depths.has(row.depth);
          if (row.subRows?.length) visit(row.subRows);
        }
      };
      visit(table.getGroupedRowModel().rows);
      setExpanded(newExpanded);
    },
    [rowGrouping, table]
  );

  const getExpandedDepths = useCallback((): Set<number> => {
    if (!rowGrouping?.length) return new Set();
    const depths = new Set<number>();
    if (typeof expanded === "boolean") {
      if (expanded) {
        const visit = (rows: Row<T>[]) => {
          for (const row of rows) {
            if (row.getIsGrouped()) {
              depths.add(row.depth);
              if (row.subRows?.length) visit(row.subRows);
            }
          }
        };
        visit(table.getGroupedRowModel().rows);
      }
      return depths;
    }
    const expandedMap = expanded as Record<string, boolean>;
    for (const [id, isOpen] of Object.entries(expandedMap)) {
      if (!isOpen) continue;
      try {
        const row = table.getRow(id);
        if (row?.getIsGrouped()) depths.add(row.depth);
      } catch { /* row may not exist in current model */ }
    }
    return depths;
  }, [rowGrouping, expanded, table]);

  const getGroupingProperty = useCallback(
    (depth: number): string | undefined => rowGrouping?.[depth],
    [rowGrouping]
  );

  const getGroupingDepth = useCallback(
    (property: string): number => rowGrouping?.indexOf(property) ?? -1,
    [rowGrouping]
  );

  // ─── Keep tableContextRef in sync every render ───
  // This runs synchronously before render, so column cells always see fresh values.
  tableContextRef.current = {
    selectedRows,
    selectedIds,
    totalSelected: totalSelectedItems,
    search,
    dateRange,
    allData: data,
    expandAllGroups: () => table.toggleAllRowsExpanded(true),
    collapseAllGroups: () => table.toggleAllRowsExpanded(false),
    expandDepth,
    collapseDepth,
    toggleDepth,
    getGroupingProperty,
    getGroupingDepth,
    isRowGroupingActive: !!(grouping.length),
  };

  // ─── Expose grouping API via groupingRef (imperative handle) ───
  // Re-publish the handle whenever any of the captured helpers change identity
  // (each helper is a useCallback that updates when its own deps change, so
  // this effect runs only when the closure's behaviour actually changes —
  // not on every render, which previously nulled the ref between renders).
  const publishedGroupingRef = useRef(groupingRef);
  useEffect(() => {
    if (publishedGroupingRef.current !== groupingRef) {
      const previous = publishedGroupingRef.current;
      if (previous) {
        (previous as React.MutableRefObject<
          import("./types").TableGroupingAPI | null
        >).current = null;
      }
      publishedGroupingRef.current = groupingRef;
    }
    if (!groupingRef) return;
    const handle: import("./types").TableGroupingAPI = {
      expandAll: () => table.toggleAllRowsExpanded(true),
      collapseAll: () => table.toggleAllRowsExpanded(false),
      expandDepth,
      collapseDepth,
      toggleDepth,
      setExpandedDepths,
      getExpandedDepths,
      getGroupingProperty,
      getGroupingDepth,
    };
    (groupingRef as React.MutableRefObject<import("./types").TableGroupingAPI | null>).current = handle;
    // No cleanup: the parent owns the ref's lifecycle.  Nulling on every
    // dep change opened a brief null window that broke consumers reading
    // `ref.current` synchronously across renders.
  }, [
    groupingRef,
    table,
    expandDepth,
    collapseDepth,
    toggleDepth,
    setExpandedDepths,
    getExpandedDepths,
    getGroupingProperty,
    getGroupingDepth,
  ]);

  useEffect(() => () => {
    const owner = publishedGroupingRef.current;
    if (owner) {
      (owner as React.MutableRefObject<import("./types").TableGroupingAPI | null>)
        .current = null;
    }
  }, []);

  const customToolbar = renderToolbar
    ? renderToolbar(toolbarContext)
    : toolbarContent;

  const resolvedStartToolbarContent =
    typeof startToolbarContent === "function"
      ? startToolbarContent(toolbarContext)
      : startToolbarContent;

  const resolvedEndToolbarContent =
    typeof endToolbarContent === "function"
      ? endToolbarContent(toolbarContext)
      : endToolbarContent;

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

  const resizePlaceholderColumnCount = tableConfig.enableColumnResizing ? 1 : 0;

  const getVisibleColumnCount = (columnCount: number) =>
    columnCount + resizePlaceholderColumnCount;

  const renderResizePlaceholderCell = (cellTag: "th" | "td") => {
    if (!resizePlaceholderColumnCount) {
      return null;
    }

    return React.createElement(cellTag, {
      "aria-hidden": true,
      role: "presentation",
    });
  };

  const totalVisibleColumns = getVisibleColumnCount(
    table.getVisibleLeafColumns().length
  );

  return (
    <div className={cn("space-y-4", className)}>
      {tableConfig.enableToolbar && (
        <DataTableToolbar
          table={table as unknown as ReturnType<typeof useReactTable<ExportableData>>}
          search={search}
          dateRange={{ from: dateRange.from, to: dateRange.to }}
          setSearch={handleSetSearch}
          setDateRange={setDateRange}
          totalSelectedItems={totalSelectedItems}
          clearSelection={clearSelection}
          getSelectedItems={getSelectedItems as () => Promise<ExportableData[]>}
          getAllItems={getAllItems as () => ExportableData[]}
          config={effectiveConfig}
          exportConfig={exportConfig as unknown as ExportConfig<ExportableData>}
          resetColumnSizing={() => {
            resetColumnSizing();
            setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
          }}
          resetColumnOrder={resetColumnOrder}
          customToolbarContent={customToolbar}
          startToolbarContent={resolvedStartToolbarContent}
          startToolbarPlacement={startToolbarPlacement}
          endToolbarContent={resolvedEndToolbarContent}
          endToolbarPlacement={endToolbarPlacement}
          hiddenColumns={hiddenColumns as string[]}
          onExpandAllGroups={tableContextRef.current.expandAllGroups}
          onCollapseAllGroups={tableContextRef.current.collapseAllGroups}
          isRowGroupingActive={tableContextRef.current.isRowGroupingActive}
        />
      )}

      <div
        ref={tableContainerRef}
        className={cn(
          "overflow-y-auto",
          !tableConfig.removeOuterBorder && "rounded-md border"
        )}
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
                  className={cn(
                    "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
                    tableConfig.removeOuterBorder && "bg-muted/50"
                  )}
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      data-slot="table-head"
                      colSpan={header.colSpan}
                      scope="col"
                      className={cn(
                        "text-foreground h-10 text-left align-middle font-medium whitespace-nowrap relative group/th",
                        header.column.id === "select" || header.column.id === "__expand"
                          ? "px-2"
                          : "px-4"
                      )}
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
                  {renderResizePlaceholderCell("th")}
                </tr>
              ))}
            </thead>

            <tbody data-slot="table-body" className="[&>tr:last-child]:border-0">
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
                        className={cn(
                          "align-middle whitespace-nowrap text-left",
                          header.column.id === "select" || header.column.id === "__expand"
                            ? "px-2 py-2"
                            : "px-4 py-2"
                        )}
                        style={{ width: header.getSize() }}
                      >
                        <div className="h-6 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                    {renderResizePlaceholderCell("td")}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row, rowIndex) => {
                  const isGroupRow = row.getIsGrouped();
                  const visibleCells = row.getVisibleCells();

                  // Group label always renders in the first non-system column so the
                  // chevron + value appear at column 0 regardless of grouping key.
                  const firstDataCellId = isGroupRow
                    ? (visibleCells.find(
                        c => c.column.id !== "select" && c.column.id !== "__expand" && c.column.id !== "__actions"
                      )?.id ?? null)
                    : null;

                  // First data cell of leaf rows — only this cell gets depth indentation.
                  const firstLeafDataCellId = !isGroupRow
                    ? (visibleCells.find(
                        c => c.column.id !== "select" && c.column.id !== "__expand" && c.column.id !== "__actions"
                      )?.id ?? null)
                    : null;

                  return (
                    <Fragment key={isGroupRow ? `group-row-${row.id}` : row.id}>
                      <tr
                        id={`row-${rowIndex}`}
                        data-slot="table-row"
                        data-row-index={rowIndex}
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        data-group-row={isGroupRow ? "true" : undefined}
                        data-depth={isGroupRow ? String(row.depth) : undefined}
                        tabIndex={isGroupRow ? -1 : 0}
                        aria-selected={isGroupRow ? undefined : row.getIsSelected()}
                        aria-expanded={undefined}
                        className={cn(
                          "border-b transition-colors",
                          isGroupRow
                            ? "hover:bg-muted/60 cursor-pointer"
                            : "hover:bg-muted/50 data-[state=selected]:bg-muted",
                          onRowClick && !isGroupRow ? "cursor-pointer" : undefined
                        )}
                        onClick={(event) => {
                          if (isGroupRow) {
                            return;
                          }
                          if (isInteractiveTarget(event.target)) {
                            return;
                          }
                          if (tableConfig.enableClickRowSelect) {
                            row.toggleSelected();
                          }
                          if (onRowClick) {
                            handleRowClick(event, row.original, rowIndex);
                          }
                        }}
                        style={{
                          cursor: isGroupRow || onRowClick ? "pointer" : undefined,
                        }}
                      >
                        {visibleCells.map((cell) => {
                          const isSystemCol =
                            cell.column.id === "select" ||
                            cell.column.id === "__expand" ||
                            cell.column.id === "__actions";

                          const isFirstDataCell =
                            cell.id === firstDataCellId || cell.id === firstLeafDataCellId;

                          // \u2500\u2500 Group rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                          if (isGroupRow) {
                            // Placeholder cells that are not the target first-data cell \u2192 empty
                            if (cell.getIsPlaceholder() && !isFirstDataCell) {
                              return (
                                <td
                                  key={cell.id}
                                  data-slot="table-cell"
                                  style={{ width: cell.column.getSize() }}
                                />
                              );
                            }

                            // First data cell \u2192 render the group label here, always
                            if (isFirstDataCell) {
                              const leafCount = row.getLeafRows().length;
                              const groupValue = row.groupingValue;
                              const defaultGroupContent = (
                                <>
                                  <span className="font-medium text-foreground">
                                    {String(groupValue ?? "\u2014")}
                                  </span>
                                  <GroupRowBadge count={leafCount} />
                                </>
                              );
                              const customGroupContent = rowGroupingConfig?.renderGroupCell
                                ? rowGroupingConfig.renderGroupCell({
                                    columnId: row.groupingColumnId ?? "",
                                    value: groupValue,
                                    leafRowCount: leafCount,
                                  })
                                : null;

                              return (
                                <td
                                  key={cell.id}
                                  data-slot="table-cell"
                                  className="align-middle whitespace-nowrap text-left px-4 py-2 truncate max-w-0"
                                  style={{
                                    width: cell.column.getSize(),
                                    paddingLeft: `${16 + row.depth * 20}px`,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 text-left"
                                    aria-expanded={row.getIsExpanded()}
                                    aria-label={`${row.getIsExpanded() ? "Collapse" : "Expand"} group ${String(groupValue ?? "")}`}
                                    onClick={() => row.toggleExpanded()}
                                  >
                                    <GroupRowChevron isExpanded={row.getIsExpanded()} />
                                    {customGroupContent != null ? customGroupContent : defaultGroupContent}
                                  </button>
                                </td>
                              );
                            }

                            // Aggregated value cells (e.g. salary sum/mean)
                            if (cell.getIsAggregated()) {
                              return (
                                <td
                                  key={cell.id}
                                  data-slot="table-cell"
                                  className={cn(
                                    "align-middle whitespace-nowrap text-left",
                                    isSystemCol ? "px-2 py-2" : "px-4 py-2 truncate max-w-0"
                                  )}
                                  style={{ width: cell.column.getSize() }}
                                >
                                  {flexRender(
                                    cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </td>
                              );
                            }

                            // System columns (select checkbox etc.) and remaining cells \u2192 render normally
                            return (
                              <td
                                key={cell.id}
                                data-slot="table-cell"
                                className={cn(
                                  "align-middle whitespace-nowrap text-left",
                                  cell.column.id === "select" || cell.column.id === "__expand"
                                    ? "px-2 py-2"
                                    : cell.column.id === "__actions"
                                      ? "w-12 px-2 py-2"
                                      : "px-4 py-2 truncate max-w-0"
                                )}
                                style={{ width: cell.column.getSize() }}
                                onClick={isSystemCol ? (e) => e.stopPropagation() : undefined}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          }

                          // \u2500\u2500 Leaf rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                          // Placeholder cells (grouped columns become empty in leaf rows)
                          if (cell.getIsPlaceholder()) {
                            return (
                              <td
                                key={cell.id}
                                data-slot="table-cell"
                                style={{ width: cell.column.getSize() }}
                              />
                            );
                          }

                          // Tree-expandable rows: first data cell gets chevron + depth indent
                          if (isFirstDataCell && row.getCanExpand() && !renderSubRow) {
                            return (
                              <td
                                key={cell.id}
                                data-slot="table-cell"
                                className="align-middle whitespace-nowrap text-left px-4 py-2 truncate max-w-0"
                                style={{
                                  width: cell.column.getSize(),
                                  paddingLeft: `${16 + row.depth * 20}px`,
                                }}
                              >
                                <span className="flex items-center gap-1.5">
                                  <ExpandIcon row={row} />
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={cell.id}
                              data-slot="table-cell"
                              className={cn(
                                "align-middle whitespace-nowrap text-left",
                                cell.column.id === "select" || cell.column.id === "__expand"
                                  ? "px-2 py-2"
                                  : cell.column.id === "__actions"
                                    ? "w-12 px-2 py-2"
                                    : "px-4 py-2 truncate max-w-0"
                              )}
                              style={{
                                width: cell.column.getSize(),
                                // Depth indent only on the first data cell of nested leaf rows
                                paddingLeft: isFirstDataCell && row.depth > 0
                                  ? `${16 + row.depth * 20}px`
                                  : undefined,
                              }}
                              onClick={isSystemCol ? (e) => e.stopPropagation() : undefined}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                        {renderResizePlaceholderCell("td")}
                      </tr>

                      {/* Master-Detail sub-row (existing feature) — only for non-group leaf rows */}
                      {!isGroupRow && row.getIsExpanded() && renderSubRow && (
                        <tr key={`expanded-${row.id}`} className="bg-muted/30 hover:bg-muted/30 border-b">
                          <td
                            colSpan={getVisibleColumnCount(row.getVisibleCells().length)}
                            className="p-0"
                          >
                            {renderSubRow({ row: row.original, table: tableContextRef.current })}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr data-slot="table-row">
                  <td
                    data-slot="table-cell"
                    colSpan={totalVisibleColumns}
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
