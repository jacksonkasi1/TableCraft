import { describe, it, expect } from 'vitest';
import { buildMetadata } from '../src/core/metadataBuilder';
import { TableConfig } from '../src/types/table';

// ── Simple config (base columns only) ──

const simpleConfig: TableConfig = {
  name: 'orders',
  base: 'orders',
  columns: [
    { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    { name: 'total', type: 'number', label: 'Total', hidden: false, sortable: true, filterable: true,
      format: 'currency', align: 'right', width: 120 } as any,
    { name: 'status', type: 'string', label: 'Status', hidden: false, sortable: true, filterable: true,
      options: [
        { value: 'active', label: 'Active', color: 'green' },
        { value: 'inactive', label: 'Inactive', color: 'gray' },
      ] } as any,
    { name: 'createdAt', type: 'date', label: 'Created', hidden: false, sortable: true, filterable: true,
      datePresets: ['today', 'last7days', 'thisMonth'] } as any,
    { name: 'salary', type: 'number', hidden: false, sortable: true, filterable: true,
      visibleTo: ['admin', 'hr'] } as any,
    { name: 'secret', type: 'string', hidden: true, sortable: false, filterable: false },
  ],
  search: { fields: ['status'], enabled: true },
  pagination: { defaultPageSize: 25, maxPageSize: 100, enabled: true },
  defaultSort: [{ field: 'createdAt', order: 'desc' }],
  export: { formats: ['csv', 'json'], enabled: true },
};

// ── Complex config (joins, computed, aggregations, includes, groupBy, recursive, static filters) ──

const complexConfig: TableConfig = {
  name: 'ordersDashboard',
  base: 'orders',
  columns: [
    { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    { name: 'total', type: 'number', label: 'Total', hidden: false, sortable: true, filterable: true },
    { name: 'status', type: 'string', label: 'Status', hidden: false, sortable: true, filterable: true },
    // Computed column (added via .computed())
    { name: 'fullName', type: 'string', label: 'Full Name', hidden: false, sortable: true, filterable: false, computed: true },
  ],
  joins: [
    {
      table: 'customers',
      type: 'left',
      on: 'orders.customerId = customers.id',
      columns: [
        { name: 'customerName', type: 'string', label: 'Customer', hidden: false, sortable: true, filterable: true },
        { name: 'customerEmail', type: 'string', label: 'Email', hidden: false, sortable: false, filterable: true },
      ],
      // Nested join
      joins: [
        {
          table: 'regions',
          type: 'left',
          on: 'customers.regionId = regions.id',
          columns: [
            { name: 'regionName', type: 'string', label: 'Region', hidden: false, sortable: true, filterable: true },
          ],
        },
      ],
    },
  ],
  subqueries: [
    { alias: 'itemCount', table: 'orderItems', type: 'count', filter: 'orderItems.orderId = orders.id' },
    { alias: 'hasReturns', table: 'returns', type: 'exists', filter: 'returns.orderId = orders.id' },
  ],
  aggregations: [
    { alias: 'totalRevenue', type: 'sum', field: 'total' },
    { alias: 'avgOrderValue', type: 'avg', field: 'total' },
    { alias: 'orderCount', type: 'count', field: 'id' },
  ],
  include: [
    {
      table: 'orderItems',
      foreignKey: 'orderId',
      localKey: 'id',
      as: 'items',
      columns: ['name', 'qty', 'price'],
      include: [
        {
          table: 'products',
          foreignKey: 'productId',
          localKey: 'id',
          as: 'product',
          columns: ['sku', 'name'],
        },
      ],
    },
    {
      table: 'comments',
      foreignKey: 'orderId',
      localKey: 'id',
      as: 'comments',
    },
  ],
  groupBy: {
    fields: ['status', 'customerId'],
    having: [{ alias: 'orderCount', operator: 'gt', value: 5 }],
  },
  recursive: {
    parentKey: 'parentOrderId',
    childKey: 'id',
    maxDepth: 5,
    depthAlias: 'depth',
  },
  filters: [
    { field: 'status', operator: 'eq', value: 'active', type: 'static' },
  ],
  backendConditions: [
    { field: 'deletedAt', operator: 'isNull', value: null },
  ],
  search: { fields: ['status'], enabled: true },
  pagination: { defaultPageSize: 25, maxPageSize: 100, enabled: true },
  defaultSort: [{ field: 'createdAt', order: 'desc' }],
  export: { formats: ['csv', 'json'], enabled: true },
};

describe('buildMetadata — simple config', () => {
  it('should build metadata without context (no role filtering)', () => {
    const meta = buildMetadata(simpleConfig);

    expect(meta.name).toBe('orders');
    // salary has visibleTo but no user roles → hidden
    const salaryCol = meta.columns.find(c => c.name === 'salary');
    expect(salaryCol).toBeUndefined();

    // secret is hidden → not in metadata
    const secretCol = meta.columns.find(c => c.name === 'secret');
    expect(secretCol).toBeUndefined();
  });

  it('should show salary to admin role', () => {
    const meta = buildMetadata(simpleConfig, {
      user: { id: '1', roles: ['admin'] },
    });

    const salaryCol = meta.columns.find(c => c.name === 'salary');
    expect(salaryCol).toBeDefined();
  });

  it('should hide salary from viewer role', () => {
    const meta = buildMetadata(simpleConfig, {
      user: { id: '1', roles: ['viewer'] },
    });

    const salaryCol = meta.columns.find(c => c.name === 'salary');
    expect(salaryCol).toBeUndefined();
  });

  it('should include format metadata', () => {
    const meta = buildMetadata(simpleConfig, { user: { id: '1', roles: ['admin'] } });

    const totalCol = meta.columns.find(c => c.name === 'total')!;
    expect(totalCol.format).toBe('currency');
    expect(totalCol.align).toBe('right');
    expect(totalCol.width).toBe(120);
  });

  it('should include enum options', () => {
    const meta = buildMetadata(simpleConfig);

    const statusCol = meta.columns.find(c => c.name === 'status')!;
    expect(statusCol.options).toHaveLength(2);
    expect(statusCol.options![0]).toEqual({ value: 'active', label: 'Active', color: 'green' });
  });

  it('should include date presets', () => {
    const meta = buildMetadata(simpleConfig);

    const dateCol = meta.columns.find(c => c.name === 'createdAt')!;
    expect(dateCol.datePresets).toEqual(['today', 'last7days', 'thisMonth']);
  });

  it('should include correct operators per type', () => {
    const meta = buildMetadata(simpleConfig);

    const idCol = meta.columns.find(c => c.name === 'id')!;
    expect(idCol.operators).toContain('eq');
    expect(idCol.operators).toContain('in');

    const totalCol = meta.columns.find(c => c.name === 'total')!;
    expect(totalCol.operators).toContain('gt');
    expect(totalCol.operators).toContain('between');

    const statusCol = meta.columns.find(c => c.name === 'status')!;
    expect(statusCol.operators).toContain('contains');
  });

  it('should include capabilities', () => {
    const meta = buildMetadata(simpleConfig);

    expect(meta.capabilities.search).toBe(true);
    expect(meta.capabilities.searchFields).toEqual(['status']);
    expect(meta.capabilities.export).toBe(true);
    expect(meta.capabilities.pagination.defaultPageSize).toBe(25);
    expect(meta.capabilities.sort.defaultSort).toEqual([{ field: 'createdAt', order: 'desc' }]);
    expect(meta.capabilities.groupBy).toBe(false);
    expect(meta.capabilities.recursive).toBe(false);
  });

  it('should include filter metadata', () => {
    const meta = buildMetadata(simpleConfig);

    const statusFilter = meta.filters.find(f => f.field === 'status');
    expect(statusFilter).toBeDefined();
    expect(statusFilter!.options).toHaveLength(2);
    expect(statusFilter!.operators).toContain('contains');
  });

  it('should have empty aggregations, includes, staticFilters for simple config', () => {
    const meta = buildMetadata(simpleConfig);

    expect(meta.aggregations).toEqual([]);
    expect(meta.includes).toEqual([]);
    expect(meta.staticFilters).toEqual([]);
  });

  it('should mark base columns with source "base"', () => {
    const meta = buildMetadata(simpleConfig);

    const idCol = meta.columns.find(c => c.name === 'id')!;
    expect(idCol.source).toBe('base');
    expect(idCol.computed).toBe(false);
  });
});

describe('buildMetadata — complex config (joins, computed, aggregations, includes)', () => {
  it('should include join columns from joined tables', () => {
    const meta = buildMetadata(complexConfig);

    const customerNameCol = meta.columns.find(c => c.name === 'customerName');
    expect(customerNameCol).toBeDefined();
    expect(customerNameCol!.source).toBe('join');
    expect(customerNameCol!.joinTable).toBe('customers');
    expect(customerNameCol!.label).toBe('Customer');
    expect(customerNameCol!.filterable).toBe(true);
  });

  it('should include nested join columns', () => {
    const meta = buildMetadata(complexConfig);

    const regionCol = meta.columns.find(c => c.name === 'regionName');
    expect(regionCol).toBeDefined();
    expect(regionCol!.source).toBe('join');
    expect(regionCol!.joinTable).toBe('regions');
  });

  it('should include computed columns with correct source', () => {
    const meta = buildMetadata(complexConfig);

    const fullNameCol = meta.columns.find(c => c.name === 'fullName');
    expect(fullNameCol).toBeDefined();
    expect(fullNameCol!.source).toBe('computed');
    expect(fullNameCol!.computed).toBe(true);
    expect(fullNameCol!.filterable).toBe(false);
  });

  it('should include subquery virtual columns', () => {
    const meta = buildMetadata(complexConfig);

    const itemCountCol = meta.columns.find(c => c.name === 'itemCount');
    expect(itemCountCol).toBeDefined();
    expect(itemCountCol!.source).toBe('subquery');
    expect(itemCountCol!.type).toBe('number');

    const hasReturnsCol = meta.columns.find(c => c.name === 'hasReturns');
    expect(hasReturnsCol).toBeDefined();
    expect(hasReturnsCol!.source).toBe('subquery');
    expect(hasReturnsCol!.type).toBe('boolean');
  });

  it('should include aggregation metadata', () => {
    const meta = buildMetadata(complexConfig);

    expect(meta.aggregations).toHaveLength(3);
    expect(meta.aggregations[0]).toEqual({ alias: 'totalRevenue', type: 'sum', field: 'total' });
    expect(meta.aggregations[1]).toEqual({ alias: 'avgOrderValue', type: 'avg', field: 'total' });
    expect(meta.aggregations[2]).toEqual({ alias: 'orderCount', type: 'count', field: 'id' });
  });

  it('should include nested relation metadata (includes)', () => {
    const meta = buildMetadata(complexConfig);

    expect(meta.includes).toHaveLength(2);

    const items = meta.includes.find(i => i.as === 'items');
    expect(items).toBeDefined();
    expect(items!.table).toBe('orderItems');
    expect(items!.columns).toEqual(['name', 'qty', 'price']);
    expect(items!.nested).toHaveLength(1);
    expect(items!.nested![0].as).toBe('product');
    expect(items!.nested![0].table).toBe('products');
    expect(items!.nested![0].columns).toEqual(['sku', 'name']);

    const comments = meta.includes.find(i => i.as === 'comments');
    expect(comments).toBeDefined();
    expect(comments!.table).toBe('comments');
    expect(comments!.nested).toBeUndefined();
  });

  it('should expose groupBy capabilities', () => {
    const meta = buildMetadata(complexConfig);

    expect(meta.capabilities.groupBy).toBe(true);
    expect(meta.capabilities.groupByFields).toEqual(['status', 'customerId']);
  });

  it('should expose recursive capability', () => {
    const meta = buildMetadata(complexConfig);

    expect(meta.capabilities.recursive).toBe(true);
  });

  it('should expose static filters and backend conditions', () => {
    const meta = buildMetadata(complexConfig);

    expect(meta.staticFilters).toContain('status');
    expect(meta.staticFilters).toContain('deletedAt');
    expect(meta.staticFilters).toHaveLength(2);
  });

  it('should include join columns in filterable filters list', () => {
    const meta = buildMetadata(complexConfig);

    const customerFilter = meta.filters.find(f => f.field === 'customerName');
    expect(customerFilter).toBeDefined();
    expect(customerFilter!.type).toBe('string');
    expect(customerFilter!.operators).toContain('contains');
  });

  it('should count total columns from all sources', () => {
    const meta = buildMetadata(complexConfig);

    // 4 base + 3 join (customerName, customerEmail, regionName) + 2 subquery (itemCount, hasReturns) = 9
    expect(meta.columns).toHaveLength(9);
  });
});

// ── metadataBuilder fallback path — raw TableConfig (bypasses builder) ──

describe("buildMetadata — raw TableConfig fallback path (subquery columns)", () => {
  // This config simulates a developer who writes a raw TableConfig JSON object
  // without using the define.ts builder. In this path, metadataBuilder.ts
  // must add the subquery virtual columns itself via the fallback in step 3.

  const rawConfigWithSubqueries: TableConfig = {
    name: 'orders',
    base: 'orders',
    columns: [
      // NOTE: No subquery columns pre-populated — this is the fallback path.
      { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    ],
    subqueries: [
      { alias: 'itemCount', table: 'orderItems', type: 'count', filter: 'orderItems.orderId = orders.id' },
      { alias: 'hasReturns', table: 'returns', type: 'exists', filter: 'returns.orderId = orders.id' },
      { alias: 'firstItem', table: 'orderItems', type: 'first', filter: 'orderItems.orderId = orders.id' },
    ],
  };

  // Pre-populated subquery column config — tests that fallback does NOT duplicate
  const configWithPrepopulatedSubquery: TableConfig = {
    name: 'orders',
    base: 'orders',
    columns: [
      { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
      // Pre-populated subquery column — fallback must NOT add a duplicate
      { name: 'itemCount', type: 'number', hidden: false, sortable: true, filterable: false, computed: true },
    ],
    subqueries: [
      { alias: 'itemCount', table: 'orderItems', type: 'count', filter: 'orderItems.orderId = orders.id' },
    ],
  };

  it("does not duplicate subquery columns already present in config.columns", () => {
    const meta = buildMetadata(configWithPrepopulatedSubquery);

    const itemCountColumns = meta.columns.filter((col) => col.name === 'itemCount');
    expect(itemCountColumns).toHaveLength(1);
  });

  it("should auto-add subquery columns in fallback path (count, exists, first)", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);

    const itemCount = meta.columns.find(c => c.name === 'itemCount');
    expect(itemCount).toBeDefined();
    expect(itemCount!.source).toBe('subquery');

    const hasReturns = meta.columns.find(c => c.name === 'hasReturns');
    expect(hasReturns).toBeDefined();
    expect(hasReturns!.source).toBe('subquery');

    const firstItem = meta.columns.find(c => c.name === 'firstItem');
    expect(firstItem).toBeDefined();
    expect(firstItem!.source).toBe('subquery');
  });

  it("'count' subquery column should be sortable: true and filterable: false in fallback path", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);

    const itemCount = meta.columns.find(c => c.name === 'itemCount')!;
    expect(itemCount.sortable).toBe(true);
    expect(itemCount.filterable).toBe(false);
  });

  it("'exists' subquery column should be sortable: true and filterable: false in fallback path", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);

    const hasReturns = meta.columns.find(c => c.name === 'hasReturns')!;
    expect(hasReturns.sortable).toBe(true);
    expect(hasReturns.filterable).toBe(false);
  });

  it("'first' subquery column should be sortable: false and filterable: false in fallback path", () => {
    // 'first' uses row_to_json() — non-scalar, cannot be sorted or filtered.
    const meta = buildMetadata(rawConfigWithSubqueries);

    const firstItem = meta.columns.find(c => c.name === 'firstItem')!;
    expect(firstItem.sortable).toBe(false);
    expect(firstItem.filterable).toBe(false);
  });

  it("'first' subquery column should NOT appear in filters list (filterable: false)", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);

    const firstItemFilter = meta.filters.find(f => f.field === 'firstItem');
    expect(firstItemFilter).toBeUndefined();
  });

  it("'count' subquery column should NOT appear in filters list (filterable: false)", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);

    const itemCountFilter = meta.filters.find(f => f.field === 'itemCount');
    expect(itemCountFilter).toBeUndefined();
  });

  it("'count' type subquery column should have type 'number'", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);
    const itemCount = meta.columns.find(c => c.name === 'itemCount')!;
    expect(itemCount.type).toBe('number');
  });

  it("'exists' type subquery column should have type 'boolean'", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);
    const hasReturns = meta.columns.find(c => c.name === 'hasReturns')!;
    expect(hasReturns.type).toBe('boolean');
  });

  it("'first' type subquery column should have type 'string'", () => {
    const meta = buildMetadata(rawConfigWithSubqueries);
    const firstItem = meta.columns.find(c => c.name === 'firstItem')!;
    expect(firstItem.type).toBe('string');
  });

  it("define.ts builder path and fallback path should produce matching sortable/filterable for subquery columns", () => {
    // Simulate define.ts builder path: columns pre-populated in config.columns
    const builderPathConfig: TableConfig = {
      name: 'orders',
      base: 'orders',
      columns: [
        { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
        // As set by define.ts .subquery()
        { name: 'itemCount', type: 'number', label: 'itemCount', hidden: false, sortable: true, filterable: false, computed: true },
        { name: 'firstItem', type: 'string', label: 'firstItem', hidden: false, sortable: false, filterable: false, computed: true },
      ],
      subqueries: [
        { alias: 'itemCount', table: 'orderItems', type: 'count', filter: 'orderItems.orderId = orders.id' },
        { alias: 'firstItem', table: 'orderItems', type: 'first', filter: 'orderItems.orderId = orders.id' },
      ],
    };

    const builderMeta = buildMetadata(builderPathConfig);
    const fallbackMeta = buildMetadata(rawConfigWithSubqueries);

    const builderItemCount = builderMeta.columns.find(c => c.name === 'itemCount')!;
    const fallbackItemCount = fallbackMeta.columns.find(c => c.name === 'itemCount')!;
    expect(builderItemCount.sortable).toBe(fallbackItemCount.sortable);
    expect(builderItemCount.filterable).toBe(fallbackItemCount.filterable);

    const builderFirstItem = builderMeta.columns.find(c => c.name === 'firstItem')!;
    const fallbackFirstItem = fallbackMeta.columns.find(c => c.name === 'firstItem')!;
    expect(builderFirstItem.sortable).toBe(fallbackFirstItem.sortable);
    expect(builderFirstItem.filterable).toBe(fallbackFirstItem.filterable);
  });
});
