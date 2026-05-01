import { useMemo, useState } from "react";
import {
  DataTable,
  hiddenColumns,
  defineColumnOverrides,
} from "@tablecraft/table";
import { createProductsAdapter } from "@/generated/products";
import type { ProductsRow, ProductsColumn } from "@/generated/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "../api";
import {
  Upload,
  Trash2,
  Archive,
  ArchiveRestore,
  SlidersHorizontal,
} from "lucide-react";

// ─── Shared column overrides ──────────────────────────────────────────────────

const columnOverrides = defineColumnOverrides<ProductsRow>()({
  price: ({ value }) => (
    <span className="font-mono font-semibold text-emerald-500">
      ${(value as number).toFixed(2)}
    </span>
  ),
  isArchived: ({ value }) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        value
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      }`}
    >
      {value ? "Archived" : "Active"}
    </span>
  ),
});

const hidden = hiddenColumns<ProductsColumn>(["id", "tenantId", "metadata", "tags"]);

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  description,
  placement,
  children,
}: {
  title: string;
  badge: string;
  description: string;
  placement: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Badge variant="secondary">{badge}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <code className="text-xs bg-muted px-2 py-0.5 rounded">
            endToolbarPlacement=&quot;{placement}&quot;
          </code>
        </div>
      </div>
      {children}
    </section>
  );
}

// ─── Example 1: Bulk actions — context-aware button before export ─────────────

function BulkActionsDemo() {
  const adapter = useMemo(
    () => createProductsAdapter({ baseUrl: API_BASE_URL }),
    [],
  );
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <Section
      title="Bulk Actions"
      badge="before-export"
      placement="before-export"
      description={`The endToolbarContent function receives ToolbarContext so you can read
        selectedIds, totalSelected, etc. The button only renders when rows are selected.`}
    >
      {lastAction && (
        <div className="text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
          Last action: {lastAction}
        </div>
      )}
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        endToolbarPlacement="before-export"
        endToolbarContent={(ctx) =>
          ctx.totalSelected > 0 ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  setLastAction(
                    `Archived ${ctx.totalSelected} product(s): [${ctx.selectedIds.join(", ")}]`,
                  );
                  ctx.clearSelection();
                }}
              >
                <Archive className="h-3.5 w-3.5" />
                Archive ({ctx.totalSelected})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={() => {
                  setLastAction(
                    `Restored ${ctx.totalSelected} product(s): [${ctx.selectedIds.join(", ")}]`,
                  );
                  ctx.clearSelection();
                }}
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                Restore
              </Button>
            </div>
          ) : null
        }
        config={{
          enableRowSelection: true,
          enableSearch: true,
          enableExport: true,
          enableColumnResizing: true,
          defaultPageSize: 5,
          pageSizeOptions: [5, 10, 20],
          columnResizingTableId: "tp-bulk",
          enableUrlState: false,
        }}
      />
    </Section>
  );
}

// ─── Example 2: Import button — static, rightmost slot ───────────────────────

function ImportDemo() {
  const adapter = useMemo(
    () => createProductsAdapter({ baseUrl: API_BASE_URL }),
    [],
  );

  return (
    <Section
      title="Import Button (rightmost)"
      badge="after-settings"
      placement="after-settings"
      description="Static ReactNode in the last slot — useful for an import/upload action
        that should sit outside the built-in control group."
    >
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
        config={{
          enableSearch: true,
          enableExport: true,
          defaultPageSize: 5,
          pageSizeOptions: [5, 10],
          columnResizingTableId: "tp-import",
          enableUrlState: false,
        }}
      />
    </Section>
  );
}

// ─── Example 3: Category filter chips — before the view-options button ────────

const CATEGORIES = ["electronics", "clothing", "home"] as const;
type Category = (typeof CATEGORIES)[number];

function CategoryFilterDemo() {
  const [activeCat, setActiveCat] = useState<Category | null>(null);

  const adapter = useMemo(
    () =>
      createProductsAdapter({
        baseUrl: API_BASE_URL,
        customFilters: activeCat
          ? { category: { operator: "eq", value: activeCat } }
          : undefined,
      }),
    [activeCat],
  );

  return (
    <Section
      title="Custom Filter Chips"
      badge="before-view"
      placement="before-view"
      description="Injects category chips between the export button and the view-options
        button. Drives a customFilters value on the adapter — no search input needed."
    >
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        endToolbarPlacement="before-view"
        endToolbarContent={
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCat(activeCat === cat ? null : cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  activeCat === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        }
        config={{
          enableSearch: false,
          enableExport: true,
          defaultPageSize: 5,
          pageSizeOptions: [5, 10],
          columnResizingTableId: "tp-cats",
          enableUrlState: false,
        }}
      />
    </Section>
  );
}

// ─── Example 4: Delete with selection count — after-view ─────────────────────

function DeleteDemo() {
  const adapter = useMemo(
    () => createProductsAdapter({ baseUrl: API_BASE_URL }),
    [],
  );

  return (
    <Section
      title="Destructive Action (default slot)"
      badge="after-view"
      placement="after-view"
      description={`The default placement — sits between view-options and settings.
        Receives context so the button can reflect the selection count.`}
    >
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hidden}
        columnOverrides={columnOverrides}
        endToolbarContent={(ctx) => (
          <Button
            size="sm"
            variant="outline"
            disabled={ctx.totalSelected === 0}
            className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 disabled:opacity-40"
            onClick={() => {
              if (ctx.totalSelected === 0) return;
              alert(`Delete ${ctx.totalSelected} product(s)?`);
              ctx.clearSelection();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete{ctx.totalSelected > 0 ? ` (${ctx.totalSelected})` : ""}
          </Button>
        )}
        config={{
          enableRowSelection: true,
          enableSearch: true,
          enableExport: true,
          enableColumnVisibility: true,
          defaultPageSize: 5,
          pageSizeOptions: [5, 10],
          columnResizingTableId: "tp-delete",
          enableUrlState: false,
        }}
      />
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ToolbarPlacementPage() {
  return (
    <div className="container mx-auto p-6 space-y-12">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Toolbar Placement</h1>
          <Badge>endToolbarContent + endToolbarPlacement</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Inject custom controls anywhere in the right toolbar cluster without
          moving built-in buttons. Pass a{" "}
          <code className="text-xs bg-muted px-1 rounded">ReactNode</code> or a
          function that receives{" "}
          <code className="text-xs bg-muted px-1 rounded">ToolbarContext</code>{" "}
          (selectedIds, totalSelected, clearSelection, search, dateRange).
        </p>

        {/* Slot map */}
        <div className="mt-4 p-3 rounded-md border bg-muted/40 text-xs font-mono text-muted-foreground">
          <span className="text-foreground font-semibold">Right cluster order: </span>
          {(
            [
              "before-grouping",
              "after-grouping / before-export",
              "after-export / before-view",
              "after-view / before-settings",
              "after-settings",
            ] as const
          ).map((slot, i, arr) => (
            <span key={slot}>
              <span className="text-foreground">{slot}</span>
              {i < arr.length - 1 ? (
                <span className="text-muted-foreground/50"> → </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <BulkActionsDemo />
      <ImportDemo />
      <CategoryFilterDemo />
      <DeleteDemo />
    </div>
  );
}
