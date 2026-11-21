import {
  Table,
  Column,
  SQL,
  sql,
  getTableColumns,
  and,
} from 'drizzle-orm';
import type { TableConfig, JoinConfig } from '../types/table.js';

// ** import utils
import { findJoin, getJoinTable } from '../utils/joinUtils.js';
import { applyOperator } from '../utils/operators.js';
import { ConfigError } from '../errors.js';

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
        const join = findJoin(config.joins ?? [], tableName);
        const joinedTable = join
          ? getJoinTable(this.schema, join)
          : (this.schema[tableName] as Table | undefined);
        if (joinedTable) {
          col = getTableColumns(joinedTable)[colName];
        }
      } else {
        // Base table column
        col = columns[dbField];
      }

      if (!col) continue;

      if (colConfig.dbTransform && colConfig.dbTransform.length > 0) {
        // Apply SQL transforms. col must be a Column object with a .name string;
        // SQL expressions (e.g. from computed columns) do not have .name and
        // cannot be wrapped in a function call.
        if (!('name' in col) || typeof (col as Column).name !== 'string') {
          throw new ConfigError(
            `[TableCraft] dbTransform on '${colConfig.name}' failed: ` +
            `the resolved column is not a plain Column (it may be a SQL expression). ` +
            `Use rawSelect() with an explicit SQL expression instead.`
          );
        }
        const colName = (col as Column).name;
        const expressionStr = colConfig.dbTransform.reduce((acc, func) => {
          if (func.includes('?')) {
            return func.replaceAll('?', acc);
          }
          return `${func}(${acc})`;
        }, colName);
        selection[colConfig.name] = sql.raw(expressionStr);
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
        const joinedTable = getJoinTable(this.schema, join);
        if (joinedTable) {
          const tableCols = getTableColumns(joinedTable);
          for (const colConfig of join.columns) {
            if (colConfig.hidden) continue;
            
            const colName = colConfig.field ?? colConfig.name;
            const col = tableCols[colName];
            if (col) {
              if (Object.prototype.hasOwnProperty.call(selection, colConfig.name)) {
                throw new ConfigError(
                  `[TableCraft] Name collision: join column '${colConfig.name}' from table '${join.table}' ` +
                  `conflicts with an existing selection key. ` +
                  `Rename the column using the 'field' property or give it a unique alias.`
                );
              }
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

    query = query.$dynamic();
    for (const join of config.joins) {
      query = this.applyJoin(query, join, sqlConditions);
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
  ): any {
    const joinedTable = getJoinTable(this.schema, join);
    if (!joinedTable) {
      throw new Error(`Joined table '${join.table}' not found in schema`);
    }

    const key = join.alias ?? join.table;
    const onCondition = sqlConditions?.get(key) ?? sql.raw(join.on);

    switch (join.type) {
      case 'left':  query = query.leftJoin(joinedTable, onCondition); break;
      case 'right': query = query.rightJoin(joinedTable, onCondition); break;
      case 'inner': query = query.innerJoin(joinedTable, onCondition); break;
      case 'full':  query = query.fullJoin(joinedTable, onCondition); break;
    }

    if (join.joins) {
      for (const nested of join.joins) {
        query = this.applyJoin(query, nested, sqlConditions);
      }
    }

    return query;
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
