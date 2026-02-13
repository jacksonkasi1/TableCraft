import type { ColumnDef } from "@tanstack/react-table";
import type { TableMetadata, CellRenderer, ColumnMetadataForRenderer } from "../types";
import { resolveRenderer } from "../renderers";
import { DataTableColumnHeader } from "../column-header";

/**
 * Generates TanStack Table column definitions from TableCraft metadata.
 * This is the magic that makes `<DataTable adapter={adapter} />` work
 * with zero manual column configuration.
 */
export function generateColumns<T extends Record<string, unknown>>(
  metadata: TableMetadata,
  customRenderers?: Record<string, CellRenderer>
): ColumnDef<T, unknown>[] {
  return metadata.columns
    .filter((col) => !col.hidden)
    .map((col) => {
      const Renderer = resolveRenderer(col.type, customRenderers);

      const rendererColumn: ColumnMetadataForRenderer = {
        name: col.name,
        type: col.type,
        format: col.format,
        align: col.align,
        options: col.options,
      };

      return {
        id: col.name,
        accessorKey: col.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={col.label} />
        ),
        cell: ({ getValue, row }) => (
          <Renderer
            value={getValue()}
            row={row.original as Record<string, unknown>}
            column={rendererColumn}
          />
        ),
        enableSorting: col.sortable,
        enableHiding: true,
        size: col.width,
        minSize: col.minWidth,
        maxSize: col.maxWidth,
        meta: {
          label: col.label,
          type: col.type,
          format: col.format,
        },
      } satisfies ColumnDef<T, unknown>;
    });
}
