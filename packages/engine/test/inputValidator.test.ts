import { describe, it, expect } from 'vitest';
import { validateInput } from '../src/core/inputValidator';
import { TableConfig } from '../src/types/table';
import { FieldError, ValidationError } from '../src/errors';

const config: TableConfig = {
  name: 'test',
  base: 'test',
  columns: [
    { name: 'id', type: 'uuid', hidden: false, sortable: true, filterable: true },
    { name: 'name', type: 'string', hidden: false, sortable: true, filterable: true },
    { name: 'age', type: 'number', hidden: false, sortable: true, filterable: true },
    { name: 'active', type: 'boolean', hidden: false, sortable: false, filterable: true },
    { name: 'secret', type: 'string', hidden: true, sortable: false, filterable: false },
    { name: 'createdAt', type: 'date', hidden: false, sortable: true, filterable: true },
  ],
};

describe('validateInput', () => {
  it('should pass with valid params', () => {
    expect(() => validateInput({
      select: ['id', 'name'],
      filters: { name: { operator: 'eq', value: 'test' } },
      sort: [{ field: 'name', order: 'asc' }],
    }, config)).not.toThrow();
  });

  it('should throw FieldError for invalid select field', () => {
    expect(() => validateInput({
      select: ['nonexistent'],
    }, config)).toThrow(FieldError);
  });

  it('should throw FieldError for hidden select field', () => {
    expect(() => validateInput({
      select: ['secret'],
    }, config)).toThrow(FieldError);
  });

  it('should throw FieldError for non-filterable field', () => {
    expect(() => validateInput({
      filters: { secret: { operator: 'eq', value: 'x' } },
    }, config)).toThrow(FieldError);
  });

  it('should throw ValidationError for wrong type on number field', () => {
    expect(() => validateInput({
      filters: { age: { operator: 'eq', value: 'not-a-number' } },
    }, config)).toThrow(ValidationError);
  });

  it('should throw ValidationError for wrong type on boolean field', () => {
    expect(() => validateInput({
      filters: { active: { operator: 'eq', value: 'yes' } },
    }, config)).toThrow(ValidationError);
  });

  it('should throw ValidationError for wrong type on date field', () => {
    expect(() => validateInput({
      filters: { createdAt: { operator: 'gt', value: 'invalid-date' } },
    }, config)).toThrow(ValidationError);
  });

  it('should throw FieldError for non-sortable field', () => {
    expect(() => validateInput({
      sort: [{ field: 'active', order: 'asc' }],
    }, config)).toThrow(FieldError);
  });
});
