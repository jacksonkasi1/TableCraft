import { Hono } from 'hono';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc, and, ilike, sql, isNull } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  const search = c.req.query('search');
  const category = c.req.query('category');
  // Handle filter[category] syntax to match Engine behavior if passed that way
  const filterCategory = c.req.query('filter[category]') ?? category;
  
  // Static filter: isArchived = false (from config)
  const whereConditions = [eq(schema.products.isArchived, false)];
  
  // Dynamic filters
  if (filterCategory) {
    whereConditions.push(eq(schema.products.category, filterCategory));
  }
  
  if (search) {
    // Engine uses ILIKE on all text columns by default if configured
    // Config says: searchAll() -> name, description, category
    whereConditions.push(sql`(${schema.products.name} ILIKE ${`%${search}%`} OR ${schema.products.description} ILIKE ${`%${search}%`} OR ${schema.products.category} ILIKE ${`%${search}%`})`);
  }

  // Pagination (page size 5 from config)
  const page = Number(c.req.query('page')) || 1;
  const pageSize = Number(c.req.query('pageSize')) || 5;
  const limit = Math.min(pageSize, 50); // Max 50 from config
  const offset = (page - 1) * limit;

  // Sorting (-price from config)
  const sortParam = c.req.query('sort');
  let orderBy = desc(schema.products.price); // Default

  if (sortParam === 'price') orderBy = schema.products.price as any; // asc
  if (sortParam === '-price') orderBy = desc(schema.products.price);

  const [data, countResult] = await Promise.all([
    db.query.products.findMany({
      where: and(...whereConditions),
      orderBy: orderBy,
      limit: limit,
      offset: offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(schema.products).where(and(...whereConditions))
  ]);

  return c.json({
    data,
    meta: {
      page,
      pageSize: limit,
      total: Number(countResult[0].count),
      totalPages: Math.ceil(Number(countResult[0].count) / limit),
    }
  });
});

export default app;
