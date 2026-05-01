import { useMemo, useState } from "react";
import { DataTable, hiddenColumns, defineColumnOverrides } from "@tablecraft/table";
import { createProductsAdapter } from "@/generated/products";
import type { ProductsRow, ProductsColumn } from "@/generated/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "../api";
import { Upload, Trash2, Archive, ArchiveRestore, SlidersHorizontal } from "lucide-react";

const columnOverrides = defineColumnOverrides<ProductsRow>()({
  price: ({ value }) => (
    <span className="font-mono font-semibold text-emerald-500">
      ${(value as number).toFixed(2)}
    </span>
  ),
  isArchived: ({ value }) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      value
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    }`}>
      {value ? "Archived" : "Active"}
    </span>
  ),
});

const hidden = hiddenColumns<ProductsColumn>(["id", "tenantId", "metadata", "tags", "description"]);

function Demo({
  label,
  placement,
  children,
}: {
  label: string;
  placement: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="outline" className="font-mono text-xs">{placement}</Badge>
      </div>
      {children}
    </section>
  );
}

// ─── before-export: bulk actions ──────────────────────────────────────────────

function BulkActionsDemo() {
  const adapter = useMemo(() => createProductsAdapter({ baseUrl: API_BASE_URL }), []);
  const [log, setLog] = useState<string | null>(null);

  return (
    <Demo label="Bulk actions (context-aware)" placement='endToolbarPlacement="before-export"'>
      {log && <p className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-md">{log}</p>}
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        endToolbarPlacement="before-export"
        endToolbarContent={(ctx) =>
          ctx.totalSelected > 0 ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setLog(`Archived ${ctx.totalSelected}: [${ctx.selectedIds.join(", ")}]`); ctx.clearSelection(); }}>
                <Archive className="h-3.5 w-3.5" />
                Archive ({ctx.totalSelected})
              </Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5"
                onClick={() => { setLog(`Restored ${ctx.totalSelected}: [${ctx.selectedIds.join(", ")}]`); ctx.clearSelection(); }}>
                <ArchiveRestore className="h-3.5 w-3.5" />
                Restore
              </Button>
            </div>
          ) : null
        }
        config={{ enableRowSelection: true, enableSearch: true, enableExport: true, defaultPageSize: 5, pageSizeOptions: [5, 10], columnResizingTableId: "tp-bulk", enableUrlState: false }}
      />
    </Demo>
  );
}

// ─── after-settings: import (rightmost) ──────────────────────────────────────

function ImportDemo() {
  const adapter = useMemo(() => createProductsAdapter({ baseUrl: API_BASE_URL }), []);
  return (
    <Demo label="Import button — rightmost slot" placement='endToolbarPlacement="after-settings"'>
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        endToolbarPlacement="after-settings"
        endToolbarContent={
          <Button size="sm" variant="outline" className="h-9 gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
        }
        config={{ enableSearch: true, enableExport: true, defaultPageSize: 5, pageSizeOptions: [5], columnResizingTableId: "tp-import", enableUrlState: false }}
      />
    </Demo>
  );
}

// ─── before-view: category filter chips ──────────────────────────────────────

const CATS = ["electronics", "clothing", "home"] as const;
type Cat = (typeof CATS)[number];

function CategoryFilterDemo() {
  const [activeCat, setActiveCat] = useState<Cat | null>(null);
  const adapter = useMemo(
    () => createProductsAdapter({
      baseUrl: API_BASE_URL,
      customFilters: activeCat ? { category: { operator: "eq", value: activeCat } } : undefined,
    }),
    [activeCat],
  );

  return (
    <Demo label="Category chips driving customFilters" placement='endToolbarPlacement="before-view"'>
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        endToolbarPlacement="before-view"
        endToolbarContent={
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            {CATS.map((c) => (
              <button key={c} type="button"
                onClick={() => setActiveCat(activeCat === c ? null : c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  activeCat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                {c}
              </button>
            ))}
          </div>
        }
        config={{ enableSearch: false, enableExport: true, defaultPageSize: 5, pageSizeOptions: [5], columnResizingTableId: "tp-cats", enableUrlState: false }}
      />
    </Demo>
  );
}

// ─── after-view (default): delete with count ──────────────────────────────────

function DeleteDemo() {
  const adapter = useMemo(() => createProductsAdapter({ baseUrl: API_BASE_URL }), []);
  return (
    <Demo label="Delete — default slot, disabled until rows selected" placement='endToolbarPlacement="after-view" (default)'>
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        endToolbarContent={(ctx) => (
          <Button size="sm" variant="outline" disabled={ctx.totalSelected === 0}
            className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 disabled:opacity-40"
            onClick={() => { alert(`Delete ${ctx.totalSelected}?`); ctx.clearSelection(); }}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete{ctx.totalSelected > 0 ? ` (${ctx.totalSelected})` : ""}
          </Button>
        )}
        config={{ enableRowSelection: true, enableSearch: true, enableExport: true, enableColumnVisibility: true, defaultPageSize: 5, pageSizeOptions: [5], columnResizingTableId: "tp-delete", enableUrlState: false }}
      />
    </Demo>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ToolbarPlacementPage() {
  return (
    <div className="container mx-auto p-6 space-y-10">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">End Slots</h1>
          <Badge className="font-mono text-xs">endToolbarContent</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Inject into the right toolbar cluster. Order:{" "}
          <code className="bg-muted px-1 rounded text-xs">
            before-grouping → before-export → after-export / before-view → after-view / before-settings → after-settings
          </code>
        </p>
      </div>

      <BulkActionsDemo />
      <ImportDemo />
      <CategoryFilterDemo />
      <DeleteDemo />
    </div>
  );
}
