// @vitest-environment jsdom

// ** import core packages
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

// ** import utils
import { useTreeAdapter, type UseTreeAdapterReturn } from "../src/auto/use-tree-adapter";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface NodeRow extends Record<string, unknown> {
  id?: unknown;
  children?: NodeRow[];
}

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

function mountHook(
  childrenFetch: (parentId: string, signal: AbortSignal) => Promise<NodeRow[]>,
  listUrl = "https://example.test/tree?tenant=acme",
  getRowId?: (row: NodeRow) => string,
) {
  let current: UseTreeAdapterReturn<NodeRow> | undefined;
  function Harness() {
    current = useTreeAdapter<NodeRow>({
      list: { url: listUrl },
      children: { fetch: childrenFetch },
      getRowId,
    });
    return null;
  }
  const container = document.createElement("div");
  root = createRoot(container);
  act(() => root?.render(<Harness />));
  return () => current!;
}

describe("useTreeAdapter", () => {
  it("preserves existing list query parameters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: { total: 0, page: 2, pageSize: 5, totalPages: 0 } })),
    );
    const hook = mountHook(async () => []);

    await hook().adapter.query({
      page: 2,
      pageSize: 5,
      search: "desk",
      sort: "name",
      sortOrder: "asc",
      filters: {},
      dateRange: { from: "", to: "" },
    });

    const url = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(url.searchParams.get("tenant")).toBe("acme");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("search")).toBe("desk");
    fetchSpy.mockRestore();
  });

  it("removes stale controlled query parameters when table state is empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } })),
    );
    const hook = mountHook(
      async () => [],
      "https://example.test/tree?tenant=acme&search=old&sort=name&sortOrder=desc",
    );

    await hook().adapter.query({
      page: 1,
      pageSize: 10,
      search: "",
      sort: "",
      sortOrder: "" as "asc",
      filters: {},
      dateRange: { from: "", to: "" },
    });

    const url = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(url.searchParams.get("tenant")).toBe("acme");
    expect(url.searchParams.has("search")).toBe(false);
    expect(url.searchParams.has("sort")).toBe(false);
    expect(url.searchParams.has("sortOrder")).toBe(false);
    fetchSpy.mockRestore();
  });

  it("aborts active child requests on collapse, invalidation, and unmount", () => {
    const signals: AbortSignal[] = [];
    const hook = mountHook((_id, signal) => {
      signals.push(signal);
      return new Promise(() => undefined);
    });
    const row = { id: "parent" };

    act(() => hook().treeProps.onRowExpand({ row, rowId: String(row.id), depth: 0, isExpanded: true }));
    act(() => hook().treeProps.onRowExpand({ row, rowId: String(row.id), depth: 0, isExpanded: false }));
    expect(signals[0].aborted).toBe(true);

    act(() => hook().treeProps.onRowExpand({ row, rowId: String(row.id), depth: 0, isExpanded: true }));
    act(() => hook().invalidateChildren(String(row.id)));
    expect(signals[1].aborted).toBe(true);

    act(() => hook().treeProps.onRowExpand({ row, rowId: String(row.id), depth: 0, isExpanded: true }));
    act(() => root?.unmount());
    root = undefined;
    expect(signals[2].aborted).toBe(true);
  });

  it("allows retry after a non-abort child error", async () => {
    const fetchChildren = vi.fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValueOnce([{ id: "child" }]);
    const hook = mountHook(fetchChildren);
    const row = { id: "parent" };

    act(() => hook().treeProps.onRowExpand({ row, rowId: String(row.id), depth: 0, isExpanded: true }));
    await act(async () => Promise.resolve());
    act(() => hook().treeProps.onRowExpand({ row, rowId: String(row.id), depth: 0, isExpanded: true }));
    await act(async () => Promise.resolve());

    expect(fetchChildren).toHaveBeenCalledTimes(2);
  });

  it("normalizes numeric and zero IDs before loading children", () => {
    const fetchChildren = vi.fn(() => new Promise<NodeRow[]>(() => undefined));
    const hook = mountHook(fetchChildren);

    act(() => hook().treeProps.onRowExpand({
      row: { id: 0 }, rowId: "0", depth: 0, isExpanded: true,
    }));
    expect(fetchChildren).toHaveBeenCalledWith("0", expect.any(AbortSignal));
  });

  it("rejects missing IDs and supports a custom resolver", () => {
    const missing = mountHook(async () => []);
    expect(() => missing().treeProps.onRowExpand({
      row: {}, rowId: "", depth: 0, isExpanded: true,
    })).toThrow("every row must have an id");

    act(() => root?.unmount());
    root = undefined;
    const fetchChildren = vi.fn(() => new Promise<NodeRow[]>(() => undefined));
    const custom = mountHook(fetchChildren, undefined, (row) => String(row.key));
    act(() => custom().treeProps.onRowExpand({
      row: { key: 42 }, rowId: "42", depth: 0, isExpanded: true,
    }));
    expect(fetchChildren).toHaveBeenCalledWith("42", expect.any(AbortSignal));
  });

  it("remaps child cache updates without refetching the root list", async () => {
    let resolveChildren: ((rows: NodeRow[]) => void) | undefined;
    const listFetch = vi.fn(async () => ({
      data: [{ id: "root" }],
      meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 },
    }));
    const childrenFetch = vi.fn(() => new Promise<NodeRow[]>((resolve) => {
      resolveChildren = resolve;
    }));
    let current: UseTreeAdapterReturn<NodeRow> | undefined;
    function Harness() {
      current = useTreeAdapter<NodeRow>({
        list: { fetch: listFetch },
        children: { fetch: childrenFetch },
      });
      return null;
    }
    const container = document.createElement("div");
    root = createRoot(container);
    act(() => root?.render(<Harness />));
    const params = {
      page: 1, pageSize: 10, search: "", sort: "", sortOrder: "asc" as const,
      filters: {}, dateRange: { from: "", to: "" },
    };
    let rendered = await current!.adapter.query(params);
    const refresh = vi.fn(async () => {
      rendered = await current!.adapter.query(params);
    });
    const unsubscribe = current!.adapter.subscribe?.(refresh);

    act(() => current!.treeProps.onRowExpand({
      row: { id: "root" }, rowId: "root", depth: 0, isExpanded: true,
    }));
    expect(childrenFetch).toHaveBeenCalledOnce();
    expect(listFetch).toHaveBeenCalledOnce();

    await act(async () => resolveChildren?.([{ id: "child" }]));
    await vi.waitFor(() => {
      expect(rendered.data[0].children).toEqual([{ id: "child" }]);
    });
    expect(listFetch).toHaveBeenCalledOnce();

    await current!.adapter.query({ ...params, page: 2, search: "new", sort: "name" });
    expect(listFetch).toHaveBeenCalledTimes(2);
    unsubscribe?.();
  });
});
