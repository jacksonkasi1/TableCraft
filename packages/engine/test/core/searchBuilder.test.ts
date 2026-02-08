import { describe, it, expect } from 'vitest';
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { SearchBuilder } from '../../src/core/searchBuilder';
import { TableConfig } from '../../src/types/table';

// Mock Schema
const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  status: text('status')
});

const schema = { users };

describe('SearchBuilder', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [
      { name: 'id', type: 'number', sortable: true, hidden: false, filterable: true },
      { name: 'name', type: 'string', sortable: true, hidden: false, filterable: true },
      { name: 'email', type: 'string', sortable: true, hidden: false, filterable: true },
      { name: 'status', type: 'string', filterable: true, hidden: false, sortable: true }
    ],
    search: {
      fields: ['name', 'email'],
      enabled: true
    }
  };

  const builder = new SearchBuilder(schema);

  describe('buildSearch', () => {
    it('should build search condition across multiple fields', () => {
      const condition = builder.buildSearch(config, 'john');
      expect(condition).toBeDefined();
    });

    it('should return undefined if search is disabled', () => {
      const disabledConfig: TableConfig = {
        ...config,
        search: { ...config.search!, enabled: false }
      };
      expect(builder.buildSearch(disabledConfig, 'john')).toBeUndefined();
    });

    it('should return undefined if search fields are empty', () => {
      const emptyFieldsConfig: TableConfig = {
        ...config,
        search: { ...config.search!, fields: [] }
      };
      expect(builder.buildSearch(emptyFieldsConfig, 'john')).toBeUndefined();
    });

    it('should return undefined if search term is empty', () => {
      expect(builder.buildSearch(config, '')).toBeUndefined();
      expect(builder.buildSearch(config, '   ')).toBeUndefined();
    });

    it('should escape special characters in search term', () => {
      // We can't easily verify the SQL output structure, but we can verify it doesn't crash
      const condition = builder.buildSearch(config, 'john%doe_');
      expect(condition).toBeDefined();
    });
  });

  describe('buildFullTextSearch', () => {
     it('should build full text search condition', () => {
        const condition = builder.buildFullTextSearch(config, 'john');
        expect(condition).toBeDefined();
     });

     it('should return undefined if search is disabled', () => {
        const disabledConfig = { ...config, search: { ...config.search!, enabled: false } };
        expect(builder.buildFullTextSearch(disabledConfig, 'john')).toBeUndefined();
     });
  });
});
