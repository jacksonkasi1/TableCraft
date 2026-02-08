import { describe, it, expect } from 'vitest';
import { pgTable, integer, text } from 'drizzle-orm/pg-core';
import { SubqueryBuilder } from '../../src/core/subqueryBuilder';
import { TableConfig } from '../../src/types/table';

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});

const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
  userId: integer('user_id'),
});

const schema = { users, orders };

describe('SubqueryBuilder', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
    subqueries: [
      { alias: 'ordersCount', table: 'orders', type: 'count', filter: 'orders.user_id = users.id' },
      { alias: 'hasOrders', table: 'orders', type: 'exists', filter: 'orders.user_id = users.id' },
      { alias: 'lastOrder', table: 'orders', type: 'first', filter: 'orders.user_id = users.id' }
    ]
  };

  const builder = new SubqueryBuilder(schema);

  describe('buildSubqueries', () => {
    it('should build subquery map', () => {
      const result = builder.buildSubqueries(config);
      expect(result).toBeDefined();
      expect(Object.keys(result!)).toHaveLength(3);
      expect(result!['ordersCount']).toBeDefined();
      expect(result!['hasOrders']).toBeDefined();
      expect(result!['lastOrder']).toBeDefined();
    });

    it('should return undefined if no subqueries configured', () => {
      const noSubConfig: TableConfig = { ...config, subqueries: [] };
      const result = builder.buildSubqueries(noSubConfig);
      expect(result).toBeUndefined();
    });

    it('should ignore subqueries for unknown tables', () => {
      const badConfig: TableConfig = {
        ...config,
        subqueries: [{ alias: 'x', table: 'unknown', type: 'count' }]
      };
      const result = builder.buildSubqueries(badConfig);
      expect(result).toBeUndefined();
    });
  });
});
