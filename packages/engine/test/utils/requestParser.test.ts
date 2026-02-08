import { describe, it, expect } from 'vitest';
import { parseRequest } from '../../src/utils/requestParser';

describe('parseRequest', () => {
  it('should parse page and pageSize', () => {
    const result = parseRequest({ page: '2', pageSize: '25' });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
  });

  it('should parse sort with desc prefix', () => {
    const result = parseRequest({ sort: '-createdAt,name' });
    expect(result.sort).toEqual([
      { field: 'createdAt', order: 'desc' },
      { field: 'name', order: 'asc' },
    ]);
  });

  it('should parse sort with asc prefix', () => {
    const result = parseRequest({ sort: '+name' });
    expect(result.sort).toEqual([{ field: 'name', order: 'asc' }]);
  });

  it('should parse simple filter[field]=value as eq', () => {
    const result = parseRequest({ 'filter[status]': 'active' });
    expect(result.filters).toEqual({
      status: { operator: 'eq', value: 'active' },
    });
  });

  it('should parse filter[field][operator]=value', () => {
    const result = parseRequest({ 'filter[amount][gte]': '100' });
    expect(result.filters).toEqual({
      amount: { operator: 'gte', value: 100 },
    });
  });

  it('should coerce numeric values', () => {
    const result = parseRequest({ 'filter[price]': '42.5' });
    expect(result.filters!.price.value).toBe(42.5);
  });

  it('should coerce boolean values', () => {
    const result = parseRequest({ 'filter[active]': 'true' });
    expect(result.filters!.active.value).toBe(true);
  });

  it('should coerce null values', () => {
    const result = parseRequest({ 'filter[deleted]': 'null' });
    expect(result.filters!.deleted.value).toBeNull();
  });

  it('should coerce comma-separated to array', () => {
    const result = parseRequest({ 'filter[status][in]': 'active,pending,done' });
    expect(result.filters!.status.value).toEqual(['active', 'pending', 'done']);
  });

  it('should parse search', () => {
    const result = parseRequest({ search: 'hello world' });
    expect(result.search).toBe('hello world');
  });

  it('should parse export format', () => {
    const result = parseRequest({ export: 'csv' });
    expect(result.export).toBe('csv');
  });

  it('should ignore invalid export format', () => {
    const result = parseRequest({ export: 'xml' });
    expect(result.export).toBeUndefined();
  });

  it('should parse includeDeleted', () => {
    const result = parseRequest({ includeDeleted: 'true' });
    expect(result.includeDeleted).toBe(true);
  });

  it('should reject invalid operators in filters', () => {
    const result = parseRequest({ 'filter[x][INVALID]': '1' });
    expect(result.filters).toBeUndefined();
  });

  it('should handle URLSearchParams', () => {
    const sp = new URLSearchParams();
    sp.set('page', '3');
    sp.set('filter[name]', 'test');
    sp.set('sort', '-id');

    const result = parseRequest(sp);
    expect(result.page).toBe(3);
    expect(result.filters!.name).toEqual({ operator: 'eq', value: 'test' });
    expect(result.sort).toEqual([{ field: 'id', order: 'desc' }]);
  });

  it('should return empty for no params', () => {
    const result = parseRequest({});
    expect(result.page).toBeUndefined();
    expect(result.pageSize).toBeUndefined();
    expect(result.sort).toBeUndefined();
    expect(result.filters).toBeUndefined();
    expect(result.search).toBeUndefined();
    expect(result.export).toBeUndefined();
    expect(result.includeDeleted).toBe(false);
  });
});
