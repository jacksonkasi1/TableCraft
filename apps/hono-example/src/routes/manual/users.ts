import { Hono } from 'hono';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { desc, ilike, or, sql } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  const search = c.req.query('search');
  
  // Pagination
  const page = Number(c.req.query('page')) || 1;
  const pageSize = Number(c.req.query('pageSize')) || 10;
  const limit = Math.min(pageSize, 100);
  const offset = (page - 1) * limit;

  const whereConditions = [];

  // Manual search implementation matching engine's .search('email', 'role')
  if (search) {
    whereConditions.push(
      or(
        ilike(schema.users.email, `%${search}%`),
        ilike(schema.users.role, `%${search}%`)
      )
    );
  }

  // Manual select to hide tenantId (matching .hide('tenantId'))
  // and transforms (email lowercase, role uppercase)
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(or(...whereConditions)) // or/and logic depends on if we have other filters. Here only search.
    .orderBy(desc(schema.users.createdAt)) // .sort('-createdAt')
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(or(...whereConditions));

  // Apply manual transforms
  const data = rows.map(u => ({
    ...u,
    email: u.email.toLowerCase(),
    role: u.role?.toUpperCase() ?? u.role,
  }));

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
