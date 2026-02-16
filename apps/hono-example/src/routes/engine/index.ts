import { Hono } from 'hono';
import { createHonoApp } from '@tablecraft/adapter-hono';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { configs } from './configs';

// Mounts /engine/:table (e.g., /engine/products, /engine/orders)
const engineApp = createHonoApp({
  db,
  schema,
  configs,
  enableDiscovery: true,
  getContext: (c) => {
    // Mock context for example
    return {
      tenantId: 1, // Assume tenant 1
      user: {
        id: 'user_123',
        roles: ['admin'], // Grant admin access
      }
    };
  }
});

export default engineApp;
