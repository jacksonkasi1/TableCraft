import { useState, useEffect, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DataAdapter, TableMetadata, CellRenderer } from "../types";
import { generateColumns } from "./auto-columns";

/**
 * Hook that auto-generates columns from adapter metadata.
 * If manual columns are provided, they take priority.
 * If no columns and no metadata, returns an empty array.
 */
export function useAutoColumns<T extends Record<string, unknown>>(
  adapter: DataAdapter<T>,
  manualColumns?: ColumnDef<T, unknown>[],
  customRenderers?: Record<string, CellRenderer>
): {
  columns: ColumnDef<T, unknown>[];
  metadata: TableMetadata | null;
  isLoadingMeta: boolean;
} {
  const [metadata, setMetadata] = useState<TableMetadata | null>(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  // Fetch metadata if no manual columns and adapter supports it
  useEffect(() => {
    if (manualColumns && manualColumns.length > 0) return;
    if (!adapter.meta) return;

    let cancelled = false;
    setIsLoadingMeta(true);

    adapter
      .meta()
      .then((meta) => {
        if (!cancelled) {
          setMetadata(meta);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to fetch table metadata:", err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMeta(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, manualColumns]);

  const columns = useMemo(() => {
    // Manual columns take priority
    if (manualColumns && manualColumns.length > 0) {
      return manualColumns;
    }

    // Auto-generate from metadata
    if (metadata) {
      return generateColumns<T>(metadata, customRenderers);
    }

    return [];
  }, [manualColumns, metadata, customRenderers]);

  return { columns, metadata, isLoadingMeta };
}