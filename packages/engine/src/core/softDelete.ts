import {
  Table,
  SQL,
  getTableColumns,
  isNull,
} from 'drizzle-orm';
import { TableConfig } from '../types/table';

export class SoftDeleteHandler {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Returns a WHERE condition that excludes soft-deleted rows.
   * Returns undefined when soft delete is disabled or overridden.
   */
  buildSoftDeleteCondition(
    config: TableConfig,
    includeDeleted: boolean = false
  ): SQL | undefined {
    if (!config.softDelete?.enabled) return undefined;
    if (includeDeleted) return undefined;

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);
    const field = config.softDelete.field ?? 'deletedAt';
    const col = columns[field];

    if (!col) {
      console.warn(
        `[tablecraft] Soft-delete field '${field}' not found in table '${config.base}'`
      );
      return undefined;
    }

    return isNull(col);
  }
}
