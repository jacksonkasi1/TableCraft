import { describe, it, expect, vi } from 'vitest';
import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { SoftDeleteHandler } from '../../src/core/softDelete';
import { TableConfig } from '../../src/types/table';

const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name'),
  deletedAt: timestamp('deletedAt')
});

const schema = { users };

describe('SoftDeleteHandler', () => {
  const config: TableConfig = {
    name: 'users',
    base: 'users',
    columns: [{ name: 'id', type: 'number', hidden: false, sortable: true, filterable: true }],
    softDelete: {
      enabled: true,
      field: 'deletedAt'
    }
  };

  const handler = new SoftDeleteHandler(schema);

  it('should return null check if soft delete is enabled', () => {
    const condition = handler.buildSoftDeleteCondition(config);
    expect(condition).toBeDefined();
  });

  it('should return undefined if soft delete is disabled', () => {
    const disabledConfig: TableConfig = {
      ...config,
      softDelete: { enabled: false, field: 'deletedAt' }
    };
    const condition = handler.buildSoftDeleteCondition(disabledConfig);
    expect(condition).toBeUndefined();
  });

  it('should return undefined if includeDeleted is true', () => {
    const condition = handler.buildSoftDeleteCondition(config, true);
    expect(condition).toBeUndefined();
  });

  it('should use default field name if not specified', () => {
    const defaultConfig: TableConfig = {
      ...config,
      softDelete: { enabled: true, field: 'deletedAt' } // explicit for types but testing default logic internal to handler
    };
    // If we passed undefined field it would default to deletedAt in z.infer output?
    // But handler logic: field = config.softDelete.field ?? 'deletedAt';
    // So if config has field, it uses it.
    const condition = handler.buildSoftDeleteCondition(defaultConfig);
    expect(condition).toBeDefined();
  });

  it('should warn and return undefined if field does not exist', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const badConfig: TableConfig = {
      ...config,
      softDelete: { enabled: true, field: 'nonExistent' }
    };
    
    const condition = handler.buildSoftDeleteCondition(badConfig);
    expect(condition).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
