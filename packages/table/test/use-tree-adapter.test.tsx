// @vitest-environment jsdom

// ** import core packages
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

// ** import utils
import { useTreeAdapter, type UseTreeAdapterReturn } from "../src/auto/use-tree-adapter";

interface NodeRow extends Record<string, unknown> {
  id: string;
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
) {
  let current: UseTreeAdapterReturn<NodeRow> | undefined;
  function Harness() {
    current = useTreeAdapter<NodeRow>({
      list: { url: listUrl },
      children: { fetch: childrenFetch },
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

  it("aborts active child requests on collapse, invalidation, and unmount", () => {
    const signals: AbortSignal[] = [];
    const hook = mountHook((_id, signal) => {
      signals.push(signal);
      return new Promise(() => undefined);
    });
    const row = { id: "parent" };

    act(() => hook().treeProps.onRowExpand({ row, rowId: row.id, depth: 0, isExpanded: true }));
    act(() => hook().treeProps.onRowExpand({ row, rowId: row.id, depth: 0, isExpanded: false }));
    expect(signals[0].aborted).toBe(true);

    act(() => hook().treeProps.onRowExpand({ row, rowId: row.id, depth: 0, isExpanded: true }));
    act(() => hook().invalidateChildren(row.id));
    expect(signals[1].aborted).toBe(true);

    act(() => hook().treeProps.onRowExpand({ row, rowId: row.id, depth: 0, isExpanded: true }));
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

    act(() => hook().treeProps.onRowExpand({ row, rowId: row.id, depth: 0, isExpanded: true }));
    await act(async () => Promise.resolve());
    act(() => hook().treeProps.onRowExpand({ row, rowId: row.id, depth: 0, isExpanded: true }));
    await act(async () => Promise.resolve());

    expect(fetchChildren).toHaveBeenCalledTimes(2);
  });
});
