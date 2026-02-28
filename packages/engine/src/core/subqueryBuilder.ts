import {
  Table,
  SQL,
  sql,
} from 'drizzle-orm';
import { TableConfig, SubqueryConfig, SubqueryCondition } from '../types/table';
import { Dialect } from './dialect';
import { DialectError } from '../errors';

// Maps our operator enum to the SQL operator string
const OP_MAP: Record<NonNullable<SubqueryCondition['op']>, string> = {
  eq:    '=',
  neq:   '!=',
  gt:    '>',
  gte:   '>=',
  lt:    '<',
  lte:   '<=',
  like:  'LIKE',
  ilike: 'ILIKE',
};

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
    const filterSql = this.buildFilter(sub, dialect);

    switch (sub.type) {
      case 'count':
        return sql`(SELECT count(*) FROM ${subTable} WHERE ${filterSql})`;
      case 'exists':
        return sql`EXISTS (SELECT 1 FROM ${subTable} WHERE ${filterSql})`;
      case 'first': {
        // 'first' uses row_to_json() which is PostgreSQL-only.
        if (dialect && dialect !== 'unknown' && dialect !== 'postgresql') {
          throw new DialectError('first', dialect);
        }
        return sql`(SELECT row_to_json(t) FROM (SELECT * FROM ${subTable} WHERE ${filterSql} LIMIT 1) t)`;
      }
      default:
        return undefined;
    }
  }

  /**
   * Builds the WHERE clause SQL for a subquery.
   *
   * Priority:
   * 1. `filterSql`        — Drizzle SQL expression (full Drizzle DX, passed through as-is)
   * 2. `filterConditions` — structured array of conditions (typed, safe, recommended)
   * 3. `filter`           — raw SQL string (@deprecated, developer-authored only)
   * 4. fallback           — `true` (uncorrelated, scans whole table)
   */
  private buildFilter(sub: SubqueryConfig, dialect?: Dialect): SQL {
    if (sub.filterSql) {
      return sub.filterSql;
    }
    if (sub.filterConditions && sub.filterConditions.length > 0) {
      return this.buildStructuredFilter(sub.filterConditions, dialect);
    }
    if (sub.filter) {
      return sql.raw(sub.filter);
    }
    return sql`true`;
  }

  /**
   * Converts a `SubqueryCondition[]` into a single AND-combined SQL expression.
   *
   * Column references  → emitted via sql.raw() — developer-defined, not user input
   * Literal values     → parameterized via sql`${value}` to prevent injection
   */
  private buildStructuredFilter(conditions: SubqueryCondition[], dialect?: Dialect): SQL {
    if (conditions.length === 0) return sql`true`;

    const parts = conditions.map((cond) => {
      const leftSql  = 'column' in cond.left  ? sql.raw(cond.left.column)  : sql`${cond.left.value as any}`;
      const rightSql = 'column' in cond.right ? sql.raw(cond.right.column) : sql`${cond.right.value as any}`;
      const op = cond.op ?? 'eq';

      if (op === 'ilike') {
        if (dialect && dialect !== 'unknown' && dialect !== 'postgresql') {
          // MySQL/SQLite don't support ILIKE directly. We rewrite to LOWER() LIKE LOWER().
          return sql`LOWER(${leftSql}) LIKE LOWER(${rightSql})`;
        }
      }

      const opStr = OP_MAP[op];
      return sql`${leftSql} ${sql.raw(opStr)} ${rightSql}`;
    });

    // AND-combine all parts
    return parts.reduce((acc, part) => sql`${acc} AND ${part}`);
  }
}
