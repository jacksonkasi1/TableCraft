import {
  Table,
  SQL,
  sql,
} from 'drizzle-orm';
import { TableConfig, SubqueryConfig } from '../types/table';
import { Dialect } from './dialect';
import { DialectError } from '../errors';

export class SubqueryBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds correlated subquery select expressions.
   * Supports count, exists, and first subquery types.
   *
   * @param dialect - Optional dialect for feature gating. When provided,
   *   'first' mode (which uses PostgreSQL-only `row_to_json`) will throw a
   *   DialectError on non-PostgreSQL dialects. Pass 'unknown' to skip the
   *   guard (e.g. when dialect cannot be detected).
   */
  buildSubqueries(config: TableConfig, dialect?: Dialect): Record<string, SQL> | undefined {
    if (!config.subqueries || config.subqueries.length === 0) {
      return undefined;
    }

    const baseTable = this.schema[config.base] as Table;
    if (!baseTable) return undefined;

    const result: Record<string, SQL> = {};

    for (const sub of config.subqueries) {
      const subTable = this.schema[sub.table] as Table;
      if (!subTable) continue;

      const subQuery = this.buildSingle(sub, subTable, dialect);
      if (subQuery) {
        result[sub.alias] = subQuery;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private buildSingle(sub: SubqueryConfig, subTable: Table, dialect?: Dialect): SQL | undefined {
    // Build a safe correlation filter.
    //
    // Prefer the structured `filterCondition` (e.g. { leftColumn: 'order_items.order_id', rightColumn: 'orders.id' })
    // over the deprecated raw `filter` string. The structured form is validated and cannot accidentally
    // include user-supplied strings. The raw `filter` string is kept for backwards compatibility but
    // is marked deprecated — new call sites should use `filterCondition` instead.
    let filterSql: SQL;
    if (sub.filterCondition) {
      filterSql = sql.raw(`${sub.filterCondition.leftColumn} = ${sub.filterCondition.rightColumn}`);
    } else if (sub.filter) {
      filterSql = sql.raw(sub.filter);
    } else {
      filterSql = sql`true`;
    }

    switch (sub.type) {
      case 'count':
        return sql`(SELECT count(*) FROM ${subTable} WHERE ${filterSql})`;
      case 'exists':
        return sql`EXISTS (SELECT 1 FROM ${subTable} WHERE ${filterSql})`;
      case 'first': {
        // 'first' uses row_to_json() which is PostgreSQL-only.
        // Throw a clear DialectError rather than silently generating invalid SQL
        // that will crash at query-execution time with a cryptic DB error.
        if (dialect && dialect !== 'unknown' && dialect !== 'postgresql') {
          throw new DialectError('first', dialect);
        }
        return sql`(SELECT row_to_json(t) FROM (SELECT * FROM ${subTable} WHERE ${filterSql} LIMIT 1) t)`;
      }
      default:
        return undefined;
    }
  }
}
