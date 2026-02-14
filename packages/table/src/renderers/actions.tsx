import type { CellRendererProps } from "../types";

/**
 * Placeholder actions renderer.
 * Users should provide their own actions renderer via the `renderers` prop
 * since actions are highly application-specific.
 */
export function ActionsRenderer(_props: CellRendererProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">—</span>
    </div>
  );
}