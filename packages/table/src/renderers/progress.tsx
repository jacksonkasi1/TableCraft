import type { CellRendererProps } from "../types";

export function ProgressRenderer({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const num = typeof value === "number" ? value : Number(value);
  const clamped = Math.min(100, Math.max(0, Number.isNaN(num) ? 0 : num));

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}