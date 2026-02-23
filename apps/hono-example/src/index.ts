import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import manualRoutes from './routes/manual';
import engineRoutes from './routes/engine';

const app = new Hono();

app.use('*', cors({ origin: '*' }));
app.use('*', logger());

// Timing Middleware
app.use('*', async (c, next) => {
  const start = performance.now();
  await next();
  const end = performance.now();
  c.header('X-Response-Time', `${(end - start).toFixed(2)}ms`);
});

// --- 1. Manual Route ---
app.route('/api/manual', manualRoutes);

// --- 2. TableCraft Engine Route ---
app.route('/api/engine', engineRoutes);

export default {
  port: 5000,
  fetch: app.fetch,
};
