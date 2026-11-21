// @vitest-environment jsdom

// ** import types
import type { ColumnDef } from "@tanstack/react-table-v8";
import type { TableGroupingAPI } from "../src/types";
import type { ColumnDef as V9ColumnDef } from "../src/v9";

// ** import core packages
import React, { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

// ** import components
import { DataTableColumnHeader } from "../src/column-header";
import { DataTable as V8DataTable, validateSelectedRows } from "../src/data-table";
import { DataTable as V9DataTable } from "../src/v9";

// ** import utils
import { createStaticAdapter } from "../src/auto/static-adapter";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface TestRow extends Record<string, unknown> {
  id: string;
  group: string;
  name: string;
  children?: TestRow[];
}

const COLUMNS = [
  { accessorKey: "group", header: "Group" },
  { accessorKey: "name", header: "Name" },
] satisfies ColumnDef<TestRow>[];

const ROWS: TestRow[] = [
  { id: "1", group: "A", name: "One" },
  { id: "2", group: "A", name: "Two" },
];

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

async function renderTable(node: React.ReactNode): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(node);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return container;
}

describe.each([
  ["v8", V8DataTable],
  ["v9", V9DataTable],
] as const)("DataTable %s regressions", (_version, DataTable) => {
  it("rejects missing, unexpected, duplicate, and wrong selected IDs", () => {
    const selected = new Set(["1", "2"]);
    expect(validateSelectedRows(ROWS, selected, "id")).toBe(ROWS);
    expect(() => validateSelectedRows([ROWS[0]], selected, "id"))
      .toThrow("Missing IDs: 2");
    expect(() => validateSelectedRows([
      ROWS[0], { ...ROWS[1], id: "3" },
    ], selected, "id")).toThrow("unexpected IDs: 3");
    expect(() => validateSelectedRows([ROWS[0], ROWS[0]], selected, "id"))
      .toThrow("duplicate IDs: 1");
  });
  it("does not expose group rows to selection or actions", async () => {
    const actions = vi.fn(({ row }: { row: TestRow }) => <span>{row.name}</span>);
    const container = await renderTable(
      <DataTable
        adapter={createStaticAdapter(ROWS)}
        columns={COLUMNS}
        rowGrouping={["group"]}
        actions={actions}
        config={{
          enablePagination: false,
          enableToolbar: false,
          enableRowSelection: true,
        }}
      />,
    );

    await act(async () => {
      (container.querySelector('[aria-label="Expand group A"]') as HTMLElement).click();
    });

    expect(container.querySelectorAll('[aria-label="Select row"]')).toHaveLength(2);
    expect(actions.mock.calls.every(([value]) => ROWS.some((row) => row.id === value.row.id)))
      .toBe(true);

    act(() => (container.querySelector('[aria-label="Select all"]') as HTMLElement).click());
    expect(container.querySelector('[data-group-row="true"] [aria-label="Select row"]'))
      .toBeNull();
  });

  it("emits callbacks for bulk expansion and collapse", async () => {
    const groupingRef = createRef<TableGroupingAPI>();
    const onExpand = vi.fn();
    await renderTable(
      <DataTable
        adapter={createStaticAdapter(ROWS)}
        columns={COLUMNS}
        rowGrouping={["group"]}
        groupingRef={groupingRef}
        onRowGroupExpand={onExpand}
        config={{ enablePagination: false, enableToolbar: false }}
      />,
    );

    await act(async () => groupingRef.current?.expandAll());
    expect(onExpand).toHaveBeenCalledWith(expect.objectContaining({ isExpanded: true }));

    onExpand.mockClear();
    await act(async () => groupingRef.current?.collapseAll());
    expect(onExpand).toHaveBeenCalledWith(expect.objectContaining({ isExpanded: false }));
  });

  it("clears the previous grouping ref when the ref object changes", async () => {
    const first = createRef<TableGroupingAPI>();
    const second = createRef<TableGroupingAPI>();
    const props = {
      adapter: createStaticAdapter(ROWS),
      columns: COLUMNS,
      rowGrouping: ["group"],
      config: { enablePagination: false, enableToolbar: false },
    };
    await renderTable(<DataTable {...props} groupingRef={first} />);
    expect(first.current).not.toBeNull();

    await act(async () => root?.render(<DataTable {...props} groupingRef={second} />));
    expect(first.current).toBeNull();
    expect(second.current).not.toBeNull();
  });

  it("ignores interactive controls before click-to-select and onRowClick", async () => {
    const onRowClick = vi.fn();
    const interactiveColumns = [
      {
        accessorKey: "name",
        header: "Name",
        cell: () => (
          <div>
            <button type="button" data-interactive>Button</button>
            <a href="#target" data-interactive>Link</a>
            <input aria-label="Cell input" data-interactive />
            <span>Plain text</span>
          </div>
        ),
      },
      { accessorKey: "group", header: "Group" },
    ] satisfies ColumnDef<TestRow>[];
    const container = await renderTable(
      <DataTable
        adapter={createStaticAdapter([ROWS[0]])}
        columns={interactiveColumns}
        onRowClick={onRowClick}
        columnOverrides={{
          group: ({ value }) => <button type="button" data-interactive>
            Override {String(value)}
          </button>,
        }}
        config={{
          enableClickRowSelect: true,
          enablePagination: false,
          enableToolbar: false,
        }}
      />,
    );
    const dataRow = container.querySelector("tbody tr") as HTMLTableRowElement;
    for (const target of container.querySelectorAll("[data-interactive]")) {
      act(() => (target as HTMLElement).click());
      expect(dataRow.dataset.state).toBeUndefined();
      expect(onRowClick).not.toHaveBeenCalled();
    }

    const plainText = [...container.querySelectorAll("span")]
      .find((element) => element.textContent === "Plain text") as HTMLElement;
    act(() => plainText.click());
    expect(dataRow.dataset.state).toBe("selected");
    expect(onRowClick).toHaveBeenCalledOnce();
  });
});

it("renders v9 column callbacks and updates pagination through the v9 store", async () => {
  const columns: V9ColumnDef<TestRow>[] = [{
    accessorKey: "name",
    header: ({ column, table }) => (
      <DataTableColumnHeader
        column={column}
        title={`Name (page ${table.store.state.pagination.pageIndex + 1})`}
      />
    ),
    cell: ({ row }) => `Employee: ${row.original.name}`,
  }];
  const container = await renderTable(
    <V9DataTable
      adapter={createStaticAdapter(ROWS)}
      columns={columns}
      config={{
        defaultPageSize: 1,
        enableToolbar: false,
        enableUrlState: false,
        pageSizeOptions: [1],
      }}
    />,
  );

  expect(container.textContent).toContain("Name (page 1)");
  expect(container.textContent).toContain("Employee: One");
  expect(container.textContent).not.toContain("Employee: Two");

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]')?.click();
  });

  expect(container.textContent).toContain("Name (page 2)");
  expect(container.textContent).toContain("Employee: Two");
  expect(container.textContent).not.toContain("Employee: One");
});
