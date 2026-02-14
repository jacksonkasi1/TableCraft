import {
  Table,
  SQL,
  sql,
  getTableColumns,
  getTableName,
} from 'drizzle-orm';
import { TableConfig } from '../types/table';
import { applyOperator } from '../utils/operators';

export class RecursiveBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds and executes a WITH RECURSIVE query for tree-structured data.
   *
   * Generates:
   * WITH RECURSIVE tree AS (
   *   SELECT *, 0 AS depth FROM table WHERE parentKey IS NULL
   *   UNION ALL
   *   SELECT c.*, t.depth + 1 FROM table c
   *   INNER JOIN tree t ON c.parentKey = t.childKey
   *   WHERE t.depth < maxDepth
   * )
   * SELECT * FROM tree ORDER BY depth, childKey
   */
  buildRecursiveSQL(config: TableConfig): SQL | undefined {
    if (!config.recursive) return undefined;

    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const tableName = getTableName(table);
    const { parentKey, childKey, maxDepth, depthAlias, pathAlias, startWith } = config.recursive;

    // Base case: root nodes
    let baseCondition: SQL;
    if (startWith) {
      const columns = getTableColumns(table);
      const col = columns[startWith.field];
      if (col) {
        const op = applyOperator(startWith.operator, col, startWith.value);
        baseCondition = op ?? sql`${sql.identifier(parentKey)} IS NULL`;
      } else {
        baseCondition = sql`${sql.identifier(parentKey)} IS NULL`;
      }
    } else {
      baseCondition = sql`${sql.identifier(parentKey)} IS NULL`;
    }

    // Path tracking
    const pathSelect = pathAlias
      ? sql`, CAST(${sql.identifier(childKey)} AS TEXT) AS ${sql.identifier(pathAlias)}`
      : sql``;
    const pathRecurse = pathAlias
      ? sql`, t.${sql.identifier(pathAlias)} || '/' || CAST(c.${sql.identifier(childKey)} AS TEXT) AS ${sql.identifier(pathAlias)}`
      : sql``;

    const recursiveSql = sql`
      WITH RECURSIVE tree AS (
        SELECT *, 0 AS ${sql.identifier(depthAlias)}${pathSelect}
        FROM ${sql.identifier(tableName)}
        WHERE ${baseCondition}

        UNION ALL

        SELECT c.*, t.${sql.identifier(depthAlias)} + 1${pathRecurse}
        FROM ${sql.identifier(tableName)} c
        INNER JOIN tree t ON c.${sql.identifier(parentKey)} = t.${sql.identifier(childKey)}
        WHERE t.${sql.identifier(depthAlias)} < ${maxDepth}
      )
      SELECT * FROM tree ORDER BY ${sql.identifier(depthAlias)}, ${sql.identifier(childKey)}
    `;

    return recursiveSql;
  }

  /**
   * Executes the recursive query and returns results.
   */
  async execute(db: any, config: TableConfig): Promise<Record<string, unknown>[]> {
    const query = this.buildRecursiveSQL(config);
    if (!query) return [];

    const result = await db.execute(query);

    // db.execute returns different shapes per driver
    // rows is typically result.rows or just result
    if (Array.isArray(result)) return result;
    if (result?.rows && Array.isArray(result.rows)) return result.rows;
    return [];
  }
}
