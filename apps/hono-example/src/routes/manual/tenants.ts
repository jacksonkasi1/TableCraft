import { Hono } from 'hono';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { sql } from 'drizzle-orm';

const app = new Hono();

// Simple introspection-like endpoint for tenants
// No filters/sorts implemented manually to show contrast with engine
app.get('/', async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const pageSize = Number(c.req.query('pageSize')) || 10;
  const limit = Math.min(pageSize, 100);
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select().from(schema.tenants).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(schema.tenants)
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
