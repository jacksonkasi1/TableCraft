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
    // Build a safe correlation filter. The filter string is a developer-authored
    // SQL correlation condition (e.g. "orders.user_id = users.id").
    // It is written by the application developer in source code — not by end users —
    // so raw injection risk is low. However, to prevent accidental developer mistakes
    // we keep the TODO comment and ensure this is clearly documented.
    //
    // TODO: replace with a structured, parameterised representation so the filter
    //   can be validated and cannot accidentally include user-supplied strings.
    const filterSql = sub.filter ? sql.raw(sub.filter) : sql`true`;

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
          throw new DialectError(
            `subquery type 'first' (alias: '${sub.alias}')`,
            dialect
          );
        }
        return sql`(SELECT row_to_json(t) FROM (SELECT * FROM ${subTable} WHERE ${filterSql} LIMIT 1) t)`;
      }
      default:
        return undefined;
    }
  }
}
