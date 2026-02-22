import { describe, it, expect } from 'vitest';
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { SortBuilder } from '../../src/core/sortBuilder';
import { TableConfig } from '../../src/types/table';
import { SortParam } from '../../src/types/engine';

const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  role: text('role'),
});

const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
  userId: integer('user_id'),
  status: text('status'),
  total: integer('total'),
});

const schema = { users, orders };

describe('SortBuilder', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [
      { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
      { name: 'name', type: 'string', sortable: true, hidden: false, filterable: true },
      { name: 'email', type: 'string', sortable: false, hidden: false, filterable: true }, // Not sortable
    ],
    defaultSort: [
      { field: 'name', order: 'asc' }
    ]
  };

  const builder = new SortBuilder(schema);

  describe('buildSort', () => {
    it('should return default sort if no params provided', () => {
      const sort = builder.buildSort(config, []);
      expect(sort).toHaveLength(1);
      // We assume it's name ASC
    });

    it('should return default sort if params are empty/undefined', () => {
      const sort = builder.buildSort(config, undefined);
      expect(sort).toHaveLength(1);
    });

    it('should use provided sort params', () => {
      const params: SortParam[] = [{ field: 'id', order: 'desc' }];
      const sort = builder.buildSort(config, params);
      expect(sort).toHaveLength(1);
    });

    it('should ignore unsortable columns', () => {
      const params: SortParam[] = [{ field: 'email', order: 'asc' }];
      const sort = builder.buildSort(config, params);
      expect(sort).toHaveLength(0);
    });

    it('should ignore unknown columns', () => {
        const params: SortParam[] = [{ field: 'unknown', order: 'asc' }];
        const sort = builder.buildSort(config, params);
        expect(sort).toHaveLength(0);
    });

    it('should handle multiple sort params', () => {
        const params: SortParam[] = [
            { field: 'name', order: 'desc' },
            { field: 'id', order: 'asc' }
        ];
        const sort = builder.buildSort(config, params);
        expect(sort).toHaveLength(2);
    });
  });

  describe('buildSort — computed/raw-select SQL expressions', () => {
    const configWithComputed: TableConfig = {
      name: 'orders',
      base: 'users',
      columns: [
        { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
        { name: 'vatAmount', type: 'number', sortable: true, hidden: false, filterable: false },
        { name: 'displayName', type: 'string', sortable: true, hidden: false, filterable: false },
      ],
    };

    const vatExpr = sql`total * 0.2`;
    const displayExpr = sql`first_name || ' ' || last_name`;

    const sqlExpressions = new Map([
      ['vatAmount', vatExpr],
      ['displayName', displayExpr],
    ]);

    it('should use SQL expression when field is not a real Drizzle column (asc)', () => {
      const params: SortParam[] = [{ field: 'vatAmount', order: 'asc' }];
      const sort = builder.buildSort(configWithComputed, params, sqlExpressions);
      expect(sort).toHaveLength(1);
    });

    it('should use SQL expression when field is not a real Drizzle column (desc)', () => {
      const params: SortParam[] = [{ field: 'vatAmount', order: 'desc' }];
      const sort = builder.buildSort(configWithComputed, params, sqlExpressions);
      expect(sort).toHaveLength(1);
    });

    it('should resolve multiple mixed sorts — real column and computed expression', () => {
      const params: SortParam[] = [
        { field: 'id', order: 'asc' },
        { field: 'vatAmount', order: 'desc' },
      ];
      const sort = builder.buildSort(configWithComputed, params, sqlExpressions);
      expect(sort).toHaveLength(2);
    });

    it('should drop computed field when not in sqlExpressions map', () => {
      const params: SortParam[] = [{ field: 'vatAmount', order: 'asc' }];
      // Pass empty map — vatAmount has no backing column and no expression
      const sort = builder.buildSort(configWithComputed, params, new Map());
      expect(sort).toHaveLength(0);
    });

    it('should drop computed field when no sqlExpressions map is provided at all', () => {
      const params: SortParam[] = [{ field: 'vatAmount', order: 'asc' }];
      const sort = builder.buildSort(configWithComputed, params);
      expect(sort).toHaveLength(0);
    });

    it('should handle all computed sorts from the map', () => {
      const params: SortParam[] = [
        { field: 'vatAmount', order: 'asc' },
        { field: 'displayName', order: 'desc' },
      ];
      const sort = builder.buildSort(configWithComputed, params, sqlExpressions);
      expect(sort).toHaveLength(2);
    });
  });

  describe('buildSort — join columns', () => {
    const configWithJoin: TableConfig = {
      name: 'orders',
      base: 'orders',
      columns: [
        { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
        { name: 'status', type: 'string', sortable: true, hidden: false, filterable: true },
      ],
      joins: [{
        table: 'users',
        type: 'left',
        on: 'orders.user_id = users.id',
        columns: [
          { name: 'email', type: 'string', hidden: false, sortable: true, filterable: true },
          { name: 'role', type: 'string', hidden: false, sortable: true, filterable: true },
        ],
      }],
    };

    const joinBuilder = new SortBuilder(schema);

    it('should sort by a join column (email from users)', () => {
      const params: SortParam[] = [{ field: 'email', order: 'asc' }];
      const sort = joinBuilder.buildSort(configWithJoin, params);
      expect(sort).toHaveLength(1);
    });

    it('should sort by a join column in desc order', () => {
      const params: SortParam[] = [{ field: 'email', order: 'desc' }];
      const sort = joinBuilder.buildSort(configWithJoin, params);
      expect(sort).toHaveLength(1);
    });

    it('should sort by multiple join columns', () => {
      const params: SortParam[] = [
        { field: 'email', order: 'asc' },
        { field: 'role', order: 'desc' },
      ];
      const sort = joinBuilder.buildSort(configWithJoin, params);
      expect(sort).toHaveLength(2);
    });

    it('should mix base and join column sorts', () => {
      const params: SortParam[] = [
        { field: 'status', order: 'asc' },
        { field: 'email', order: 'desc' },
      ];
      const sort = joinBuilder.buildSort(configWithJoin, params);
      expect(sort).toHaveLength(2);
    });

    it('should ignore join columns that are not sortable', () => {
      const configNotSortable: TableConfig = {
        ...configWithJoin,
        joins: [{
          table: 'users',
          type: 'left',
          on: 'orders.user_id = users.id',
          columns: [
            { name: 'email', type: 'string', hidden: false, sortable: false, filterable: true },
          ],
        }],
      };
      const params: SortParam[] = [{ field: 'email', order: 'asc' }];
      const sort = joinBuilder.buildSort(configNotSortable, params);
      expect(sort).toHaveLength(0);
    });

    it('should resolve nested join columns', () => {
      const configNested: TableConfig = {
        name: 'orders',
        base: 'orders',
        columns: [
          { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
        ],
        joins: [{
          table: 'users',
          type: 'left',
          on: 'orders.user_id = users.id',
          columns: [],
          joins: [{
            table: 'users',
            type: 'left',
            on: 'unused',
            columns: [
              { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true },
            ],
          }],
        }],
      };
      const params: SortParam[] = [{ field: 'name', order: 'asc' }];
      const sort = joinBuilder.buildSort(configNested, params);
      expect(sort).toHaveLength(1);
    });

    it('should handle mix of base, join, and computed columns in one sort', () => {
      const configAll: TableConfig = {
        ...configWithJoin,
        columns: [
          { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
          { name: 'status', type: 'string', sortable: true, hidden: false, filterable: true },
          { name: 'vatAmount', type: 'number', sortable: true, hidden: false, filterable: false, computed: true },
        ],
      };
      const sqlExpr = new Map([['vatAmount', sql`total * 0.2`]]);
      const params: SortParam[] = [
        { field: 'status', order: 'asc' },
        { field: 'vatAmount', order: 'desc' },
        { field: 'email', order: 'asc' },
      ];
      const sort = joinBuilder.buildSort(configAll, params, sqlExpr);
      expect(sort).toHaveLength(3);
    });
  });

  describe('buildSort — subquery SQL expressions', () => {
    const configWithSubquery: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [
        { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
        { name: 'name', type: 'string', sortable: true, hidden: false, filterable: true },
        { name: 'ordersCount', type: 'number', sortable: true, hidden: false, filterable: false, computed: true },
      ],
      subqueries: [
        { alias: 'ordersCount', table: 'orders', type: 'count', filter: 'orders.user_id = users.id' },
      ],
    };

    const subqueryExpr = sql`(SELECT count(*) FROM orders WHERE orders.user_id = users.id)`;
    const subquerySqlExpressions = new Map([['ordersCount', subqueryExpr]]);

    it('should sort by a subquery field (asc)', () => {
      const params: SortParam[] = [{ field: 'ordersCount', order: 'asc' }];
      const sort = builder.buildSort(configWithSubquery, params, subquerySqlExpressions);
      expect(sort).toHaveLength(1);
    });

    it('should sort by a subquery field (desc)', () => {
      const params: SortParam[] = [{ field: 'ordersCount', order: 'desc' }];
      const sort = builder.buildSort(configWithSubquery, params, subquerySqlExpressions);
      expect(sort).toHaveLength(1);
    });

    it('should handle mix of base column and subquery sort', () => {
      const params: SortParam[] = [
        { field: 'name', order: 'asc' },
        { field: 'ordersCount', order: 'desc' },
      ];
      const sort = builder.buildSort(configWithSubquery, params, subquerySqlExpressions);
      expect(sort).toHaveLength(2);
    });

    it('should drop subquery field when not in sqlExpressions map', () => {
      const params: SortParam[] = [{ field: 'ordersCount', order: 'asc' }];
      const sort = builder.buildSort(configWithSubquery, params, new Map());
      expect(sort).toHaveLength(0);
    });

    // 'first' mode subqueries are marked sortable: false — they must be silently
    // excluded from ORDER BY even if their SQL expression were in the map.
    it("should exclude 'first' mode subquery fields that are marked sortable: false", () => {
      const configWithFirst: TableConfig = {
        name: 'orders',
        base: 'users',
        columns: [
          { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
          // 'first' subquery — sortable: false (as set by define.ts .subquery())
          { name: 'firstItem', type: 'string', sortable: false, hidden: false, filterable: false, computed: true },
        ],
        subqueries: [
          { alias: 'firstItem', table: 'orders', type: 'first', filter: 'orders.user_id = users.id' },
        ],
      };
      // Even if the SQL expression is in the map, the sortable: false check prevents its use
      const firstExpr = sql`(SELECT row_to_json(t) FROM (SELECT * FROM orders LIMIT 1) t)`;
      const params: SortParam[] = [{ field: 'firstItem', order: 'asc' }];
      const sort = builder.buildSort(configWithFirst, params, new Map([['firstItem', firstExpr]]));
      expect(sort).toHaveLength(0);
    });

    // Simulate the queryGrouped/exportRows/explain merge: subquery expressions are
    // merged into the sqlExpressions map BEFORE calling buildSort.
    it('should sort correctly when subquery expressions are merged from queryGrouped/exportRows/explain paths', () => {
      // Simulate: const sqlExpressions = new Map([...ext.computedExpressions, ...ext.rawSelects])
      const sqlExpressions = new Map<string, ReturnType<typeof sql>>();
      // Simulate: subqueryExpressionsGrouped is built and merged in
      sqlExpressions.set('ordersCount', subqueryExpr);

      const params: SortParam[] = [{ field: 'ordersCount', order: 'desc' }];
      const sort = builder.buildSort(configWithSubquery, params, sqlExpressions);
      expect(sort).toHaveLength(1);
    });
  });
});
