import { 
  Table, 
  SQL, 
  ilike, 
  or, 
  getTableColumns,
  sql
} from 'drizzle-orm';
import { TableConfig } from '../types/table';

export class SearchBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds the search condition for global search.
   * Performs an ILIKE match across all configured search fields using OR logic.
   */
  buildSearch(config: TableConfig, searchTerm?: string): SQL | undefined {
    if (!searchTerm || !config.search || !config.search.enabled) {
      return undefined;
    }

    const table = this.schema[config.base] as Table;
    const columns = getTableColumns(table);
    const conditions: SQL[] = [];
    const term = `%${searchTerm}%`;

    for (const fieldName of config.search.fields) {
      const col = columns[fieldName];
      if (!col) continue;

      // TODO: Check if column type supports ILIKE (string/text)
      // For now, assume config is correct or DB handles coercion
      conditions.push(ilike(col, term));
    }

    return conditions.length > 0 ? or(...conditions) : undefined;
  }
}
