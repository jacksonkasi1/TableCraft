import { Hono } from 'hono';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, ilike, asc, desc, sql } from 'drizzle-orm';

const app = new Hono();

type SortOrder = 'asc' | 'desc';

const REGION_SORT   = { name: schema.retailRegions.name,   totalSales: schema.retailRegions.totalSales,   revenue: schema.retailRegions.revenue,   stores: schema.retailRegions.stores,   avgRating: schema.retailRegions.avgRating   } as const;
const STORE_SORT    = { name: schema.retailStores.name,    totalSales: schema.retailStores.totalSales,    revenue: schema.retailStores.revenue,                                               avgRating: schema.retailStores.avgRating    } as const;
const PRODUCT_SORT  = { name: schema.retailProducts.name,  totalSales: schema.retailProducts.totalSales,  revenue: schema.retailProducts.revenue,                                             avgRating: schema.retailProducts.avgRating  } as const;

function byDir<T>(col: T, dir: SortOrder) {
  return dir === 'asc' ? asc(col as any) : desc(col as any);
}

// ─── GET /api/retail/tree ─────────────────────────────────────────────────
// No search  → paginated + sorted top-level regions (lazy tree).
// With search → full-text across all three levels, flat results with breadcrumb.
app.get('/tree', async (c) => {
  const page     = Math.max(1, Number(c.req.query('page'))     || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('pageSize')) || 10));
  const offset   = (page - 1) * pageSize;
  const search   = c.req.query('search')?.trim() ?? '';
  const sortDir  = (c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc') as SortOrder;
  const sortKey  = c.req.query('sort') ?? 'name';

  // ── Deep search mode ──────────────────────────────────────────────────
  if (search) {
    const term = `%${search}%`;

    const [rRows, sRows, pRows] = await Promise.all([
      db.select().from(schema.retailRegions)
        .where(ilike(schema.retailRegions.name, term)),

      db.select({
        id: schema.retailStores.id, name: schema.retailStores.name,
        totalSales: schema.retailStores.totalSales, revenue: schema.retailStores.revenue,
        avgRating: schema.retailStores.avgRating,
        regionName: schema.retailRegions.name,
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
      ...rRows.map(r => ({
        id: r.id, name: r.name, type: 'Region' as const,
        totalSales: r.totalSales, revenue: r.revenue,
        stores: r.stores, avgRating: r.avgRating,
        breadcrumb: null as string | null, children: [] as never[],
      })),
      ...sRows.map(s => ({
        id: s.id, name: s.name, type: 'Store' as const,
        totalSales: s.totalSales, revenue: s.revenue,
        stores: null, avgRating: s.avgRating,
        breadcrumb: s.regionName ?? null, children: [] as never[],
      })),
      ...pRows.map(p => ({
        id: p.id, name: p.name, type: 'Product' as const,
        totalSales: p.totalSales, revenue: p.revenue,
        stores: null, avgRating: p.avgRating,
        breadcrumb: [p.regionName, p.storeName].filter(Boolean).join(' › ') || null,
        children: [] as never[],
      })),
    ];

    const total = all.length;
    return c.json({
      data: all.slice(offset, offset + pageSize),
      meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  }

  // ── Tree mode: top-level regions ──────────────────────────────────────
  const sortCol = REGION_SORT[sortKey as keyof typeof REGION_SORT] ?? schema.retailRegions.name;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(schema.retailRegions)
      .orderBy(byDir(sortCol, sortDir))
      .limit(pageSize).offset(offset),
    db.select({ total: sql<number>`count(*)` }).from(schema.retailRegions),
  ]);

  const count = Number(total);
  return c.json({
    data: rows.map(r => ({ ...r, type: 'Region' as const, breadcrumb: null, children: undefined })),
    meta: { page, pageSize, total: count, totalPages: Math.max(1, Math.ceil(count / pageSize)) },
  });
});

// ─── GET /api/retail/tree/:id/children ───────────────────────────────────
app.get('/tree/:id/children', async (c) => {
  const id      = c.req.param('id');
  const sortDir = (c.req.query('sortOrder') === 'asc' ? 'asc' : 'desc') as SortOrder;
  const sortKey = c.req.query('sort') ?? 'name';

  // Region → stores
  const region = await db.query.retailRegions.findFirst({ where: eq(schema.retailRegions.id, id) });
  if (region) {
    const col = STORE_SORT[sortKey as keyof typeof STORE_SORT] ?? schema.retailStores.name;
    const rows = await db.select().from(schema.retailStores)
      .where(eq(schema.retailStores.regionId, id))
      .orderBy(byDir(col, sortDir));
    return c.json(rows.map(s => ({ ...s, type: 'Store' as const, stores: null, breadcrumb: null, children: undefined })));
  }

  // Store → products (leaf nodes)
  const store = await db.query.retailStores.findFirst({ where: eq(schema.retailStores.id, id) });
  if (store) {
    const col = PRODUCT_SORT[sortKey as keyof typeof PRODUCT_SORT] ?? schema.retailProducts.name;
    const rows = await db.select().from(schema.retailProducts)
      .where(eq(schema.retailProducts.storeId, id))
      .orderBy(byDir(col, sortDir));
    return c.json(rows.map(p => ({ ...p, type: 'Product' as const, stores: null, breadcrumb: null, children: [] })));
  }

  return c.json([]);
});

export default app;
