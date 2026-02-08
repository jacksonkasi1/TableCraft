import { 
  Table, 
  Column, 
  SQL, 
  sql, 
  getTableColumns,
  and
} from 'drizzle-orm';
import { TableConfig, JoinConfig } from '../types/table';
import { applyOperator } from '../utils/operators';

export class QueryBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds the selection object for a Drizzle query.
   * Handles column selection, aliasing, and database-level transformations.
   */
  buildSelect(table: Table, config: TableConfig): Record<string, SQL | Column> {
    const selection: Record<string, SQL | Column> = {};
    const columns = getTableColumns(table);

    for (const colConfig of config.columns) {
      if (colConfig.hidden) continue;

      const col = columns[colConfig.name];
      if (!col) continue;

      if (colConfig.dbTransform && colConfig.dbTransform.length > 0) {
        // Apply SQL transforms
        let expressionStr = colConfig.dbTransform.reduce((acc, func) => `${func}(${acc})`, '?');
        selection[colConfig.name] = sql.raw(expressionStr.replace('?', col.name)); 
      } else {
        selection[colConfig.name] = col;
      }
    }

    return selection;
  }

  /**
   * Applies joins to a query builder instance.
   * Supports recursive joins.
   */
  buildJoins(query: any, config: TableConfig): any {
    if (!config.joins) return query;

    for (const join of config.joins) {
        this.applyJoin(query, join);
    }
    return query;
  }

  private applyJoin(query: any, join: JoinConfig) {
      const joinedTable = this.schema[join.table] as Table;
      if (!joinedTable) {
          throw new Error(`Joined table '${join.table}' not found in schema`);
      }

      // Safe ON condition parsing needed.
      const onCondition = sql.raw(join.on); 

      switch (join.type) {
          case 'left':
              query.leftJoin(joinedTable, onCondition);
              break;
          case 'right':
              query.rightJoin(joinedTable, onCondition);
              break;
          case 'inner':
              query.innerJoin(joinedTable, onCondition);
              break;
          case 'full':
              query.fullJoin(joinedTable, onCondition);
              break;
      }

      if (join.joins) {
          for (const nestedJoin of join.joins) {
              this.applyJoin(query, nestedJoin);
          }
      }
  }

  /**
   * Builds the WHERE clause for backend conditions (static filters).
   */
  buildBackendConditions(config: TableConfig, context: Record<string, any> = {}): SQL | undefined {
    if (!config.backendConditions || config.backendConditions.length === 0) {
      return undefined;
    }

    const conditions: SQL[] = [];
    const table = this.schema[config.base] as Table;
    const columns = getTableColumns(table);

    for (const condition of config.backendConditions) {
        const col = columns[condition.field];
        if (!col) continue;

        let value = condition.value;

        // Context variable substitution (e.g. "$user.id")
        if (typeof value === 'string' && value.startsWith('$')) {
            const contextKey = value.substring(1); // remove '$'
            value = contextKey.split('.').reduce((obj, key) => obj?.[key], context);
            
            if (value === undefined) {
                console.warn(`Context key '${contextKey}' missing for backend condition.`);
                value = null; 
            }
        }

        const op = applyOperator(condition.operator, col, value);
        if (op) conditions.push(op);
    }
    
    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
