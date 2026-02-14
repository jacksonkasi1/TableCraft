import type { Table } from "@tanstack/react-table";
import type { KeyboardEvent } from "react";

/**
 * Creates a keyboard navigation handler for data tables.
 *
 * Supports:
 * - Space to toggle selection
 * - Enter to activate/view a row
 */
export function createKeyboardNavigationHandler<TData>(
  table: Table<TData>,
  onRowActivate?: (row: TData, rowIndex: number) => void
) {
  return (e: KeyboardEvent) => {
    if (
      (e.key === " " || e.key === "Enter") &&
      !(e.target as HTMLElement).matches(
        'input, button, [role="button"], [contenteditable="true"]'
      )
    ) {
      e.preventDefault();

      const focusedElement = document.activeElement;
      if (
        focusedElement &&
        (focusedElement.getAttribute("role") === "row" ||
          focusedElement.getAttribute("role") === "gridcell")
      ) {
        const rowElement =
          focusedElement.getAttribute("role") === "row"
            ? focusedElement
            : focusedElement.closest('[role="row"]');

        if (rowElement) {
          const rowId =
            rowElement.getAttribute("data-row-index") || rowElement.id;
          if (rowId) {
            const rowIndex = Number.parseInt(rowId.replace(/^row-/, ""), 10);
            const row = table.getRowModel().rows[rowIndex];
            if (row) {
              if (e.key === " ") {
                row.toggleSelected();
              } else if (e.key === "Enter" && onRowActivate) {
                onRowActivate(row.original, rowIndex);
              }
            }
          }
        }
      }
    }
  };
}