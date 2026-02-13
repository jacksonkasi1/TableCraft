import { useState } from "react";
import type { Table } from "@tanstack/react-table";
import { DownloadIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExportableData, DataTransformFunction, ExportConfig, TableConfig } from "./types";
import { exportToCSV, exportToExcel } from "./utils/export-utils";
import { cn } from "./utils/cn";

interface DataTableExportProps<TData extends ExportableData> {
  table: Table<TData>;
  data: TData[];
  selectedCount: number;
  getSelectedItems?: () => Promise<TData[]>;
  exportConfig?: ExportConfig<TData>;
  tableConfig: TableConfig;
}

export function DataTableExport<TData extends ExportableData>({
  table,
  data,
  selectedCount,
  getSelectedItems,
  exportConfig,
  tableConfig,
}: DataTableExportProps<TData>) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const entityName = exportConfig?.entityName || "items";
  const enableCsv = exportConfig?.enableCsv !== false;
  const enableExcel = exportConfig?.enableExcel !== false;
  const hasSelection = selectedCount > 0;

  const getExportMeta = () => {
    const visibleColumns = table
      .getAllColumns()
      .filter((col) => col.getIsVisible())
      .filter((col) => col.id !== "actions" && col.id !== "select");

    const columnOrder = table.getState().columnOrder;
    const orderedColumns =
      columnOrder.length > 0
        ? [...visibleColumns].sort((a, b) => {
            const aIdx = columnOrder.indexOf(a.id);
            const bIdx = columnOrder.indexOf(b.id);
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
          })
        : visibleColumns;

    const visibleColumnIds = orderedColumns.map((col) => col.id);
    const allTableColumnIds = table
      .getAllColumns()
      .filter((col) => col.id !== "actions" && col.id !== "select")
      .map((col) => col.id);

    let exportHeaders: string[];
    const cfgHeaders = exportConfig?.headers;

    if (tableConfig.allowExportNewColumns === false) {
      exportHeaders =
        cfgHeaders && cfgHeaders.length > 0
          ? cfgHeaders.filter((h) => visibleColumnIds.includes(h))
          : visibleColumnIds;
    } else {
      if (cfgHeaders && cfgHeaders.length > 0) {
        const existing = cfgHeaders.filter(
          (h) => allTableColumnIds.includes(h) && visibleColumnIds.includes(h)
        );
        const newHeaders = cfgHeaders.filter(
          (h) => !allTableColumnIds.includes(h)
        );
        exportHeaders = [...existing, ...newHeaders];
      } else {
        exportHeaders = visibleColumnIds;
      }
    }

    const exportColumnMapping =
      exportConfig?.columnMapping ||
      (() => {
        const mapping: Record<string, string> = {};
        orderedColumns.forEach((col) => {
          const headerText = col.columnDef.header as string;
          if (headerText && typeof headerText === "string") {
            mapping[col.id] = headerText;
          } else {
            mapping[col.id] = col.id
              .split(/(?=[A-Z])|_/)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(" ");
          }
        });
        return mapping;
      })();

    const exportColumnWidths = exportConfig?.columnWidths
      ? exportHeaders.map(
          (_, i) => exportConfig.columnWidths![i] || { wch: 15 }
        )
      : exportHeaders.map(() => ({ wch: 15 }));

    return { exportHeaders, exportColumnMapping, exportColumnWidths };
  };

  const handleExport = async (
    type: "csv" | "excel",
    mode: "selected" | "page"
  ) => {
    if (isLoading) return;
    setIsOpen(false);

    try {
      setIsLoading(true);

      let exportRows: TData[];
      if (mode === "selected" && getSelectedItems) {
        toast.loading("Preparing export...", { id: "export-toast" });
        exportRows = await getSelectedItems();
      } else {
        exportRows = data;
      }

      if (exportRows.length === 0) {
        toast.error("No data to export", { id: "export-toast" });
        return;
      }

      const { exportHeaders, exportColumnMapping, exportColumnWidths } =
        getExportMeta();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${entityName}-export-${timestamp}`;

      let success = false;
      if (type === "csv") {
        success = exportToCSV(
          exportRows,
          filename,
          exportHeaders,
          exportColumnMapping,
          exportConfig?.transformFunction as DataTransformFunction<ExportableData> | undefined
        );
      } else {
        success = await exportToExcel(
          exportRows,
          filename,
          exportColumnMapping,
          exportColumnWidths,
          exportHeaders,
          exportConfig?.transformFunction as DataTransformFunction<ExportableData> | undefined
        );
      }

      if (success) {
        toast.success(
          `Exported ${exportRows.length} ${entityName} to ${type.toUpperCase()}`,
          { id: "export-toast" }
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed", { id: "export-toast" });
    } finally {
      setIsLoading(false);
    }
  };

  const btnSize =
    tableConfig.size === "sm"
      ? "h-8 px-3"
      : tableConfig.size === "lg"
        ? "h-11 px-5"
        : "h-9 px-4";

  return (
    <div className="relative">
      <button
        className={cn(
          btnSize,
          "inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
        )}
        disabled={isLoading}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Export
            {hasSelection && <span className="ml-1">({selectedCount})</span>}
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-[220px] rounded-md border bg-popover p-1 shadow-md text-popover-foreground animate-in fade-in-0 zoom-in-95">
            {hasSelection ? (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Selected ({selectedCount})
                </div>
                {enableCsv && (
                  <div
                    onClick={() => handleExport("csv", "selected")}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Export as CSV
                  </div>
                )}
                {enableExcel && (
                  <div
                    onClick={() => handleExport("excel", "selected")}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Export as XLS
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Current Page
                </div>
                {enableCsv && (
                  <div
                    onClick={() => handleExport("csv", "page")}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Export as CSV
                  </div>
                )}
                {enableExcel && (
                  <div
                    onClick={() => handleExport("excel", "page")}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    Export as XLS
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
