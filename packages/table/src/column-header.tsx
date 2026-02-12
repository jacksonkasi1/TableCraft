import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "./utils/cn";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const currentDirection = column.getIsSorted();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <button
        className="flex items-center gap-1 hover:text-foreground -ml-3 h-8 px-3 data-[state=open]:bg-accent rounded-md text-sm font-medium"
        onClick={() => {
          if (currentDirection === "asc") {
            column.toggleSorting(true, false);
          } else if (currentDirection === "desc") {
            column.clearSorting();
          } else {
            column.toggleSorting(false, false);
          }
        }}
      >
        <span>{title}</span>
        {currentDirection === "desc" ? (
          <ArrowDown className="ml-1 h-4 w-4" />
        ) : currentDirection === "asc" ? (
          <ArrowUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronsUpDown className="ml-1 h-4 w-4" />
        )}
      </button>
    </div>
  );
}