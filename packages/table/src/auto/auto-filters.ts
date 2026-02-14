import type { TableMetadata, FilterMetadata } from "../types";

/**
 * Filter configuration for the frontend.
 */
export interface FilterConfig {
  field: string;
  type: string;
  label: string;
  operators: string[];
  options?: { value: string | number | boolean; label: string; color?: string }[];
  datePresets?: string[];
}

/**
 * Generates filter configuration from table metadata.
 * Used to auto-build filter UI elements.
 */
export function generateFilterConfig(
  metadata: TableMetadata
): FilterConfig[] {
  return metadata.filters.map((filter: FilterMetadata) => ({
    field: filter.field,
    type: filter.type,
    label: filter.label,
    operators: filter.operators,
    options: filter.options,
    datePresets: filter.datePresets,
  }));
}