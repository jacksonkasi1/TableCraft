import type { CellRendererProps } from "../types";
import { Check, X } from "lucide-react";

export function BooleanRenderer({ value }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  const boolVal = value === true || value === "true" || value === 1;

  return boolVal ? (
    <Check className="h-4 w-4 text-green-600" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground" />
  );
}