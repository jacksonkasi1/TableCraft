import type { ColumnDef } from "@tanstack/react-table";

function hasIdAndSize<TData>(
  column: ColumnDef<TData, unknown>
): column is ColumnDef<TData, unknown> & { id: string; size: number } {
  return (
    "id" in column &&
    typeof column.id === "string" &&
    "size" in column &&
    typeof column.size === "number"
  );
}

function hasAccessorKeyAndSize<TData>(
  column: ColumnDef<TData, unknown>
): column is ColumnDef<TData, unknown> & { accessorKey: string; size: number } {
  return (
    "accessorKey" in column &&
    typeof column.accessorKey === "string" &&
    "size" in column &&
    typeof column.size === "number"
  );
}

/**
 * Extract default column sizes from column definitions.
 */
export function extractDefaultColumnSizes<TData>(
  columns: ColumnDef<TData, unknown>[]
): Record<string, number> {
  const defaultSizing: Record<string, number> = {};

  columns.forEach((column) => {
    if (hasIdAndSize(column)) {
      defaultSizing[column.id] = column.size;
    } else if (hasAccessorKeyAndSize(column)) {
      defaultSizing[column.accessorKey] = column.size;
    }
  });

  return defaultSizing;
}

function isValidColumnSizing(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every(
    (size) => typeof size === "number" && !Number.isNaN(size) && size > 0
  );
}

/**
 * Initialize column sizes from localStorage or defaults.
 */
export function initializeColumnSizes<TData>(
  columns: ColumnDef<TData, unknown>[],
  tableId: string,
  setColumnSizing: (sizes: Record<string, number>) => void
): void {
  if (columns.length === 0) return;

  const defaultSizing = extractDefaultColumnSizes(columns);
  if (Object.keys(defaultSizing).length === 0) return;

  try {
    const savedSizing = localStorage.getItem(`table-column-sizing-${tableId}`);
    if (!savedSizing) {
      setColumnSizing(defaultSizing);
    } else {
      const parsedSizing = JSON.parse(savedSizing);
      if (isValidColumnSizing(parsedSizing)) {
        setColumnSizing(parsedSizing);
      } else {
        setColumnSizing(defaultSizing);
      }
    }
  } catch {
    setColumnSizing(defaultSizing);
  }
}

/**
 * Track column resizing state in document body for styling purposes.
 */
export function trackColumnResizing(
  isResizing: boolean,
  attribute = "data-resizing"
): void {
  if (isResizing) {
    document.body.setAttribute(attribute, "true");
  } else {
    document.body.removeAttribute(attribute);
  }
}

/**
 * Clean up column resizing tracking when component unmounts.
 */
export function cleanupColumnResizing(attribute = "data-resizing"): void {
  document.body.removeAttribute(attribute);
}