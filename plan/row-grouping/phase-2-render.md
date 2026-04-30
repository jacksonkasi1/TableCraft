# Phase 2 — Group Row Rendering

**Agent write scope:** `packages/table/src/data-table.tsx` — JSX render section (`<tbody>` loop only)
**Depends on:** Phase 1 (grouping state must be wired first)
**Blocks:** Phase 3, Phase 5

---

## Goal

Render group-header rows with the correct visual structure:
- A full-width chevron + group label + row count badge
- Child data rows indented under their group
- Aggregate cells shown in non-grouped columns of the group-header row

---

## Visual Target

```
┌──────────────────────────────────────────────────────────┐
│ ▼  Department: Engineering          12 rows   $1.2M sum  │  ← group header row
│    Alice      Senior    $120k                             │  ← data row (indented)
│    Bob        Junior    $80k                              │  ← data row
│ ▶  Department: Design                5 rows              │  ← collapsed group
└──────────────────────────────────────────────────────────┘
```

---

## 1. Group Row Utility Function

Add a helper function just above the `<tbody>` return in `DataTable` (or in a nearby utils file):

```tsx
function renderGroupHeaderCell(
  row: Row<T>,
  cell: Cell<T, unknown>,
  rowGroupingConfig?: RowGroupingConfig<T>
): React.ReactNode {
  const isGroupedCell = cell.getIsGrouped();
  const isAggregatedCell = cell.getIsAggregated();
  const isPlaceholderCell = cell.getIsPlaceholder();

  if (isGroupedCell) {
    // This is THE cell that shows the group label + toggle
    const groupValue = cell.getValue();
    const leafCount = row.getLeafRows().length;

    // Custom renderer wins
    if (rowGroupingConfig?.renderGroupCell) {
      const custom = rowGroupingConfig.renderGroupCell({
        columnId: cell.column.id,
        value: groupValue,
        leafRowCount: leafCount,
      });
      if (custom !== null) return custom;
    }

    // Default: "ColumnId: value  (n)"
    return (
      <span className="flex items-center gap-2">
        <span className="font-medium text-foreground">
          {String(cell.column.id)}: {String(groupValue ?? "—")}
        </span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {leafCount}
        </span>
      </span>
    );
  }

  if (isAggregatedCell) {
    return flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext());
  }

  if (isPlaceholderCell) return null;

  // Normal data cell
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}
```

> Keep this function inside the `DataTable` function body so it closes over `rowGroupingConfig` without prop-drilling.

---

## 2. Update `<tbody>` Row Mapping

Find the existing `table.getRowModel().rows.map(...)` block inside `<tbody>`.
Currently each row renders as:

```tsx
<Fragment key={row.id}>
  <tr ...>
    {row.getVisibleCells().map(...)}
  </tr>
  {row.getIsExpanded() && renderSubRow && (
    <tr>...</tr>
  )}
</Fragment>
```

**Replace** the `<tr>` inner content with the following logic that handles both grouped and normal rows:

```tsx
table.getRowModel().rows.map((row, rowIndex) => {
  const isGroupRow = row.getIsGrouped();
  const depth = row.depth;

  return (
    <Fragment key={row.id}>
      <tr
        id={`row-${rowIndex}`}
        data-slot="table-row"
        data-row-index={rowIndex}
        data-state={row.getIsSelected() ? "selected" : undefined}
        data-group-row={isGroupRow ? "true" : undefined}
        tabIndex={0}
        aria-selected={row.getIsSelected()}
        aria-expanded={isGroupRow ? row.getIsExpanded() : undefined}
        className={cn(
          "border-b transition-colors",
          isGroupRow
            ? "bg-muted/40 hover:bg-muted/60 cursor-pointer font-medium"
            : "hover:bg-muted/50 data-[state=selected]:bg-muted",
          onRowClick && !isGroupRow && "cursor-pointer"
        )}
        onClick={(event) => {
          if (isGroupRow) {
            row.toggleExpanded();
            return;
          }
          if (tableConfig.enableClickRowSelect) row.toggleSelected();
          if (onRowClick) handleRowClick(event, row.original, rowIndex);
        }}
        style={{
          cursor: isGroupRow ? "pointer" : onRowClick ? "pointer" : undefined,
        }}
      >
        {row.getVisibleCells().map((cell) => {
          const isFirstDataCol =
            cell.column.id !== "select" &&
            cell.column.id !== "__expand" &&
            cell.column.id !== "__actions";
          const isVeryFirstCol = cell.column.getIndex() === 0;

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
                // Indent child rows; indent group header chevron via paddingLeft on first data col
                paddingLeft:
                  isFirstDataCol && depth > 0 && !isGroupRow
                    ? `${16 + depth * 20}px`
                    : undefined,
              }}
              colSpan={
                // Group row: first grouped cell spans 1, placeholder cells are hidden
                isGroupRow && cell.getIsPlaceholder() ? 0 : 1
              }
            >
              {isGroupRow ? (
                // Grouped row — first grouped cell shows chevron + label
                cell.getIsGrouped() ? (
                  <span className="flex items-center gap-1.5">
                    {/* Chevron */}
                    <span
                      className={cn(
                        "inline-flex transition-transform duration-150",
                        row.getIsExpanded() ? "rotate-90" : "rotate-0"
                      )}
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </span>
                    {renderGroupHeaderCell(row, cell, rowGroupingConfig)}
                  </span>
                ) : cell.getIsPlaceholder() ? null : (
                  // Aggregated value cell
                  renderGroupHeaderCell(row, cell, rowGroupingConfig)
                )
              ) : (
                // Normal data row
                flexRender(cell.column.columnDef.cell, cell.getContext())
              )}
            </td>
          );
        })}
        {renderResizePlaceholderCell("td")}
      </tr>

      {/* Master-Detail sub-row expansion (existing feature, unchanged) */}
      {row.getIsExpanded() && renderSubRow && !isGroupRow && (
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
```

> **Key points:**
> - `isGroupRow` check gates all grouping-specific logic — normal rows are 100% unchanged.
> - `renderSubRow` still works on leaf rows because of the `!isGroupRow` guard.
> - `ChevronRight` from `lucide-react` (already a dependency) — rotate 90° when expanded.
> - `colSpan={0}` on placeholder cells effectively hides them; the grouped cell naturally takes the remaining space because sibling `colSpan=0` cells collapse.

---

## 3. Import `ChevronRight` from `lucide-react`

```ts
import { ChevronRight } from "lucide-react";
```

Lucide is already a peer dependency.

---

## 4. Handle Grouped Column Hiding

When a column is being used as a grouping column (e.g., `department`), TanStack creates a "grouped" cell for it in the group-header row and "placeholder" cells for it in every leaf row.
The placeholder cells in leaf rows should show nothing — handle via:

```tsx
// Inside leaf row cell render, before calling flexRender:
if (cell.getIsPlaceholder()) return <td key={cell.id} style={{ width: cell.column.getSize() }} />;
```

Add this as an early return at the top of the `cell.map` inside the non-group row branch.

---

## Checklist

- [ ] `renderGroupHeaderCell` helper added (supports custom `renderGroupCell`)
- [ ] Group header rows rendered with chevron + label + count badge
- [ ] Aggregate cells shown in non-grouped columns of group rows
- [ ] Child data rows receive left-padding based on `row.depth`
- [ ] Placeholder cells in leaf rows render empty (no flickering)
- [ ] `renderSubRow` still works for non-group leaf rows (existing feature unbroken)
- [ ] `ChevronRight` icon imported
- [ ] Clicking a group row toggles `row.toggleExpanded()`
- [ ] `aria-expanded` set on group rows for accessibility
- [ ] No TypeScript errors
- [ ] Screenshot / storybook story shows correct visual output
