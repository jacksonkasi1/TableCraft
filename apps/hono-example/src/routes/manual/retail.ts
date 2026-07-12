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
type MixedSortKey = 'name' | 'totalSales' | 'revenue' | 'avgRating';

const MIXED_SORT_KEYS = new Set<MixedSortKey>([
  'name',
  'totalSales',
  'revenue',
  'avgRating',
]);

/** Resolve a sort column from a whitelist + direction into a Drizzle ORDER BY clause. */
function order<T extends Record<string, unknown>>(map: T, key: string, fallback: T[keyof T], dir: Dir) {
  const col = (key in map ? map[key] : fallback) as Parameters<typeof asc>[0];
  return dir === 'asc' ? asc(col) : desc(col);
}

/** Build the standard pagination meta object. */
function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
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
    // `stores` is region-only and therefore cannot define a consistent mixed
    // ordering. Mixed search falls back to name for it and for invalid keys.
    const safeSortKey: MixedSortKey = MIXED_SORT_KEYS.has(sortKey as MixedSortKey)
      ? sortKey as MixedSortKey
      : 'name';
    const windowSize = offset + pageSize;
    const direction = sortDir === 'asc' ? 1 : -1;

    const [rRows, sRows, pRows, [rCount], [sCount], [pCount]] = await Promise.all([
      db.select().from(schema.retailRegions)
        .where(ilike(schema.retailRegions.name, term))
        .orderBy(
          order(SORT.region, safeSortKey, schema.retailRegions.name, sortDir),
          asc(schema.retailRegions.id),
        ).limit(windowSize),

      db.select({
        id: schema.retailStores.id, name: schema.retailStores.name,
        totalSales: schema.retailStores.totalSales, revenue: schema.retailStores.revenue,
        avgRating: schema.retailStores.avgRating, regionName: schema.retailRegions.name,
      }).from(schema.retailStores)
        .leftJoin(schema.retailRegions, eq(schema.retailStores.regionId, schema.retailRegions.id))
        .where(ilike(schema.retailStores.name, term))
        .orderBy(
          order(SORT.store, safeSortKey, schema.retailStores.name, sortDir),
          asc(schema.retailStores.id),
        ).limit(windowSize),

      db.select({
        id: schema.retailProducts.id, name: schema.retailProducts.name,
        totalSales: schema.retailProducts.totalSales, revenue: schema.retailProducts.revenue,
        avgRating: schema.retailProducts.avgRating,
        storeName: schema.retailStores.name, regionName: schema.retailRegions.name,
      }).from(schema.retailProducts)
        .leftJoin(schema.retailStores,  eq(schema.retailProducts.storeId,  schema.retailStores.id))
        .leftJoin(schema.retailRegions, eq(schema.retailStores.regionId,   schema.retailRegions.id))
        .where(ilike(schema.retailProducts.name, term))
        .orderBy(
          order(SORT.product, safeSortKey, schema.retailProducts.name, sortDir),
          asc(schema.retailProducts.id),
        ).limit(windowSize),
      db.select({ total: sql<number>`count(*)` }).from(schema.retailRegions)
        .where(ilike(schema.retailRegions.name, term)),
      db.select({ total: sql<number>`count(*)` }).from(schema.retailStores)
        .where(ilike(schema.retailStores.name, term)),
      db.select({ total: sql<number>`count(*)` }).from(schema.retailProducts)
        .where(ilike(schema.retailProducts.name, term)),
    ]);

    const all = [
      ...rRows.map(r => ({ ...r, type: 'Region'  as const, breadcrumb: null as string | null, children: [] as never[] })),
      ...sRows.map(s => ({ id: s.id, name: s.name, type: 'Store' as const, totalSales: s.totalSales, revenue: s.revenue, stores: null, avgRating: s.avgRating, breadcrumb: s.regionName ?? null, children: [] as never[] })),
      ...pRows.map(p => ({ id: p.id, name: p.name, type: 'Product' as const, totalSales: p.totalSales, revenue: p.revenue, stores: null, avgRating: p.avgRating, breadcrumb: [p.regionName, p.storeName].filter(Boolean).join(' › ') || null, children: [] as never[] })),
    ];

    // Mixed entity results share the requested field ordering. Entity type and
    // ID are deterministic tie-breakers; invalid fields fall back to name.
    all.sort((left, right) => {
      const leftValue = left[safeSortKey as keyof typeof left];
      const rightValue = right[safeSortKey as keyof typeof right];
      const primary = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
      if (primary !== 0) return primary * direction;
      const typeOrder = left.type.localeCompare(right.type);
      return typeOrder || left.id.localeCompare(right.id);
    });
    const total = Number(rCount.total) + Number(sCount.total) + Number(pCount.total);

    return c.json({
      data: all.slice(offset, offset + pageSize),
      meta: pageMeta(page, pageSize, total),
    });
  }

  // ── Tree mode: paginated top-level regions ──────────────────────────────
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(schema.retailRegions)
      .orderBy(
        order(SORT.region, sortKey, schema.retailRegions.name, sortDir),
        asc(schema.retailRegions.id),
      )
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
      .orderBy(
        order(SORT.store, sortKey, schema.retailStores.name, sortDir),
        asc(schema.retailStores.id),
      );
    return c.json(rows.map(s => ({ ...s, type: 'Store' as const, stores: null, breadcrumb: null, children: undefined })));
  }

  // Store → products (leaf)
  const store = await db.query.retailStores.findFirst({ where: eq(schema.retailStores.id, id) });
  if (store) {
    const rows = await db.select().from(schema.retailProducts)
      .where(eq(schema.retailProducts.storeId, id))
      .orderBy(
        order(SORT.product, sortKey, schema.retailProducts.name, sortDir),
        asc(schema.retailProducts.id),
      );
    return c.json(rows.map(p => ({ ...p, type: 'Product' as const, stores: null, breadcrumb: null, children: [] })));
  }

  return c.json([]);
});

export default app;
