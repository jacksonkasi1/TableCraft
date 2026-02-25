import { JoinConfig } from '../types/table';

/** Recursively populates `out` with sortable field names from all join configs. */
export function collectSortableJoinFields(joins: JoinConfig[], out: Set<string>): void {
  for (const join of joins) {
    if (join.columns) {
      for (const col of join.columns) {
        if (col.sortable !== false) {
          out.add(col.name);
        }
      }
    }
    if (join.joins) {
      collectSortableJoinFields(join.joins, out);
    }
  }
}

/** Recursively populates `out` with filterable field names from all join configs. */
export function collectFilterableJoinFields(joins: JoinConfig[], out: Set<string>): void {
  for (const join of joins) {
    if (join.columns) {
      for (const col of join.columns) {
        if (col.filterable !== false) {
          out.add(col.name);
        }
      }
    }
    if (join.joins) {
      collectFilterableJoinFields(join.joins, out);
    }
  }
}

/**
 * Recursively populates `out` with selectable (non-hidden) field names from all join configs.
 * Used by FieldSelector and validateSelectFields so that ?select=joinColumn works correctly.
 */
export function collectSelectableJoinFields(joins: JoinConfig[], out: Set<string>): void {
  for (const join of joins) {
    if (join.columns) {
      for (const col of join.columns) {
        if (!col.hidden) {
          out.add(col.name);
        }
      }
    }
    if (join.joins) {
      collectSelectableJoinFields(join.joins, out);
    }
  }
}

/**
 * Returns true if `fieldName` is defined in any join config (recursively).
 */
export function isJoinColumnInJoins(joins: JoinConfig[], fieldName: string): boolean {
  for (const join of joins) {
    if (join.columns?.some(c => c.name === fieldName)) {
      return true;
    }
    if (join.joins && isJoinColumnInJoins(join.joins, fieldName)) {
      return true;
    }
  }
  return false;
}