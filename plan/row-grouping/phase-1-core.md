# Phase 1 — TanStack Table Core Wiring

**Agent write scope:** `packages/table/src/data-table.tsx` (state + options sections only — do NOT touch the JSX render section)
**Depends on:** Phase 0 (types must be merged first)
**Blocks:** Phase 2, Phase 3

---

## Goal

Wire up TanStack Table's grouping row model and grouping state inside `DataTable`.
After this phase, the table has grouping state and the correct row models, but group rows are not yet visually styled (that is Phase 2).

---

## 1. New TanStack Imports

At the top of `data-table.tsx`, add to the `@tanstack/react-table` import:

```ts
import {
  // ... existing imports ...
  GroupingState,
  getGroupedRowModel,
  getAggregatedRowModel,
} from "@tanstack/react-table";
```

---

## 2. Destructure New Props

In the `DataTable` function signature destructuring, add:

```ts
const {
  // ... existing props ...
  rowGrouping,
  rowGroupingConfig,
  onRowGroupExpand,
} = props;
```

---

## 3. Derive Column Aggregation Functions

Before `resolvedColumns` useMemo, add:

```ts
// ─── Row grouping aggregation map ───
// Maps accessorKey → TanStack aggregation fn string (e.g. "sum", "count")
const aggregationFns = useMemo(() => {
  if (!rowGrouping?.length || !rowGroupingConfig?.aggregations) return {};
  return rowGroupingConfig.aggregations;
}, [rowGrouping, rowGroupingConfig]);
```

---

## 4. Inject Aggregation Functions into `autoColumns`

In the `resolvedColumns` useMemo, inside the `cols.map(...)` loop that processes `autoColumns`, add aggregation metadata when present:

```ts
// Apply aggregation functions from rowGroupingConfig
if (aggregationFns[accessorKey as keyof T & string]) {
  return {
    ...col,
    aggregationFn: aggregationFns[accessorKey as keyof T & string],
  };
}
```

Place this before the `columnOverrides` section so overrides can still win.

---

## 5. Add Grouping State

After the existing `expanded` state, add:

```ts
// ─── Row grouping state ───
const [grouping, setGrouping] = useState<GroupingState>(
  () => rowGrouping ?? []
);

// Keep grouping in sync if rowGrouping prop changes (e.g. controlled from outside)
useEffect(() => {
  setGrouping(rowGrouping ?? []);
}, [JSON.stringify(rowGrouping)]); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## 6. Add Grouping Expanded State Init

The existing `expanded` state already handles sub-row expansion.
For row grouping, we must initialize expanded state from `rowGroupingConfig.defaultExpanded`:

```ts
// ─── Expanded state (handles both renderSubRow and rowGrouping) ───
const [expanded, setExpanded] = useState<ExpandedState>(() => {
  // Explicit config override wins first
  if (tableConfig.defaultExpanded !== undefined) {
    return tableConfig.defaultExpanded === false ? {} : (tableConfig.defaultExpanded ?? {});
  }
  // Row grouping default
  if (rowGroupingConfig?.defaultExpanded) return true; // expand all groups
  return {};
});
```

Replace the existing `expanded` useState with this version.

---

## 7. Fire `onRowGroupExpand` Callback

Wrap `setExpanded` with an interceptor that fires the callback:

```ts
const handleExpandedChange = useCallback(
  (updaterOrValue: ExpandedState | ((prev: ExpandedState) => ExpandedState)) => {
    setExpanded((prev) => {
      const next =
        typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;

      // Fire callback for each group row whose state changed
      if (onRowGroupExpand && rowGrouping?.length) {
        const prevKeys = new Set(Object.keys(prev as Record<string, boolean>).filter(k => (prev as Record<string, boolean>)[k]));
        const nextKeys = new Set(Object.keys(next as Record<string, boolean>).filter(k => (next as Record<string, boolean>)[k]));

        // Newly expanded
        for (const k of nextKeys) {
          if (!prevKeys.has(k)) {
            const row = table.getRow(k);
            if (row?.getIsGrouped()) {
              onRowGroupExpand({
                columnId: row.groupingColumnId ?? "",
                value: row.groupingValue,
                isExpanded: true,
                depth: row.depth,
              });
            }
          }
        }
        // Newly collapsed
        for (const k of prevKeys) {
          if (!nextKeys.has(k)) {
            const row = table.getRow(k);
            if (row?.getIsGrouped()) {
              onRowGroupExpand({
                columnId: row.groupingColumnId ?? "",
                value: row.groupingValue,
                isExpanded: false,
                depth: row.depth,
              });
            }
          }
        }
      }

      return next;
    });
  },
  [onRowGroupExpand, rowGrouping]
);
```

> **Note:** `table` is not yet available at this point; move this into a `useEffect` or a ref-based approach. Simplest: just fire the callback in a `useEffect` that watches `expanded` diff. See the alternative below if needed.

**Simpler alternative** — fire a `useEffect` to diff expanded state:

```ts
const prevExpandedRef = useRef<ExpandedState>({});

useEffect(() => {
  if (!onRowGroupExpand || !rowGrouping?.length || !tableRef.current) return;
  const prev = prevExpandedRef.current as Record<string, boolean>;
  const curr = expanded as Record<string, boolean>;

  for (const k of Object.keys(curr)) {
    if (curr[k] && !prev[k]) {
      const row = tableRef.current.getRow(k);
      if (row?.getIsGrouped()) {
        onRowGroupExpand({ columnId: row.groupingColumnId ?? "", value: row.groupingValue, isExpanded: true, depth: row.depth });
      }
    }
  }
  for (const k of Object.keys(prev)) {
    if (prev[k] && !curr[k]) {
      const row = tableRef.current.getRow(k);
      if (row?.getIsGrouped()) {
        onRowGroupExpand({ columnId: row.groupingColumnId ?? "", value: row.groupingValue, isExpanded: false, depth: row.depth });
      }
    }
  }

  prevExpandedRef.current = expanded;
}, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps
```

Use whichever approach is cleaner — the `useEffect` version is simpler.

---

## 8. Update `tableOptions` useMemo

Inside the large `tableOptions` useMemo, add the following fields:

```ts
// Add to state object:
state: {
  // ... existing state ...
  grouping,
},

// Add new model getters (after getSortedRowModel):
getGroupedRowModel: rowGrouping?.length ? getGroupedRowModel() : undefined,
getAggregatedRowModel: rowGrouping?.length ? getAggregatedRowModel() : undefined,

// Grouping state handler:
onGroupingChange: setGrouping,
```

Also add `grouping` and `setGrouping` to the `useMemo` dependency array.

> **Important:** TanStack's `getGroupedRowModel` must come BEFORE `getPaginationRowModel` in the pipeline. The current order is:
> `getCoreRowModel → getFilteredRowModel → getGroupedRowModel → getAggregatedRowModel → getSortedRowModel → getPaginationRowModel`
> This matches TanStack's recommended pipeline order.

---

## 9. Expose `expandAll` / `collapseAll` helpers via `tableContextRef`

Add to `tableContextRef.current` (the `TableContext` object):

```ts
tableContextRef.current = {
  // ... existing fields ...
  expandAllGroups: () => table.toggleAllRowsExpanded(true),
  collapseAllGroups: () => table.toggleAllRowsExpanded(false),
  isRowGroupingActive: !!rowGrouping?.length,
};
```

> Phase 3 (toolbar) will read these helpers from `tableContextRef`.

---

## Checklist

- [ ] `GroupingState`, `getGroupedRowModel`, `getAggregatedRowModel` imported
- [ ] `rowGrouping`, `rowGroupingConfig`, `onRowGroupExpand` destructured from props
- [ ] `aggregationFns` derived and applied to `autoColumns` processing
- [ ] `grouping` state created and synced with `rowGrouping` prop
- [ ] `expanded` state initialisation updated to respect `rowGroupingConfig.defaultExpanded`
- [ ] `onRowGroupExpand` callback fired (via useEffect diff pattern)
- [ ] `tableOptions` updated: `grouping` in state, row model getters added in correct pipeline order
- [ ] `expandAllGroups` / `collapseAllGroups` helpers on `tableContextRef`
- [ ] `tsc --noEmit` passes
- [ ] Existing sub-row tests (`renderSubRow`) still pass
