import { db } from './index';
import { tenants, users, products, orders, orderItems } from './schema';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  // Cleanup
  console.log('Cleaning up old data...');
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(users);
  await db.delete(tenants);

  // 1. Tenants
  console.log('Creating tenants...');
  const tenantData = [
    { name: 'Acme Corp', slug: 'acme', plan: 'enterprise' },
    { name: 'StartUp Inc', slug: 'startup', plan: 'pro' },
    { name: 'Dev Studio', slug: 'devstudio', plan: 'free' },
  ];
  
  const createdTenants = await db.insert(tenants).values(tenantData).returning();

  // 2. Users & Products per Tenant
  for (const tenant of createdTenants) {
    console.log(`Populating tenant: ${tenant.name}`);

    // Users
    const usersData = Array.from({ length: 10 }).map((_, i) => ({
      tenantId: tenant.id,
      email: `${tenant.slug}-user${i + 1}@example.com`,
      role: i === 0 ? 'admin' : i % 5 === 0 ? 'viewer' : 'member',
      isActive: true,
    }));
    const createdUsers = await db.insert(users).values(usersData).returning();

    // Products
    const productsData = Array.from({ length: 20 }).map((_, i) => ({
      tenantId: tenant.id,
      name: `${tenant.name} Product ${i + 1}`,
      description: `Description for product ${i + 1}`,
      price: (Math.random() * 100 + 10).toFixed(2),
      category: i % 3 === 0 ? 'electronics' : i % 3 === 1 ? 'clothing' : 'home',
      tags: ['new', 'sale'],
      isArchived: Math.random() > 0.8,
    }));
    const createdProducts = await db.insert(products).values(productsData).returning();

    // Orders
    const ordersData = [];
    for (let i = 0; i < 50; i++) {
      const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      ordersData.push({
        tenantId: tenant.id,
        userId: user.id,
        status: ['pending', 'paid', 'shipped', 'cancelled'][Math.floor(Math.random() * 4)],
        total: '0', // Will update after items
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
      });
    }
    const createdOrders = await db.insert(orders).values(ordersData).returning();

    // Order Items
    const orderItemsData = [];
    for (const order of createdOrders) {
      let orderTotal = 0;
      const numItems = Math.floor(Math.random() * 5) + 1;
      
      for (let k = 0; k < numItems; k++) {
        const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = parseFloat(product.price as string);
        
        orderItemsData.push({
          orderId: order.id,
          productId: product.id,
          quantity: qty,
          unitPrice: product.price,
        });
        
        orderTotal += price * qty;
      }

      // Update order total
      await db.update(orders)
        .set({ total: orderTotal.toFixed(2) })
        .where(sql`${orders.id} = ${order.id}`);
    }
    
    await db.insert(orderItems).values(orderItemsData);
  }

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
