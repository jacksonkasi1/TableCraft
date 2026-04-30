import { DataTable, createStaticAdapter } from "@tablecraft/table";
import { EMPLOYEES_DATA, type EmployeeRow } from "@/data/employees-grouping";

const adapter = createStaticAdapter<EmployeeRow>(EMPLOYEES_DATA);

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
          rowGrouping={["department"]}
          rowGroupingConfig={{
            defaultExpanded: true,
            aggregations: { salary: "sum" },
          }}
          config={{
            enableUrlState: false,
            enablePagination: false,
          }}
        />
      </section>

      {/* Example 2: Group by Department then Team */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Group by Department → Team (salary mean)</h2>
        <DataTable<EmployeeRow>
          adapter={adapter}
          rowGrouping={["department", "team"]}
          rowGroupingConfig={{
            defaultExpanded: false,
            aggregations: { salary: "mean" },
          }}
          config={{
            enableUrlState: false,
            enablePagination: false,
          }}
        />
      </section>

      {/* Example 3: Custom group cell renderer */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Custom Group Header (group by location)</h2>
        <DataTable<EmployeeRow>
          adapter={adapter}
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
          }}
        />
      </section>
    </div>
  );
}
