import { Table, SQL, and, getTableColumns } from 'drizzle-orm';
import { TableConfig } from '../types/table';
import { mapOperator } from './operators';

export class FilterBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds dynamic filters based on URL parameters and config.
   * @param config The table configuration
   * @param params The parsed query parameters (e.g., { filters: { status: 'active' } })
   */
  buildFilters(config: TableConfig, params: Record<string, any>): SQL | undefined {
    const filters = params.filters || {};
    const conditions: SQL[] = [];
    const table = this.schema[config.base] as Table;
    const columns = getTableColumns(table);

    // 1. Map URL params to Configured Filters
    if (config.filters) {
      for (const filterConfig of config.filters) {
        const value = filters[filterConfig.field];
        
        // Skip if value is not provided
        if (value === undefined || value === null || value === '') continue;

        const col = columns[filterConfig.field];
        if (!col) continue;

        // Apply operator
        const op = mapOperator(filterConfig.operator, col, value);
        if (op) conditions.push(op);
      }
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
