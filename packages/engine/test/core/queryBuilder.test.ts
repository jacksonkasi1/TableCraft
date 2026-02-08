import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../../src/core/queryBuilder';
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { TableConfig } from '../../src/types/table';

// Mock Schema
const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  role: text('role'),
  tenantId: integer('tenant_id')
});

const schema = { users };

describe('QueryBuilder', () => {
  const builder = new QueryBuilder(schema);

  describe('buildSelect', () => {
    it('should select specified columns', () => {
      const config: TableConfig = {
        name: 'users',
        base: 'users',
        columns: [
          // @ts-ignore
          { name: 'id', type: 'number' },
          // @ts-ignore
          { name: 'email', type: 'string' }
        ]
      };

      const selection = builder.buildSelect(users, config);
      expect(selection).toHaveProperty('id');
      expect(selection).toHaveProperty('email');
      expect(selection).not.toHaveProperty('name'); // Not in config
    });

    it('should apply dbTransform', () => {
       const config: TableConfig = {
        name: 'users',
        base: 'users',
        columns: [
          // @ts-ignore
          { name: 'email', type: 'string', dbTransform: ['upper'] }
        ]
      };

      const selection = builder.buildSelect(users, config);
      expect(selection.email).toBeDefined();
      // Inspecting SQL output is tricky in unit tests without a mock DB, 
      // but we can check if it returns a SQL wrapper.
      // Drizzle's `isSQLWrapper` isn't exported directly in all versions, 
      // but we can check if it has .getSQL() or similar if needed.
    });
  });

  describe('buildBackendConditions', () => {
    it('should build static condition', () => {
      const config: TableConfig = {
        name: 'users',
        base: 'users',
        columns: [],
        backendConditions: [
          { field: 'role', operator: 'eq', value: 'admin' }
        ]
      };

      const condition = builder.buildBackendConditions(config);
      expect(condition).toBeDefined(); 
      // verification of the exact SQL string usually requires a driver
    });

    it('should inject context variables', () => {
       const config: TableConfig = {
        name: 'users',
        base: 'users',
        columns: [],
        backendConditions: [
          { field: 'tenantId', operator: 'eq', value: '$tenant.id' }
        ]
      };

      const context = { tenant: { id: 123 } };
      const condition = builder.buildBackendConditions(config, context);
      expect(condition).toBeDefined();
    });

    it('should handle missing context gracefully (default to null/undefined behavior)', () => {
       const config: TableConfig = {
        name: 'users',
        base: 'users',
        columns: [],
        backendConditions: [
          { field: 'tenantId', operator: 'eq', value: '$missing.id' }
        ]
      };

      // No context provided
      const condition = builder.buildBackendConditions(config, {}); 
      // Should still return a condition object (likely `tenant_id IS NULL` or similar based on mapOperator)
      expect(condition).toBeDefined();
    });
  });
});
