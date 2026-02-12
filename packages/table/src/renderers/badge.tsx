import type { CellRendererProps } from "../types";
import { cn } from "../utils/cn";

export function BadgeRenderer({ value, column }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const option = column.options?.find((o) => o.value === value);
  const label = option?.label ?? String(value);
  const color = option?.color;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        !color && "bg-secondary text-secondary-foreground"
      )}
      style={
        color
          ? {
              backgroundColor: `${color}20`,
              color: color,
              borderColor: `${color}40`,
            }
          : undefined
      }
    >
      {label}
    </span>
  );
}