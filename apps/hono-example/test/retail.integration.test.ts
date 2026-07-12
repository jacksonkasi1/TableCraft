// ** import core packages
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// ** import database
import { dbClient } from '@/db';

// ** import routes
import retailApp from '@/routes/manual/retail';

interface RetailRow {
  id: string;
  name: string;
  type: 'Region' | 'Store' | 'Product';
  totalSales: number;
  revenue: number;
  avgRating: number | null;
}

interface RetailResponse {
  data: RetailRow[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

async function request(path: string): Promise<RetailResponse> {
  const response = await retailApp.request(path);
  expect(response.status).toBe(200);
  return response.json() as Promise<RetailResponse>;
}

beforeAll(async () => {
  await dbClient.unsafe(`
    DROP TABLE IF EXISTS retail_products, retail_stores, retail_regions CASCADE;
    CREATE TABLE retail_regions (
      id text PRIMARY KEY, name text NOT NULL, total_sales integer NOT NULL,
      revenue integer NOT NULL, stores integer NOT NULL, avg_rating real
    );
    CREATE TABLE retail_stores (
      id text PRIMARY KEY, region_id text NOT NULL REFERENCES retail_regions(id),
      name text NOT NULL, total_sales integer NOT NULL, revenue integer NOT NULL,
      avg_rating real
    );
    CREATE TABLE retail_products (
      id text PRIMARY KEY, store_id text NOT NULL REFERENCES retail_stores(id),
      name text NOT NULL, total_sales integer NOT NULL, revenue integer NOT NULL,
      avg_rating real
    );
    INSERT INTO retail_regions VALUES
      ('r2', 'Match Beta', 20, 200, 8, 4.2),
      ('r1', 'Match Alpha', 10, 300, 9, 4.5),
      ('r3', 'Other', 30, 100, 1, 3.0);
    INSERT INTO retail_stores VALUES
      ('s2', 'r1', 'Match Delta', 20, 100, 4.0),
      ('s1', 'r1', 'Match Gamma', 10, 400, 4.5),
      ('s3', 'r2', 'Other Store', 30, 200, 3.0);
    INSERT INTO retail_products VALUES
      ('p2', 's1', 'Match Zeta', 20, 500, 4.2),
      ('p1', 's1', 'Match Epsilon', 10, 200, 4.5),
      ('p3', 's2', 'Other Product', 30, 300, 3.0);
  `);
});

afterAll(async () => {
  await dbClient.end();
});

describe('retail route integration', () => {
  for (const field of ['name', 'totalSales', 'revenue', 'avgRating'] as const) {
    for (const direction of ['asc', 'desc'] as const) {
      it(`sorts mixed ${field} ${direction}`, async () => {
        const result = await request(
          `/tree?search=Match&pageSize=20&sort=${field}&sortOrder=${direction}`,
        );
        const values = result.data.map((row) => row[field]);
        const expected = [...values].sort((left, right) => {
          const comparison = typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right));
          return direction === 'asc' ? comparison : -comparison;
        });
        expect(values).toEqual(expected);
      });
    }
  }

  it('falls back to name for stores and invalid mixed sort fields', async () => {
    const byName = await request('/tree?search=Match&pageSize=20&sort=name&sortOrder=asc');
    const byStores = await request('/tree?search=Match&pageSize=20&sort=stores&sortOrder=asc');
    const invalid = await request('/tree?search=Match&pageSize=20&sort=nope&sortOrder=asc');
    expect(byStores.data.map((row) => row.id)).toEqual(byName.data.map((row) => row.id));
    expect(invalid.data.map((row) => row.id)).toEqual(byName.data.map((row) => row.id));
  });

  it('uses deterministic type and ID tie-breakers', async () => {
    const result = await request('/tree?search=Match&pageSize=20&sort=avgRating&sortOrder=desc');
    const tied = result.data.filter((row) => row.avgRating === 4.5);
    expect(tied.map((row) => `${row.type}:${row.id}`)).toEqual([
      'Product:p1', 'Region:r1', 'Store:s1',
    ]);
  });

  it('returns empty metadata and stable later pages', async () => {
    const empty = await request('/tree?search=missing&pageSize=2');
    expect(empty).toEqual({ data: [], meta: { page: 1, pageSize: 2, total: 0, totalPages: 0 } });

    const all = await request('/tree?search=Match&pageSize=20&sort=name&sortOrder=asc');
    const later = await request('/tree?search=Match&page=2&pageSize=2&sort=name&sortOrder=asc');
    expect(later.data.map((row) => row.id)).toEqual(all.data.slice(2, 4).map((row) => row.id));
  });

  it('sorts region stores and store products with deterministic IDs', async () => {
    const stores = await retailApp.request('/tree/r1/children?sort=totalSales&sortOrder=desc');
    const products = await retailApp.request('/tree/s1/children?sort=revenue&sortOrder=asc');
    expect((await stores.json() as RetailRow[]).map((row) => row.id)).toEqual(['s2', 's1']);
    expect((await products.json() as RetailRow[]).map((row) => row.id)).toEqual(['p1', 'p2']);
  });
});
