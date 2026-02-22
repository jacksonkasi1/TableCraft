import { defineTable } from '@tablecraft/engine';
import { sql } from 'drizzle-orm';
import * as s from '@/db/schema';

// 4. Orders — Complex: Joins, Computed, Tenant, Soft Delete, Access
export const orders = defineTable(s.orders)
  .as('orders')
  // Join with Users
  .join(s.users, {
    on: 'orders.user_id = users.id',
    alias: 'customer',
    columns: ['email', 'role'] // Only select these from joined table
  })
  // Computed column (SQL) - Status Label
  .computed('statusLabel', sql`
    CASE
      WHEN ${s.orders.status} = 'paid' THEN 'Completed'
      WHEN ${s.orders.status} = 'pending' THEN 'Processing'
      WHEN ${s.orders.status} = 'cancelled' THEN 'Voided'
      ELSE 'Unknown'
    END
  `, { type: 'string', label: 'Status Label' })
  // Computed column (SQL) - VAT (e.g. 20%)
  .computed('vatAmount', sql`${s.orders.total} * 0.2`, { type: 'number', label: 'VAT' })
  // Subquery: Item Count (count — sortable)
  .subquery('itemCount', s.orderItems, 'count', 'order_items.order_id = orders.id')
  // Subquery: First Item (first — NOT sortable; uses row_to_json, PostgreSQL only)
  .subquery('firstItem', s.orderItems, 'first', 'order_items.order_id = orders.id')
  // Tenant isolation (using context.tenantId)
  .tenant('tenantId')
  // Soft Delete (filters out deletedAt IS NOT NULL)
  .softDelete()
  // Access Control (requires role 'admin' or 'member')
  .access({ roles: ['admin', 'member'] })
  // Export allowed
  .exportable('csv', 'json');
