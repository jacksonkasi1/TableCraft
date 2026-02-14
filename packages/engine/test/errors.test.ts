import { describe, it, expect } from 'vitest';
import {
  TableCraftError,
  ConfigError,
  FieldError,
  ValidationError,
  AccessDeniedError,
  NotFoundError,
  QueryError,
  DialectError,
} from '../src/errors';

describe('Error classes', () => {
  it('should create ConfigError with correct properties', () => {
    const err = new ConfigError('Bad config', { field: 'x' });
    expect(err.code).toBe('CONFIG_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: 'x' });
    expect(err instanceof TableCraftError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('should create FieldError', () => {
    const err = new FieldError('status', 'is not filterable');
    expect(err.code).toBe('FIELD_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('status');
    expect(err.message).toContain('not filterable');
  });

  it('should create ValidationError', () => {
    const err = new ValidationError('age', 'number', 'hello');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('age');
    expect(err.message).toContain('number');
  });

  it('should create AccessDeniedError', () => {
    const err = new AccessDeniedError('orders', 'missing role');
    expect(err.code).toBe('ACCESS_DENIED');
    expect(err.statusCode).toBe(403);
  });

  it('should create NotFoundError', () => {
    const err = new NotFoundError('users');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });

  it('should create QueryError', () => {
    const err = new QueryError('SQL failed');
    expect(err.code).toBe('QUERY_ERROR');
    expect(err.statusCode).toBe(500);
  });

  it('should create DialectError', () => {
    const err = new DialectError('Recursive CTE', 'mysql');
    expect(err.code).toBe('DIALECT_ERROR');
    expect(err.message).toContain('mysql');
    expect(err.message).toContain('Recursive CTE');
  });

  it('should be catchable as TableCraftError', () => {
    const errors = [
      new ConfigError('x'),
      new FieldError('x', 'y'),
      new ValidationError('x', 'y', 'z'),
      new AccessDeniedError('x'),
      new NotFoundError('x'),
      new QueryError('x'),
      new DialectError('x', 'y'),
    ];

    for (const err of errors) {
      expect(err instanceof TableCraftError).toBe(true);
    }
  });
});
