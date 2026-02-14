import type { CellRendererProps } from "../types";

export function TextRenderer({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  return <span className="truncate">{String(value)}</span>;
}