"use client";

// ** import types
import type { Table, Column } from "@tanstack/react-table";

// ** import core packages
import { useCallback, useState } from "react";

// ** import utils
import { Check, GripVertical, Settings2, RotateCcw } from "lucide-react";
import { cn } from "./utils/cn";

// ** import components
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

// ─── Sortable item ───────────────────────────────────────────────────────────

function SortableColumnItem<TData>({
  column,
  getColumnLabel,
  onToggle,
  isActive,
}: {
  column: Column<TData, unknown>;
  getColumnLabel: (column: Column<TData, unknown>) => string;
  onToggle: (id: string) => void;
  isActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto",
    position: "relative" as const,
    backgroundColor: isActive ? "hsl(var(--accent))" : undefined,
  };

  return (
    <CommandItem
      ref={setNodeRef}
      style={style}
      // Prevent cmdk from handling pointer events on the whole row while dragging
      onPointerDown={(e) => {
        // Only block cmdk's handler — let dnd-kit handle via the grip
        if ((e.target as HTMLElement).closest("[data-drag-handle]")) {
          e.preventDefault();
        }
      }}
      onSelect={() => onToggle(column.id)}
      className="flex items-center gap-2 select-none"
    >
      {/* Drag handle — all dnd-kit listeners are here only */}
      <span
        data-drag-handle
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted flex items-center"
        // Stop the click from bubbling to onSelect (which would toggle visibility)
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </span>

      <span className="flex-grow truncate capitalize">
        {getColumnLabel(column)}
      </span>

      <Check
        className={cn(
          "ml-auto h-4 w-4 shrink-0",
          column.getIsVisible() ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const COLUMN_ORDER_STORAGE_KEY = "tablecraft-column-order";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
  columnMapping?: Record<string, string>;
  size?: "sm" | "default" | "lg";
  tableId?: string;
  hiddenColumns?: string[];
}

export function DataTableViewOptions<TData>({
  table,
  columnMapping,
  size = "default",
  tableId,
  hiddenColumns,
}: DataTableViewOptionsProps<TData>) {
  const isLoading = table.options.meta?.isLoadingColumns ?? false;

  const storageKey = tableId
    ? `${COLUMN_ORDER_STORAGE_KEY}-${tableId}`
    : COLUMN_ORDER_STORAGE_KEY;

  // Track the actively dragged column id for visual feedback
  const [activeId, setActiveId] = useState<string | null>(null);

  // ─── Derive sorted columns from table state (single source of truth) ───
  const allColumns = table.getAllColumns().filter(
    (col) =>
      typeof col.accessorFn !== "undefined" &&
      col.getCanHide() &&
      !hiddenColumns?.includes(col.id)
  );

  const columnOrder = table.getState().columnOrder;

  const orderedColumns =
    columnOrder.length === 0
      ? allColumns
      : [...allColumns].sort((a, b) => {
          const ai = columnOrder.indexOf(a.id);
          const bi = columnOrder.indexOf(b.id);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });

  // ─── dnd-kit sensors ───
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require a small movement before a drag starts so clicks still work
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── Handlers ───
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Build the definitive current order from the visible sorted list
      const ids = orderedColumns.map((c) => c.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(ids, oldIndex, newIndex);

      // Persist in table state
      table.setColumnOrder(newOrder);

      // Persist in localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(newOrder));
      } catch {
        // ignore
      }
    },
    [orderedColumns, table, storageKey]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleVisibilityToggle = useCallback(
    (columnId: string) => {
      const vis = table.getState().columnVisibility;
      table.setColumnVisibility({
        ...vis,
        [columnId]: vis[columnId] === false ? true : false,
      });
    },
    [table]
  );

  const resetColumnOrder = useCallback(() => {
    table.setColumnOrder([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [table, storageKey]);

  const getColumnLabel = useCallback(
    (column: Column<TData, unknown>): string => {
      if (columnMapping && column.id in columnMapping) {
        return columnMapping[column.id]!;
      }
      return (
        (column.columnDef.meta as { label?: string })?.label ??
        column.id.replace(/_/g, " ")
      );
    },
    [columnMapping]
  );

  // ─── Button class (matches shadcn outline variant) ───
  const buttonClass = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium",
    "ring-offset-background transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    size === "sm" ? "h-8 px-3" : size === "lg" ? "h-11 px-5" : "h-9 px-4",
    "ml-auto hidden lg:flex"
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Toggle columns" className={buttonClass}>
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Search columns..." />
          <CommandList>
            {isLoading ? (
              <CommandGroup>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center px-2 py-1.5 space-x-2">
                    <div className="h-4 w-4 rounded bg-muted animate-pulse opacity-50" />
                    <div className="h-4 grow rounded bg-muted animate-pulse opacity-50" />
                  </div>
                ))}
              </CommandGroup>
            ) : (
              <>
                <CommandEmpty>No columns found.</CommandEmpty>
                <CommandGroup>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={orderedColumns.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {orderedColumns.map((column) => (
                        <SortableColumnItem
                          key={column.id}
                          column={column}
                          getColumnLabel={getColumnLabel}
                          onToggle={handleVisibilityToggle}
                          isActive={activeId === column.id}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </CommandGroup>
              </>
            )}

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
