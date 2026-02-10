import { describe, it, expect } from 'vitest';
import { buildMetadata } from '../src/core/metadataBuilder';
import { TableConfig } from '../src/types/table';

const config: TableConfig = {
  name: 'orders',
  base: 'orders',
  columns: [
    { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    { name: 'total', type: 'number', label: 'Total', hidden: false, sortable: true, filterable: true,
      format: 'currency', align: 'right' } as any,
    { name: 'status', type: 'string', label: 'Status', hidden: false, sortable: true, filterable: true,
      options: [
        { value: 'active', label: 'Active', color: 'green' },
        { value: 'pending', label: 'Pending', color: 'yellow' },
      ] } as any,
    { name: 'profit', type: 'number', hidden: false, sortable: true, filterable: true,
      visibleTo: ['admin'] } as any,
  ],
  joins: [
    { table: 'customers', type: 'left', on: 'orders.customerId = customers.id',
      columns: [{ name: 'customerName', type: 'string', hidden: false, sortable: true, filterable: true }] },
  ],
  subqueries: [{ alias: 'itemCount', table: 'orderItems', type: 'count', filter: 'orderId = orders.id' }],
  filters: [
    { field: 'status', operator: 'eq', type: 'dynamic' },
    { field: 'archived', operator: 'eq', value: false, type: 'static' },
  ],
  backendConditions: [
    { field: 'tenantId', operator: 'eq', value: '$tenantId' },
  ],
  search: { fields: ['status', 'customerName'], enabled: true },
  pagination: { defaultPageSize: 25, maxPageSize: 100, enabled: true },
  defaultSort: [{ field: 'createdAt', order: 'desc' }],
  aggregations: [
    { alias: 'totalRevenue', type: 'sum', field: 'total' },
    { alias: 'orderCount', type: 'count', field: 'id' },
  ],
  include: [
    { table: 'orderItems', foreignKey: 'orderId', as: 'items', localKey: 'id', columns: ['qty', 'price'] },
  ],
  groupBy: { fields: ['status'] },
  export: { formats: ['csv', 'json'], enabled: true },
};

describe('buildMetadata — complete response', () => {
  it('should include source field for join columns', () => {
    const meta = buildMetadata(config, { user: { id: '1', roles: ['admin'] } });
    const nameCol = meta.columns.find((c) => c.name === 'customerName')!;
    expect(nameCol.source).toBe('join');
    expect(nameCol.joinTable).toBe('customers');
  });

  it('should include aggregations array', () => {
    const meta = buildMetadata(config);
    expect(meta.aggregations).toHaveLength(2);
    expect(meta.aggregations[0]).toEqual({ alias: 'totalRevenue', type: 'sum', field: 'total' });
    expect(meta.aggregations[1]).toEqual({ alias: 'orderCount', type: 'count', field: 'id' });
  });

  it('should include includes array', () => {
    const meta = buildMetadata(config);
    expect(meta.includes).toHaveLength(1);
    expect(meta.includes[0]).toEqual({
      as: 'items',
      table: 'orderItems',
      columns: ['qty', 'price'],
    });
  });

  it('should include staticFilters', () => {
    const meta = buildMetadata(config);
    expect(meta.staticFilters).toContain('archived');
    expect(meta.staticFilters).toContain('tenantId');
  });

  it('should include groupBy in capabilities', () => {
    const meta = buildMetadata(config);
    expect(meta.capabilities.groupBy).toBe(true);
    expect(meta.capabilities.groupByFields).toEqual(['status']);
  });

  it('should set recursive false when not configured', () => {
    const meta = buildMetadata(config);
    expect(meta.capabilities.recursive).toBe(false);
  });

  it('should set recursive true when configured', () => {
    const recursiveConfig = {
      ...config,
      recursive: { parentKey: 'parentId', childKey: 'id', maxDepth: 10, depthAlias: 'depth' },
    };
    const meta = buildMetadata(recursiveConfig);
    expect(meta.capabilities.recursive).toBe(true);
  });

  it('should include format and align in column metadata', () => {
    const meta = buildMetadata(config, { user: { id: '1', roles: ['admin'] } });
    const totalCol = meta.columns.find((c) => c.name === 'total')!;
    expect(totalCol.format).toBe('currency');
    expect(totalCol.align).toBe('right');
  });

  it('should include enum options in filters', () => {
    const meta = buildMetadata(config);
    const statusFilter = meta.filters.find((f) => f.field === 'status')!;
    expect(statusFilter.options).toHaveLength(2);
    expect(statusFilter.options![0].value).toBe('active');
  });

  it('should mark subquery columns with correct source', () => {
    const meta = buildMetadata(config, { user: { id: '1', roles: ['admin'] } });
    const itemCountCol = meta.columns.find((c) => c.name === 'itemCount');
    expect(itemCountCol).toBeDefined();
    expect(itemCountCol!.source).toBe('subquery');
    expect(itemCountCol!.type).toBe('number');
  });

  it('should hide role-restricted columns from unauthorized users', () => {
    const viewerMeta = buildMetadata(config, { user: { id: '1', roles: ['viewer'] } });
    expect(viewerMeta.columns.find((c) => c.name === 'profit')).toBeUndefined();

    const adminMeta = buildMetadata(config, { user: { id: '1', roles: ['admin'] } });
    expect(adminMeta.columns.find((c) => c.name === 'profit')).toBeDefined();
  });
});
