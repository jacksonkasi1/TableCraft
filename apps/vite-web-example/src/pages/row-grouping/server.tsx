import { useState, useCallback, useRef, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DataTable,
  DataTableColumnHeader,
} from "@tablecraft/table";
import type { DataAdapter, QueryResult } from "@tablecraft/table";
import { ChevronRight, Loader2 } from "lucide-react";
import type { RetailNode } from "@/data/retail-tree";

const RETAIL_API = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/manual/retail`;
const LOADING_PREFIX = "__loading__";

const isLoadingRow = (n: RetailNode) => n.id.startsWith(LOADING_PREFIX);

const loadingPlaceholder = (parentId: string): RetailNode => ({
  id: `${LOADING_PREFIX}${parentId}`,
  name: "",
  type: "Product",
  totalSales: 0,
  revenue: 0,
  stores: null,
  avgRating: null,
  children: [],
});

function mergeChildren(
  node: RetailNode,
  cache: Record<string, RetailNode[] | null>
): RetailNode {
  if (!(node.id in cache)) return node;
  const cached = cache[node.id];
  if (cached === null) return { ...node, children: [loadingPlaceholder(node.id)] };
  return {
    ...node,
    children: cached.map((child) => mergeChildren(child, cache)),
  };
}

// ─── Columns ────────────────────────────────────────────────────────────────

const columns: ColumnDef<RetailNode, unknown>[] = [
  {
    accessorKey: "name",
    size: 320,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row, getValue }) => {
      if (isLoadingRow(row.original)) {
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
      isLoadingRow(row.original) ? null : (
        <span className="text-xs text-muted-foreground">{String(getValue())}</span>
      ),
  },
  {
    accessorKey: "totalSales",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Sales" />,
    cell: ({ row, getValue }) =>
      isLoadingRow(row.original) ? null : (
        <span className="font-mono">{(getValue() as number).toLocaleString()}</span>
      ),
  },
  {
    accessorKey: "revenue",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Revenue" />,
    cell: ({ row, getValue }) =>
      isLoadingRow(row.original) ? null : (
        <span className="font-mono font-semibold text-emerald-500">
          ${(getValue() as number).toLocaleString()}
        </span>
      ),
  },
  {
    accessorKey: "stores",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stores" />,
    cell: ({ row, getValue }) => {
      if (isLoadingRow(row.original)) return null;
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
      if (isLoadingRow(row.original)) return null;
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
  const childrenRef = useRef<Record<string, RetailNode[] | null>>({});
  const [version, setVersion] = useState(0);

  const adapter = useMemo<DataAdapter<RetailNode>>(
    () => ({
      async query(params) {
        const qs = new URLSearchParams({
          page: String(params.page),
          pageSize: String(params.pageSize),
        });
        if (params.search)    qs.set("search",    params.search);
        if (params.sort)      qs.set("sort",      params.sort);
        if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

        const res = await fetch(`${RETAIL_API}/tree?${qs}`);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const result: QueryResult<RetailNode> = await res.json();

        return {
          ...result,
          data: result.data.map((row) => mergeChildren(row, childrenRef.current)),
        };
      },
      async queryByIds() {
        return [];
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  const handleRowExpand = useCallback(
    ({ row, isExpanded }: { row: RetailNode; isExpanded: boolean }) => {
      if (!isExpanded) return;
      if (childrenRef.current[row.id] !== undefined) return;

      childrenRef.current[row.id] = null;
      setVersion((v) => v + 1);

      fetch(`${RETAIL_API}/tree/${row.id}/children`)
        .then((r) => {
          if (!r.ok) throw new Error(`API error ${r.status}`);
          return r.json() as Promise<RetailNode[]>;
        })
        .then((children) => {
          childrenRef.current[row.id] = children;
          setVersion((v) => v + 1);
        })
        .catch(() => {
          delete childrenRef.current[row.id];
          setVersion((v) => v + 1);
        });
    },
    []
  );

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
        getSubRows={(row) => row.children}
        getRowCanExpand={(row) =>
          !isLoadingRow(row) &&
          row.type !== "Product" &&
          row.children?.length !== 0
        }
        onRowExpand={handleRowExpand}
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
