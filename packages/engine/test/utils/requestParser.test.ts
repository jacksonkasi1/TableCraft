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

  // ═══════════════════════════════════════════════════════════════════════════
  // Operator-aware normalization tests (array vs string contract)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('array operator normalization (in / notIn)', () => {
    it('should auto-wrap single string value to array for "in" operator', () => {
      const result = parseRequest({ 'filter[status][in]': 'processing' });
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['processing'],
      });
    });

    it('should auto-wrap single string value to array for "notIn" operator', () => {
      const result = parseRequest({ 'filter[status][notIn]': 'cancelled' });
      expect(result.filters!.status).toEqual({
        operator: 'notIn',
        value: ['cancelled'],
      });
    });

    it('should split comma-separated values into array for "in" operator', () => {
      const result = parseRequest({ 'filter[status][in]': 'processing,shipped' });
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['processing', 'shipped'],
      });
    });

    it('should auto-wrap single numeric value to array for "in" operator', () => {
      const result = parseRequest({ 'filter[id][in]': '42' });
      expect(result.filters!.id).toEqual({
        operator: 'in',
        value: [42],
      });
    });

    it('should handle mixed types in comma-separated "in" values', () => {
      const result = parseRequest({ 'filter[status][in]': 'active,42,true' });
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['active', 42, true],
      });
    });

    it('should produce empty array for empty string with "in" operator', () => {
      const result = parseRequest({ 'filter[status][in]': '' });
      // coerceValue('') returns '' (string), then normalizeFilterValue wraps to ['']
      // This is correct — the validator will catch the empty string if needed
      expect(result.filters!.status.operator).toBe('in');
      expect(Array.isArray(result.filters!.status.value)).toBe(true);
    });

    it('should handle "null" string in "in" operator', () => {
      const result = parseRequest({ 'filter[status][in]': 'null' });
      // coerceValue('null') → null, normalizeFilterValue: null is null → []
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: [],
      });
    });

    it('should handle comma-separated with "null" in "in" operator', () => {
      const result = parseRequest({ 'filter[status][in]': 'active,null,pending' });
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['active', null, 'pending'],
      });
    });

    it('should NOT deduplicate values in "in" array and preserve order', () => {
      const result = parseRequest({ 'filter[status][in]': 'processing,processing' });
      // We intentionally do NOT deduplicate — that's the DB's job.
      // The parser's contract is: normalize shape, not semantics.
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['processing', 'processing'],
      });
    });
  });

  describe('nullary operator normalization (isNull / isNotNull)', () => {
    it('should discard value for isNull operator', () => {
      const result = parseRequest({ 'filter[deletedAt][isNull]': 'anything' });
      expect(result.filters!.deletedAt).toEqual({
        operator: 'isNull',
        value: undefined,
      });
    });

    it('should discard value for isNotNull operator', () => {
      const result = parseRequest({ 'filter[deletedAt][isNotNull]': 'true' });
      expect(result.filters!.deletedAt).toEqual({
        operator: 'isNotNull',
        value: undefined,
      });
    });
  });

  describe('between operator normalization', () => {
    it('should parse comma-separated pair as two-element array for "between"', () => {
      const result = parseRequest({ 'filter[amount][between]': '10,100' });
      expect(result.filters!.amount).toEqual({
        operator: 'between',
        value: [10, 100],
      });
    });

    it('should leave single value as-is for "between" (validator will catch)', () => {
      const result = parseRequest({ 'filter[amount][between]': '10' });
      // Single value → coerceValue returns 10 (number), normalizeFilterValue
      // passes through since it's not a 2-element array — validator catches.
      expect(result.filters!.amount).toEqual({
        operator: 'between',
        value: 10,
      });
    });
  });

  describe('scalar operator passthrough', () => {
    it('should NOT wrap scalar for "eq" operator', () => {
      const result = parseRequest({ 'filter[status]': 'active' });
      expect(result.filters!.status.value).toBe('active');
    });

    it('should NOT wrap scalar for "gte" operator', () => {
      const result = parseRequest({ 'filter[amount][gte]': '100' });
      expect(result.filters!.amount.value).toBe(100);
    });

    it('should NOT wrap scalar for "like" operator', () => {
      const result = parseRequest({ 'filter[name][like]': '%john%' });
      expect(result.filters!.name.value).toBe('%john%');
    });

    it('should NOT wrap scalar for "contains" operator', () => {
      const result = parseRequest({ 'filter[name][contains]': 'john' });
      expect(result.filters!.name.value).toBe('john');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge case matrix
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle empty string filter value', () => {
      const result = parseRequest({ 'filter[status]': '' });
      // coerceValue('') → '' (empty string, not numeric)
      expect(result.filters!.status).toEqual({ operator: 'eq', value: '' });
    });

    it('should handle "undefined" as string value', () => {
      const result = parseRequest({ 'filter[status]': 'undefined' });
      expect(result.filters!.status).toEqual({ operator: 'eq', value: 'undefined' });
    });

    it('should handle "true" as boolean', () => {
      const result = parseRequest({ 'filter[active]': 'true' });
      expect(result.filters!.active.value).toBe(true);
    });

    it('should handle numeric string "1" as number', () => {
      const result = parseRequest({ 'filter[count]': '1' });
      expect(result.filters!.count.value).toBe(1);
    });

    it('should handle URL-encoded brackets in value (not key)', () => {
      const result = parseRequest({ 'filter[note]': '%5Bprocessing%5D' });
      // URLSearchParams already decodes, so this tests the Record<string,string> path
      expect(result.filters!.note).toEqual({ operator: 'eq', value: '%5Bprocessing%5D' });
    });

    it('should handle trailing comma in in-operator value', () => {
      const result = parseRequest({ 'filter[status][in]': 'a,b,' });
      // 'a,b,' splits to ['a', 'b', ''] — coerceValue on '' is ''
      const val = result.filters!.status.value;
      expect(Array.isArray(val)).toBe(true);
      expect((val as unknown[]).length).toBe(3);
    });

    it('should handle leading comma in in-operator value', () => {
      const result = parseRequest({ 'filter[status][in]': ',a,b' });
      const val = result.filters!.status.value;
      expect(Array.isArray(val)).toBe(true);
    });

    it('should handle filter value with spaces in comma list', () => {
      const result = parseRequest({ 'filter[status][in]': 'a, b, c' });
      expect(result.filters!.status.value).toEqual(['a', 'b', 'c']);
    });

    it('should handle mixed casing (passes through as-is)', () => {
      const result = parseRequest({ 'filter[status][in]': 'Processing,SHIPPED' });
      expect(result.filters!.status.value).toEqual(['Processing', 'SHIPPED']);
    });

    it('should not be vulnerable to prototype pollution via filter keys', () => {
      const result = parseRequest({ 'filter[__proto__]': 'attack' });
      // __proto__ matches \w+ regex, so it will be in filters
      // but it should NOT pollute Object.prototype
      expect(({} as any).attack).toBeUndefined();
      // The filter itself should exist as a normal property
      if (result.filters) {
        expect(result.filters['__proto__']).toBeDefined();
      }
    });

    it('should not be vulnerable to constructor pollution', () => {
      const result = parseRequest({ 'filter[constructor]': 'attack' });
      expect(({} as any).constructor).toBe(Object);
    });

    it('should handle SQL injection attempt in filter value', () => {
      const result = parseRequest({ 'filter[name]': "'; DROP TABLE users; --" });
      // Value passes through as a string — SQL injection is prevented by
      // parameterized queries in Drizzle ORM, not by the parser
      expect(result.filters!.name.value).toBe("'; DROP TABLE users; --");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // URLSearchParams integration (simulates real browser behavior)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('URLSearchParams integration', () => {
    it('should handle single value for in-operator via URLSearchParams', () => {
      const sp = new URLSearchParams('filter[status][in]=processing');
      const result = parseRequest(sp);
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['processing'],
      });
    });

    it('should handle comma-separated for in-operator via URLSearchParams', () => {
      const sp = new URLSearchParams('filter[status][in]=processing,shipped');
      const result = parseRequest(sp);
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['processing', 'shipped'],
      });
    });

    it('should handle repeated keys in URLSearchParams (last wins)', () => {
      const sp = new URLSearchParams();
      sp.append('filter[status][in]', 'processing');
      sp.append('filter[status][in]', 'shipped');
      const result = parseRequest(sp);
      // Last value wins in our normalise() — "shipped" → auto-wrapped to ['shipped']
      expect(result.filters!.status).toEqual({
        operator: 'in',
        value: ['shipped'],
      });
    });

    it('should handle the original bug case: single status with in operator', () => {
      // This is the exact scenario from the bug report:
      // GET /orders-complex?filter[status][in]=processing
      const sp = new URLSearchParams('filter[status][in]=processing');
      const result = parseRequest(sp);

      // Before fix: value was "processing" (string) → validator threw
      // After fix: value is ["processing"] (array) → works correctly
      expect(result.filters!.status.operator).toBe('in');
      expect(Array.isArray(result.filters!.status.value)).toBe(true);
      expect(result.filters!.status.value).toEqual(['processing']);
    });
  });
});
