import {
  Table,
  Column,
  SQL,
  getTableColumns,
  and,
  or,
} from 'drizzle-orm';
import { FilterExpression, FilterCondition, TableConfig } from '../types/table';
import { applyOperator } from '../utils/operators';

export class FilterGroupBuilder {
  constructor(private schema: Record<string, unknown>) {}

  /**
   * Builds SQL from a filter expression tree.
   * Supports arbitrary nesting of AND/OR groups.
   *
   * Example:
   * { type: 'or', conditions: [
   *   { field: 'status', operator: 'eq', value: 'active' },
   *   { type: 'and', conditions: [
   *     { field: 'priority', operator: 'eq', value: 'high' },
   *     { field: 'total', operator: 'gt', value: 1000 },
   *   ]}
   * ]}
   * → (status = 'active' OR (priority = 'high' AND total > 1000))
   */
  build(expression: FilterExpression, config: TableConfig): SQL | undefined {
    const table = this.schema[config.base] as Table;
    if (!table) return undefined;

    const columns = getTableColumns(table);
    return this.resolve(expression, columns);
  }

  /**
   * Builds SQL from an array of filter expressions (top-level AND).
   */
  buildAll(expressions: FilterExpression[], config: TableConfig): SQL | undefined {
    if (!expressions.length) return undefined;

    const parts: SQL[] = [];
    for (const expr of expressions) {
      const sql = this.build(expr, config);
      if (sql) parts.push(sql);
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
  }

  private resolve(expr: FilterExpression, columns: Record<string, Column>): SQL | undefined {
    // Leaf node: a single condition
    if ('field' in expr && 'operator' in expr) {
      return this.resolveCondition(expr as FilterCondition, columns);
    }

    // Branch node: AND/OR group
    const group = expr as { type: 'and' | 'or'; conditions: FilterExpression[] };
    const parts: SQL[] = [];

    for (const child of group.conditions) {
      const childSql = this.resolve(child, columns);
      if (childSql) parts.push(childSql);
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];

    return group.type === 'or' ? or(...parts) : and(...parts);
  }

  private resolveCondition(
    condition: FilterCondition,
    columns: Record<string, Column>
  ): SQL | undefined {
    const col = columns[condition.field];
    if (!col) return undefined;
    return applyOperator(condition.operator, col, condition.value);
  }
}
