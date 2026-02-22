import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import appConfig from '../src/index';

const BASE_URL = 'http://localhost:5000';
let server: any;

describe('API Comparison', () => {
  beforeAll(() => {
    server = Bun.serve(appConfig);
  });

  afterAll(() => {
    server?.stop();
  });

  // --- Products ---

  it('should return products via manual route', async () => {
    const res = await fetch(`${BASE_URL}/manual/products?search=pro&category=electronics`);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('should return products via engine route', async () => {
    // Equivalent engine query:
    // search=pro -> search=pro
    // category=electronics -> filter[category]=electronics
    const res = await fetch(`${BASE_URL}/engine/products?search=pro&filter[category]=electronics`);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.meta).toBeDefined(); // Engine adds pagination meta
  });

  // --- Orders (Complex) ---

  it('should return orders via manual route', async () => {
    const res = await fetch(`${BASE_URL}/manual/orders`);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data).toBeDefined();
    if (json.data.length > 0) {
      const first = json.data[0];
      expect(first.userEmail).toBeDefined();
      expect(first.itemCount).toBeDefined();
    }
  });

  it('should return orders via engine route', async () => {
    const res = await fetch(`${BASE_URL}/engine/orders`);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    
    // Log for debugging
    if (json.data.length > 0) {
        console.log('Engine Order Sample:', JSON.stringify(json.data[0], null, 2));
    }

    expect(json.data).toBeDefined();
    if (json.data.length > 0) {
      const first = json.data[0];
      // Engine uses 'email' from joined table
      expect(first.email || first.userEmail).toBeDefined();
      expect(first.itemCount).toBeDefined();
    }
  });

  // --- Engine Specific Features ---

  it('should handle sorting in engine', async () => {
    const res = await fetch(`${BASE_URL}/engine/products?sort=-price`);
    const json = await res.json() as any;
    const prices = json.data.map((p: any) => Number(p.price));
    // Verify descending order
    const sorted = [...prices].sort((a, b) => b - a);
    expect(prices).toEqual(sorted);
  });

  it('should handle pagination in engine', async () => {
    const res = await fetch(`${BASE_URL}/engine/products?page=1&pageSize=1`);
    const json = await res.json() as any;
    expect(json.data.length).toBeLessThanOrEqual(1);
    expect(json.meta.pageSize).toBe(1);
  });

  // --- Subquery Sort Validation (Test #19 / #20) ---
  // Fix #1: .subquery() with type='first' sets sortable: false because row_to_json()
  // returns a non-scalar JSON object that cannot be used in ORDER BY.
  // .subquery() with type='count' or 'exists' sets sortable: true (scalar values).

  it('Test #19: sort by count subquery field (itemCount) should return 200', async () => {
    // 'count' subquery returns a scalar integer — valid for ORDER BY
    const res = await fetch(`${BASE_URL}/engine/orders?sort=itemCount`);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
  });

  it('Test #20: sort by first subquery field (firstItem) should return 400', async () => {
    // 'first' subquery returns row_to_json() — a non-scalar JSON object.
    // Sorting by it crashes the DB with a cryptic error.
    // The engine now sets sortable: false for 'first' subqueries and
    // validateSortFields() rejects it with FieldError (HTTP 400).
    const res = await fetch(`${BASE_URL}/engine/orders?sort=firstItem`);
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error).toBeDefined();
    // Should mention the field name in the error message
    expect(json.error).toContain('firstItem');
  });
});
