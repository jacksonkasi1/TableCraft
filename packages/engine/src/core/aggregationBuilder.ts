import {
  Table,
  SQL,
  getTableColumns,
  count,
  sum,
  avg,
  min,
  max,
} from 'drizzle-orm';
import { TableConfig } from '../types/table';

export class AggregationBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds aggregation select fields (COUNT, SUM, AVG, MIN, MAX).
   * Returns a map of alias → SQL expression for use in a separate aggregation query.
   */
  buildAggregations(config: TableConfig): Record<string, SQL> | undefined {
    if (!config.aggregations || config.aggregations.length === 0) {
      return undefined;
    }

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);
    const result: Record<string, SQL> = {};

    for (const agg of config.aggregations) {
      const col = columns[agg.field];
      if (!col) continue;

      switch (agg.type) {
        case 'count':
          result[agg.alias] = count(col);
          break;
        case 'sum':
          result[agg.alias] = sum(col);
          break;
        case 'avg':
          result[agg.alias] = avg(col);
          break;
        case 'min':
          result[agg.alias] = min(col);
          break;
        case 'max':
          result[agg.alias] = max(col);
          break;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  /**
   * Builds the select map for a standalone aggregation query,
   * always including a total row count alongside configured aggregations.
   */
  buildAggregationSelect(config: TableConfig): Record<string, SQL> {
    const result: Record<string, SQL> = { _totalCount: count() };

    if (!config.aggregations) return result;

    const table = this.schema[config.base] as Table;
    if (!table) return result;

    const columns = getTableColumns(table);

    for (const agg of config.aggregations) {
      const col = columns[agg.field];
      if (!col) continue;

      switch (agg.type) {
        case 'count':
          result[agg.alias] = count(col);
          break;
        case 'sum':
          result[agg.alias] = sum(col);
          break;
        case 'avg':
          result[agg.alias] = avg(col);
          break;
        case 'min':
          result[agg.alias] = min(col);
          break;
        case 'max':
          result[agg.alias] = max(col);
          break;
      }
    }

    return result;
  }
}
