import { Table, Column, SQL, sql, getTableColumns } from 'drizzle-orm';

/**
 * Type-safe column reference helper.
 * Use when you need a column ref outside of Drizzle's sql tag.
 *
 * @example
 * ```ts
 * const col = column(s.orders, 'total');  // ← TypeScript autocomplete + validation
 * const col = column(s.orders, 'typo');   // ← TypeScript ERROR
 * ```
 */
export function column<T extends Table>(
  table: T,
  name: T extends { _: { columns: infer C } } ? keyof C & string : string
): Column {
  const columns = getTableColumns(table);
  const col = columns[name];
  if (!col) {
    throw new Error(`Column '${name}' does not exist on table`);
  }
  return col;
}

/**
 * Type-safe CASE WHEN builder.
 * Avoids writing raw SQL for the most common pattern.
 *
 * @example
 * ```ts
 * const statusLabel = caseWhen(s.orders.status, {
 *   1: 'success',
 *   2: 'failed',
 *   3: 'partial',
 * }, 'unknown');
 * // → CASE WHEN status = 1 THEN 'success' WHEN status = 2 THEN 'failed' ... END
 *
 * defineTable(s.orders).computed('statusLabel', statusLabel, { type: 'string' });
 * ```
 */
export function caseWhen<T>(
  col: Column,
  mapping: Record<string | number, T>,
  fallback?: T
): SQL {
  const parts: SQL[] = [];

  for (const [value, result] of Object.entries(mapping)) {
    const v = isNaN(Number(value)) ? value : Number(value);
    parts.push(sql`WHEN ${col} = ${v} THEN ${result}`);
  }

  const caseParts = sql.join(parts, sql` `);

  if (fallback !== undefined) {
    return sql`CASE ${caseParts} ELSE ${fallback} END`;
  }

  return sql`CASE ${caseParts} END`;
}

/**
 * Type-safe COALESCE.
 *
 * @example
 * ```ts
 * const name = coalesce(s.users.nickname, s.users.name, sql`'Anonymous'`);
 * ```
 */
export function coalesce(...values: (Column | SQL | string | number)[]): SQL {
  const parts = values.map(v => {
    if (typeof v === 'string') return sql`${v}`;
    if (typeof v === 'number') return sql`${v}`;
    return v;
  });
  return sql`COALESCE(${sql.join(parts, sql`, `)})`;
}

/**
 * Type-safe CONCAT.
 */
export function concat(...values: (Column | SQL | string)[]): SQL {
  const parts = values.map(v => typeof v === 'string' ? sql`${v}` : v);
  return sql`CONCAT(${sql.join(parts, sql`, `)})`;
}

/**
 * Type-safe date truncation.
 *
 * @example
 * ```ts
 * const month = dateTrunc('month', s.orders.createdAt);
 * defineTable(s.orders).groupBy('createdAt') // or use as computed
 * ```
 */
export function dateTrunc(
  precision: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute',
  col: Column
): SQL {
  return sql`DATE_TRUNC(${precision}, ${col})`;
}

/**
 * Type-safe interval.
 */
export function interval(value: number, unit: 'days' | 'hours' | 'minutes' | 'months' | 'years'): SQL {
  return sql`INTERVAL '${sql.raw(String(value))} ${sql.raw(unit)}'`;
}

/**
 * Type-safe NOW() - interval shorthand.
 *
 * @example
 * ```ts
 * .rawWhere(sql`${s.orders.createdAt} > ${ago(30, 'days')}`)
 * ```
 */
export function ago(value: number, unit: 'days' | 'hours' | 'minutes' | 'months' | 'years'): SQL {
  return sql`NOW() - ${interval(value, unit)}`;
}
