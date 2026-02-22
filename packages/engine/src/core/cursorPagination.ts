import { Table, SQL, getTableColumns, gt, lt, eq, and, or, asc, desc } from 'drizzle-orm';
import { TableConfig, SortConfig } from '../types/table';
import { FieldError } from '../errors';

export interface CursorResult {
  whereCondition: SQL | undefined;
  orderBy: SQL[];
  limit: number;
}

export interface CursorMeta {
  nextCursor: string | null;
  pageSize: number;
}

/**
 * Cursor-based pagination.
 * Uses the sort column values as the cursor instead of OFFSET.
 * O(1) performance regardless of page depth.
 *
 * Cursor format: base64({ field: value, field2: value2 })
 *
 * Multi-column sort: the WHERE clause uses ALL sort fields in a
 * row-value comparison to avoid duplicate/skipped rows when rows
 * share the same primary sort value.
 */
export class CursorPaginationBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Decodes a cursor string and builds WHERE + ORDER BY for the next page.
   */
  build(
    config: TableConfig,
    cursor: string | undefined,
    pageSize: number,
    sort?: SortConfig[],
    sqlExpressions?: Map<string, SQL>
  ): CursorResult {
    const table = this.schema[config.base] as Table;
    if (!table) {
      return { whereCondition: undefined, orderBy: [], limit: pageSize + 1 };
    }

    const columns = getTableColumns(table);

    // Determine sort fields (default to id or createdAt)
    const sortFields = sort?.length
      ? sort
      : config.defaultSort?.length
        ? config.defaultSort
        : [{ field: 'id', order: 'asc' as const }];

    // Build ORDER BY — throw a FieldError for unknown fields instead of
    // injecting unvalidated raw SQL identifiers.
    const orderBy: SQL[] = sortFields.map((s) => {
      const col = columns[s.field];
      if (col) {
        return s.order === 'desc' ? desc(col) : asc(col);
      }
      if (sqlExpressions?.has(s.field)) {
        const expr = sqlExpressions.get(s.field)!;
        return s.order === 'desc' ? desc(expr) : asc(expr);
      }
      // Previously fell back to sql.identifier(s.field) — an unvalidated raw
      // SQL identifier that bypasses all whitelist checks. Throw instead so
      // the developer gets a clear, actionable error rather than a DB crash.
      throw new FieldError(
        s.field,
        `cannot be used for cursor pagination: not a known column or SQL expression`
      );
    });

    // Decode cursor and build WHERE
    // Uses ALL sort fields (compound cursor) so that rows sharing the same
    // primary sort value are not duplicated or skipped across pages.
    //
    // For ORDER BY col1 ASC, col2 ASC with cursor (v1, v2), the correct
    // continuation is a lexicographic OR-expansion:
    //
    //   (col1 > v1)
    //   OR (col1 = v1 AND col2 > v2)
    //   OR (col1 = v1 AND col2 = v2 AND col3 > v3)
    //   ...
    //
    // A flat AND (col1 > v1 AND col2 > v2) is WRONG — it would skip rows
    // where col1 = v1 and col2 > v2 (same primary sort value, later secondary).
    let whereCondition: SQL | undefined;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && sortFields.length > 0) {
        // Collect resolvable sort fields from base columns OR sqlExpressions
        // (computed/subquery sort fields can participate in cursor continuation)
        const resolvable = sortFields
          .map((s) => {
            const col = columns[s.field];
            const expr = sqlExpressions?.get(s.field);
            return { s, col, expr };
          })
          .filter(({ s, col, expr }) => (col !== undefined || expr !== undefined) && decoded[s.field] != null);

        if (resolvable.length === 1) {
          // Single field — simple gt/lt
          const { s, col, expr } = resolvable[0];
          const target = col ?? expr!;
          whereCondition = s.order === 'desc'
            ? lt(target, decoded[s.field])
            : gt(target, decoded[s.field]);
        } else if (resolvable.length > 1) {
          // Multi-field: build the lexicographic OR-expansion
          // Each "arm" of the OR is: (prefix equality conditions) AND (advance condition)
          const orArms: SQL[] = [];

          for (let i = 0; i < resolvable.length; i++) {
            const { s, col, expr } = resolvable[i];
            const target = col ?? expr!;
            const advance: SQL = s.order === 'desc'
              ? lt(target, decoded[s.field])
              : gt(target, decoded[s.field]);

            if (i === 0) {
              // First arm: just the advance condition on col1
              orArms.push(advance);
            } else {
              // Remaining arms: prefix equality on cols 0..i-1, advance on col i
              const prefixEqs: SQL[] = resolvable
                .slice(0, i)
                .map(({ s: ps, col: pc, expr: pe }) => eq(pc ?? pe!, decoded[ps.field]));
              orArms.push(and(...prefixEqs, advance) as SQL);
            }
          }

          whereCondition = or(...orArms) as SQL;
        }
      }
    }

    // Fetch one extra row to determine if there's a next page
    return {
      whereCondition,
      orderBy,
      limit: pageSize + 1,
    };
  }

  /**
   * From the fetched data (with 1 extra row), determine next cursor.
   * The cursor encodes ALL sort field values from the last row so the
   * compound WHERE condition can be reconstructed on the next request.
   */
  buildMeta(
    data: Record<string, unknown>[],
    pageSize: number,
    sort?: SortConfig[]
  ): { data: Record<string, unknown>[]; meta: CursorMeta } {
    const hasMore = data.length > pageSize;
    const trimmed = hasMore ? data.slice(0, pageSize) : data;

    let nextCursor: string | null = null;
    if (hasMore && trimmed.length > 0) {
      const lastRow = trimmed[trimmed.length - 1];
      // Encode ALL sort field values so the compound cursor WHERE is complete
      const sortFields = sort?.length ? sort : [{ field: 'id', order: 'asc' as const }];
      const cursorValues: Record<string, unknown> = {};
      for (const s of sortFields) {
        if (lastRow[s.field] != null) {
          cursorValues[s.field] = lastRow[s.field];
        }
      }
      nextCursor = encodeCursor(cursorValues);
    }

    return {
      data: trimmed,
      meta: { nextCursor, pageSize },
    };
  }
}

// ── Cursor encoding ──

export function encodeCursor(values: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(values)).toString('base64url');
}

export function decodeCursor(cursor: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
