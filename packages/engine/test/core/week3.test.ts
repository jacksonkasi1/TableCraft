import { describe, it, expect } from 'vitest';
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { FilterBuilder } from '../../src/core/filterBuilder';
import { SearchBuilder } from '../../src/core/searchBuilder';
import { PaginationBuilder } from '../../src/core/paginationBuilder';
import { TableConfig } from '../../src/types/table';

// Mock Schema
const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  status: text('status'),
  role: text('role'),
  age: integer('age')
});

const schema = { users };

describe('Week 3: Interactive Features', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [
      { name: 'id', type: 'number', sortable: true },
      { name: 'name', type: 'string', sortable: true },
      { name: 'email', type: 'string', sortable: true },
      { name: 'status', type: 'string', filterable: true },
      { name: 'age', type: 'number', filterable: true }
    ],
    filters: [
      { field: 'status', operator: 'eq' },
      { field: 'age', operator: 'gte' }
    ],
    search: {
      fields: ['name', 'email'],
      enabled: true
    },
    defaultSort: [
      { field: 'id', order: 'desc' }
    ],
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 50,
      enabled: true
    }
  };

  describe('FilterBuilder', () => {
    const builder = new FilterBuilder(schema);

    it('should build filter conditions from params', () => {
      const params = {
        filters: {
          status: 'active',
          age: 18
        }
      };
      
      const conditions = builder.buildFilters(config, params);
      expect(conditions).toBeDefined();
      // In integration tests we would check the SQL string
    });

    it('should ignore undefined/null values', () => {
      const params = {
        filters: {
          status: null
        }
      };
      const conditions = builder.buildFilters(config, params);
      expect(conditions).toBeUndefined();
    });

    it('should ignore unconfigured filters', () => {
        const params = {
            filters: {
                role: 'admin' // Not in config.filters
            }
        };
        const conditions = builder.buildFilters(config, params);
        expect(conditions).toBeUndefined();
    });
  });

  describe('SearchBuilder', () => {
    const builder = new SearchBuilder(schema);

    it('should build search condition across multiple fields', () => {
      const condition = builder.buildSearch(config, 'john');
      expect(condition).toBeDefined();
    });

    it('should return undefined if search is disabled or empty', () => {
      expect(builder.buildSearch(config, '')).toBeUndefined();
      
      const noSearchConfig = { ...config, search: undefined };
      expect(builder.buildSearch(noSearchConfig, 'john')).toBeUndefined();
    });
  });

  describe('PaginationBuilder', () => {
    const builder = new PaginationBuilder(schema);

    it('should use default sort if no params provided', () => {
      const sort = builder.buildSort(config, {});
      expect(sort).toHaveLength(1); // id desc
    });

    it('should use URL sort params', () => {
      const sort = builder.buildSort(config, { sort: '-name,email' });
      expect(sort).toHaveLength(2);
      // Verify direction logic (name desc, email asc)
    });

    it('should calculate pagination limit and offset', () => {
      const result = builder.buildPagination(config, { page: 2, pageSize: 20 });
      expect(result).toEqual({ limit: 20, offset: 20 });
    });

    it('should enforce max page size', () => {
      const result = builder.buildPagination(config, { pageSize: 1000 });
      expect(result.limit).toBe(50); // capped at config.maxPageSize
    });
  });
});
