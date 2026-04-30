# Phase 5 — Demo App & Documentation

**Agent write scope:** `apps/vite-web-example/…` (new files only), `packages/table/README.md` (append only)
**Depends on:** Phase 2 + Phase 3 merged
**Blocks:** nothing (final phase)

---

## Goal

Ship a runnable demo page that shows row grouping in action and update the README with usage docs.

---

## 1. Demo Data File

Create `apps/vite-web-example/src/data/employees.ts`:

```ts
export interface Employee {
  id: string;
  name: string;
  department: string;
  team: string;
  role: string;
  salary: number;
  location: string;
  startDate: string;
}

export const EMPLOYEES: Employee[] = [
  { id: "1",  name: "Alice Chen",     department: "Engineering", team: "Frontend",  role: "Senior Engineer",  salary: 130000, location: "SF",     startDate: "2021-03-01" },
  { id: "2",  name: "Bob Martinez",   department: "Engineering", team: "Frontend",  role: "Junior Engineer",  salary: 85000,  location: "NY",     startDate: "2023-06-15" },
  { id: "3",  name: "Carol Kim",      department: "Engineering", team: "Backend",   role: "Staff Engineer",   salary: 155000, location: "Remote", startDate: "2019-11-20" },
  { id: "4",  name: "David Park",     department: "Engineering", team: "Backend",   role: "Senior Engineer",  salary: 135000, location: "SF",     startDate: "2020-07-10" },
  { id: "5",  name: "Eva Rossi",      department: "Design",      team: "UX",        role: "Lead Designer",    salary: 120000, location: "NY",     startDate: "2020-02-14" },
  { id: "6",  name: "Frank Nguyen",   department: "Design",      team: "UX",        role: "Designer",         salary: 95000,  location: "SF",     startDate: "2022-09-01" },
  { id: "7",  name: "Grace Liu",      department: "Design",      team: "Brand",     role: "Senior Designer",  salary: 110000, location: "Remote", startDate: "2021-05-17" },
  { id: "8",  name: "Hiro Tanaka",    department: "Product",     team: "Growth",    role: "PM",               salary: 140000, location: "SF",     startDate: "2020-01-06" },
  { id: "9",  name: "Isla Scott",     department: "Product",     team: "Core",      role: "Senior PM",        salary: 160000, location: "NY",     startDate: "2018-08-22" },
  { id: "10", name: "James O'Brien",  department: "Product",     team: "Growth",    role: "APM",              salary: 90000,  location: "Remote", startDate: "2023-01-10" },
];
```

---

## 2. Mock Adapter

Create `apps/vite-web-example/src/data/employees-adapter.ts`:

```ts
import type { DataAdapter, QueryParams, QueryResult } from "@tablecraft/table";
import { EMPLOYEES, type Employee } from "./employees";

export const employeesAdapter: DataAdapter<Employee> = {
  async query(params: QueryParams): Promise<QueryResult<Employee>> {
    let rows = [...EMPLOYEES];

    if (params.search) {
      const q = params.search.toLowerCase();
      rows = rows.filter(
        (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
      );
    }

    if (params.sortBy) {
      rows.sort((a, b) => {
        const va = a[params.sortBy as keyof Employee];
        const vb = b[params.sortBy as keyof Employee];
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
        return params.sortOrder === "desc" ? -cmp : cmp;
      });
    }

    const total = rows.length;
    const start = ((params.page ?? 1) - 1) * (params.pageSize ?? 10);
    const data = rows.slice(start, start + (params.pageSize ?? 10));

    return { data, meta: { total, page: params.page ?? 1, pageSize: params.pageSize ?? 10, totalPages: Math.ceil(total / (params.pageSize ?? 10)) } };
  },
};
```

---

## 3. Demo Page Component

Create `apps/vite-web-example/src/pages/EmployeeGroupingDemo.tsx`:

```tsx
import { DataTable } from "@tablecraft/table";
import { employeesAdapter } from "../data/employees-adapter";

export default function EmployeeGroupingDemo() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Row Grouping Demo</h1>
      <p className="text-muted-foreground">
        Flat employee data grouped by Department → Team.
        Salary column shows a sum aggregate per group.
      </p>

      {/* Example 1: Single-level grouping */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Group by Department</h2>
        <DataTable
          adapter={employeesAdapter}
          rowGrouping={["department"]}
          rowGroupingConfig={{
            defaultExpanded: true,
            aggregations: { salary: "sum" },
          }}
          config={{ enableUrlState: false }}
        />
      </section>

      {/* Example 2: Multi-level grouping */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Group by Department → Team</h2>
        <DataTable
          adapter={employeesAdapter}
          rowGrouping={["department", "team"]}
          rowGroupingConfig={{
            defaultExpanded: false,
            aggregations: { salary: "mean" },
          }}
          config={{ enableUrlState: false }}
        />
      </section>

      {/* Example 3: Custom group cell renderer */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Custom Group Header</h2>
        <DataTable
          adapter={employeesAdapter}
          rowGrouping={["location"]}
          rowGroupingConfig={{
            renderGroupCell: ({ columnId, value, leafRowCount }) => (
              <span className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <strong>{String(value)}</strong>
                <span className="text-sm text-muted-foreground">({leafRowCount} employees)</span>
              </span>
            ),
          }}
          config={{ enableUrlState: false }}
        />
      </section>
    </div>
  );
}
```

---

## 4. Register the Route

In the vite-web-example router (usually `src/App.tsx` or `src/main.tsx`), add:

```tsx
import EmployeeGroupingDemo from "./pages/EmployeeGroupingDemo";

// Add route:
<Route path="/demo/row-grouping" element={<EmployeeGroupingDemo />} />

// Add nav link:
<a href="/demo/row-grouping">Row Grouping</a>
```

---

## 5. README Update (`packages/table/README.md`)

Append a new `## Row Grouping` section:

```md
## Row Grouping

Group flat data into collapsible hierarchies without changing your API:

\`\`\`tsx
<DataTable
  adapter={employeesAdapter}
  rowGrouping={["department", "team"]}
  rowGroupingConfig={{
    defaultExpanded: true,
    aggregations: { salary: "sum" },
  }}
/>
\`\`\`

| Prop | Type | Description |
|---|---|---|
| `rowGrouping` | `string[]` | Column IDs to group by (left = outermost level) |
| `rowGroupingConfig.defaultExpanded` | `boolean` | Start all groups open (default: `false`) |
| `rowGroupingConfig.aggregations` | `Record<string, AggFn>` | Aggregate values to show in group rows |
| `rowGroupingConfig.renderGroupCell` | `fn` | Custom renderer for group-header cell |
| `onRowGroupExpand` | `fn` | Callback fired on expand / collapse |
| `config.enableRowGroupingControls` | `boolean` | Show Expand All / Collapse All in toolbar (default: `true`) |
```

---

## Checklist

- [ ] `employees.ts` data file created
- [ ] `employees-adapter.ts` mock adapter created
- [ ] `EmployeeGroupingDemo.tsx` page created with 3 examples
- [ ] Route registered in the demo app
- [ ] `README.md` `## Row Grouping` section appended
- [ ] Demo runs locally: `bun run dev` in `apps/vite-web-example`
- [ ] All three demo examples render correctly
- [ ] Expand / Collapse All toolbar buttons visible in demo
