import { Table, SQL, sql, getTableColumns, gt, lt, asc, desc } from 'drizzle-orm';
import { TableConfig, SortConfig } from '../types/table';

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
 * Uses the sort column value as the cursor instead of OFFSET.
 * O(1) performance regardless of page depth.
 *
 * Cursor format: base64({ field: value, field2: value2 })
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

    // Build ORDER BY
    const orderBy: SQL[] = sortFields.map((s) => {
      const col = columns[s.field];
      if (col) {
        return s.order === 'desc' ? desc(col) : asc(col);
      }
      if (sqlExpressions?.has(s.field)) {
        const expr = sqlExpressions.get(s.field)!;
        return s.order === 'desc' ? desc(expr) : asc(expr);
      }
      return s.order === 'desc' ? desc(sql.identifier(s.field)) : asc(sql.identifier(s.field));
    });

    // Decode cursor and build WHERE
    let whereCondition: SQL | undefined;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && sortFields.length > 0) {
        const primary = sortFields[0];
        const col = columns[primary.field];
        if (col && decoded[primary.field] !== undefined) {
          whereCondition = primary.order === 'desc'
            ? lt(col, decoded[primary.field])
            : gt(col, decoded[primary.field]);
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
      const sortField = sort?.[0]?.field ?? 'id';
      nextCursor = encodeCursor({ [sortField]: lastRow[sortField] });
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
