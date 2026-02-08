import { describe, it, expect } from 'vitest';
import { PaginationBuilder } from '../../src/core/paginationBuilder';
import { TableConfig } from '../../src/types/table';

describe('PaginationBuilder', () => {
  const builder = new PaginationBuilder();

  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [],
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 50,
      enabled: true
    }
  };

  describe('buildPagination', () => {
    it('should use default values when no params provided', () => {
      const result = builder.buildPagination(config);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should use provided page and pageSize', () => {
      const result = builder.buildPagination(config, 2, 20);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(20); // (2-1)*20
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
    });

    it('should respect maxPageSize', () => {
      const result = builder.buildPagination(config, 1, 100);
      expect(result.limit).toBe(50);
      expect(result.pageSize).toBe(50);
    });

    it('should handle invalid page numbers', () => {
      const result = builder.buildPagination(config, -1, 10);
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should handle disabled pagination', () => {
      const disabledConfig: TableConfig = {
        ...config,
        pagination: { ...config.pagination!, enabled: false }
      };
      const result = builder.buildPagination(disabledConfig);
      expect(result.limit).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('buildMeta', () => {
    it('should calculate total pages correctly', () => {
        const pagination = { limit: 10, offset: 0, page: 1, pageSize: 10 };
        const meta = builder.buildMeta(95, pagination);
        expect(meta.total).toBe(95);
        expect(meta.totalPages).toBe(10); // ceil(95/10)
    });

    it('should handle zero total', () => {
        const pagination = { limit: 10, offset: 0, page: 1, pageSize: 10 };
        const meta = builder.buildMeta(0, pagination);
        expect(meta.totalPages).toBe(0);
    });
  });
});
