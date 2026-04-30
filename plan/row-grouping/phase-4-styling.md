# Phase 4 — Styling, Icons & Theming

**Agent write scope:** `packages/table/src/expand-icon.tsx`, `packages/table/src/styles.css`
**Depends on:** Phase 0 (can run in parallel with Phase 1)
**Blocks:** Phase 2 (merge before or alongside)

---

## Goal

Add the visual polish for group rows:
- CSS utility classes for group row backgrounds, indentation, and hover states
- An optional `GroupRowIcon` component that Phase 2 can use instead of an inline `<span>`
- Dark-mode safe colours

All changes here must be **purely additive** — no existing selectors modified.

---

## 1. New CSS Classes (`styles.css`)

Append at the end of `styles.css`:

```css
/* ─────────────────────────────────────────
   Row Grouping
───────────────────────────────────────── */

/* Group-header row base */
[data-group-row="true"] {
  background-color: hsl(var(--muted) / 0.4);
  font-weight: 500;
}
[data-group-row="true"]:hover {
  background-color: hsl(var(--muted) / 0.6);
}

/* Depth-based left-border accent (visual depth cue) */
[data-group-row="true"][data-depth="0"] > td:first-child {
  border-left: 3px solid hsl(var(--primary) / 0.6);
}
[data-group-row="true"][data-depth="1"] > td:first-child {
  border-left: 3px solid hsl(var(--primary) / 0.35);
}
[data-group-row="true"][data-depth="2"] > td:first-child {
  border-left: 3px solid hsl(var(--primary) / 0.2);
}

/* Row count badge */
.tc-group-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  line-height: 1;
  padding: 2px 7px;
  border-radius: 9999px;
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  font-weight: 400;
  min-width: 1.5rem;
}

/* Chevron transition */
.tc-group-chevron {
  display: inline-flex;
  transition: transform 150ms ease;
}
.tc-group-chevron[data-expanded="true"] {
  transform: rotate(90deg);
}
.tc-group-chevron[data-expanded="false"] {
  transform: rotate(0deg);
}

/* Child row indentation — set via inline style in Phase 2.
   These classes provide fallback values and ensure no Tailwind purge issues. */
.tc-group-indent-1 { padding-left: calc(16px + 1 * 20px); }
.tc-group-indent-2 { padding-left: calc(16px + 2 * 20px); }
.tc-group-indent-3 { padding-left: calc(16px + 3 * 20px); }
```

> **Why `data-*` selectors instead of class names?**
> `data-group-row` is already set by Phase 2 on the `<tr>` element.
> CSS-only styling on data attributes means zero JS overhead and works with SSR.

---

## 2. Update `expand-icon.tsx` — Add `GroupRowChevron`

The existing `expand-icon.tsx` exports `ExpandIcon` for the Master-Detail pattern.
**Add a new named export** `GroupRowChevron` for use in Phase 2's group-header rows:

```tsx
import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "./utils/cn"; // adjust path if needed

interface GroupRowChevronProps {
  isExpanded: boolean;
  className?: string;
}

/**
 * Animated chevron for row-grouping group-header rows.
 * Points right when collapsed, rotates 90° when expanded.
 */
export function GroupRowChevron({ isExpanded, className }: GroupRowChevronProps) {
  return (
    <span
      className={cn("tc-group-chevron", className)}
      data-expanded={isExpanded ? "true" : "false"}
    >
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </span>
  );
}
```

Then in Phase 2's render code, replace the inline `<span className={cn(...)}>` with:

```tsx
import { GroupRowChevron } from "./expand-icon";
// ...
<GroupRowChevron isExpanded={row.getIsExpanded()} />
```

---

## 3. Add `data-depth` to Group Row `<tr>`

Phase 2 renders `<tr data-group-row="true" ...>`.
Ask Phase 2 agent to also add `data-depth={row.depth}` so the CSS depth accent works:

```tsx
<tr
  data-group-row={isGroupRow ? "true" : undefined}
  data-depth={isGroupRow ? row.depth : undefined}
  // ...
>
```

---

## 4. Row Count Badge Component

Export a tiny `GroupRowBadge` from `expand-icon.tsx` for reuse:

```tsx
interface GroupRowBadgeProps {
  count: number;
}

export function GroupRowBadge({ count }: GroupRowBadgeProps) {
  return <span className="tc-group-badge">{count}</span>;
}
```

Phase 2 can then use `<GroupRowBadge count={row.getLeafRows().length} />` in `renderGroupHeaderCell`.

---

## 5. Dark Mode Verification

TableCraft uses Shadcn's CSS variable system (`hsl(var(--muted))`).
Verify each new CSS variable used exists in both `:root` and `.dark` in the consuming app's `globals.css`:

- `--muted` ✅ (Shadcn default)
- `--muted-foreground` ✅
- `--primary` ✅

No additions needed.

---

## Checklist

- [ ] CSS classes for group rows added to `styles.css` (additive only, nothing modified)
- [ ] `[data-group-row]` CSS selector covers hover and background
- [ ] `[data-depth="0/1/2"]` border-left accent added
- [ ] `.tc-group-badge` class added for row count badge
- [ ] `.tc-group-chevron` + `data-expanded` CSS transition added
- [ ] `GroupRowChevron` component exported from `expand-icon.tsx`
- [ ] `GroupRowBadge` component exported from `expand-icon.tsx`
- [ ] Phase 2 agent notified to add `data-depth={row.depth}` on `<tr>`
- [ ] No existing CSS selectors modified
- [ ] Dark mode manual check passes
