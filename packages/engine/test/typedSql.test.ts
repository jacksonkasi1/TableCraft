import { describe, it, expect } from 'vitest';
import { column, caseWhen, coalesce, concat, dateTrunc, interval, ago } from '../src/utils/typedSql';
import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  nickname: varchar('nickname', { length: 255 }),
  status: integer('status'),
  createdAt: timestamp('created_at'),
});

describe('column', () => {
  it('should return a valid column', () => {
    const col = column(users, 'name');
    expect(col).toBeDefined();
  });

  it('should throw for invalid column', () => {
    // @ts-expect-error - testing runtime failure
    expect(() => column(users, 'nonexistent')).toThrow();
  });
});

describe('caseWhen', () => {
  it('should build a CASE expression', () => {
    const col = column(users, 'status');
    const result = caseWhen(col, { 1: 'active', 2: 'inactive' }, 'unknown');
    expect(result).toBeDefined();
  });

  it('should build without fallback', () => {
    const col = column(users, 'status');
    const result = caseWhen(col, { 1: 'yes', 0: 'no' });
    expect(result).toBeDefined();
  });
});

describe('coalesce', () => {
  it('should build COALESCE with columns', () => {
    const result = coalesce(
      column(users, 'nickname'),
      column(users, 'name'),
      'Anonymous'
    );
    expect(result).toBeDefined();
  });
});

describe('concat', () => {
  it('should build CONCAT', () => {
    const result = concat(column(users, 'name'), ' - ', column(users, 'nickname'));
    expect(result).toBeDefined();
  });
});

describe('dateTrunc', () => {
  it('should build DATE_TRUNC', () => {
    const result = dateTrunc('month', column(users, 'createdAt'));
    expect(result).toBeDefined();
  });
});

describe('interval', () => {
  it('should build INTERVAL', () => {
    const result = interval(30, 'days');
    expect(result).toBeDefined();
  });
});

describe('ago', () => {
  it('should build NOW() - INTERVAL', () => {
    const result = ago(30, 'days');
    expect(result).toBeDefined();
  });
});
