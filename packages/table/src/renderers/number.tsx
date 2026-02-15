import type { CellRendererProps } from "../types";

export function NumberRenderer({ value, column }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) {
    return <span>{String(value)}</span>;
  }

  let formatted: string;
  const format = column.format;

  if (format === "currency") {
    formatted = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(num);
  } else if (format === "percent") {
    formatted = new Intl.NumberFormat(undefined, {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(num / 100);
  } else {
    formatted = new Intl.NumberFormat().format(num);
  }

  return (
    <span className={column.align === "right" ? "text-right block" : ""}>
      {formatted}
    </span>
  );
}