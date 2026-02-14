import { Hono } from 'hono';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc, and, sql, isNull } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
  // Tenant isolation (mock tenant 1)
  const tenantId = 1;

  // Pagination
  const page = Number(c.req.query('page')) || 1;
  const pageSize = Number(c.req.query('pageSize')) || 10;
  const limit = Math.min(pageSize, 100);
  const offset = (page - 1) * limit;

  // Sorting
  const sortParam = c.req.query('sort');
  // Default sort not specified in config? Engine defaults to PK if not set? 
  // Actually config says nothing about default sort for orders. Engine uses PK usually.
  let orderBy: any = schema.orders.id; 
  if (sortParam === '-createdAt') orderBy = desc(schema.orders.createdAt);

  const whereConditions = [
    eq(schema.orders.tenantId, tenantId), // Tenant check
    isNull(schema.orders.deletedAt),      // Soft delete check
  ];

  const rows = await db
    .select({
      id: schema.orders.id,
      status: schema.orders.status,
      total: schema.orders.total,
      createdAt: schema.orders.createdAt,
      tenantId: schema.orders.tenantId,
      // Joined fields
      userEmail: schema.users.email,
      // Computed fields
      statusLabel: sql<string>`CASE 
        WHEN ${schema.orders.status} = 'paid' THEN 'Completed'
        WHEN ${schema.orders.status} = 'pending' THEN 'Processing'
        WHEN ${schema.orders.status} = 'cancelled' THEN 'Voided'
        ELSE 'Unknown'
      END`,
      vatAmount: sql<number>`${schema.orders.total} * 0.2`,
      // Subquery
      itemCount: sql<number>`(SELECT count(*) FROM ${schema.orderItems} WHERE ${schema.orderItems.orderId} = ${schema.orders.id})`
    })
    .from(schema.orders)
    .leftJoin(schema.users, eq(schema.orders.userId, schema.users.id))
    .where(and(...whereConditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(and(...whereConditions));

  return c.json({
    data: rows,
    meta: {
      page,
      pageSize: limit,
      total: Number(countResult[0].count),
      totalPages: Math.ceil(Number(countResult[0].count) / limit),
    }
  });
});

export default app;
