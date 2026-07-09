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

// ─────────────────────────────────────────────
// Row Grouping Components
// ─────────────────────────────────────────────

interface GroupRowChevronProps {
  isExpanded: boolean;
  className?: string;
}

/**
 * Animated chevron for row-grouping group-header rows.
 * Points right when collapsed, rotates 90° when expanded.
 * Uses CSS class tc-group-chevron + data-expanded for the animation.
 */
export function GroupRowChevron({ isExpanded, className }: GroupRowChevronProps) {
  return (
    <span
      className={cn("tc-group-chevron", className)}
      data-expanded={isExpanded ? "true" : "false"}
    >
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}

interface GroupRowBadgeProps {
  count: number;
  className?: string;
}

/**
 * Pill badge showing the number of rows in a group.
 * Uses tc-group-badge CSS class.
 */
export function GroupRowBadge({ count, className }: GroupRowBadgeProps) {
  return <span className={cn("tc-group-badge", className)}>{count}</span>;
}
