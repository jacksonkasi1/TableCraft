import { describe, it, expect } from 'vitest';
import { pgTable, integer } from 'drizzle-orm/pg-core';
import { SubqueryBuilder } from '../../src/core/subqueryBuilder';
import { TableConfig } from '../../src/types/table';
import { DialectError } from '../../src/errors';

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

  // ── Dialect gating for 'first' mode ──

  describe("dialect gating for 'first' mode subqueries", () => {
    const firstOnlyConfig: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [
        { alias: 'lastOrder', table: 'orders', type: 'first', filter: 'orders.user_id = users.id' }
      ]
    };

    it("should build 'first' mode without error when dialect is 'postgresql'", () => {
      expect(() => builder.buildSubqueries(firstOnlyConfig, 'postgresql')).not.toThrow();
    });

    it("should build 'first' mode without error when dialect is undefined (no guard)", () => {
      expect(() => builder.buildSubqueries(firstOnlyConfig, undefined)).not.toThrow();
    });

    it("should build 'first' mode without error when dialect is 'unknown'", () => {
      expect(() => builder.buildSubqueries(firstOnlyConfig, 'unknown')).not.toThrow();
    });

    it("should throw DialectError for 'first' mode on 'mysql' dialect", () => {
      expect(() => builder.buildSubqueries(firstOnlyConfig, 'mysql')).toThrow(DialectError);
    });

    it("should throw DialectError for 'first' mode on 'sqlite' dialect", () => {
      expect(() => builder.buildSubqueries(firstOnlyConfig, 'sqlite')).toThrow(DialectError);
    });

    it("should throw DialectError with 'first' feature name and dialect", () => {
      try {
        builder.buildSubqueries(firstOnlyConfig, 'mysql');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(DialectError);
        expect((err as DialectError).message).toContain('first');
        expect((err as DialectError).message).toContain('mysql');
      }
    });

    it("should not throw for 'count' and 'exists' types on any dialect", () => {
      const countExistsConfig: TableConfig = {
        name: 'users',
        base: 'users',
        columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
        subqueries: [
          { alias: 'ordersCount', table: 'orders', type: 'count', filter: 'orders.user_id = users.id' },
          { alias: 'hasOrders', table: 'orders', type: 'exists', filter: 'orders.user_id = users.id' },
        ]
      };

      for (const dialect of ['postgresql', 'mysql', 'sqlite', 'unknown'] as const) {
        expect(() => builder.buildSubqueries(countExistsConfig, dialect)).not.toThrow();
      }
    });
  });
});
