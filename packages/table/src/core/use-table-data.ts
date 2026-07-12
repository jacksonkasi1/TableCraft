import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { DataAdapter, QueryParams, QueryResult, TableConfig } from "../types";
import { createConditionalStateHook } from "./use-conditional-state";
import { preprocessSearch } from "../utils/search";

export interface UseTableDataReturn<T> {
  /** Current page data */
  data: T[];
  /** Pagination metadata */
  meta: {
    total: number | null;
    page: number;
    pageSize: number;
    totalPages: number | null;
  };
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object */
  error: Error | null;

  // ─── State values ───
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  dateRange: { from: string; to: string };
  columnVisibility: Record<string, boolean>;
  columnFilters: Array<{ id: string; value: unknown }>;

  // ─── State setters ───
  setPage: (value: number | ((prev: number) => number)) => void;
  setPageSize: (value: number | ((prev: number) => number)) => void;
  setSearch: (value: string | ((prev: string) => string)) => void;
  setSortBy: (value: string | ((prev: string) => string)) => void;
  setSortOrder: (value: "asc" | "desc" | ((prev: "asc" | "desc") => "asc" | "desc")) => void;
  setDateRange: (
    value:
      | { from: string; to: string }
      | ((prev: { from: string; to: string }) => { from: string; to: string })
  ) => void;
  setColumnVisibility: (
    value:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void;
  setColumnFilters: (
    value:
      | Array<{ id: string; value: unknown }>
      | ((prev: Array<{ id: string; value: unknown }>) => Array<{ id: string; value: unknown }>)
  ) => void;
}

/**
 * Core data hook — manages all table state and data fetching.
 * This is the brain of the DataTable component.
 */
export function useTableData<T extends Record<string, unknown>>(
  adapter: DataAdapter<T>,
  config: TableConfig
): UseTableDataReturn<T> {
  const useConditionalState = createConditionalStateHook(config.enableUrlState);

  // ─── URL-synced state ───
  const [page, setPage] = useConditionalState("page", 1);
  const [pageSize, setPageSize] = useConditionalState(
    "pageSize",
    config.defaultPageSize ?? 10
  );
  const [search, setSearch] = useConditionalState("search", "");
  const [sortBy, setSortBy] = useConditionalState(
    "sortBy",
    config.defaultSortBy || ""
  );
  const [sortOrder, setSortOrder] = useConditionalState<"asc" | "desc">(
    "sortOrder",
    config.defaultSortOrder || "desc"
  );
  const [dateRange, setDateRange] = useConditionalState<{
    from: string;
    to: string;
  }>("dateRange", { from: "", to: "" });
  const [columnVisibility, setColumnVisibility] = useConditionalState<
    Record<string, boolean>
  >("columnVisibility", {});
  const [columnFilters, setColumnFilters] = useConditionalState<
    Array<{ id: string; value: unknown }>
  >("columnFilters", []);

  // ─── Internal state ───
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<QueryResult<T> | null>(null);
  const [adapterRevision, setAdapterRevision] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!adapter.subscribe) return;
    return adapter.subscribe(() => setAdapterRevision((revision) => revision + 1));
  }, [adapter]);

  // ─── Build query params ───
  const queryParams = useMemo<QueryParams>(
    () => ({
      page,
      pageSize,
      search: preprocessSearch(search),
      sort: sortBy,
      sortOrder,
      filters: columnFilters.reduce((acc, curr) => {
        acc[curr.id] = { operator: "eq", value: curr.value };
        return acc;
      }, {} as Record<string, any>),
      dateRange: { from: dateRange.from, to: dateRange.to },
    }),
    [page, pageSize, search, sortBy, sortOrder, dateRange, columnFilters]
  );

  // ─── Fetch data on param change ───
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchData = async () => {
      try {
        // When keepPreviousData is on and we already have rows, skip the
        // skeleton flash — render the prior data until the new query resolves.
        if (!(config.keepPreviousData && result)) {
          setIsLoading(true);
        }
        const data = await adapter.query(queryParams, { signal: controller.signal });
        // Stale-response guard: if this effect was superseded (param changed,
        // unmount, etc.) while the await was pending, drop the result so it
        // can't overwrite newer table state. Adapters that honour the signal
        // will already have thrown AbortError; this catches the rest.
        if (controller.signal.aborted) return;
        setResult(data);
        setIsError(false);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (controller.signal.aborted) return;
        setIsError(true);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    };
  }, [adapter, adapterRevision, queryParams]);

  // ─── Validate page when total pages changes ───
  useEffect(() => {
    const totalPages = result?.meta.totalPages ?? 0;
    const countMode = result?.meta?.countMode;
    // Don't auto-reset page if we are in estimated mode or if totalPages is 0 (which might mean unknown)
    if (countMode !== 'estimated' && totalPages > 0 && page > totalPages) {
      setPage(1);
    }
  }, [result?.meta.totalPages, result?.meta?.countMode, page, setPage]);

  // ─── Reset to page 1 when filters change ───
  const prevFiltersRef = useRef(columnFilters);
  useEffect(() => {
    const changed =
      JSON.stringify(prevFiltersRef.current) !== JSON.stringify(columnFilters);
    if (changed && page !== 1) {
      setPage(1);
    }
    prevFiltersRef.current = columnFilters;
  }, [columnFilters, page, setPage]);

  // ─── Memoized return ───
  const data = useMemo(() => result?.data ?? [], [result]);
  const meta = useMemo(() => {
    if (!result?.meta) {
      return { total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }

    const m = result.meta;
    let totalPages = m.totalPages ?? 0;

    // Calculate total pages from total count if available
    if ((m.total ?? 0) > 0 && m.pageSize > 0) {
      const calculated = Math.ceil((m.total ?? 0) / m.pageSize);
      if (calculated > totalPages) {
        totalPages = calculated;
      }
    }

    // If countMode is estimated and totalPages is 0, use -1 to indicate unknown total pages.
    // This enables the "Next" button in the pagination controls.
    if (m.countMode === "estimated" && totalPages === 0) {
      totalPages = -1;
    }

    return {
      ...m,
      totalPages,
    };
  }, [result]);

  // Wrapper setters that cast away the Promise return type for simpler consumer API
  const wrappedSetPage = useCallback(
    (v: number | ((prev: number) => number)) => { setPage(v); },
    [setPage]
  );
  const wrappedSetPageSize = useCallback(
    (v: number | ((prev: number) => number)) => { setPageSize(v); },
    [setPageSize]
  );
  const wrappedSetSearch = useCallback(
    (v: string | ((prev: string) => string)) => { setSearch(v); },
    [setSearch]
  );
  const wrappedSetSortBy = useCallback(
    (v: string | ((prev: string) => string)) => { setSortBy(v); },
    [setSortBy]
  );
  const wrappedSetSortOrder = useCallback(
    (v: "asc" | "desc" | ((prev: "asc" | "desc") => "asc" | "desc")) => { setSortOrder(v); },
    [setSortOrder]
  );
  const wrappedSetDateRange = useCallback(
    (v: { from: string; to: string } | ((prev: { from: string; to: string }) => { from: string; to: string })) => { setDateRange(v); },
    [setDateRange]
  );
  const wrappedSetColumnVisibility = useCallback(
    (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => { setColumnVisibility(v); },
    [setColumnVisibility]
  );
  const wrappedSetColumnFilters = useCallback(
    (v: Array<{ id: string; value: unknown }> | ((prev: Array<{ id: string; value: unknown }>) => Array<{ id: string; value: unknown }>)) => { setColumnFilters(v); },
    [setColumnFilters]
  );

  return {
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
    columnVisibility,
    columnFilters,
    setPage: wrappedSetPage,
    setPageSize: wrappedSetPageSize,
    setSearch: wrappedSetSearch,
    setSortBy: wrappedSetSortBy,
    setSortOrder: wrappedSetSortOrder,
    setDateRange: wrappedSetDateRange,
    setColumnVisibility: wrappedSetColumnVisibility,
    setColumnFilters: wrappedSetColumnFilters,
  };
}
