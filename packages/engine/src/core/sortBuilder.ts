import {
  Table,
  SQL,
  getTableColumns,
  asc,
  desc,
  Column,
} from 'drizzle-orm';
import { TableConfig, JoinConfig } from '../types/table';
import { SortParam } from '../types/engine';
import { isJoinColumnInJoins, collectSortableJoinFields } from '../utils/joinUtils';

export class SortBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds ORDER BY clauses from request params, falling back to defaults.
   * Only allows sorting on columns marked sortable in the config.
   *
   * Supports:
   * - Base-table columns
   * - Join columns (resolved recursively through join configs)
   * - Computed/raw-select SQL expressions (via the optional sqlExpressions map)
   *
   * @param sqlExpressions - Optional map of field name → SQL expression for
   *   computed/raw-select columns that don't exist as real Drizzle columns.
   */
  buildSort(config: TableConfig, params?: SortParam[], sqlExpressions?: Map<string, SQL>): SQL[] {
    const sortParams =
      params && params.length > 0 ? params : this.getDefaultSort(config);

    if (!sortParams || sortParams.length === 0) return [];

    const table = this.schema[config.base] as Table;
    if (!table) return [];

    const baseColumns = getTableColumns(table);

    // Build a whitelist of sortable fields from base columns AND join columns
    const sortableFields = new Set<string>();
    for (const col of config.columns) {
      if (col.sortable !== false) {
        sortableFields.add(col.name);
      }
    }
    if (config.joins) {
      collectSortableJoinFields(config.joins, sortableFields);
    }

    const clauses: SQL[] = [];

    for (const sp of sortParams) {
      if (!sortableFields.has(sp.field)) continue;

      const colConfig = config.columns.find(c => c.name === sp.field);
      const dbFieldName = colConfig?.field ?? sp.field;

      let col: Column | undefined;

      // 1. Dot-syntax: "users.email" → explicit table reference
      if (dbFieldName.includes('.')) {
         const [tableName, colName] = dbFieldName.split('.');
         // Find actual table name if tableName is an alias
         let actualTableName = tableName;
         if (config.joins) {
           const aliasedJoin = config.joins.find(j => j.alias === tableName);
           if (aliasedJoin) {
             actualTableName = aliasedJoin.table;
           }
         }
         
         const joinedTable = this.schema[actualTableName] as Table | undefined;
         if (joinedTable) {
             col = getTableColumns(joinedTable)[colName];
         }
      } else {
         // 2. Try the base table first, unless it's a join field to prevent shadowing
         const isJoinField = isJoinColumnInJoins(config.joins ?? [], sp.field);
         if (!isJoinField) {
           col = baseColumns[dbFieldName];
         }
      }

      if (col) {
        clauses.push(sp.order === 'desc' ? desc(col) : asc(col));
        continue;
      }

      // 3. Fallback: computed/raw-select SQL expressions
      const sqlExpr = sqlExpressions?.get(sp.field) ?? sqlExpressions?.get(dbFieldName);
      if (sqlExpr) {
        clauses.push(sp.order === 'desc' ? desc(sqlExpr) : asc(sqlExpr));
        continue;
      }

      // 4. Fallback: search join configs for this column name
      const joinCol = this.resolveJoinColumn(config, sp.field);
      if (joinCol) {
        clauses.push(sp.order === 'desc' ? desc(joinCol) : asc(joinCol));
      }
    }

    return clauses;
  }

  /**
   * Searches join configs recursively for a column with the given plain name.
   * Returns the Drizzle Column from the joined table's schema.
   * 
   * Note: This implements a "first-match-wins" strategy. If multiple joins
   * expose a column with the same name, the first one encountered in a
   * depth-first traversal of the join tree will be used.
   */
  private resolveJoinColumn(
    config: { joins?: JoinConfig[] },
    fieldName: string
  ): Column | undefined {
    if (!config.joins) return undefined;

    for (const join of config.joins) {
      const joinColConfig = join.columns?.find(
        (c) => c.name === fieldName
      );

      if (joinColConfig) {
        const joinedTable = this.schema[join.table] as Table | undefined;
        if (!joinedTable) continue;

        const joinedCols = getTableColumns(joinedTable);
        const dbCol = joinColConfig.field ?? fieldName;
        const column = joinedCols[dbCol];
        if (column) return column;
      }

      // Recurse into nested joins
      if (join.joins) {
        const nested = this.resolveJoinColumn({ joins: join.joins }, fieldName);
        if (nested) return nested;
      }
    }

    return undefined;
  }

  private getDefaultSort(config: TableConfig): SortParam[] | undefined {
    if (!config.defaultSort || config.defaultSort.length === 0) return undefined;

    return config.defaultSort.map((s) => ({
      field: s.field,
      order: s.order ?? 'asc',
    }));
  }
}
