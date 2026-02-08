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
            // For joins, we assume colConfig.name matches the column name in the joined table
            // unless field is specified.
            // But usually we alias output.
            // If alias is provided for the table, Drizzle handles it if we join properly.
            // But here we are selecting specific columns.
            // If join.alias is "customer" and column is "email", we probably want output "email" or "customer.email"?
            // In the example config, columns=['email', 'role'], alias='customer'.
            // The expectation is flat 'email', 'role' OR 'customer.email'?
            // The manual route returned 'customer: { email, role }'.
            // The test expects 'first.email'.
            // So we should output 'email'.
            
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
