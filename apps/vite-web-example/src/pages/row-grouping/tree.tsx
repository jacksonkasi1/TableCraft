import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, DataTableColumnHeader, createStaticAdapter } from "@tablecraft/table";
import { RETAIL_TREE, type RetailNode } from "@/data/retail-tree";

const adapter = createStaticAdapter<RetailNode>(RETAIL_TREE);

const TYPE_BADGE: Record<RetailNode["type"], string> = {
  Region:  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Store:   "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Product: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

const columns: ColumnDef<RetailNode, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ getValue }) => <span className="font-medium">{String(getValue())}</span>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ getValue }) => {
      const t = getValue() as RetailNode["type"];
      return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[t]}`}>
          {t}
        </span>
      );
    },
  },
  {
    accessorKey: "totalSales",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Sales" />,
    cell: ({ getValue }) => (
      <span className="font-mono">{(getValue() as number).toLocaleString()}</span>
    ),
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold text-emerald-500">
        ${(getValue() as number).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "stores",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stores" />,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? (
        <span className="font-mono">{v}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "avgRating",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Avg Rating" />,
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return v != null ? (
        <span className="flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          <span className="font-mono">{v.toFixed(1)}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
];

export function RowGroupingTreePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Client-side Tree (Regions → Stores → Products)</h2>
        <p className="text-sm text-muted-foreground">
          Pass <code className="text-xs bg-muted px-1 rounded">getSubRows</code> to enable
          hierarchical rendering. The data already contains nested{" "}
          <code className="text-xs bg-muted px-1 rounded">children</code> arrays — no grouping
          config needed.
        </p>
        <DataTable<RetailNode>
          adapter={adapter}
          columns={columns}
          getSubRows={(row) => row.children as RetailNode[] | undefined}
          config={{
            enableUrlState: false,
            enablePagination: false,
            defaultPageSize: 200,
          }}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Server-side Pattern</h2>
        <p className="text-sm text-muted-foreground">
          For server-side tree data, use <code className="text-xs bg-muted px-1 rounded">createRestAdapter</code> with a{" "}
          <code className="text-xs bg-muted px-1 rounded">queryFn</code> that returns the full nested JSON from your API.
          Pass <code className="text-xs bg-muted px-1 rounded">getSubRows</code> the same way — the adapter only fetches data,
          tree rendering is handled by the table.
        </p>
        <div className="rounded-md border bg-muted/40 p-4 text-sm font-mono text-muted-foreground space-y-1">
          <p>{"const adapter = createRestAdapter<TreeNode>({"}</p>
          <p className="pl-4">{"queryFn: async (params) => {"}</p>
          <p className="pl-8">{"const res = await fetch(`/api/tree?page=${params.page}`);"}</p>
          <p className="pl-8">{"return res.json(); // { data: [...nested], total, page, pageSize }"}</p>
          <p className="pl-4">{"}"}</p>
          <p>{"});"}</p>
          <p>&nbsp;</p>
          <p>{"<DataTable"}</p>
          <p className="pl-4">{"adapter={adapter}"}</p>
          <p className="pl-4">{"columns={columns}"}</p>
          <p className="pl-4">{"getSubRows={(row) => row.children}"}</p>
          <p>{"/>"}</p>
        </div>
      </section>
    </div>
  );
}
