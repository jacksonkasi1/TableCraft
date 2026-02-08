import {
  Table,
  Column,
  SQL,
  sql,
  getTableColumns,
  and,
} from 'drizzle-orm';
import { TableConfig, JoinConfig } from '../types/table';
import { applyOperator } from '../utils/operators';

export class QueryBuilder {
  constructor(private schema: Record<string, unknown>) {}

  buildSelect(table: Table, config: TableConfig): Record<string, SQL | Column> {
    const selection: Record<string, SQL | Column> = {};
    const columns = getTableColumns(table);

    for (const colConfig of config.columns) {
      if (colConfig.hidden) continue;
      // Skip computed columns (they are added by the engine)
      if (colConfig.computed) continue;

      const dbField = colConfig.field ?? colConfig.name;
      let col: Column | SQL | undefined;

      if (dbField.includes('.')) {
        // Joined column: "table.column"
        const [tableName, colName] = dbField.split('.');
        const joinedTable = this.schema[tableName] as Table;
        if (joinedTable) {
          const joinedCols = getTableColumns(joinedTable);
          col = joinedCols[colName];
          if (!col) {
             // console.warn(`[QueryBuilder] Column '${colName}' not found in joined table '${tableName}'`);
          }
        } else {
             // console.warn(`[QueryBuilder] Joined table '${tableName}' not found in schema`);
        }
      } else {
        // Base table column
        col = columns[dbField];
      }

      if (!col) continue;

      if (colConfig.dbTransform && colConfig.dbTransform.length > 0) {
        // Apply SQL transforms (only works if col is a Column object with name)
        const colName = (col as Column).name; 
        // TODO: This might break if col is already SQL or alias, but for now we assume Column
        if (colName) {
           let expressionStr = colConfig.dbTransform.reduce((acc, func) => `${func}(${acc})`, '?');
           selection[colConfig.name] = sql.raw(expressionStr.replace('?', colName));
        } else {
           selection[colConfig.name] = col;
        }
      } else {
        selection[colConfig.name] = col;
      }
    }

    // Collect columns from joins
    if (config.joins) {
      this.collectJoinColumns(config.joins, selection);
    }

    return selection;
  }

  private collectJoinColumns(joins: JoinConfig[], selection: Record<string, SQL | Column>) {
    for (const join of joins) {
      if (join.columns) {
        const joinedTable = this.schema[join.table] as Table;
        if (joinedTable) {
          const tableCols = getTableColumns(joinedTable);
          for (const colConfig of join.columns) {
            if (colConfig.hidden) continue;
            
            const colName = colConfig.field ?? colConfig.name;
            const col = tableCols[colName];
            if (col) {
               // TODO: Handle name collisions?
               selection[colConfig.name] = col;
            }
          }
        }
      }
      if (join.joins) {
        this.collectJoinColumns(join.joins, selection);
      }
    }
  }

  /**
   * Applies joins. Accepts optional SQL conditions map for type-safe joins.
   * If a SQL condition exists for a join's table/alias, it's used instead of the raw string.
   */
  buildJoins(
    query: any,
    config: TableConfig,
    sqlConditions?: Map<string, SQL>
  ): any {
    if (!config.joins) return query;

    for (const join of config.joins) {
      this.applyJoin(query, join, sqlConditions);
    }
    return query;
  }

  /**
   * Applies raw SQL join clauses (LATERAL JOIN, etc.)
   */
  applyRawJoins(query: any): any {
    // Raw joins are appended via sql template
    // Drizzle doesn't have a direct method, so we use a workaround
    // The caller should apply these at the db.execute level if needed
    return query;
  }

  private applyJoin(
    query: any,
    join: JoinConfig,
    sqlConditions?: Map<string, SQL>
  ): void {
    const joinedTable = this.schema[join.table] as Table;
    if (!joinedTable) {
      throw new Error(`Joined table '${join.table}' not found in schema`);
    }

    // Use SQL object if available, otherwise fall back to raw string
    const key = join.alias ?? join.table;
    const onCondition = sqlConditions?.get(key) ?? sql.raw(join.on);

    switch (join.type) {
      case 'left': query.leftJoin(joinedTable, onCondition); break;
      case 'right': query.rightJoin(joinedTable, onCondition); break;
      case 'inner': query.innerJoin(joinedTable, onCondition); break;
      case 'full': query.fullJoin(joinedTable, onCondition); break;
    }

    if (join.joins) {
      for (const nested of join.joins) {
        this.applyJoin(query, nested, sqlConditions);
      }
    }
  }

  buildBackendConditions(
    config: TableConfig,
    context: Record<string, any> = {}
  ): SQL | undefined {
    if (!config.backendConditions || config.backendConditions.length === 0) {
      return undefined;
    }

    const table = this.schema[config.base] as Table;
    const columns = getTableColumns(table);
    const conditions: SQL[] = [];

    for (const condition of config.backendConditions) {
      const col = columns[condition.field];
      if (!col) continue;

      let value = condition.value;

      if (typeof value === 'string' && value.startsWith('$')) {
        const contextKey = value.substring(1);
        value = contextKey
          .split('.')
          .reduce(
            (obj: Record<string, any> | undefined, k: string) => obj?.[k],
            context
          );

        if (value === undefined) {
          console.warn(`[tablecraft] Context key '${contextKey}' missing.`);
          value = null;
        }
      }

      const op = applyOperator(condition.operator, col, value);
      if (op) conditions.push(op);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
