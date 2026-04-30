# Row Grouping — Feature Plan

> **Issue reference:** [#32](https://github.com/jacksonkasi1/TableCraft/issues/32)
> **Inspiration:** [simple-table row grouping](https://www.simple-table.com/docs/row-grouping)

---

## What "Row Grouping" Means (vs. Existing Sub-Row Feature)

TableCraft already ships two sub-row patterns:

| Pattern | Prop | What it does |
|---|---|---|
| Master-Detail | `renderSubRow` | Renders arbitrary React content below a row |
| Tree Data | `getSubRows` *(planned)* | Hierarchical same-type children |

**Row Grouping is a third, entirely different thing.**
Given **flat data**, the table dynamically generates collapsible **group-header rows** that bundle all rows sharing the same value for one or more columns.

```
▼ Department: Engineering  (12 rows)
    Alice    Senior   $120k
    Bob      Junior   $80k
▶  Department: Design       (5 rows)
▶  Department: Product      (8 rows)
```

It is powered by TanStack Table's built-in `getGroupedRowModel()` + `getAggregatedRowModel()`.

---

## High-Level User API (target DX)

```tsx
// Minimal — just pass column IDs to group by
<DataTable
  adapter={employeesAdapter}
  rowGrouping={["department"]}
/>

// Full control
<DataTable
  adapter={employeesAdapter}
  rowGrouping={["department", "team"]}
  rowGroupingConfig={{
    defaultExpanded: true,          // start all groups open
    aggregations: {
      salary: "sum",                // show sum of salary in group header
      headcount: "count",
    },
    renderGroupCell?: (props) => …, // custom group-header cell
  }}
  onRowGroupExpand={(info) => …}    // optional expand/collapse callback
/>
```

---

## Plan Structure

Each phase maps to **one agent task** with a well-defined write scope.
Phases 1–4 can be worked in parallel after Phase 0 is complete.

```
plan/row-grouping/
├── README.md           ← this file (overview + DX target)
├── phase-0-types.md    ← Type definitions (write: types.ts only)
├── phase-1-core.md     ← TanStack wiring (write: data-table.tsx)
├── phase-2-render.md   ← Group row rendering (write: data-table.tsx tbody section)
├── phase-3-toolbar.md  ← Expand-all / Collapse-all controls (write: toolbar.tsx)
├── phase-4-styling.md  ← Indentation, icons, theming (write: styles.css + expand-icon.tsx)
└── phase-5-demo.md     ← Demo app + docs (write: apps/vite-web-example)
```

---

## Dependency Graph

```
Phase 0 (types)
      │
      ├──► Phase 1 (core TanStack wiring)
      │         │
      │         └──► Phase 2 (group row render)  ◄── Phase 4 (styling)
      │                    │
      │                    └──► Phase 3 (toolbar controls)
      │
      └──► Phase 5 (demo) — can start after Phase 2
```

Phases **1** and **4** can run in parallel after Phase 0.
Phase **5** (demo) is independent and can start after Phase 2 merges.

---

## Files Touched — Master List

| File | Phases |
|---|---|
| `packages/table/src/types.ts` | 0 |
| `packages/table/src/core/table-config.ts` | 0 |
| `packages/table/src/data-table.tsx` | 1, 2 |
| `packages/table/src/toolbar.tsx` | 3 |
| `packages/table/src/expand-icon.tsx` | 4 |
| `packages/table/src/styles.css` | 4 |
| `packages/table/src/index.ts` | 0 (re-export new types) |
| `apps/vite-web-example/…` | 5 |

No other packages are touched. The `engine` and adapter packages are **not modified** — row grouping is a pure frontend concern.

---

## Definition of Done

- [ ] Phase 0 merged — types compile cleanly
- [ ] Phase 1 merged — `getGroupedRowModel` wired, no visual regression on existing tests
- [ ] Phase 2 merged — group header rows render with count badge and chevron
- [ ] Phase 3 merged — "Expand All / Collapse All" buttons appear in toolbar when `rowGrouping` is set
- [ ] Phase 4 merged — indented child rows, group icon matches design system
- [ ] Phase 5 merged — demo page added, README updated
- [ ] Multi-agent review sign-off on each phase before merge
