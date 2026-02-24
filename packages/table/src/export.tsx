import { useState } from "react";
import type { Table } from "@tanstack/react-table";
import { DownloadIcon, Loader2, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import type { ExportableData, DataTransformFunction, ExportConfig, TableConfig } from "./types";
import { exportToCSV, exportToExcel } from "./utils/export-utils";
import { cn } from "./utils/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/popover";

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

    // Start with all visible columns, remove any listed in removeHeaders
    const removeSet = new Set((exportConfig?.removeHeaders as string[]) ?? []);
    const exportHeaders = visibleColumnIds.filter((id) => !removeSet.has(id));

    const exportColumnMapping: Record<string, string> =
      (exportConfig?.columnMapping as Record<string, string>) ||
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            btnSize,
            "cursor-pointer"
          )}
          disabled={isLoading}
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
      </PopoverTrigger>

      <PopoverContent align="end" className="w-60">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">
              {hasSelection ? `Selected (${selectedCount})` : "Current Page"}
            </h4>
          </div>
          <div className="grid gap-2">
            {enableCsv && (
              <button
                onClick={() => handleExport("csv", hasSelection ? "selected" : "page")}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                  btnSize,
                  "justify-start w-full"
                )}
              >
                <FileJson className="mr-2 h-4 w-4" />
                Export as CSV
              </button>
            )}
            {enableExcel && (
              <button
                onClick={() => handleExport("excel", hasSelection ? "selected" : "page")}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                  btnSize,
                  "justify-start w-full"
                )}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as XLSX
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
