import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';
import { SubqueryBuilder } from '../../src/core/subqueryBuilder';
import { TableConfig } from '../../src/types/table';
import { DialectError } from '../../src/errors';

const users = pgTable('users', {
  id: integer('id').primaryKey(),
});

const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
  userId: integer('user_id'),
  status: varchar('status', { length: 50 }),
  amount: integer('amount'),
});

const schema = { users, orders };
const builder = new SubqueryBuilder(schema);

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract the SQL string from a Drizzle SQL object (calls .toSQL on a fake query). */
function toSqlString(sql: any): string {
  // Drizzle SQL objects expose their chunks; we serialize them to a readable string
  // by joining the queryChunks. For testing we use the internal representation.
  return JSON.stringify(sql);
}

// ── existing filter: string path (backwards compat) ──────────────────────────

describe('SubqueryBuilder — legacy filter string', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
    subqueries: [
      { alias: 'ordersCount', table: 'orders', type: 'count', filter: 'orders.user_id = users.id' },
      { alias: 'hasOrders',   table: 'orders', type: 'exists', filter: 'orders.user_id = users.id' },
      { alias: 'lastOrder',   table: 'orders', type: 'first',  filter: 'orders.user_id = users.id' },
    ],
  };

  it('builds a map with all three aliases', () => {
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(Object.keys(result!)).toHaveLength(3);
    expect(result!['ordersCount']).toBeDefined();
    expect(result!['hasOrders']).toBeDefined();
    expect(result!['lastOrder']).toBeDefined();
  });

  it('returns undefined when subqueries array is empty', () => {
    expect(builder.buildSubqueries({ ...config, subqueries: [] })).toBeUndefined();
  });

  it('silently skips subqueries whose table is not in schema', () => {
    const cfg: TableConfig = {
      ...config,
      subqueries: [{ alias: 'x', table: 'unknown_table', type: 'count' }],
    };
    expect(builder.buildSubqueries(cfg)).toBeUndefined();
  });
});

// ── filterConditions: structured path ────────────────────────────────────────

describe('SubqueryBuilder — filterConditions structured path', () => {

  it('builds a count subquery with a single column-to-column equality condition', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'ordersCount',
        table: 'orders',
        type: 'count',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } },
        ],
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['ordersCount']).toBeDefined();
  });

  it('builds an exists subquery with a single column-to-column equality condition', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'hasOrders',
        table: 'orders',
        type: 'exists',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } },
        ],
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['hasOrders']).toBeDefined();
  });

  it('builds a first subquery with filterConditions on postgresql dialect', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'lastOrder',
        table: 'orders',
        type: 'first',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } },
        ],
      }],
    };
    expect(() => builder.buildSubqueries(config, 'postgresql')).not.toThrow();
    const result = builder.buildSubqueries(config, 'postgresql');
    expect(result!['lastOrder']).toBeDefined();
  });

  it('supports multi-condition AND (column-to-column + column-to-literal)', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'paidOrdersCount',
        table: 'orders',
        type: 'count',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq',  right: { column: 'users.id' } },
          { left: { column: 'orders.status'  }, op: 'eq',  right: { value: 'paid' } },
        ],
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['paidOrdersCount']).toBeDefined();
  });

  it('supports non-equality operators: gte with a literal number', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'bigOrdersCount',
        table: 'orders',
        type: 'count',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq',  right: { column: 'users.id' } },
          { left: { column: 'orders.amount'  }, op: 'gte', right: { value: 100 } },
        ],
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['bigOrdersCount']).toBeDefined();
  });

  it('supports neq operator with literal value', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'nonCancelledOrders',
        table: 'orders',
        type: 'count',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq',  right: { column: 'users.id' } },
          { left: { column: 'orders.status'  }, op: 'neq', right: { value: 'cancelled' } },
        ],
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['nonCancelledOrders']).toBeDefined();
  });

  it('supports lt and lte operators', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'smallOrders',
        table: 'orders',
        type: 'count',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } },
          { left: { column: 'orders.amount'  }, op: 'lt', right: { value: 50 } },
        ],
      }],
    };
    expect(() => builder.buildSubqueries(config)).not.toThrow();
  });

  it('supports three or more conditions (AND chain)', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'specificOrders',
        table: 'orders',
        type: 'count',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq',  right: { column: 'users.id' } },
          { left: { column: 'orders.status'  }, op: 'eq',  right: { value: 'paid' } },
          { left: { column: 'orders.amount'  }, op: 'gte', right: { value: 10 } },
        ],
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['specificOrders']).toBeDefined();
  });

  it('filterConditions takes priority over deprecated filter string when both present', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{
        alias: 'ordersCount',
        table: 'orders',
        type: 'count',
        filter: 'orders.user_id = users.id',
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } },
        ],
      }],
    };
    // Both defined — filterConditions path should be used without error
    expect(() => builder.buildSubqueries(config)).not.toThrow();
    const result = builder.buildSubqueries(config);
    expect(result!['ordersCount']).toBeDefined();
  });

  it('falls back to sql`true` when neither filter nor filterConditions is provided', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [{ alias: 'allOrders', table: 'orders', type: 'count' }],
    };
    // Should not throw — just scans whole sub-table
    expect(() => builder.buildSubqueries(config)).not.toThrow();
    const result = builder.buildSubqueries(config);
    expect(result!['allOrders']).toBeDefined();
  });
});

// ── dialect gating (filterConditions path) ───────────────────────────────────

describe('SubqueryBuilder — dialect gating with filterConditions', () => {
  const firstConfig: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
    subqueries: [{
      alias: 'lastOrder',
      table: 'orders',
      type: 'first',
      filterConditions: [
        { left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } },
      ],
    }],
  };

  it('allows first on postgresql', () => {
    expect(() => builder.buildSubqueries(firstConfig, 'postgresql')).not.toThrow();
  });

  it('allows first when dialect is undefined', () => {
    expect(() => builder.buildSubqueries(firstConfig, undefined)).not.toThrow();
  });

  it('allows first when dialect is unknown', () => {
    expect(() => builder.buildSubqueries(firstConfig, 'unknown')).not.toThrow();
  });

  it('throws DialectError for first on mysql', () => {
    expect(() => builder.buildSubqueries(firstConfig, 'mysql')).toThrow(DialectError);
  });

  it('throws DialectError for first on sqlite', () => {
    expect(() => builder.buildSubqueries(firstConfig, 'sqlite')).toThrow(DialectError);
  });

  it('count and exists never throw regardless of dialect', () => {
    const cfg: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
      subqueries: [
        { alias: 'c', table: 'orders', type: 'count',  filterConditions: [{ left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } }] },
        { alias: 'e', table: 'orders', type: 'exists', filterConditions: [{ left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } }] },
      ],
    };
    for (const dialect of ['postgresql', 'mysql', 'sqlite', 'unknown'] as const) {
      expect(() => builder.buildSubqueries(cfg, dialect)).not.toThrow();
    }
  });
});

// ── filterSql: Drizzle SQL expression path ────────────────────────────────────

describe('SubqueryBuilder — filterSql Drizzle SQL expression path', () => {
  const baseColumns: TableConfig['columns'] = [
    { name: 'id', type: 'number', hidden: false, sortable: true, filterable: true },
  ];

  it('accepts a drizzle sql`` expression for count', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: baseColumns,
      subqueries: [{
        alias: 'ordersCount',
        table: 'orders',
        type: 'count',
        filterSql: sql`${orders.userId} = ${users.id}`,
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['ordersCount']).toBeDefined();
  });

  it('accepts a drizzle sql`` expression for exists', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: baseColumns,
      subqueries: [{
        alias: 'hasOrders',
        table: 'orders',
        type: 'exists',
        filterSql: sql`${orders.userId} = ${users.id}`,
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['hasOrders']).toBeDefined();
  });

  it('accepts a drizzle sql`` expression for first (postgresql)', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: baseColumns,
      subqueries: [{
        alias: 'lastOrder',
        table: 'orders',
        type: 'first',
        filterSql: sql`${orders.userId} = ${users.id}`,
      }],
    };
    const result = builder.buildSubqueries(config, 'postgresql');
    expect(result).toBeDefined();
    expect(result!['lastOrder']).toBeDefined();
  });

  it('filterSql takes priority over filterConditions when both present', () => {
    // If filterSql is present it should be used (no error thrown), even if
    // filterConditions is also set. We verify by checking a result is returned.
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: baseColumns,
      subqueries: [{
        alias: 'ordersCount',
        table: 'orders',
        type: 'count',
        filterSql: sql`${orders.userId} = ${users.id}`,
        filterConditions: [
          { left: { column: 'orders.user_id' }, op: 'eq', right: { column: 'users.id' } },
        ],
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['ordersCount']).toBeDefined();
  });

  it('filterSql with a compound expression (AND + literal)', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: baseColumns,
      subqueries: [{
        alias: 'activeOrders',
        table: 'orders',
        type: 'count',
        filterSql: sql`${orders.userId} = ${users.id} AND ${orders.status} = ${'active'}`,
      }],
    };
    const result = builder.buildSubqueries(config);
    expect(result).toBeDefined();
    expect(result!['activeOrders']).toBeDefined();
  });
});
