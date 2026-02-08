import {
  Table,
  Column,
  SQL,
  sql,
  getTableColumns,
  and,
  count,
  sum,
  avg,
  min,
  max,
} from 'drizzle-orm';
import { TableConfig } from '../types/table';

export class GroupByBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Returns the columns to GROUP BY.
   */
  buildGroupByColumns(config: TableConfig): Column[] | undefined {
    if (!config.groupBy?.fields?.length) return undefined;

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);
    const result: Column[] = [];

    for (const field of config.groupBy.fields) {
      const col = columns[field];
      if (col) result.push(col);
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Builds the SELECT for a grouped query:
   * group-by fields + aggregation expressions.
   */
  buildGroupedSelect(config: TableConfig): Record<string, SQL | Column> | undefined {
    if (!config.groupBy?.fields?.length) return undefined;

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);
    const selection: Record<string, SQL | Column> = {};

    // Add grouped fields
    for (const field of config.groupBy.fields) {
      const col = columns[field];
      if (col) selection[field] = col;
    }

    // Add aggregations
    if (config.aggregations) {
      for (const agg of config.aggregations) {
        const col = columns[agg.field];
        if (!col) continue;

        switch (agg.type) {
          case 'count': selection[agg.alias] = count(col); break;
          case 'sum': selection[agg.alias] = sum(col); break;
          case 'avg': selection[agg.alias] = avg(col); break;
          case 'min': selection[agg.alias] = min(col); break;
          case 'max': selection[agg.alias] = max(col); break;
        }
      }
    }

    return Object.keys(selection).length > 0 ? selection : undefined;
  }

  /**
   * Builds the HAVING clause.
   * HAVING references aggregation expressions, not aliases.
   */
  buildHaving(config: TableConfig): SQL | undefined {
    if (!config.groupBy?.having?.length) return undefined;
    if (!config.aggregations?.length) return undefined;

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);
    const parts: SQL[] = [];

    for (const having of config.groupBy.having) {
      // Find the aggregation config by alias
      const agg = config.aggregations.find((a) => a.alias === having.alias);
      if (!agg) continue;

      const col = columns[agg.field];
      if (!col) continue;

      // Build the aggregation expression
      const aggExpr = this.buildAggExpression(agg.type, col);
      if (!aggExpr) continue;

      // Build the comparison
      const comparison = this.buildComparison(aggExpr, having.operator, having.value);
      if (comparison) parts.push(comparison);
    }

    if (parts.length === 0) return undefined;
    return and(...parts);
  }

  private buildAggExpression(type: string, col: Column): SQL | undefined {
    switch (type) {
      case 'count': return sql`count(${col})`;
      case 'sum': return sql`sum(${col})`;
      case 'avg': return sql`avg(${col})`;
      case 'min': return sql`min(${col})`;
      case 'max': return sql`max(${col})`;
      default: return undefined;
    }
  }

  private buildComparison(expr: SQL, operator: string, value: unknown): SQL | undefined {
    switch (operator) {
      case 'eq': return sql`${expr} = ${value}`;
      case 'neq': return sql`${expr} != ${value}`;
      case 'gt': return sql`${expr} > ${value}`;
      case 'gte': return sql`${expr} >= ${value}`;
      case 'lt': return sql`${expr} < ${value}`;
      case 'lte': return sql`${expr} <= ${value}`;
      default: return undefined;
    }
  }
}
