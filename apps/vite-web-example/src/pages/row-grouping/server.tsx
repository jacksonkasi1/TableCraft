import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
  isTreeLoadingRow,
  useTreeAdapter,
} from "@tablecraft/table";
import { ChevronRight, Loader2 } from "lucide-react";
import type { RetailNode } from "@/data/retail-tree";

const RETAIL_API = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/manual/retail`;

// ─── Columns ────────────────────────────────────────────────────────────────

const columns: ColumnDef<RetailNode, unknown>[] = [
  {
    accessorKey: "name",
    size: 320,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row, getValue }) => {
      if (isTreeLoadingRow(row.original)) {
        return (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Loading…</span>
          </span>
        );
      }
      const breadcrumb = row.original.breadcrumb;
      return (
        <span className="flex flex-col gap-0.5">
          <span
            className={
              row.depth === 0 ? "font-semibold" : row.depth === 1 ? "font-medium" : ""
            }
          >
            {String(getValue())}
          </span>
          {breadcrumb && (
            <span className="text-xs text-muted-foreground">{breadcrumb}</span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: "type",
    size: 90,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row, getValue }) =>
      isTreeLoadingRow(row.original) ? null : (
        <span className="text-xs text-muted-foreground">{String(getValue())}</span>
      ),
  },
  {
    accessorKey: "totalSales",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Sales" />,
    cell: ({ row, getValue }) =>
      isTreeLoadingRow(row.original) ? null : (
        <span className="font-mono">{(getValue() as number).toLocaleString()}</span>
      ),
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
    cell: ({ row, getValue }) =>
      isTreeLoadingRow(row.original) ? null : (
        <span className="font-mono font-semibold text-emerald-500">
          ${(getValue() as number).toLocaleString()}
        </span>
      ),
  },
  {
    accessorKey: "stores",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stores" />,
    cell: ({ row, getValue }) => {
      if (isTreeLoadingRow(row.original)) return null;
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
    cell: ({ row, getValue }) => {
      if (isTreeLoadingRow(row.original)) return null;
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

// ─── Page ───────────────────────────────────────────────────────────────────

export function RowGroupingServerPage() {
  const { adapter, treeProps, isLoadingRow } = useTreeAdapter<RetailNode>({
    list: { url: `${RETAIL_API}/tree` },
    children: { url: (id) => `${RETAIL_API}/tree/${id}/children` },
    loadingRow: (_parentId, loadingId) => ({
      id: loadingId,
      name: "",
      type: "Product",
      totalSales: 0,
      revenue: 0,
      stores: null,
      avgRating: null,
      children: [],
    }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Server-side Lazy Tree — Regions → Stores → Products
        </h2>
        <p className="text-sm text-muted-foreground">
          Top-level regions are fetched from the DB with server-side search &
          sort. Click{" "}
          <ChevronRight className="inline h-3.5 w-3.5 align-middle" /> to
          expand — children are fetched on demand from the API, each level
          independently.
        </p>
      </div>

      <DataTable<RetailNode>
        adapter={adapter}
        columns={columns}
        {...treeProps}
        getRowCanExpand={(row) =>
          !isLoadingRow(row) &&
          row.type !== "Product" &&
          row.children?.length !== 0
        }
        config={{
          enableUrlState: true,
          enablePagination: true,
          enableDateFilter: false,
          keepPreviousData: true,
          defaultPageSize: 10,
          searchPlaceholder: "Search regions, stores, products…",
        }}
      />
    </div>
  );
}
