# Phase 0 — Type Definitions

**Agent write scope:** `packages/table/src/types.ts`, `packages/table/src/core/table-config.ts`, `packages/table/src/index.ts`
**Depends on:** nothing (first phase)
**Blocks:** Phase 1, Phase 2, Phase 3

---

## Goal

Add all new TypeScript types and config defaults for row grouping **without touching any runtime logic**.
This phase is pure type work — it must compile with zero errors before any other phase starts.

---

## 1. New Types to Add (`types.ts`)

### 1a. `RowGroupingAggregation`

Allowed aggregate function names (mirrors TanStack built-ins + "count"):

```ts
// packages/table/src/types.ts

export type RowGroupingAggregation =
  | "sum"
  | "min"
  | "max"
  | "mean"   // TanStack calls it "mean", not "avg"
  | "median"
  | "unique"
  | "uniqueCount"
  | "count"
  | "extent";
```

### 1b. `RowGroupingConfig`

```ts
export interface RowGroupingConfig<T extends Record<string, unknown>> {
  /**
   * Start all groups expanded when the table mounts.
   * @default false
   */
  defaultExpanded?: boolean;

  /**
   * Per-column aggregate functions to display in the group-header row.
   * Keys must be column accessorKeys present in T.
   * @example { salary: "sum", headcount: "count" }
   */
  aggregations?: Partial<Record<keyof T & string, RowGroupingAggregation>>;

  /**
   * Optional custom renderer for the group-header cell content.
   * Receives the grouped column ID, the group value, and the leaf row count.
   * Return null to fall back to the default "ColumnLabel: value (n rows)" format.
   */
  renderGroupCell?: (props: {
    columnId: string;
    value: unknown;
    leafRowCount: number;
  }) => React.ReactNode;
}
```

### 1c. `OnRowGroupExpandInfo`

```ts
export interface OnRowGroupExpandInfo {
  /** The column ID that was grouped */
  columnId: string;
  /** The grouped value (e.g. "Engineering") */
  value: unknown;
  /** Whether the group was just expanded (true) or collapsed (false) */
  isExpanded: boolean;
  /** Zero-based depth level in a multi-level grouping */
  depth: number;
}
```

---

## 2. Update `DataTableProps` (`types.ts`)

Add the following props inside `DataTableProps<T>`:

```ts
/**
 * Column IDs to group flat data by — creates collapsible group-header rows.
 * First element = outermost group, last element = innermost group.
 * @example rowGrouping={["department", "team"]}
 */
rowGrouping?: (keyof T & string)[];

/**
 * Fine-grained configuration for the row grouping behaviour.
 * Only relevant when `rowGrouping` is set.
 */
rowGroupingConfig?: RowGroupingConfig<T>;

/**
 * Callback fired when a group row is expanded or collapsed.
 */
onRowGroupExpand?: (info: OnRowGroupExpandInfo) => void;
```

---

## 3. Update `TableConfig` (`types.ts`)

Inside `TableConfig` interface, add:

```ts
/**
 * Show "Expand All / Collapse All" buttons in the toolbar when rowGrouping is active.
 * @default true
 */
enableRowGroupingControls: boolean;
```

---

## 4. Update `defaultConfig` (`core/table-config.ts`)

Find the exported `defaultConfig` object and add:

```ts
enableRowGroupingControls: true,
```

---

## 5. Re-export from `index.ts`

Add to the public barrel export:

```ts
export type {
  RowGroupingAggregation,
  RowGroupingConfig,
  OnRowGroupExpandInfo,
} from "./types";
```

---

## Checklist

- [ ] `RowGroupingAggregation` type added
- [ ] `RowGroupingConfig<T>` interface added
- [ ] `OnRowGroupExpandInfo` interface added
- [ ] `rowGrouping`, `rowGroupingConfig`, `onRowGroupExpand` added to `DataTableProps`
- [ ] `enableRowGroupingControls` added to `TableConfig` interface
- [ ] `enableRowGroupingControls: true` added to `defaultConfig`
- [ ] New types re-exported from `index.ts`
- [ ] `tsc --noEmit` passes with zero errors
