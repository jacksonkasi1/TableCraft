import { describe, it, expect } from 'vitest';
import { generateOpenApiSpec } from '../../src/utils/openapi';
import { TableConfig } from '../../src/types/table';

describe('generateOpenApiSpec', () => {
  it('should generate a valid OpenAPI 3 spec', () => {
    const config: TableConfig = {
      name: 'orders',
      base: 'orders',
      columns: [
        { name: 'id', type: 'uuid', label: 'Order ID', hidden: false, sortable: true, filterable: true },
        { name: 'total', type: 'number', label: 'Total', hidden: false, sortable: true, filterable: true },
        { name: 'status', type: 'string', hidden: false, sortable: true, filterable: true },
        { name: 'secret', type: 'string', hidden: true, sortable: false, filterable: false },
      ],
      filters: [
        { field: 'status', operator: 'eq', type: 'dynamic', label: 'Status' },
        { field: 'archived', operator: 'eq', value: false, type: 'static' },
      ],
      search: { fields: ['status'], enabled: true },
      pagination: { defaultPageSize: 25, maxPageSize: 100, enabled: true },
      aggregations: [
        { alias: 'totalRevenue', type: 'sum', field: 'total' },
      ],
      export: { formats: ['csv', 'json'], enabled: true },
    };

    const spec = generateOpenApiSpec(config) as any;

    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toContain('orders');

    const path = spec.paths['/api/orders'];
    expect(path).toBeDefined();
    expect(path.get).toBeDefined();

    // Check parameters
    const paramNames = path.get.parameters.map((p: any) => p.name);
    expect(paramNames).toContain('page');
    expect(paramNames).toContain('pageSize');
    expect(paramNames).toContain('sort');
    expect(paramNames).toContain('search');
    expect(paramNames).toContain('export');
    expect(paramNames).toContain('filter[status]');
    // Static filters should not be in params
    expect(paramNames).not.toContain('filter[archived]');

    // Check response schema
    const responseProps =
      path.get.responses['200'].content['application/json'].schema.properties;
    expect(responseProps.data).toBeDefined();
    expect(responseProps.meta).toBeDefined();
    expect(responseProps.aggregations).toBeDefined();

    // Hidden columns should not be in schema
    const dataProps = responseProps.data.items.properties;
    expect(dataProps.id).toBeDefined();
    expect(dataProps.total).toBeDefined();
    expect(dataProps.secret).toBeUndefined();
  });

  it('should include security when access is configured', () => {
    const config: TableConfig = {
      name: 'admin',
      base: 'admin',
      columns: [{ name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true }],
      access: { roles: ['admin'] },
    };

    const spec = generateOpenApiSpec(config) as any;
    const getSec = spec.paths['/api/admin'].get;
    expect(getSec.security).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
  });
});
