import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  createRestAdapter,
} from "@tablecraft/table";
import type { QueryParams, QueryResult } from "@tablecraft/table";
import { API_BASE_URL } from "@/api";

// ─── Row type ────────────────────────────────────────────────────────────────

interface ProductRow extends Record<string, unknown> {
  id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  isArchived: boolean;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const columns: ColumnDef<ProductRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ getValue }) => (
      <span className="font-medium">{String(getValue())}</span>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
  },
  {
    accessorKey: "description",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground text-sm">{String(getValue() ?? "—")}</span>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold text-emerald-500">
        ${Number(getValue()).toFixed(2)}
      </span>
    ),
    aggregationFn: "mean",
    aggregatedCell: ({ getValue }) => (
      <span className="font-mono text-emerald-500 text-sm">
        avg ${Number(getValue()).toFixed(2)}
      </span>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProductsGroupingPage() {
  // Fetch all products in one request (large pageSize) so client-side grouping
  // sees the full dataset. For very large APIs, move grouping to the server.
  const adapter = useMemo(
    () =>
      createRestAdapter<ProductRow>({
        queryFn: async (params: QueryParams): Promise<QueryResult<ProductRow>> => {
          const url = new URL(`${API_BASE_URL.replace("/engine", "/manual")}/products`, window.location.origin);
          url.searchParams.set("page", String(params.page));
          url.searchParams.set("pageSize", String(params.pageSize));
          if (params.search) url.searchParams.set("search", params.search);
          if (params.sort) url.searchParams.set("sort", params.sortOrder === "desc" ? `-${params.sort}` : params.sort);

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        },
      }),
    []
  );

  return (
    <div className="container mx-auto p-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Products — Server-side Row Grouping</h1>
        <p className="text-muted-foreground text-sm">
          Data fetched from <code className="text-xs bg-muted px-1 rounded">/api/manual/products</code> and
          grouped client-side by <strong>category</strong>. Use a large{" "}
          <code className="text-xs bg-muted px-1 rounded">defaultPageSize</code> so all rows are
          available for grouping.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Group by Category (avg price)</h2>
        <DataTable<ProductRow>
          adapter={adapter}
          columns={columns}
          rowGrouping={["category"]}
          rowGroupingConfig={{
            defaultExpanded: true,
            aggregations: { price: "mean" },
          }}
          config={{
            enableUrlState: false,
            enablePagination: false,
            defaultPageSize: 100,
          }}
        />
      </section>
    </div>
  );
}
