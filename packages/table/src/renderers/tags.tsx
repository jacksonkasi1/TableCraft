import type { CellRendererProps } from "../types";
import { cn } from "../utils/cn";

export function TagsRenderer({ value, column }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const items: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",").map((s) => s.trim())
      : [value];

  if (items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => {
        const str = String(item);
        const option = column.options?.find((o) => String(o.value) === str);
        const color = option?.color;

        return (
          <span
            key={`${str}-${i}`}
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
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
            {option?.label ?? str}
          </span>
        );
      })}
    </div>
  );
}