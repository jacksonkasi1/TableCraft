import type { CellRenderer } from "../types";
import { TextRenderer } from "./text";
import { NumberRenderer } from "./number";
import { DateRenderer } from "./date";
import { BooleanRenderer } from "./boolean";
import { BadgeRenderer } from "./badge";
import { LinkRenderer } from "./link";
import { ImageRenderer } from "./image";
import { ProgressRenderer } from "./progress";
import { TagsRenderer } from "./tags";
import { ActionsRenderer } from "./actions";

/**
 * Built-in cell renderer registry.
 * Maps column type strings to React components.
 */
const defaultRenderers: Record<string, CellRenderer> = {
  string: TextRenderer,
  text: TextRenderer,
  number: NumberRenderer,
  integer: NumberRenderer,
  float: NumberRenderer,
  date: DateRenderer,
  datetime: DateRenderer,
  boolean: BooleanRenderer,
  badge: BadgeRenderer,
  status: BadgeRenderer,
  link: LinkRenderer,
  url: LinkRenderer,
  image: ImageRenderer,
  avatar: ImageRenderer,
  progress: ProgressRenderer,
  tags: TagsRenderer,
  array: TagsRenderer,
  actions: ActionsRenderer,
};

/**
 * Resolve a cell renderer by type.
 * Checks custom renderers first, then built-in registry, falls back to TextRenderer.
 */
export function resolveRenderer(
  type: string,
  customRenderers?: Record<string, CellRenderer>
): CellRenderer {
  return customRenderers?.[type] ?? defaultRenderers[type] ?? TextRenderer;
}

export {
  TextRenderer,
  NumberRenderer,
  DateRenderer,
  BooleanRenderer,
  BadgeRenderer,
  LinkRenderer,
  ImageRenderer,
  ProgressRenderer,
  TagsRenderer,
  ActionsRenderer,
  defaultRenderers,
};