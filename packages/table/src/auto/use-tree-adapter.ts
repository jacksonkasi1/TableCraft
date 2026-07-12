import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataAdapter, QueryParams, QueryResult } from "../types";

const LOADING_PREFIX = "__tc_tree_loading__";

/** Build the synthetic id for a tree-loading placeholder row. */
export function makeTreeLoadingId(parentId: string): string {
  return `${LOADING_PREFIX}${parentId}`;
}

/**
 * True when a row is the synthetic loading placeholder injected by
 * `useTreeAdapter` while a parent's children are being fetched.
 *
 * Use this in column renderers and `getRowCanExpand` to skip work on
 * the placeholder row.
 */
export function isTreeLoadingRow<T>(
  row: T,
  getRowId: (row: T) => string = (r) =>
    (r as unknown as { id: string }).id,
): boolean {
  const id = getRowId(row);
  return typeof id === "string" && id.startsWith(LOADING_PREFIX);
}

export interface UseTreeAdapterListSource<T> {
  /**
   * REST URL for top-level rows. Standard table params are appended as
   * query string: `page`, `pageSize`, `search`, `sort`, `sortOrder`.
   * Response must be a `QueryResult<T>`.
   */
  url?: string;
  /**
   * Custom fetch override. If set, `url` is ignored. Receives the same
   * `AbortSignal` the table uses to cancel stale requests.
   */
  fetch?: (params: QueryParams, signal: AbortSignal) => Promise<QueryResult<T>>;
}

export interface UseTreeAdapterChildrenSource<T> {
  /**
   * REST URL builder for a node's children. Receives the parent row id and
   * returns the absolute URL to fetch. Response must be a `T[]`.
   */
  url?: (parentId: string) => string;
  /**
   * Custom fetch override. If set, `url` is ignored. Receives an
   * `AbortSignal` that fires when the parent re-expands or unmounts.
   */
  fetch?: (parentId: string, signal: AbortSignal) => Promise<T[]>;
}

export interface UseTreeAdapterOptions<T> {
  list: UseTreeAdapterListSource<T>;
  children: UseTreeAdapterChildrenSource<T>;
  /**
   * Stable identity for the root data source (for example a tenant or account
   * ID). Change it whenever an inline `list.fetch` starts targeting a different
   * source. URL-based lists automatically use `list.url` when this is omitted.
   */
  sourceKey?: string | number;
  /** Returns the row's id. Defaults to `row.id`. */
  getRowId?: (row: T) => string;
  /** Optional lookup used for cross-page selection and export. */
  queryByIds?: DataAdapter<T>["queryByIds"];
  /**
   * Factory for the placeholder row shown while children are loading.
   * If omitted, the parent simply renders an empty children array — no
   * loading row is injected.
   *
   * The factory is called with `(parentId, loadingId)` where `loadingId`
   * is the synthetic id `useTreeAdapter` will look for. You should set
   * `id: loadingId` on the returned row so `isTreeLoadingRow` recognises it.
   */
  loadingRow?: (parentId: string, loadingId: string) => T;
  /**
   * Hard cap on tree depth merged into the rendered tree. Cycle guard.
   * @default 50
   */
  maxDepth?: number;
  /**
   * Called when fetching children fails (non-abort errors only). The
   * cache entry is cleared so the user can retry by re-expanding.
   */
  onChildrenError?: (error: Error, parentId: string) => void;
}

export interface UseTreeAdapterReturn<T> {
  adapter: DataAdapter<T>;
  /**
   * Spread onto `<DataTable>` to wire up tree behaviour:
   * `getSubRows` and `onRowExpand`.
   */
  treeProps: {
    getSubRows: (row: T) => T[] | undefined;
    onRowExpand: (info: {
      row: T;
      rowId: string;
      depth: number;
      isExpanded: boolean;
    }) => void;
  };
  /** True when a row is the synthetic loading placeholder. */
  isLoadingRow: (row: T) => boolean;
  /**
   * Drop cached children for one parent (or all parents when called
   * with no argument). This is cache-only: retained root rows are remapped
   * immediately and the root endpoint is not refetched.
   */
  invalidateChildren: (parentId?: string) => void;
}

type RowWithChildren<T> = T & { children?: T[] };

/**
 * Lazy server-side tree adapter.
 *
 * Encapsulates the children-cache, expand-handler, loading-row
 * placeholder, mergeChildren walk, and abort/dedupe logic that every
 * lazy tree needs. Pair with `<DataTable adapter={adapter} {...treeProps} />`.
 *
 * Children are merged into rows at render time via a `children` field —
 * this is the only structural assumption. If your data uses a different
 * field, map it before returning from `list.fetch`.
 */
export function useTreeAdapter<T extends Record<string, unknown>>(
  options: UseTreeAdapterOptions<T>,
): UseTreeAdapterReturn<T> {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const getRowId = useCallback((row: T): string => {
    const resolver = optionsRef.current.getRowId;
    if (resolver) return String(resolver(row));
    const value = (row as { id?: unknown }).id;
    if (value === null || value === undefined) {
      throw new Error(
        "useTreeAdapter: every row must have an id or provide getRowId",
      );
    }
    return String(value);
  }, []);

  // Children cache: parentId → children array (loaded), null (loading), or absent (untouched).
  const cacheRef = useRef<Record<string, T[] | null>>({});
  // Per-parent abort controllers so rapid re-expands cancel in-flight fetches.
  const abortRef = useRef<Record<string, AbortController>>({});
  // Incremented whenever a cache entry is invalidated so a response that
  // ignores AbortSignal cannot repopulate stale data.
  const generationRef = useRef<Record<string, number>>({});
  const subscribersRef = useRef(new Set<() => void>());
  const activeRootControllerRef = useRef<AbortController | null>(null);
  const rawResultRef = useRef<{
    key: string;
    result: QueryResult<T>;
  } | null>(null);
  // Bumped whenever the cache mutates so hook consumers repaint. Subscribers
  // receive the same cache-only revision while the adapter identity stays stable.
  const [, setVersion] = useState(0);
  const bumpVersion = useCallback(() => {
    setVersion((value) => value + 1);
    for (const listener of subscribersRef.current) listener();
  }, []);
  const effectiveSourceKey = options.sourceKey ?? options.list.url ?? "__default__";
  const sourceKeyRef = useRef<string | number>(effectiveSourceKey);

  const isLoadingRow = useCallback(
    (row: T) => isTreeLoadingRow(row, getRowId),
    [getRowId],
  );

  // Recursive merge of cached children into the row tree, depth-bounded.
  const mergeChildren = useCallback(
    (node: T, depth: number, ancestors: ReadonlySet<string> = new Set()): T => {
      const { loadingRow, maxDepth = 50 } = optionsRef.current;
      if (depth >= maxDepth) return node;
      const id = getRowId(node);
      if (ancestors.has(id)) return node;
      const cache = cacheRef.current;
      if (!(id in cache)) return node;
      const cached = cache[id];
      if (cached === null) {
        const placeholder = loadingRow
          ? [loadingRow(id, makeTreeLoadingId(id))]
          : [];
        return { ...(node as RowWithChildren<T>), children: placeholder } as T;
      }
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(id);
      const seen = new Set<string>();
      return {
        ...(node as RowWithChildren<T>),
        children: cached
          .filter((child) => {
            const childId = getRowId(child);
            if (seen.has(childId) || nextAncestors.has(childId)) return false;
            seen.add(childId);
            return true;
          })
          .map((child) => mergeChildren(child, depth + 1, nextAncestors)),
      } as T;
    },
    [getRowId],
  );
  const mergeChildrenRef = useRef(mergeChildren);
  mergeChildrenRef.current = mergeChildren;

  const adapter = useMemo<DataAdapter<T>>(
    () => {
      const stableAdapter: DataAdapter<T> = {
        async query(params, options) {
        // Prefer the upstream signal from useTableData so a stale list
        // response can be cancelled by the table's own AbortController
        // (param change, unmount). Fall back to a never-aborted signal
        // so adapters that pass it straight through still typecheck.
        activeRootControllerRef.current?.abort();
        const rootController = new AbortController();
        activeRootControllerRef.current = rootController;
        const upstreamSignal = options?.signal;
        const abortFromUpstream = () => rootController.abort();
        upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
        if (upstreamSignal?.aborted) rootController.abort();
        const signal = rootController.signal;
        const key = JSON.stringify(params);
        const cached = rawResultRef.current;
        if (cached?.key === key) {
          upstreamSignal?.removeEventListener("abort", abortFromUpstream);
          if (activeRootControllerRef.current === rootController) {
            activeRootControllerRef.current = null;
          }
          return {
            ...cached.result,
            data: cached.result.data.map((row) => mergeChildrenRef.current(row, 0)),
          };
        }
        const list = optionsRef.current.list;
        let result: QueryResult<T>;
        if (list.fetch) {
          result = await list.fetch(params, signal);
        } else {
          if (!list.url) {
            throw new Error(
              "useTreeAdapter: `list.url` or `list.fetch` is required",
            );
          }
          const url = new URL(list.url, globalThis.location?.href ?? "http://localhost");
          url.searchParams.set("page", String(params.page));
          url.searchParams.set("pageSize", String(params.pageSize));
          if (params.search) url.searchParams.set("search", params.search);
          else url.searchParams.delete("search");
          if (params.sort) url.searchParams.set("sort", params.sort);
          else url.searchParams.delete("sort");
          if (params.sortOrder) url.searchParams.set("sortOrder", params.sortOrder);
          else url.searchParams.delete("sortOrder");
          const res = await fetch(url.toString(), { signal });
          if (!res.ok) {
            throw new Error(`useTreeAdapter list: HTTP ${res.status}`);
          }
          result = (await res.json()) as QueryResult<T>;
        }
        // Stale-response guard: if the table aborted us while we were
        // awaiting, don't merge + return a fresh result that would race
        // with a newer query.
        if (signal.aborted) {
          throw Object.assign(new Error("Aborted"), { name: "AbortError" });
        }
        rawResultRef.current = { key, result };
        upstreamSignal?.removeEventListener("abort", abortFromUpstream);
        if (activeRootControllerRef.current === rootController) {
          activeRootControllerRef.current = null;
        }
        return {
          ...result,
          data: result.data.map((row) => mergeChildrenRef.current(row, 0)),
        };
        },
        subscribe(listener) {
          subscribersRef.current.add(listener);
          return () => subscribersRef.current.delete(listener);
        },
      };
      const queryByIds = (ids: (string | number)[], lookupOptions?: {
        sortBy?: string;
        sortOrder?: "asc" | "desc";
      }) => {
        const lookup = optionsRef.current.queryByIds;
        if (!lookup) {
          throw new Error("useTreeAdapter: queryByIds is not supported by this source");
        }
        return lookup(ids, lookupOptions);
      };
      Object.defineProperty(stableAdapter, "queryByIds", {
        configurable: false,
        enumerable: true,
        get: () => optionsRef.current.queryByIds ? queryByIds : undefined,
      });
      return stableAdapter;
    },
    [],
  );

  const onRowExpand = useCallback<
    UseTreeAdapterReturn<T>["treeProps"]["onRowExpand"]
  >(
    ({ row, isExpanded }) => {
      if (isLoadingRow(row)) return;
      const id = getRowId(row);
      if (!isExpanded) {
        const active = abortRef.current[id];
        if (active) {
          active.abort();
          delete abortRef.current[id];
          delete cacheRef.current[id];
          generationRef.current[id] = (generationRef.current[id] ?? 0) + 1;
          bumpVersion();
        }
        return;
      }
      // Already loaded or in flight — let the existing fetch resolve.
      if (cacheRef.current[id] !== undefined) return;

      const ctrl = new AbortController();
      const generation = (generationRef.current[id] ?? 0) + 1;
      generationRef.current[id] = generation;
      abortRef.current[id]?.abort();
      abortRef.current[id] = ctrl;

      cacheRef.current[id] = null;
      bumpVersion();

      const childrenSource = optionsRef.current.children;
      const fetchPromise: Promise<T[]> = childrenSource.fetch
        ? childrenSource.fetch(id, ctrl.signal)
        : (async () => {
            if (!childrenSource.url) {
              throw new Error(
                "useTreeAdapter: `children.url` or `children.fetch` is required",
              );
            }
            const res = await fetch(childrenSource.url(id), { signal: ctrl.signal });
            if (!res.ok) {
              throw new Error(`useTreeAdapter children: HTTP ${res.status}`);
            }
            return (await res.json()) as T[];
          })();

      fetchPromise
        .then((kids) => {
          if (ctrl.signal.aborted || generationRef.current[id] !== generation) return;
          cacheRef.current[id] = kids;
          bumpVersion();
        })
        .catch((err: unknown) => {
          if (
            (err as { name?: string } | null)?.name === "AbortError" ||
            ctrl.signal.aborted
          ) {
            return;
          }
          delete cacheRef.current[id];
          bumpVersion();
          optionsRef.current.onChildrenError?.(
            err instanceof Error ? err : new Error(String(err)),
            id,
          );
        })
        .finally(() => {
          if (abortRef.current[id] === ctrl) delete abortRef.current[id];
        });
    },
    [bumpVersion, getRowId, isLoadingRow],
  );

  const getSubRows = useCallback(
    (row: T) => (row as RowWithChildren<T>).children,
    [],
  );

  const invalidateChildren = useCallback(
    (parentId?: string) => {
      if (parentId === undefined) {
        cacheRef.current = {};
        for (const ctrl of Object.values(abortRef.current)) ctrl.abort();
        for (const id of Object.keys(generationRef.current)) {
          generationRef.current[id] += 1;
        }
        abortRef.current = {};
      } else {
        delete cacheRef.current[parentId];
        abortRef.current[parentId]?.abort();
        delete abortRef.current[parentId];
        generationRef.current[parentId] =
          (generationRef.current[parentId] ?? 0) + 1;
      }
      bumpVersion();
    },
    [bumpVersion],
  );

  useEffect(() => {
    if (sourceKeyRef.current === effectiveSourceKey) return;
    sourceKeyRef.current = effectiveSourceKey;
    activeRootControllerRef.current?.abort();
    activeRootControllerRef.current = null;
    rawResultRef.current = null;
    cacheRef.current = {};
    generationRef.current = {};
    for (const controller of Object.values(abortRef.current)) controller.abort();
    abortRef.current = {};
    bumpVersion();
  }, [bumpVersion, effectiveSourceKey]);

  // Abort any pending children fetches when the consumer unmounts.
  useEffect(() => {
    return () => {
      for (const ctrl of Object.values(abortRef.current)) ctrl.abort();
      activeRootControllerRef.current?.abort();
      activeRootControllerRef.current = null;
      abortRef.current = {};
    };
  }, []);

  return {
    adapter,
    treeProps: { getSubRows, onRowExpand },
    isLoadingRow,
    invalidateChildren,
  };
}
