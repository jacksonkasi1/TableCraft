"use client";

import type { Table, Column } from "@tanstack/react-table";
import { Check, GripVertical, Settings2, RotateCcw } from "lucide-react";
import { cn } from "./utils/cn";
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./components/command";

const COLUMN_ORDER_STORAGE_KEY = "tablecraft-column-order";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
  columnMapping?: Record<string, string>;
  size?: "sm" | "default" | "lg";
  tableId?: string;
}

export function DataTableViewOptions<TData>({
  table,
  columnMapping,
  size = "default",
  tableId,
}: DataTableViewOptionsProps<TData>) {
  const columns = useMemo(
    () =>
      table.getAllColumns().filter(
        (column) =>
          typeof column.accessorFn !== "undefined" && column.getCanHide()
      ),
    [table]
  );

  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const storageKey = tableId
    ? `${COLUMN_ORDER_STORAGE_KEY}-${tableId}`
    : COLUMN_ORDER_STORAGE_KEY;

  const columnOrder = table.getState().columnOrder;
  const orderedColumns = useMemo(() => {
    if (!columnOrder.length) return columns;
    return [...columns].sort((a, b) => {
      const aIndex = columnOrder.indexOf(a.id);
      const bIndex = columnOrder.indexOf(b.id);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [columns, columnOrder]);

  // Load column order from localStorage
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem(storageKey);
      if (savedOrder) {
        const parsed = JSON.parse(savedOrder);
        if (Array.isArray(parsed)) {
          table.setColumnOrder(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [table, storageKey]);

  const saveColumnOrder = useCallback(
    (order: string[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(order));
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const handleColumnVisibilityToggle = useCallback((columnId: string) => {
    const currentVisibility = table.getState().columnVisibility;
    const isCurrentlyVisible = currentVisibility[columnId] !== false;

    table.setColumnVisibility({
      ...currentVisibility,
      [columnId]: !isCurrentlyVisible,
    });
  }, [table]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, columnId: string) => {
      setDraggedColumnId(columnId);
      e.dataTransfer.effectAllowed = "move";
      if (e.dataTransfer.setDragImage && e.currentTarget instanceof HTMLElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      if (!draggedColumnId || draggedColumnId === targetColumnId) return;

      const currentOrder =
        table.getState().columnOrder.length > 0
          ? [...table.getState().columnOrder]
          : table.getAllLeafColumns().map((d) => d.id);

      const draggedIndex = currentOrder.indexOf(draggedColumnId);
      const targetIndex = currentOrder.indexOf(targetColumnId);
      if (draggedIndex === -1 || targetIndex === -1) return;

      const newOrder = [...currentOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumnId);

      table.setColumnOrder(newOrder);
      saveColumnOrder(newOrder);
      setDraggedColumnId(null);
    },
    [draggedColumnId, table, saveColumnOrder]
  );

  const resetColumnOrder = useCallback(() => {
    table.setColumnOrder([]);
    localStorage.removeItem(storageKey);
  }, [table, storageKey]);

  const getColumnLabel = useCallback(
    (column: Column<TData, unknown>) => {
      if (columnMapping && column.id in columnMapping) {
        return columnMapping[column.id];
      }
      return (
        (column.columnDef.meta as { label?: string })?.label ??
        column.id.replace(/_/g, " ")
      );
    },
    [columnMapping]
  );

  // Styles matching shadcn Button variant="outline"
  const buttonClass = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    size === "sm" ? "h-8 px-3" : size === "lg" ? "h-11 px-5" : "h-9 px-4",
    "ml-auto hidden lg:flex"
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Toggle columns"
          className={buttonClass}
        >
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            <CommandEmpty>No columns found.</CommandEmpty>
            <CommandGroup>
              {orderedColumns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() => handleColumnVisibilityToggle(column.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, column.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e as unknown as React.DragEvent, column.id)}
                  className={cn(
                    "flex items-center cursor-grab",
                    draggedColumnId === column.id && "bg-accent opacity-50"
                  )}
                >
                  <GripVertical className="mr-2 h-4 w-4 cursor-grab text-muted-foreground" />
                  <span className="flex-grow truncate capitalize">
                    {getColumnLabel(column)}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      column.getIsVisible() ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={resetColumnOrder}
                className="justify-center text-center cursor-pointer"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Column Order
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
