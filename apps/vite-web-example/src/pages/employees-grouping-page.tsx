import { DataTable, createStaticAdapter, DataTableColumnHeader } from "@tablecraft/table";
import { useRef } from "react";
import type { TableGroupingAPI } from "@tablecraft/table";
import type { ColumnDef } from "@tanstack/react-table";
import { EMPLOYEES_DATA, type EmployeeRow } from "@/data/employees-grouping";

const adapter = createStaticAdapter<EmployeeRow>(EMPLOYEES_DATA);

const columns: ColumnDef<EmployeeRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
  },
  {
    accessorKey: "department",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
  },
  {
    accessorKey: "team",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
  },
  {
    accessorKey: "salary",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Salary" />,
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold text-emerald-500">
        ${(getValue() as number).toLocaleString()}
      </span>
    ),
    aggregationFn: "sum",
    aggregatedCell: ({ getValue }) => (
      <span className="font-mono font-semibold text-emerald-500">
        ${(getValue() as number).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Location" />,
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Start Date" />,
    cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
  },
];

function ProgrammaticDemo() {
  const groupRef = useRef<TableGroupingAPI | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => groupRef.current?.expandAll()}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          Expand All
        </button>
        <button
          onClick={() => groupRef.current?.collapseAll()}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          Collapse All
        </button>
        <button
          onClick={() => groupRef.current?.expandDepth(0)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          Expand Dept
        </button>
        <button
          onClick={() => groupRef.current?.collapseDepth(0)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          Collapse Dept
        </button>
        <button
          onClick={() => groupRef.current?.toggleDepth(1)}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          Toggle Teams
        </button>
        <button
          onClick={() => {
            const depths = groupRef.current?.getExpandedDepths();
            const p0 = groupRef.current?.getGroupingProperty(0);
            const p1 = groupRef.current?.getGroupingProperty(1);
            const d = [...(depths ?? [])].join(", ") || "none";
            alert(`Open depths: [${d}]\nDepth 0 → "${p0 ?? "—"}"\nDepth 1 → "${p1 ?? "—"}"`);
          }}
          className="px-3 py-1.5 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors cursor-pointer"
        >
          Inspect state
        </button>
      </div>
      <DataTable<EmployeeRow>
        adapter={adapter}
        columns={columns}
        rowGrouping={["department", "team"]}
        groupingRef={groupRef}
        rowGroupingConfig={{ defaultExpanded: false }}
        config={{ enableUrlState: false, enablePagination: false, defaultPageSize: 100 }}
      />
    </div>
  );
}

export function EmployeesGroupingPage() {
  return (
    <div className="container mx-auto p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Row Grouping</h1>
        <p className="text-muted-foreground text-sm">
          Flat employee data grouped into collapsible hierarchies — no changes to the backend needed.
        </p>
      </div>

      {/* Example 1: Group by Department */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Group by Department (salary sum)</h2>
        <DataTable<EmployeeRow>
          adapter={adapter}
          columns={columns}
          rowGrouping={["department"]}
          rowGroupingConfig={{
            defaultExpanded: true,
            aggregations: { salary: "sum" },
          }}
          config={{
            enableUrlState: false,
            enablePagination: false,
            defaultPageSize: 100,
          }}
        />
      </section>

      {/* Example 2: Group by Department then Team */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Group by Department → Team (salary mean)</h2>
        <DataTable<EmployeeRow>
          adapter={adapter}
          columns={columns}
          rowGrouping={["department", "team"]}
          rowGroupingConfig={{
            defaultExpanded: false,
            aggregations: { salary: "mean" },
          }}
          config={{
            enableUrlState: false,
            enablePagination: false,
            defaultPageSize: 100,
          }}
        />
      </section>

      {/* Example 3: Custom group cell renderer */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Custom Group Header (group by location)</h2>
        <DataTable<EmployeeRow>
          adapter={adapter}
          columns={columns}
          rowGrouping={["location"]}
          rowGroupingConfig={{
            defaultExpanded: true,
            renderGroupCell: ({ value, leafRowCount }) => (
              <span className="flex items-center gap-2">
                <span>📍</span>
                <strong>{String(value)}</strong>
                <span className="text-sm text-muted-foreground">
                  ({leafRowCount} {leafRowCount === 1 ? "employee" : "employees"})
                </span>
              </span>
            ),
          }}
          config={{
            enableUrlState: false,
            enablePagination: false,
            defaultPageSize: 100,
          }}
        />
      </section>

      {/* Example 4: Programmatic depth control */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Programmatic Control (groupingRef)</h2>
        <p className="text-sm text-muted-foreground">
          Attach a <code className="text-xs bg-muted px-1 rounded">groupingRef</code> for imperative access:
          expandDepth, collapseDepth, toggleDepth, setExpandedDepths and more.
        </p>
        <ProgrammaticDemo />
      </section>
    </div>
  );
}
