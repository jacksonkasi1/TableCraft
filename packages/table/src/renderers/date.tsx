import type { CellRendererProps } from "../types";

export function DateRenderer({ value, column }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return <span>{String(value)}</span>;
  }

  const format = column.format;

  let formatted: string;
  if (format === "datetime") {
    formatted = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } else if (format === "time") {
    formatted = new Intl.DateTimeFormat(undefined, {
      timeStyle: "short",
    }).format(date);
  } else if (format === "relative") {
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) {
      formatted = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(date);
    } else if (days > 0) {
      formatted = `${days}d ago`;
    } else if (hours > 0) {
      formatted = `${hours}h ago`;
    } else if (minutes > 0) {
      formatted = `${minutes}m ago`;
    } else {
      formatted = "Just now";
    }
  } else {
    // Default: date only
    formatted = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(date);
  }

  return <span>{formatted}</span>;
}