# Sub-Row Implementation Plan for TableCraft

TableCraft is adopting a highly scalable, DX-first approach to expanding rows. To cover all use cases elegantly without brittle HTML injection, we will support two distinct patterns.

## Pattern 1: Master-Detail (The 80% Use Case)
**Best for:** When a row expands to show *different* data or complex UI (e.g., an Order expanding to show Order Items, or a User expanding to show a settings form).
**Mechanism:** The user provides a `renderSubRow` function that returns any React node. TableCraft renders this node inside a single, full-width cell right beneath the parent row.

### Implementation Steps (Pattern 1):
1.  **Add `renderSubRow` prop to `DataTableProps`:**
    ```typescript
    renderSubRow?: (props: { row: T; table: TableContext<T> }) => React.ReactNode;
    ```
2.  **Add `defaultExpanded` config option:**
    ```typescript
    defaultExpanded?: boolean | Record<string, boolean>;
    ```
3.  **Auto-Inject Expander Column:**
    In `data-table.tsx`, if `renderSubRow` is provided, automatically prepend an `__expand` column (similar to how `select` and `__actions` are handled). This column should render a chevron icon that rotates based on `row.getIsExpanded()`.
4.  **Update TanStack Table Config:**
    Pass `getExpandedRowModel: getExpandedRowModel()` to `useReactTable`.
5.  **Update `<TableBody>` Rendering:**
    Wrap the main `<TableRow>` in a `<React.Fragment>`.
    Check `if (row.getIsExpanded())`.
    If true, render a new `<TableRow>` with a single `<TableCell colSpan={visibleColumns.length}>`.
    Inside that cell, execute `renderSubRow({ row: row.original, table: tableContextRef.current })`.

## Pattern 2: Tree Data (The 20% Use Case)
**Best for:** Hierarchical data where children are the *exact same type* of entity as the parent and share the exact same columns (e.g., Folders containing Sub-folders, or Employees and Managers).
**Mechanism:** The user provides a `getSubRows` function. TanStack Table flattens the hierarchy into the main table. TableCraft adds visual indentation to the first visible cell based on `row.depth`.

### Implementation Steps (Pattern 2):
1.  **Add `getSubRows` prop to `DataTableProps`:**
    ```typescript
    getSubRows?: (row: T) => T[] | undefined;
    ```
2.  **Add `indentSize` config option (default: 20px):**
    ```typescript
    subRowIndentSize?: number;
    ```
3.  **Auto-Inject Expander Button in First Cell:**
    Instead of a dedicated expander column, the expander chevron should ideally be injected into the *first visible data cell* alongside the data, padded by `row.depth * indentSize`.
4.  **Update TanStack Table Config:**
    Pass `getSubRows` and `getExpandedRowModel: getExpandedRowModel()` to `useReactTable`.
5.  **Update `<TableBody>` Rendering:**
    Inside the cell rendering loop, if it's the first visible column and `row.getCanExpand()` is true, render the expander chevron next to the cell's `flexRender` content. Apply `paddingLeft: ${row.depth * (config.subRowIndentSize || 20)}px`.

## Summary
By keeping these two patterns strictly separated in the API (`renderSubRow` vs `getSubRows`), TableCraft avoids brittle DOM manipulation and allows for infinite flexibility (like rendering a nested TableCraft instance inside `renderSubRow`).
