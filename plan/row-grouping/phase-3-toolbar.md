# Phase 3 — Toolbar Controls (Expand All / Collapse All)

**Agent write scope:** `packages/table/src/toolbar.tsx`, `packages/table/src/types.ts` (`TableContext` only)
**Depends on:** Phase 1 (helpers must be on `tableContextRef`), Phase 2 (can run in parallel with Phase 2)
**Blocks:** Phase 5

---

## Goal

When `rowGrouping` is active and `tableConfig.enableRowGroupingControls` is `true`,
show two compact icon-buttons in the toolbar: **Expand All** and **Collapse All**.

---

## Visual Target

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search...]  [📅 Date]  [Custom content]  |  [⬆ Expand All] [⬇ Collapse All]  [👁 Columns] [⬇ Export] │
└──────────────────────────────────────────────────────────────────────────┘
```

The two new buttons appear between custom toolbar content and the "Columns" / "Export" right-side controls.

---

## 1. Update `TableContext` in `types.ts`

Add the two helpers and a flag:

```ts
export interface TableContext<T> {
  // ... existing fields ...

  /** Expand all row groups (no-op when rowGrouping is not active) */
  expandAllGroups: () => void;

  /** Collapse all row groups (no-op when rowGrouping is not active) */
  collapseAllGroups: () => void;

  /** True when rowGrouping prop is non-empty */
  isRowGroupingActive: boolean;
}
```

---

## 2. Update `ToolbarProps` in `toolbar.tsx`

The toolbar currently receives a `ToolbarContext` subset. Make sure it also receives the full config:

```ts
interface ToolbarProps<T> {
  // ... existing props ...
  tableContext: TableContext<T>;       // already exists — just check it's passed
  tableConfig: TableConfig;           // already exists — check enableRowGroupingControls
}
```

No change needed if these are already threaded through — just verify.

---

## 3. Add Expand/Collapse Buttons to Toolbar JSX

Find the right-side controls section in `toolbar.tsx` (the section containing the "Columns" visibility button and "Export" button).
**Immediately before** those right-side controls, add:

```tsx
{/* Row grouping expand/collapse controls */}
{tableContext.isRowGroupingActive && tableConfig.enableRowGroupingControls && (
  <div className="flex items-center gap-1 border-r pr-2 mr-1">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => tableContext.expandAllGroups()}
          aria-label="Expand all groups"
        >
          <ChevronsDownUp className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Expand all groups</TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => tableContext.collapseAllGroups()}
          aria-label="Collapse all groups"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Collapse all groups</TooltipContent>
    </Tooltip>
  </div>
)}
```

---

## 4. Import New Icons

```ts
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";
```

`ChevronsDownUp` = "expand all" (arrows pointing outward from center).
`ChevronsUpDown` = "collapse all" (arrows pointing inward).

---

## 5. Wire `tableContext` to Toolbar in `data-table.tsx`

In `data-table.tsx`, find where `<DataTableToolbar>` (or the toolbar component) is rendered.
Ensure `tableContextRef.current` is passed as `tableContext`:

```tsx
<DataTableToolbar
  // ... existing props ...
  tableContext={tableContextRef.current}
  tableConfig={tableConfig}
/>
```

This should already be the case — just verify and add if missing.

---

## 6. Keyboard Shortcut (Optional, Nice-to-Have)

If time permits, add keyboard shortcuts:

```tsx
useEffect(() => {
  if (!rowGrouping?.length) return;

  const handleKey = (e: KeyboardEvent) => {
    // Alt+E = Expand All, Alt+C = Collapse All
    if (e.altKey && e.key === "e") tableContextRef.current.expandAllGroups();
    if (e.altKey && e.key === "c") tableContextRef.current.collapseAllGroups();
  };

  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [rowGrouping?.length]);
```

Add inside `data-table.tsx`.

---

## Checklist

- [ ] `expandAllGroups`, `collapseAllGroups`, `isRowGroupingActive` added to `TableContext` interface
- [ ] Default no-op implementations provided in `tableContextRef` when `rowGrouping` is empty
- [ ] Expand All / Collapse All buttons render in toolbar only when `isRowGroupingActive && enableRowGroupingControls`
- [ ] `ChevronsDownUp` and `ChevronsUpDown` icons imported
- [ ] Buttons have `aria-label` for accessibility
- [ ] Tooltip wraps each button
- [ ] `tableContext` correctly threaded from `data-table.tsx` to toolbar
- [ ] No TypeScript errors
- [ ] Visual regression test: toolbar without rowGrouping looks identical to before
