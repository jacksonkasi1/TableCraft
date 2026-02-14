import { describe, it, expect } from 'vitest';
import { defineTable } from '../src/define';
import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

const orders = pgTable('orders', {
  id: uuid('id').primaryKey(),
  total: integer('total'),
  cost: integer('cost'),
  status: varchar('status', { length: 50 }),
  createdAt: timestamp('created_at'),
});

describe('columnMeta', () => {
  it('should set metadata on existing column', () => {
    const config = defineTable(orders)
      .columnMeta('total', {
        label: 'Order Total',
        format: 'currency',
        align: 'right',
        width: 150,
      })
      .toConfig();

    const col = config.columns.find((c) => c.name === 'total')!;
    expect(col.label).toBe('Order Total');
    expect((col as any).format).toBe('currency');
    expect((col as any).align).toBe('right');
    expect((col as any).width).toBe(150);
  });

  it('should create placeholder for non-existent column', () => {
    const config = defineTable(orders)
      .columnMeta('profitMargin', {
        type: 'number',
        label: 'Profit Margin',
        format: 'percent',
        sortable: true,
      })
      .toConfig();

    const col = config.columns.find((c) => c.name === 'profitMargin')!;
    expect(col).toBeDefined();
    expect(col.type).toBe('number');
    expect(col.label).toBe('Profit Margin');
    expect(col.sortable).toBe(true);
  });

  it('should set visibleTo', () => {
    const config = defineTable(orders)
      .columnMeta('cost', {
        visibleTo: ['admin', 'finance'],
      })
      .toConfig();

    const col = config.columns.find((c) => c.name === 'cost')!;
    expect((col as any).visibleTo).toEqual(['admin', 'finance']);
  });

  it('should set options', () => {
    const config = defineTable(orders)
      .columnMeta('status', {
        options: [
          { value: 'active', label: 'Active', color: 'green' },
          { value: 'inactive', label: 'Inactive', color: 'gray' },
        ],
      })
      .toConfig();

    const col = config.columns.find((c) => c.name === 'status')!;
    expect((col as any).options).toHaveLength(2);
  });

  it('should work with rawSelect', () => {
    const builder = defineTable(orders)
      .rawSelect('profit', sql`${orders.total} - ${orders.cost}`, {
        type: 'number',
        label: 'Profit',
        format: 'currency',
        sortable: true,
      });

    const config = builder.toConfig();

    // Metadata on config
    const col = config.columns.find((c) => c.name === 'profit')!;
    expect(col).toBeDefined();
    expect(col.type).toBe('number');
    expect(col.label).toBe('Profit');
    expect((col as any).format).toBe('currency');
    expect(col.sortable).toBe(true);
  });

  it('should merge with existing column metadata', () => {
    const config = defineTable(orders)
      .format('total', 'currency')
      .columnMeta('total', { width: 150, minWidth: 100 })
      .toConfig();

    const col = config.columns.find((c) => c.name === 'total')!;
    expect((col as any).format).toBe('currency'); // preserved from .format()
    expect((col as any).width).toBe(150); // added by .columnMeta()
    expect((col as any).minWidth).toBe(100);
  });
});