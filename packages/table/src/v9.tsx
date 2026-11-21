"use client";

// ** import types
import type { Table, TableOptions } from "@tanstack/react-table-v8";
import type { LegacyColumnDef, LegacyTableOptions } from "@tanstack/react-table/legacy";
import type { DataTableProps as V8DataTableProps } from "./types";

// ** import core packages
import {
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useLegacyTable,
} from "@tanstack/react-table/legacy";

// ** import components
import { DataTableView } from "./data-table";

/** Manual column definition for the TanStack Table v9 entry point. */
export type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";

/** Props for the TanStack Table v9 backend. */
export interface DataTableProps<T extends Record<string, unknown>>
  extends Omit<V8DataTableProps<T>, "columns"> {
  /** Manual columns using the TanStack Table v9 legacy feature set. */
  columns?: LegacyColumnDef<T, unknown>[];
}

function useV9Table<T extends Record<string, unknown>>(options: TableOptions<T>): Table<T> {
  // TableCraft supplies the options and uses the v8-shaped methods implemented
  // by TanStack's legacy adapter. Keep the incompatible upstream types here.
  const legacyOptions = options as unknown as LegacyTableOptions<T>;
  const table = useLegacyTable<T>({
    ...legacyOptions,
    getFilteredRowModel: getFilteredRowModel<T>(),
    getSortedRowModel: getSortedRowModel<T>(),
    getPaginationRowModel: getPaginationRowModel<T>(),
    getExpandedRowModel: getExpandedRowModel<T>(),
    // The legacy hook registers row models on mount. Grouping can be enabled later.
    getGroupedRowModel: getGroupedRowModel<T>(),
    getFacetedRowModel: getFacetedRowModel<T>(),
    getFacetedUniqueValues: getFacetedUniqueValues<T>(),
  });

  return table as unknown as Table<T>;
}

/** Render a TableCraft table with the TanStack Table v9 backend. */
export function DataTable<T extends Record<string, unknown>>(props: DataTableProps<T>) {
  return <DataTableView {...(props as unknown as V8DataTableProps<T>)} useTable={useV9Table} />;
}
