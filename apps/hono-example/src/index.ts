import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { createHonoApp } from '@tablecraft/adapter-hono';
import { db } from './db';
import * as schema from './db/schema';
import { configs } from './config';
import { eq, desc, and, ilike, sql, isNull } from 'drizzle-orm';

const app = new Hono();

app.use('*', logger());

// Timing Middleware
app.use('*', async (c, next) => {
  const start = performance.now();
  await next();
  const end = performance.now();
  c.header('X-Response-Time', `${(end - start).toFixed(2)}ms`);
});

// --- 1. Manual Route (Hardcoded Drizzle) ---
app.get('/manual/products', async (c) => {
  const search = c.req.query('search');
  const category = c.req.query('category');
  
  const whereConditions = [eq(schema.products.isArchived, false)];
  
  if (category) {
    whereConditions.push(eq(schema.products.category, category));
  }
  
  if (search) {
    whereConditions.push(ilike(schema.products.name, `%${search}%`));
  }

  const data = await db.query.products.findMany({
    where: and(...whereConditions),
    orderBy: desc(schema.products.price),
    limit: 10
  });

  return c.json({ data });
});

app.get('/manual/orders', async (c) => {
  // Complex query: Orders + User Email + Item Count + Soft Delete
  const rows = await db
    .select({
      id: schema.orders.id,
      status: schema.orders.status,
      total: schema.orders.total,
      createdAt: schema.orders.createdAt,
      userEmail: schema.users.email,
      itemCount: sql<number>`(SELECT count(*) FROM ${schema.orderItems} WHERE ${schema.orderItems.orderId} = ${schema.orders.id})`
    })
    .from(schema.orders)
    .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
    .where(isNull(schema.orders.deletedAt))
    .limit(10);

  return c.json({ data: rows });
});

// --- 2. TableCraft Engine Route ---
// Mounts /engine/:table (e.g., /engine/products, /engine/orders)
const engineApp = createHonoApp({
  db,
  schema,
  configs: Object.fromEntries(configs.map(c => [c.name, c])),
});

app.route('/engine', engineApp);

export default {
  port: 3000,
  fetch: app.fetch,
};
