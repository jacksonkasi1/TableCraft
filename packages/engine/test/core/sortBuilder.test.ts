import { describe, it, expect } from 'vitest';
import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { SortBuilder } from '../../src/core/sortBuilder';
import { TableConfig } from '../../src/types/table';
import { SortParam } from '../../src/types/engine';

const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  email: text('email'),
});

const schema = { users };

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
});
