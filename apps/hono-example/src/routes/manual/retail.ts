import { Hono } from 'hono';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, ilike, sql } from 'drizzle-orm';
import { asc, desc } from 'drizzle-orm';
import { parseRequest } from '@tablecraft/engine';

const app = new Hono();

// ─── Sort whitelists ──────────────────────────────────────────────────────────

const SORT = {
  region:  { name: schema.retailRegions.name,  totalSales: schema.retailRegions.totalSales,  revenue: schema.retailRegions.revenue,  stores: schema.retailRegions.stores,  avgRating: schema.retailRegions.avgRating  },
  store:   { name: schema.retailStores.name,   totalSales: schema.retailStores.totalSales,   revenue: schema.retailStores.revenue,                                          avgRating: schema.retailStores.avgRating   },
  product: { name: schema.retailProducts.name, totalSales: schema.retailProducts.totalSales, revenue: schema.retailProducts.revenue,                                        avgRating: schema.retailProducts.avgRating },
};

type Dir = 'asc' | 'desc';

/** Resolve a sort column from a whitelist + direction into a Drizzle ORDER BY clause. */
function order<T extends Record<string, unknown>>(map: T, key: string, fallback: T[keyof T], dir: Dir) {
  const col = (key in map ? map[key] : fallback) as Parameters<typeof asc>[0];
  return dir === 'asc' ? asc(col) : desc(col);
}

/** Build the standard pagination meta object. */
function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/**
 * Parse the common query params for both tree endpoints.
 * Uses the engine's `parseRequest` for validated page/pageSize/search,
 * then reads sort/sortOrder separately (frontend uses two-param format).
 */
function parseParams(searchParams: URLSearchParams) {
  const p = parseRequest(searchParams);
  const page     = Math.max(1, p.page     ?? 1);
  const pageSize = Math.min(100, Math.max(1, p.pageSize ?? 10));
  return {
    page,
    pageSize,
    offset:  (page - 1) * pageSize,
    search:  p.search?.trim() ?? '',
    sortKey: searchParams.get('sort')      ?? 'name',
    sortDir: (searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc') as Dir,
  };
}

// ─── GET /retail/tree ─────────────────────────────────────────────────────────
// No search → paginated top-level regions (lazy tree root).
// With search → flat results across all three levels with breadcrumbs.

app.get('/tree', async (c) => {
  const { page, pageSize, offset, search, sortKey, sortDir } =
    parseParams(new URL(c.req.url).searchParams);

  // ── Deep search mode ────────────────────────────────────────────────────
  if (search) {
    const term = `%${search}%`;

    const [rRows, sRows, pRows] = await Promise.all([
      db.select().from(schema.retailRegions)
        .where(ilike(schema.retailRegions.name, term)),

      db.select({
        id: schema.retailStores.id, name: schema.retailStores.name,
        totalSales: schema.retailStores.totalSales, revenue: schema.retailStores.revenue,
        avgRating: schema.retailStores.avgRating, regionName: schema.retailRegions.name,
      }).from(schema.retailStores)
        .leftJoin(schema.retailRegions, eq(schema.retailStores.regionId, schema.retailRegions.id))
        .where(ilike(schema.retailStores.name, term)),

      db.select({
        id: schema.retailProducts.id, name: schema.retailProducts.name,
        totalSales: schema.retailProducts.totalSales, revenue: schema.retailProducts.revenue,
        avgRating: schema.retailProducts.avgRating,
        storeName: schema.retailStores.name, regionName: schema.retailRegions.name,
      }).from(schema.retailProducts)
        .leftJoin(schema.retailStores,  eq(schema.retailProducts.storeId,  schema.retailStores.id))
        .leftJoin(schema.retailRegions, eq(schema.retailStores.regionId,   schema.retailRegions.id))
        .where(ilike(schema.retailProducts.name, term)),
    ]);

    const all = [
      ...rRows.map(r => ({ ...r, type: 'Region'  as const, breadcrumb: null as string | null, children: [] as never[] })),
      ...sRows.map(s => ({ id: s.id, name: s.name, type: 'Store' as const, totalSales: s.totalSales, revenue: s.revenue, stores: null, avgRating: s.avgRating, breadcrumb: s.regionName ?? null, children: [] as never[] })),
      ...pRows.map(p => ({ id: p.id, name: p.name, type: 'Product' as const, totalSales: p.totalSales, revenue: p.revenue, stores: null, avgRating: p.avgRating, breadcrumb: [p.regionName, p.storeName].filter(Boolean).join(' › ') || null, children: [] as never[] })),
    ];

    return c.json({ data: all.slice(offset, offset + pageSize), meta: pageMeta(page, pageSize, all.length) });
  }

  // ── Tree mode: paginated top-level regions ──────────────────────────────
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(schema.retailRegions)
      .orderBy(order(SORT.region, sortKey, schema.retailRegions.name, sortDir))
      .limit(pageSize).offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(schema.retailRegions),
  ]);

  return c.json({
    data: rows.map(r => ({ ...r, type: 'Region' as const, breadcrumb: null, children: undefined })),
    meta: pageMeta(page, pageSize, Number(total)),
  });
});

// ─── GET /retail/tree/:id/children ───────────────────────────────────────────

app.get('/tree/:id/children', async (c) => {
  const id      = c.req.param('id');
  const sortKey = c.req.query('sort')      ?? 'name';
  const sortDir = (c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc') as Dir;

  // Region → stores
  const region = await db.query.retailRegions.findFirst({ where: eq(schema.retailRegions.id, id) });
  if (region) {
    const rows = await db.select().from(schema.retailStores)
      .where(eq(schema.retailStores.regionId, id))
      .orderBy(order(SORT.store, sortKey, schema.retailStores.name, sortDir));
    return c.json(rows.map(s => ({ ...s, type: 'Store' as const, stores: null, breadcrumb: null, children: undefined })));
  }

  // Store → products (leaf)
  const store = await db.query.retailStores.findFirst({ where: eq(schema.retailStores.id, id) });
  if (store) {
    const rows = await db.select().from(schema.retailProducts)
      .where(eq(schema.retailProducts.storeId, id))
      .orderBy(order(SORT.product, sortKey, schema.retailProducts.name, sortDir));
    return c.json(rows.map(p => ({ ...p, type: 'Product' as const, stores: null, breadcrumb: null, children: [] })));
  }

  return c.json([]);
});

export default app;
