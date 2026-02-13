"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  EyeOff,
} from "lucide-react";
import type { Column } from "@tanstack/react-table";

import { cn } from "./utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/table-dropdown";

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

  // Get the current sort direction for this column
  const currentDirection = column.getIsSorted();

  // Use direct method to set sort with an explicit direction
  const setSorting = (direction: "asc" | "desc" | false) => {
    // If we're clearing sort, use an empty array
    if (direction === false) {
      column.toggleSorting(undefined, false);
      return;
    }

    // Set explicit sort with the direction
    // The second param (false) prevents multi-sort
    column.toggleSorting(direction === "desc", false);
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              // Button base styles (matching shadcn/ui Button)
              "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              // Variant "ghost"
              "hover:bg-accent hover:text-accent-foreground",
              // Size "sm" (usually h-9 px-3) but overriden to h-8 by tnks
              "h-8 px-3",
              // Custom overrides from tnks-data-table
              "data-[state=open]:bg-accent focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
          >
            <span>{title}</span>
            {currentDirection === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : currentDirection === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setSorting("asc")}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSorting("desc")}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
