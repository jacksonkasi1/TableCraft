import {
  Table,
  SQL,
  sql,
  getTableColumns,
} from 'drizzle-orm';
import { TableConfig, SubqueryConfig } from '../types/table';

export class SubqueryBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds correlated subquery select expressions.
   * Supports count, exists, and first subquery types.
   */
  buildSubqueries(config: TableConfig): Record<string, SQL> | undefined {
    if (!config.subqueries || config.subqueries.length === 0) {
      return undefined;
    }

    const baseTable = this.schema[config.base] as Table;
    if (!baseTable) return undefined;

    const result: Record<string, SQL> = {};

    for (const sub of config.subqueries) {
      const subTable = this.schema[sub.table] as Table;
      if (!subTable) continue;

      const subQuery = this.buildSingle(sub, subTable);
      if (subQuery) {
        result[sub.alias] = subQuery;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private buildSingle(sub: SubqueryConfig, subTable: Table): SQL | undefined {
    // The filter string is a raw SQL correlation condition
    // e.g. "orders.user_id = users.id"
    // TODO: replace with a structured, parameterised representation
    const filterSql = sub.filter ? sql.raw(sub.filter) : sql`true`;

    switch (sub.type) {
      case 'count':
        return sql`(SELECT count(*) FROM ${subTable} WHERE ${filterSql})`;
      case 'exists':
        return sql`EXISTS (SELECT 1 FROM ${subTable} WHERE ${filterSql})`;
      case 'first':
        return sql`(SELECT row_to_json(t) FROM (SELECT * FROM ${subTable} WHERE ${filterSql} LIMIT 1) t)`;
      default:
        return undefined;
    }
  }
}
