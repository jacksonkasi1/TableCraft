import type { CellRendererProps } from "../types";

export function LinkRenderer({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const url = String(value);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-4 hover:text-primary/80 truncate"
      onClick={(e) => e.stopPropagation()}
    >
      {url}
    </a>
  );
}