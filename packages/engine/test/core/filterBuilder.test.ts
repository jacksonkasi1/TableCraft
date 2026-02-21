import { describe, it, expect, vi } from 'vitest';
import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core';
import { FilterBuilder } from '../../src/core/filterBuilder';
import { TableConfig } from '../../src/types/table';
import { FilterParam } from '../../src/types/engine';

// ---------------------------------------------------------------------------
// Mock schema tables
// ---------------------------------------------------------------------------

/** Base table — intentionally includes a "role" and "email" column to test
 *  name-clash: these must NOT shadow join columns of the same name. */
const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
  status: text('status'),
  total: integer('total'),
  userId: integer('user_id'),
  // Same names as join columns — used in the name-clash test
  role: text('role'),
  email: text('email'),
});

const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  role: text('role'),
  archived: boolean('archived'),
});

const tenants = pgTable('tenants', {
  id: integer('id').primaryKey(),
  plan: text('plan'),
  active: boolean('active'),
});

const usersOnly = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  status: text('status'),
  role: text('role'),
  age: integer('age'),
  archived: boolean('archived'),
});

const schema = { orders, users, tenants };
const schemaUsersOnly = { users: usersOnly };

// ---------------------------------------------------------------------------
// Base config (no joins)
// ---------------------------------------------------------------------------

const baseConfig: TableConfig = {
  name: 'users',
  base: 'users',
  columns: [
    { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
    { name: 'name', type: 'string', sortable: true, hidden: false, filterable: true },
    { name: 'email', type: 'string', sortable: true, hidden: false, filterable: true },
    { name: 'status', type: 'string', filterable: true, hidden: false, sortable: true },
    { name: 'age', type: 'number', filterable: true, hidden: false, sortable: true },
    { name: 'role', type: 'string', filterable: false, hidden: false, sortable: true }, // NOT filterable
  ],
  filters: [
    { field: 'status', operator: 'eq', type: 'dynamic' },
    { field: 'age', operator: 'gte', type: 'dynamic' },
    { field: 'archived', operator: 'eq', value: false, type: 'static' },
  ],
};

// ---------------------------------------------------------------------------
// Config with a single join (orders → users)
// ---------------------------------------------------------------------------

const joinConfig: TableConfig = {
  name: 'orders',
  base: 'orders',
  columns: [
    { name: 'id', type: 'number', filterable: true, hidden: false, sortable: true },
    { name: 'status', type: 'string', filterable: true, hidden: false, sortable: true },
    { name: 'total', type: 'number', filterable: true, hidden: false, sortable: true },
  ],
  joins: [
    {
      table: 'users',
      alias: 'customer',
      type: 'left',
      on: 'orders.user_id = users.id',
      columns: [
        { name: 'email', type: 'string', filterable: true, hidden: false, sortable: true },
        { name: 'role', type: 'string', filterable: true, hidden: false, sortable: true },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Config where a join column is NOT filterable
// ---------------------------------------------------------------------------

const joinConfigNotFilterable: TableConfig = {
  ...joinConfig,
  joins: [
    {
      table: 'users',
      alias: 'customer',
      type: 'left',
      on: 'orders.user_id = users.id',
      columns: [
        { name: 'email', type: 'string', filterable: false, hidden: false, sortable: true },
        { name: 'role', type: 'string', filterable: true, hidden: false, sortable: true },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Config with recursive/nested joins (orders → users → tenants)
// ---------------------------------------------------------------------------

const nestedJoinConfig: TableConfig = {
  name: 'orders',
  base: 'orders',
  columns: [
    { name: 'id', type: 'number', filterable: true, hidden: false, sortable: true },
    { name: 'status', type: 'string', filterable: true, hidden: false, sortable: true },
  ],
  joins: [
    {
      table: 'users',
      alias: 'customer',
      type: 'left',
      on: 'orders.user_id = users.id',
      columns: [
        { name: 'role', type: 'string', filterable: true, hidden: false, sortable: true },
      ],
      joins: [
        {
          table: 'tenants',
          alias: 'tenant',
          type: 'left',
          on: 'users.tenant_id = tenants.id',
          columns: [
            { name: 'plan', type: 'string', filterable: true, hidden: false, sortable: true },
            { name: 'active', type: 'boolean', filterable: true, hidden: false, sortable: true },
          ],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// The builder instances
// ---------------------------------------------------------------------------

const builderUsers = new FilterBuilder(schemaUsersOnly);
const builderOrders = new FilterBuilder(schema);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FilterBuilder', () => {

  // ── Base column filters ──────────────────────────────────────────────────
  describe('buildFilters — base columns', () => {
    it('returns a condition for a single filterable base column', () => {
      const params: Record<string, FilterParam> = {
        status: { operator: 'eq', value: 'active' },
      };
      const result = builderUsers.buildFilters(baseConfig, params);
      expect(result).toBeDefined();
    });

    it('returns a condition when multiple base columns are filtered', () => {
      const params: Record<string, FilterParam> = {
        status: { operator: 'eq', value: 'active' },
        age: { operator: 'gte', value: 18 },
      };
      const result = builderUsers.buildFilters(baseConfig, params);
      expect(result).toBeDefined();
    });

    it('returns undefined for empty params', () => {
      const result = builderUsers.buildFilters(baseConfig, {});
      expect(result).toBeUndefined();
    });

    it('rejects a base column explicitly marked filterable: false', () => {
      // "role" is filterable: false in baseConfig.columns
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };
      const result = builderUsers.buildFilters(baseConfig, params);
      expect(result).toBeUndefined();
    });

    it('rejects an unknown field (security)', () => {
      const params: Record<string, FilterParam> = {
        __proto__: { operator: 'eq', value: 'x' },
        injected: { operator: 'eq', value: 'x' },
      };
      const result = builderUsers.buildFilters(baseConfig, params);
      expect(result).toBeUndefined();
    });
  });

  // ── Join column filters ──────────────────────────────────────────────────
  describe('buildFilters — join columns', () => {
    it('returns a condition when filtering on a join column (eq)', () => {
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };
      const result = builderOrders.buildFilters(joinConfig, params);
      expect(result).toBeDefined();
    });

    it('returns a condition when filtering on a join column (neq)', () => {
      const params: Record<string, FilterParam> = {
        role: { operator: 'neq', value: 'admin' },
      };
      const result = builderOrders.buildFilters(joinConfig, params);
      expect(result).toBeDefined();
    });

    it('returns a condition when filtering on a join column (contains)', () => {
      const params: Record<string, FilterParam> = {
        email: { operator: 'contains', value: 'acme' },
      };
      const result = builderOrders.buildFilters(joinConfig, params);
      expect(result).toBeDefined();
    });

    it('combines base column and join column filters', () => {
      const params: Record<string, FilterParam> = {
        status: { operator: 'eq', value: 'pending' },
        role: { operator: 'eq', value: 'admin' },
      };
      const result = builderOrders.buildFilters(joinConfig, params);
      expect(result).toBeDefined();
    });

    it('rejects a join column marked filterable: false', () => {
      // "email" is filterable: false in joinConfigNotFilterable
      const params: Record<string, FilterParam> = {
        email: { operator: 'eq', value: 'test@example.com' },
      };
      const result = builderOrders.buildFilters(joinConfigNotFilterable, params);
      expect(result).toBeUndefined();
    });

    it('still filters on join column that IS filterable when another join column is not', () => {
      // "role" is filterable: true, "email" is filterable: false
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };
      const result = builderOrders.buildFilters(joinConfigNotFilterable, params);
      expect(result).toBeDefined();
    });

    it('handles join with no columns array gracefully', () => {
      const configNoJoinCols: TableConfig = {
        ...joinConfig,
        joins: [
          {
            table: 'users',
            alias: 'customer',
            type: 'left',
            on: 'orders.user_id = users.id',
            // columns intentionally omitted
          },
        ],
      };
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };
      // "role" is not in the whitelist → should be silently rejected
      const result = builderOrders.buildFilters(configNoJoinCols, params);
      expect(result).toBeUndefined();
    });

    it('ignores a join referencing a table not in the schema', () => {
      const configMissingTable: TableConfig = {
        ...joinConfig,
        joins: [
          {
            table: 'nonexistent',
            alias: 'x',
            type: 'left',
            on: 'orders.x_id = nonexistent.id',
            columns: [
              { name: 'role', type: 'string', filterable: true, hidden: false, sortable: true },
            ],
          },
        ],
      };
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };
      // role IS in whitelist but resolveJoinColumn can't find the table → silently skipped
      const result = builderOrders.buildFilters(configMissingTable, params);
      expect(result).toBeUndefined();
    });
  });

  // ── Name-clash: base column MUST NOT shadow join column ──────────────────
  describe('buildFilters — name-clash: base does NOT shadow join', () => {
    /**
     * The `orders` drizzle table has columns named `role` and `email`.
     * The join config also exposes `role` and `email` from the `users` table.
     * When a filter request arrives for "role" or "email", the filter builder
     * must use the join column (users.role / users.email), NOT orders.role /
     * orders.email — because only the join columns are listed in config.columns
     * (orders config.columns does NOT include role/email).
     */
    it('resolves "role" from the join table, not the base table', () => {
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };
      // Should return a defined condition (users.role), not undefined
      const result = builderOrders.buildFilters(joinConfig, params);
      expect(result).toBeDefined();
    });

    it('resolves "email" from the join table, not the base table', () => {
      const params: Record<string, FilterParam> = {
        email: { operator: 'contains', value: 'test' },
      };
      const result = builderOrders.buildFilters(joinConfig, params);
      expect(result).toBeDefined();
    });

    it('base column "status" is still resolved from base table when not in any join', () => {
      const params: Record<string, FilterParam> = {
        status: { operator: 'eq', value: 'pending' },
      };
      const result = builderOrders.buildFilters(joinConfig, params);
      expect(result).toBeDefined();
    });
  });

  // ── Recursive / nested joins ─────────────────────────────────────────────
  describe('buildFilters — recursive/nested joins', () => {
    it('adds deeply-nested join columns to the filterable whitelist', () => {
      // "plan" is in tenants, which is a nested join under users
      const params: Record<string, FilterParam> = {
        plan: { operator: 'eq', value: 'enterprise' },
      };
      const result = builderOrders.buildFilters(nestedJoinConfig, params);
      expect(result).toBeDefined();
    });

    it('resolves a column from a deeply-nested join', () => {
      const params: Record<string, FilterParam> = {
        active: { operator: 'eq', value: true },
      };
      const result = builderOrders.buildFilters(nestedJoinConfig, params);
      expect(result).toBeDefined();
    });

    it('still resolves a 1st-level join column in a nested config', () => {
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };
      const result = builderOrders.buildFilters(nestedJoinConfig, params);
      expect(result).toBeDefined();
    });

    it('rejects a field that is not in any join at any depth', () => {
      const params: Record<string, FilterParam> = {
        nope: { operator: 'eq', value: 'x' },
      };
      const result = builderOrders.buildFilters(nestedJoinConfig, params);
      expect(result).toBeUndefined();
    });
  });

  // ── buildStaticFilters ───────────────────────────────────────────────────
  describe('buildStaticFilters', () => {
    it('returns a condition for a static filter on a base column', () => {
      const result = builderUsers.buildStaticFilters(baseConfig);
      expect(result).toBeDefined(); // archived = false
    });

    it('returns undefined when there are no static filters', () => {
      const noStatic: TableConfig = {
        ...baseConfig,
        filters: [{ field: 'status', operator: 'eq', type: 'dynamic' }],
      };
      const result = builderUsers.buildStaticFilters(noStatic);
      expect(result).toBeUndefined();
    });

    it('returns undefined when filters array is empty', () => {
      const noFilters: TableConfig = { ...baseConfig, filters: [] };
      const result = builderUsers.buildStaticFilters(noFilters);
      expect(result).toBeUndefined();
    });

    it('returns undefined when filters is undefined', () => {
      const noFiltersDef: TableConfig = { ...baseConfig, filters: undefined };
      const result = builderUsers.buildStaticFilters(noFiltersDef);
      expect(result).toBeUndefined();
    });

    it('handles a static filter on a join column', () => {
      const configWithStaticJoin: TableConfig = {
        ...joinConfig,
        filters: [
          { field: 'role', operator: 'eq', value: 'admin', type: 'static' },
        ],
      };
      const result = builderOrders.buildStaticFilters(configWithStaticJoin);
      expect(result).toBeDefined();
    });

    it('skips static filters without a value', () => {
      const configNoValue: TableConfig = {
        ...baseConfig,
        filters: [{ field: 'status', operator: 'eq', type: 'static' }], // no value
      };
      const result = builderUsers.buildStaticFilters(configNoValue);
      expect(result).toBeUndefined();
    });
  });

  // ── Warn log on silent discard ───────────────────────────────────────────
  describe('warn logging on unresolvable column', () => {
    it('logs a warning when a whitelisted field cannot be resolved', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // "role" is whitelisted via a join to a nonexistent table — will pass whitelist
      // but fail to resolve, triggering a warning
      const configMissingTable: TableConfig = {
        ...joinConfig,
        joins: [
          {
            table: 'nonexistent',
            alias: 'x',
            type: 'left',
            on: 'orders.x_id = nonexistent.id',
            columns: [
              { name: 'role', type: 'string', filterable: true, hidden: false, sortable: true },
            ],
          },
        ],
      };

      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' },
      };

      builderOrders.buildFilters(configMissingTable, params);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('role')
      );

      warnSpy.mockRestore();
    });
  });
});
