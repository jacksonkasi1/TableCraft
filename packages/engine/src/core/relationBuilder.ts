import {
  Table,
  Column,
  SQL,
  getTableColumns,
  inArray,
  asc,
  desc,
} from 'drizzle-orm';
import { IncludeConfig, TableConfig } from '../types/table';
import { applyOperator } from '../utils/operators';

export class RelationBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Fetches related records and merges them into the parent data.
   * Uses batch loading (1 query per include level, not per row).
   *
   * Flow:
   * 1. Collect parent IDs from the main result
   * 2. SELECT * FROM related WHERE foreignKey IN (parentIds)
   * 3. Group by foreignKey
   * 4. Merge into parent rows under the `as` key
   * 5. Recurse for nested includes
   */
  async resolve(
    db: any,
    data: Record<string, unknown>[],
    config: TableConfig
  ): Promise<Record<string, unknown>[]> {
    if (!config.include?.length || data.length === 0) return data;

    let result = [...data];

    for (const inc of config.include) {
      result = await this.resolveOne(db, result, inc);
    }

    return result;
  }

  private async resolveOne(
    db: any,
    parentData: Record<string, unknown>[],
    inc: IncludeConfig
  ): Promise<Record<string, unknown>[]> {
    const relatedTable = this.schema[inc.table] as Table;
    if (!relatedTable) return parentData;

    const localKey = inc.localKey ?? 'id';

    // 1. Collect parent IDs
    const parentIds = [
      ...new Set(
        parentData
          .map((row) => row[localKey])
          .filter((id) => id !== null && id !== undefined)
      ),
    ];

    if (parentIds.length === 0) return parentData;

    // 2. Build the related query
    const relatedColumns = getTableColumns(relatedTable);
    const fkColumn = relatedColumns[inc.foreignKey];
    if (!fkColumn) return parentData;

    // Build selection (specific columns or all)
    let selection: Record<string, Column>;
    if (inc.columns?.length) {
      selection = {};
      for (const colName of inc.columns) {
        if (relatedColumns[colName]) selection[colName] = relatedColumns[colName];
      }
      // Always include the foreign key for grouping
      if (!selection[inc.foreignKey]) {
        selection[inc.foreignKey] = fkColumn;
      }
    } else {
      selection = { ...relatedColumns };
    }

    let query = db.select(selection).from(relatedTable).where(inArray(fkColumn, parentIds));

    // Apply WHERE conditions
    if (inc.where?.length) {
      for (const cond of inc.where) {
        const col = relatedColumns[cond.field];
        if (!col) continue;
        const op = applyOperator(cond.operator, col, cond.value);
        if (op) query = query.where(op);
      }
    }

    // Apply ORDER BY
    if (inc.orderBy?.length) {
      const orderClauses: SQL[] = [];
      for (const s of inc.orderBy) {
        const col = relatedColumns[s.field];
        if (!col) continue;
        orderClauses.push(s.order === 'desc' ? desc(col) : asc(col));
      }
      if (orderClauses.length) query = query.orderBy(...orderClauses);
    }

    // Apply LIMIT (per-parent limiting is complex; this is global limit)
    if (inc.limit) {
      query = query.limit(inc.limit * parentIds.length);
    }

    // 3. Execute
    const relatedRows: Record<string, unknown>[] = await query;

    // 4. Recursively resolve nested includes
    let processedRows = relatedRows;
    if (inc.include?.length) {
      const nestedConfig: TableConfig = {
        name: inc.table,
        base: inc.table,
        columns: [],
        include: inc.include,
      };
      processedRows = await this.resolve(db, relatedRows, nestedConfig);
    }

    // 5. Group by foreign key
    const grouped = new Map<unknown, Record<string, unknown>[]>();
    for (const row of processedRows) {
      const fkValue = row[inc.foreignKey];
      if (!grouped.has(fkValue)) grouped.set(fkValue, []);
      grouped.get(fkValue)!.push(row);
    }

    // 6. Merge into parent
    return parentData.map((parent) => ({
      ...parent,
      [inc.as]: grouped.get(parent[localKey]) ?? [],
    }));
  }
}
