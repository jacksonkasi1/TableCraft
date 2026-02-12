import type { Table, Column } from "@tanstack/react-table";
import { Check, GripVertical, Settings2, RotateCcw } from "lucide-react";
import { cn } from "./utils/cn";
import { useCallback, useEffect, useState, useMemo } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const storageKey = tableId
    ? `${COLUMN_ORDER_STORAGE_KEY}-${tableId}`
    : COLUMN_ORDER_STORAGE_KEY;

  const columns = useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide()
        ),
    [table]
  );

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

  const filteredColumns = useMemo(() => {
    if (!searchQuery) return orderedColumns;
    return orderedColumns.filter((col) => {
      const label = getColumnLabel(col);
      return label.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [orderedColumns, searchQuery]);

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

  const handleDragStart = useCallback(
    (e: React.DragEvent, columnId: string) => {
      setDraggedColumnId(columnId);
      e.dataTransfer.effectAllowed = "move";
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

  const sizeClass = size === "sm" ? "h-8 px-3" : size === "lg" ? "h-11 px-5" : "h-9 px-4";

  return (
    <div className="relative">
      <button
        aria-label="Toggle columns"
        className={cn(
          sizeClass,
          "inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings2 className="mr-2 h-4 w-4" />
        View
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-1 w-[220px] rounded-md border bg-popover p-0 shadow-md">
            {/* Search */}
            <div className="p-2 border-b">
              <input
                placeholder="Search columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Column list */}
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredColumns.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No columns found.
                </div>
              )}
              {filteredColumns.map((column) => (
                <div
                  key={column.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, column.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  onClick={() => column.toggleVisibility()}
                  className={cn(
                    "flex items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                    draggedColumnId === column.id && "bg-accent opacity-50"
                  )}
                >
                  <GripVertical className="mr-2 h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="flex-grow truncate capitalize">
                    {getColumnLabel(column)}
                  </span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      column.getIsVisible() ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Reset */}
            <div className="border-t p-1">
              <div
                onClick={resetColumnOrder}
                className="flex items-center justify-center rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Column Order
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}