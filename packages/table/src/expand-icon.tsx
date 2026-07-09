import type { Row } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { cn } from "./utils/cn";

interface ExpandIconProps<TData> {
  row: Row<TData>;
  className?: string;
  hideWhenSingle?: boolean;
}

export function ExpandIcon<TData>({
  row,
  className,
  hideWhenSingle = false,
}: ExpandIconProps<TData>) {
  if (!row.getCanExpand()) {
    return <div className="w-4" />;
  }

  if (hideWhenSingle && row.subRows && row.subRows.length === 1) {
    return <div className="w-4" />;
  }

  return (
    <button
      onClick={row.getToggleExpandedHandler()}
      className={cn(
        "inline-flex items-center justify-center",
        "h-6 w-6 cursor-pointer transition-all",
        "hover:bg-muted rounded-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
      aria-expanded={row.getIsExpanded()}
      type="button"
    >
      <ChevronRight
        className={cn(
          "h-4 w-4 transition-transform duration-200",
          row.getIsExpanded() && "rotate-90"
        )}
      />
    </button>
  );
}