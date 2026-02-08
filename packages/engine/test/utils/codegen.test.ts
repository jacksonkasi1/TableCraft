import { describe, it, expect } from 'vitest';
import { generateDrizzleCode } from '../../src/utils/codegen';
import { TableConfig } from '../../src/types/table';

describe('generateDrizzleCode', () => {
  it('should generate valid-looking TypeScript code', () => {
    const config: TableConfig = {
      name: 'users',
      base: 'users',
      columns: [
        { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
        { name: 'email', type: 'string', hidden: false, sortable: true, filterable: true, dbTransform: ['lower'] },
        { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true },
      ],
      defaultSort: [{ field: 'name', order: 'asc' }],
      pagination: { defaultPageSize: 20, maxPageSize: 50, enabled: true },
    };

    const code = generateDrizzleCode(config);

    expect(code).toContain('import { eq, and, or, asc, desc');
    expect(code).toContain('import { users }');
    expect(code).toContain('export async function queryUsers');
    expect(code).toContain('.select(');
    expect(code).toContain('.from(users)');
    expect(code).toContain('email: sql`lower(users.email)`');
    expect(code).toContain('.orderBy(asc(users.name))');
    expect(code).toContain('.limit(');
    expect(code).toContain('return {');
  });

  it('should include join tables in imports', () => {
    const config: TableConfig = {
      name: 'orders',
      base: 'orders',
      columns: [
        { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
      ],
      joins: [
        { table: 'customers', type: 'left', on: 'orders.customerId = customers.id' },
      ],
    };

    const code = generateDrizzleCode(config);
    expect(code).toContain('orders, customers');
    expect(code).toContain('.leftJoin(customers');
  });

  it('should include backend conditions', () => {
    const config: TableConfig = {
      name: 'items',
      base: 'items',
      columns: [{ name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true }],
      backendConditions: [
        { field: 'active', operator: 'eq', value: true },
      ],
    };

    const code = generateDrizzleCode(config);
    expect(code).toContain('eq(items.active, true)');
  });

  it('should include soft delete condition', () => {
    const config: TableConfig = {
      name: 'posts',
      base: 'posts',
      columns: [{ name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true }],
      softDelete: { field: 'deletedAt', enabled: true },
    };

    const code = generateDrizzleCode(config);
    expect(code).toContain('deletedAt IS NULL');
  });
});
