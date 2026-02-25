import { Column, SQL } from 'drizzle-orm';
import { TableConfig } from '../types/table';
import { collectSelectableJoinFields } from '../utils/joinUtils';

/**
 * Filters the selection to only include requested fields.
 * Supports `?select=id,name,email` from URL.
 */
export class FieldSelector {
  /**
   * Narrows down a selection object to only include the requested fields.
   * If no fields requested, returns the original selection.
   */
  applyFieldSelection(
    selection: Record<string, SQL | Column>,
    requestedFields: string[] | undefined,
    config: TableConfig
  ): Record<string, SQL | Column> {
    if (!requestedFields?.length) return selection;

    // Build a whitelist of allowed (non-hidden) fields — base columns first
    const allowed = new Set(
      config.columns.filter((c) => !c.hidden).map((c) => c.name)
    );

    // Also allow selectable fields from joined tables so that
    // ?select=joinColumn correctly includes them in the SQL selection.
    if (config.joins?.length) {
      collectSelectableJoinFields(config.joins, allowed);
    }

    const filtered: Record<string, SQL | Column> = {};

    for (const field of requestedFields) {
      if (allowed.has(field) && selection[field]) {
        filtered[field] = selection[field];
      }
    }

    // Always include primary key if it exists (needed for includes/relations)
    if (selection['id'] && !filtered['id']) {
      const idCol = config.columns.find((c) => c.name === 'id');
      if (idCol && !idCol.hidden) {
        filtered['id'] = selection['id'];
      }
    }

    return Object.keys(filtered).length > 0 ? filtered : selection;
  }

  /**
   * Filters the response data to only include requested fields.
   * Defense-in-depth — even if SELECT returns extra columns.
   */
  filterResponseFields(
    data: Record<string, unknown>[],
    requestedFields: string[] | undefined
  ): Record<string, unknown>[] {
    if (!requestedFields?.length) return data;

    const fieldSet = new Set(requestedFields);

    return data.map((row) => {
      const filtered: Record<string, unknown> = {};
      for (const field of fieldSet) {
        if (field in row) {
          filtered[field] = row[field];
        }
      }
      return filtered;
    });
  }
}
