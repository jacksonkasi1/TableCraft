import type { CellRendererProps } from "../types";
import { cn } from "../utils/cn";

export function ImageRenderer({ value }: CellRendererProps) {
  if (value === null || value === undefined || value === "") {
    return (
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
        ?
      </div>
    );
  }

  const src = String(value);

  return (
    <img
      src={src}
      alt=""
      className={cn(
        "h-8 w-8 rounded-full object-cover",
        "bg-muted"
      )}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
        const fallback = document.createElement("div");
        fallback.className =
          "h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground";
        fallback.textContent = "?";
        target.parentNode?.appendChild(fallback);
      }}
    />
  );
}