import { useMemo, useState } from "react";
import { DataTable, hiddenColumns, defineColumnOverrides } from "@tablecraft/table";
import { createProductsAdapter } from "@/generated/products";
import type { ProductsRow, ProductsColumn } from "@/generated/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "../api";
import { Plus, RefreshCw, Tag } from "lucide-react";

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

// ─── before-search ────────────────────────────────────────────────────────────

function BeforeSearch() {
  const adapter = useMemo(() => createProductsAdapter({ baseUrl: API_BASE_URL }), []);
  return (
    <Demo label="Before the search input" placement='startToolbarPlacement="before-search"'>
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        startToolbarPlacement="before-search"
        startToolbarContent={
          <Button size="sm" className="h-9 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Product
          </Button>
        }
        config={{ enableSearch: true, defaultPageSize: 5, pageSizeOptions: [5], enableUrlState: false, columnResizingTableId: "ts-before" }}
      />
    </Demo>
  );
}

// ─── after-search ─────────────────────────────────────────────────────────────

const CATS = ["electronics", "clothing", "home"] as const;
type Cat = (typeof CATS)[number];

function AfterSearch() {
  const [cat, setCat] = useState<Cat | null>(null);
  const adapter = useMemo(
    () => createProductsAdapter({
      baseUrl: API_BASE_URL,
      customFilters: cat ? { category: { operator: "eq", value: cat } } : undefined,
    }),
    [cat],
  );

  return (
    <Demo label="After the search input, before the date filter" placement='startToolbarPlacement="after-search"'>
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        startToolbarPlacement="after-search"
        startToolbarContent={
          <div className="flex items-center gap-1">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            {CATS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(cat === c ? null : c)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  cat === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        }
        config={{ enableSearch: true, defaultPageSize: 5, pageSizeOptions: [5], enableUrlState: false, columnResizingTableId: "ts-after-search" }}
      />
    </Demo>
  );
}

// ─── after-date (default) ─────────────────────────────────────────────────────

function AfterDate() {
  const adapter = useMemo(() => createProductsAdapter({ baseUrl: API_BASE_URL }), []);
  const [syncing, setSyncing] = useState(false);

  return (
    <Demo label="After the date filter (default)" placement='startToolbarPlacement="after-date"'>
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        startToolbarPlacement="after-date"
        startToolbarContent={
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              setTimeout(() => setSyncing(false), 1500);
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync"}
          </Button>
        }
        config={{ enableSearch: true, enableDateFilter: true, defaultPageSize: 5, pageSizeOptions: [5], enableUrlState: false, columnResizingTableId: "ts-after-date" }}
      />
    </Demo>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ToolbarStartPage() {
  return (
    <div className="container mx-auto p-6 space-y-10">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Start Slots</h1>
          <Badge className="font-mono text-xs">startToolbarContent</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Inject into the left toolbar cluster.
          Order: <code className="bg-muted px-1 rounded text-xs">before-search → [search] → after-search → [date] → after-date</code>
        </p>
      </div>

      <BeforeSearch />
      <AfterSearch />
      <AfterDate />
    </div>
  );
}
