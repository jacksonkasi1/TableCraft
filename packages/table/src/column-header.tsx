import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "./utils/cn";
import { useState, useRef, useEffect } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative">
        <button
          ref={triggerRef}
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "-ml-3 h-8 flex items-center rounded-md px-3 text-sm font-medium",
            "hover:bg-accent hover:text-accent-foreground",
            "data-[state=open]:bg-accent",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
            "cursor-pointer"
          )}
          onClick={() => setIsOpen(!isOpen)}
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

        {isOpen && (
          <div
            ref={menuRef}
            className="absolute left-0 top-full z-50 mt-1 min-w-[150px] rounded-md border bg-popover p-1 shadow-md text-popover-foreground animate-in fade-in-0 zoom-in-95"
            role="menu"
          >
            <div
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                column.toggleSorting(false);
                setIsOpen(false);
              }}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Asc
            </div>
            <div
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                column.toggleSorting(true);
                setIsOpen(false);
              }}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Desc
            </div>

            <div className="-mx-1 my-1 h-px bg-muted" role="separator" />

            <div
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                column.toggleVisibility(false);
                setIsOpen(false);
              }}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Hide
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
