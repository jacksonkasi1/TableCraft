import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { cn } from "./utils/cn";

const getButtonSizeClass = (size: "sm" | "default" | "lg") => {
  switch (size) {
    case "sm":
      return "h-7 w-7 p-0";
    case "lg":
      return "h-11 w-11 p-0";
    default:
      return "h-8 w-8 p-0";
  }
};

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalItems?: number;
  totalSelectedItems?: number;
  pageSizeOptions?: number[];
  size?: "sm" | "default" | "lg";
}

export function DataTablePagination<TData>({
  table,
  totalItems = 0,
  totalSelectedItems = 0,
  pageSizeOptions = [10, 20, 30, 40, 50],
  size = "default",
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex w-full flex-col items-center justify-between gap-4 overflow-auto px-2 py-1 sm:flex-row sm:gap-8">
      <div className="flex-1 text-sm text-muted-foreground">
        {totalSelectedItems} of {totalItems} row(s) selected.
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="whitespace-nowrap text-sm font-medium">Rows per page</p>
          <select
            value={`${table.getState().pagination.pageSize}`}
            onChange={(e) => {
              const numericValue = parseInt(e.target.value, 10);
              if (isNaN(numericValue) || numericValue <= 0) return;
              table.setPagination({
                pageIndex: 0,
                pageSize: numericValue,
              });
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm cursor-pointer"
          >
            {pageSizeOptions.map((ps) => (
              <option key={ps} value={`${ps}`}>
                {ps}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount() || 1}
        </div>
        <div className="flex items-center space-x-2">
          <button
            aria-label="Go to first page"
            className={cn(
              getButtonSizeClass(size),
              "hidden lg:inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            )}
            onClick={() =>
              table.setPagination({
                pageIndex: 0,
                pageSize: table.getState().pagination.pageSize,
              })
            }
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Go to previous page"
            className={cn(
              getButtonSizeClass(size),
              "inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            )}
            onClick={() =>
              table.setPagination({
                pageIndex: table.getState().pagination.pageIndex - 1,
                pageSize: table.getState().pagination.pageSize,
              })
            }
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Go to next page"
            className={cn(
              getButtonSizeClass(size),
              "inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            )}
            onClick={() =>
              table.setPagination({
                pageIndex: table.getState().pagination.pageIndex + 1,
                pageSize: table.getState().pagination.pageSize,
              })
            }
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Go to last page"
            className={cn(
              getButtonSizeClass(size),
              "hidden lg:inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            )}
            onClick={() =>
              table.setPagination({
                pageIndex: table.getPageCount() - 1,
                pageSize: table.getState().pagination.pageSize,
              })
            }
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}