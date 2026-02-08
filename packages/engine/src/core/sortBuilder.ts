import {
  Table,
  SQL,
  getTableColumns,
  asc,
  desc,
} from 'drizzle-orm';
import { TableConfig } from '../types/table';
import { SortParam } from '../types/engine';

export class SortBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds ORDER BY clauses from request params, falling back to defaults.
   * Only allows sorting on columns marked sortable in the config.
   */
  buildSort(config: TableConfig, params?: SortParam[]): SQL[] {
    const sortParams =
      params && params.length > 0 ? params : this.getDefaultSort(config);

    if (!sortParams || sortParams.length === 0) return [];

    const table = this.schema[config.base] as Table;
    if (!table) return [];

    const columns = getTableColumns(table);

    // Build a whitelist of sortable fields
    const sortableFields = new Set<string>();
    for (const col of config.columns) {
      if (col.sortable !== false) {
        sortableFields.add(col.name);
      }
    }

    const clauses: SQL[] = [];

    for (const sp of sortParams) {
      if (!sortableFields.has(sp.field)) continue;

      const col = columns[sp.field];
      if (!col) continue;

      clauses.push(sp.order === 'desc' ? desc(col) : asc(col));
    }

    return clauses;
  }

  private getDefaultSort(config: TableConfig): SortParam[] | undefined {
    if (!config.defaultSort || config.defaultSort.length === 0) return undefined;

    return config.defaultSort.map((s) => ({
      field: s.field,
      order: s.order ?? 'asc',
    }));
  }
}
