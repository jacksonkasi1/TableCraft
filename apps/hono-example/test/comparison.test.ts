import { describe, it, expect, beforeAll } from 'bun:test';

const BASE_URL = 'http://localhost:5000';

describe('API Comparison', () => {
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
});
