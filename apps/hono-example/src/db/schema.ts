import { pgTable, serial, text, integer, timestamp, boolean, jsonb, decimal, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Tenants (SaaS context)
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  plan: text('plan').default('free'), // free, pro, enterprise
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Users (Belong to tenants)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id),
  email: text('email').notNull(),
  role: text('role').default('member'), // admin, member, viewer
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Products (Catalog)
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  category: text('category').notNull(),
  tags: jsonb('tags').$type<string[]>(), // Array of strings
  metadata: jsonb('metadata'), // Flexible JSON
  isArchived: boolean('is_archived').default(false),
});

// 4. Orders (Transactional)
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').references(() => tenants.id),
  userId: integer('user_id').references(() => users.id),
  status: text('status').default('pending'), // pending, paid, shipped, cancelled
  total: decimal('total', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

// 5. Order Items (M:N relation details)
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  productId: integer('product_id').references(() => products.id),
  quantity: integer('quantity').default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
});

// --- Relations ---

export const tenantRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  orders: many(orders),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  orders: many(orders),
}));

export const productRelations = relations(products, ({ one }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
