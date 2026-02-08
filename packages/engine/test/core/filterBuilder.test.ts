import { describe, it, expect } from 'vitest';
import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core';
import { FilterBuilder } from '../../src/core/filterBuilder';
import { TableConfig } from '../../src/types/table';
import { FilterParam } from '../../src/types/engine';

// Mock Schema
const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  status: text('status'),
  role: text('role'),
  age: integer('age'),
  archived: boolean('archived')
});

const schema = { users };

describe('FilterBuilder', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [
      { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
      { name: 'name', type: 'string', sortable: true, hidden: false, filterable: true },
      { name: 'email', type: 'string', sortable: true, hidden: false, filterable: true },
      { name: 'status', type: 'string', filterable: true, hidden: false, sortable: true },
      { name: 'age', type: 'number', filterable: true, hidden: false, sortable: true },
      { name: 'role', type: 'string', filterable: false, hidden: false, sortable: true } // Not filterable
    ],
    filters: [
      { field: 'status', operator: 'eq', type: 'dynamic' },
      { field: 'age', operator: 'gte', type: 'dynamic' },
      { field: 'archived', operator: 'eq', value: false, type: 'static' } // Static filter
    ]
  };

  const builder = new FilterBuilder(schema);

  describe('buildFilters', () => {
    it('should build filter conditions from valid params', () => {
      const params: Record<string, FilterParam> = {
        status: { operator: 'eq', value: 'active' },
        age: { operator: 'gte', value: 18 }
      };
      
      const conditions = builder.buildFilters(config, params);
      expect(conditions).toBeDefined();
      // We can't easily inspect the SQL object structure deeply without internal knowledge, 
      // but we can check it returns something.
      // Drizzle's `and` returns an object.
    });

    it('should ignore filters for columns not marked as filterable', () => {
      const params: Record<string, FilterParam> = {
        role: { operator: 'eq', value: 'admin' }
      };
      
      const conditions = builder.buildFilters(config, params);
      expect(conditions).toBeUndefined();
    });

    it('should ignore filters for unknown columns', () => {
        const params: Record<string, FilterParam> = {
          unknown: { operator: 'eq', value: 'something' }
        };
        
        const conditions = builder.buildFilters(config, params);
        expect(conditions).toBeUndefined();
    });

    it('should return undefined for empty params', () => {
      const conditions = builder.buildFilters(config, {});
      expect(conditions).toBeUndefined();
    });
  });

  describe('buildStaticFilters', () => {
    it('should build static filters from config', () => {
      const conditions = builder.buildStaticFilters(config);
      expect(conditions).toBeDefined();
    });

    it('should return undefined if no static filters', () => {
      const noStaticConfig: TableConfig = {
        ...config,
        filters: []
      };
      const conditions = builder.buildStaticFilters(noStaticConfig);
      expect(conditions).toBeUndefined();
    });
  });
});
