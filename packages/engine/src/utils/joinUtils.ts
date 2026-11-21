// ** import types
import type { Table } from 'drizzle-orm';
import type { JoinConfig } from '../types/table.js';

// ** import database
import { aliasedTable } from 'drizzle-orm';

/** Resolves the Drizzle table as it appears in a configured join. */
export function getJoinTable(schema: Record<string, unknown>, join: JoinConfig): Table | undefined {
  const table = schema[join.table] as Table | undefined;
  return table && join.alias ? aliasedTable(table, join.alias) : table;
}

/** Finds a table by its configured join name, including nested joins. */
export function findJoin(joins: JoinConfig[], name: string): JoinConfig | undefined {
  for (const join of joins) {
    if ((join.alias ?? join.table) === name) return join;

    const nested = findJoin(join.joins ?? [], name);
    if (nested) return nested;
  }
  return undefined;
}

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
