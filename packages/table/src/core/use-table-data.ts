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

  const abortRef = useRef<AbortController | null>(null);

  // ─── Build query params ───
  const queryParams = useMemo<QueryParams>(
    () => ({
      page,
      pageSize,
      search: preprocessSearch(search),
      sort: sortBy,
      sortOrder,
      filters: {},
      dateRange: { from: dateRange.from, to: dateRange.to },
    }),
    [page, pageSize, search, sortBy, sortOrder, dateRange]
  );

  // ─── Fetch data on param change ───
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await adapter.query(queryParams);
        setResult(data);
        setIsError(false);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setIsError(true);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      abortRef.current?.abort();
    };
  }, [adapter, queryParams]);

  // ─── Validate page when total pages changes ───
  useEffect(() => {
    const totalPages = result?.meta.totalPages ?? 0;
    if (totalPages > 0 && page > totalPages) {
      setPage(1);
    }
  }, [result?.meta.totalPages, page, setPage]);

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
  const meta = useMemo(
    () =>
      result?.meta ?? { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    [result]
  );

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