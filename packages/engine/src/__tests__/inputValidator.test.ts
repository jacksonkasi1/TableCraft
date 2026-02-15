import { describe, it, expect } from 'vitest';
import { validateInput } from '../core/inputValidator';
import type { TableConfig, ColumnConfig } from '../types/table';
import type { EngineParams } from '../types/engine';

function createTestConfig(columns: Partial<ColumnConfig>[]): TableConfig {
  return {
    name: 'test',
    base: 'test_table',
    columns: columns.map((c) => ({
      name: c.name ?? 'id',
      type: c.type ?? 'string',
      label: c.label ?? c.name ?? 'ID',
      hidden: c.hidden ?? false,
      sortable: c.sortable ?? true,
      filterable: c.filterable ?? true,
      ...c,
    })) as ColumnConfig[],
  };
}

describe('inputValidator', () => {
  describe('validateFilterValues', () => {
    it('should skip unknown filter fields gracefully', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number', filterable: true },
        { name: 'name', type: 'string', filterable: true },
      ]);

      const params: EngineParams = {
        filters: {
          nonexistentField: { operator: 'eq', value: 123 },
          anotherUnknown: { operator: 'gte', value: 'test' },
        },
      };

      expect(() => validateInput(params, config)).not.toThrow();
    });

    it('should validate known filter fields with correct types', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number', filterable: true },
        { name: 'name', type: 'string', filterable: true },
      ]);

      const params: EngineParams = {
        filters: {
          id: { operator: 'gt', value: 100 },
          name: { operator: 'contains', value: 'test' },
        },
      };

      expect(() => validateInput(params, config)).not.toThrow();
    });

    it('should throw for non-filterable columns', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number', filterable: false },
      ]);

      const params: EngineParams = {
        filters: {
          id: { operator: 'eq', value: 1 },
        },
      };

      expect(() => validateInput(params, config)).toThrow('is not filterable');
    });

    it('should validate number type correctly', () => {
      const config = createTestConfig([
        { name: 'price', type: 'number', filterable: true },
      ]);

      const validParams: EngineParams = {
        filters: { price: { operator: 'gte', value: 100 } },
      };
      expect(() => validateInput(validParams, config)).not.toThrow();

      const invalidParams: EngineParams = {
        filters: { price: { operator: 'gte', value: 'not-a-number' } },
      };
      expect(() => validateInput(invalidParams, config)).toThrow();
    });

    it('should validate date type correctly', () => {
      const config = createTestConfig([
        { name: 'createdAt', type: 'date', filterable: true },
      ]);

      const validParams: EngineParams = {
        filters: { createdAt: { operator: 'gte', value: '2024-01-01T00:00:00Z' } },
      };
      expect(() => validateInput(validParams, config)).not.toThrow();

      const invalidParams: EngineParams = {
        filters: { createdAt: { operator: 'gte', value: 'not-a-date' } },
      };
      expect(() => validateInput(invalidParams, config)).toThrow();
    });

    it('should validate boolean type correctly', () => {
      const config = createTestConfig([
        { name: 'isActive', type: 'boolean', filterable: true },
      ]);

      const validParams: EngineParams = {
        filters: { isActive: { operator: 'eq', value: true } },
      };
      expect(() => validateInput(validParams, config)).not.toThrow();

      const invalidParams: EngineParams = {
        filters: { isActive: { operator: 'eq', value: 'yes' } },
      };
      expect(() => validateInput(invalidParams, config)).toThrow();
    });

    it('should validate between operator with array value', () => {
      const config = createTestConfig([
        { name: 'price', type: 'number', filterable: true },
      ]);

      const validParams: EngineParams = {
        filters: { price: { operator: 'between', value: [10, 100] } },
      };
      expect(() => validateInput(validParams, config)).not.toThrow();

      const invalidParams: EngineParams = {
        filters: { price: { operator: 'between', value: [10] } },
      };
      expect(() => validateInput(invalidParams, config)).toThrow();
    });

    it('should validate in operator with array value', () => {
      const config = createTestConfig([
        { name: 'status', type: 'string', filterable: true },
      ]);

      const validParams: EngineParams = {
        filters: { status: { operator: 'in', value: ['active', 'pending'] } },
      };
      expect(() => validateInput(validParams, config)).not.toThrow();

      const invalidParams: EngineParams = {
        filters: { status: { operator: 'in', value: 'active' } },
      };
      expect(() => validateInput(invalidParams, config)).toThrow();
    });

    it('should skip validation for isNull and isNotNull operators', () => {
      const config = createTestConfig([
        { name: 'deletedAt', type: 'date', filterable: true },
      ]);

      const params: EngineParams = {
        filters: { deletedAt: { operator: 'isNull', value: null } },
      };
      expect(() => validateInput(params, config)).not.toThrow();
    });
  });

  describe('validateSelectFields', () => {
    it('should validate existing fields', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
      ]);

      const params: EngineParams = {
        select: ['id', 'name'],
      };

      expect(() => validateInput(params, config)).not.toThrow();
    });

    it('should throw for non-existent fields', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number' },
      ]);

      const params: EngineParams = {
        select: ['nonexistent'],
      };

      expect(() => validateInput(params, config)).toThrow('does not exist');
    });

    it('should throw for hidden fields', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number' },
        { name: 'secret', type: 'string', hidden: true },
      ]);

      const params: EngineParams = {
        select: ['secret'],
      };

      expect(() => validateInput(params, config)).toThrow('is not accessible');
    });
  });

  describe('validateSortFields', () => {
    it('should validate sortable fields', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number', sortable: true },
        { name: 'name', type: 'string', sortable: true },
      ]);

      const params: EngineParams = {
        sort: [{ field: 'id', order: 'asc' }],
      };

      expect(() => validateInput(params, config)).not.toThrow();
    });

    it('should throw for non-sortable fields', () => {
      const config = createTestConfig([
        { name: 'id', type: 'number', sortable: false },
      ]);

      const params: EngineParams = {
        sort: [{ field: 'id', order: 'asc' }],
      };

      expect(() => validateInput(params, config)).toThrow('is not sortable');
    });
  });
});
