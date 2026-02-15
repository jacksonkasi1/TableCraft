import { describe, it, expect } from 'vitest';
import { buildMetadata } from '../core/metadataBuilder';
import type { TableConfig } from '../types/table';

function createTestConfig(overrides: Partial<TableConfig> = {}): TableConfig {
  return {
    name: 'test_table',
    base: 'test_table',
    columns: [
      { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
      { name: 'name', type: 'string', label: 'Name', hidden: false, sortable: true, filterable: true },
    ],
    ...overrides,
  } as TableConfig;
}

describe('metadataBuilder', () => {
  describe('dateRangeColumn detection', () => {
    it('should return null when no date columns exist', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'name', type: 'string', label: 'Name', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBeNull();
      expect(meta.dateColumns).toEqual([]);
    });

    it('should detect createdAt column automatically', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'createdAt', type: 'date', label: 'Created At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('createdAt');
      expect(meta.dateColumns).toEqual(['createdAt']);
    });

    it('should detect created_at column (snake_case) automatically', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'created_at', type: 'date', label: 'Created At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('created_at');
      expect(meta.dateColumns).toEqual(['created_at']);
    });

    it('should prefer createdAt over other date columns', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'customDate', type: 'date', label: 'Custom Date', hidden: false, sortable: true, filterable: true },
          { name: 'createdAt', type: 'date', label: 'Created At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('createdAt');
      expect(meta.dateColumns).toEqual(['customDate', 'createdAt']);
    });

    it('should use first date column when no createdAt exists', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'shippedAt', type: 'date', label: 'Shipped At', hidden: false, sortable: true, filterable: true },
          { name: 'deliveredAt', type: 'date', label: 'Delivered At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('shippedAt');
      expect(meta.dateColumns).toEqual(['shippedAt', 'deliveredAt']);
    });

    it('should use explicit dateRangeColumn from config', () => {
      const config = createTestConfig({
        dateRangeColumn: 'deliveredAt',
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'createdAt', type: 'date', label: 'Created At', hidden: false, sortable: true, filterable: true },
          { name: 'deliveredAt', type: 'date', label: 'Delivered At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('deliveredAt');
      expect(meta.dateColumns).toEqual(['createdAt', 'deliveredAt']);
    });

    it('should fall back to auto-detected dateRangeColumn when config references a missing column', () => {
      const config = createTestConfig({
        dateRangeColumn: 'missingColumn',
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'shippedAt', type: 'date', label: 'Shipped At', hidden: false, sortable: true, filterable: true },
          { name: 'deliveredAt', type: 'date', label: 'Delivered At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('shippedAt');
      expect(meta.dateColumns).toEqual(['shippedAt', 'deliveredAt']);
    });

    it('should fall back to auto-detected dateRangeColumn when config references a non-date column', () => {
      const config = createTestConfig({
        dateRangeColumn: 'id',
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'shippedAt', type: 'date', label: 'Shipped At', hidden: false, sortable: true, filterable: true },
          { name: 'deliveredAt', type: 'date', label: 'Delivered At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('shippedAt');
      expect(meta.dateColumns).toEqual(['shippedAt', 'deliveredAt']);
    });

    it('should fall back to auto-detected dateRangeColumn when config references a hidden column', () => {
      const config = createTestConfig({
        dateRangeColumn: 'internalDate',
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'shippedAt', type: 'date', label: 'Shipped At', hidden: false, sortable: true, filterable: true },
          { name: 'internalDate', type: 'date', label: 'Internal', hidden: true, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBe('shippedAt');
      expect(meta.dateColumns).toEqual(['shippedAt']);
    });

    it('should exclude hidden columns from dateColumns', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'createdAt', type: 'date', label: 'Created At', hidden: false, sortable: true, filterable: true },
          { name: 'internalDate', type: 'date', label: 'Internal', hidden: true, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateColumns).toEqual(['createdAt']);
      expect(meta.dateRangeColumn).toBe('createdAt');
    });

    it('should return null when dateRangeColumn is not set and no date columns exist', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'name', type: 'string', label: 'Name', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateRangeColumn).toBeNull();
      expect(meta.dateColumns).toEqual([]);
    });

    it('should exclude computed columns from dateColumns', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'createdAt', type: 'date', label: 'Created At', hidden: false, sortable: true, filterable: true },
          { name: 'computedDate', type: 'date', label: 'Computed', hidden: false, sortable: true, filterable: true, computed: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateColumns).toEqual(['createdAt']);
      expect(meta.dateRangeColumn).toBe('createdAt');
    });

    it('should detect multiple date columns', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'createdAt', type: 'date', label: 'Created At', hidden: false, sortable: true, filterable: true },
          { name: 'updatedAt', type: 'date', label: 'Updated At', hidden: false, sortable: true, filterable: true },
          { name: 'deletedAt', type: 'date', label: 'Deleted At', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.dateColumns).toEqual(['createdAt', 'updatedAt', 'deletedAt']);
      expect(meta.dateRangeColumn).toBe('createdAt');
    });
  });

  describe('filter metadata', () => {
    it('should generate filter metadata for filterable columns', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'name', type: 'string', label: 'Name', hidden: false, sortable: true, filterable: false },
          { name: 'status', type: 'string', label: 'Status', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.filters).toHaveLength(2);
      expect(meta.filters.map(f => f.field)).toEqual(['id', 'status']);
    });

    it('should include correct operators for column types', () => {
      const config = createTestConfig({
        columns: [
          { name: 'price', type: 'number', label: 'Price', hidden: false, sortable: true, filterable: true },
          { name: 'createdAt', type: 'date', label: 'Created', hidden: false, sortable: true, filterable: true },
          { name: 'isActive', type: 'boolean', label: 'Active', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      const priceFilter = meta.filters.find(f => f.field === 'price');
      expect(priceFilter?.operators).toContain('gt');
      expect(priceFilter?.operators).toContain('between');

      const dateFilter = meta.filters.find(f => f.field === 'createdAt');
      expect(dateFilter?.operators).toContain('gte');
      expect(dateFilter?.operators).toContain('between');

      const boolFilter = meta.filters.find(f => f.field === 'isActive');
      expect(boolFilter?.operators).toEqual(['eq', 'neq']);
    });
  });

  describe('column metadata', () => {
    it('should exclude hidden columns from visible columns', () => {
      const config = createTestConfig({
        columns: [
          { name: 'id', type: 'number', label: 'ID', hidden: false, sortable: true, filterable: true },
          { name: 'secret', type: 'string', label: 'Secret', hidden: true, sortable: true, filterable: true },
          { name: 'name', type: 'string', label: 'Name', hidden: false, sortable: true, filterable: true },
        ],
      });

      const meta = buildMetadata(config);

      expect(meta.columns).toHaveLength(2);
      expect(meta.columns.map(c => c.name)).toEqual(['id', 'name']);
    });
  });
});
