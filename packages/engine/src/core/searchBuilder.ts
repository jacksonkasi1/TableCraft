import {
  Table,
  SQL,
  sql,
  Column,
  getTableColumns,
  or,
  ilike,
} from 'drizzle-orm';
import { TableConfig } from '../types/table';
import { escapeLikePattern } from '../utils/operators';

export class SearchBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds a search condition across multiple columns using OR + ILIKE.
   */
  buildSearch(
    config: TableConfig,
    searchTerm: string
  ): SQL | undefined {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return undefined;
    }

    if (!config.search || !config.search.enabled) {
      return undefined;
    }

    const searchFields = config.search.fields;
    if (!searchFields || searchFields.length === 0) {
      return undefined;
    }

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const baseColumns = getTableColumns(table);
    const escaped = escapeLikePattern(searchTerm.trim());
    const conditions: SQL[] = [];

    for (const fieldName of searchFields) {
      const col = this.resolveColumn(baseColumns, fieldName);
      if (!col) continue;

      conditions.push(ilike(col, `%${escaped}%`));
    }

    if (conditions.length === 0) return undefined;

    // Combine with OR — matching any field is a hit
    return or(...conditions);
  }

  /**
   * Builds a PostgreSQL full-text search condition (tsvector/tsquery).
   * This is an optional enhanced mode — only works on PostgreSQL.
   */
  buildFullTextSearch(
    config: TableConfig,
    searchTerm: string,
    language: string = 'english'
  ): SQL | undefined {
    if (!searchTerm || searchTerm.trim().length === 0) return undefined;
    if (!config.search?.enabled) return undefined;

    const fields = config.search.fields;
    if (!fields || fields.length === 0) return undefined;

    // Concatenate all search fields into a single tsvector
    const concatParts = fields.map((f) =>
      sql`coalesce(${sql.identifier(f)}::text, '')`
    );
    const concatenated = sql.join(concatParts, sql` || ' ' || `);

    return sql`to_tsvector(${sql.raw(`'${language}'`)}, ${concatenated}) @@ plainto_tsquery(${sql.raw(`'${language}'`)}, ${searchTerm.trim()})`;
  }

  private resolveColumn(
    baseColumns: Record<string, Column>,
    fieldName: string
  ): Column | undefined {
    if (baseColumns[fieldName]) return baseColumns[fieldName];

    // Joined table column: "table.column"
    if (fieldName.includes('.')) {
      const [tableName, colName] = fieldName.split('.');
      const joinedTable = this.schema[tableName] as Table | undefined;
      if (!joinedTable) return undefined;
      const cols = getTableColumns(joinedTable);
      return cols[colName];
    }

    return undefined;
  }
}
