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