# @tablecraft/adapter-hono

Hono adapter for TableCraft — build powerful data APIs with Hono framework.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-hono hono
# or
npm install @tablecraft/engine @tablecraft/adapter-hono hono
# or
yarn add @tablecraft/engine @tablecraft/adapter-hono hono
# or
pnpm add @tablecraft/engine @tablecraft/adapter-hono hono
```

## Features

- **Universal** — Works on Cloudflare Workers, Bun, Deno, Node.js — anywhere Hono runs
- **Lightweight** — Minimal overhead, perfect for edge deployments
- **Type-safe** — Full TypeScript support with Hono's type inference
- **Middleware integration** — Works seamlessly with Hono middleware

## Usage

### Sub-app (multiple tables)

```ts
import { Hono } from 'hono';
import { createHonoApp } from '@tablecraft/adapter-hono';
import { db } from './db';
import * as schema from './db/schema';
import { configs } from './tablecraft.config';

const app = new Hono();

app.route('/api/data', createHonoApp({
  db,
  schema,
  configs,
  getContext: (c) => ({
    tenantId: c.req.header('x-tenant-id'),
    user: c.get('user'),
  }),
}));

export default app;
```

### Single route

```ts
import { Hono } from 'hono';
import { createHonoHandler } from '@tablecraft/adapter-hono';

const app = new Hono();

app.get('/api/users', createHonoHandler({ 
  db, 
  schema, 
  config: usersConfig,
  getContext: (c) => ({
    tenantId: c.req.header('x-tenant-id'),
  }),
}));
```

### Cloudflare Workers

```ts
// src/index.ts
import { Hono } from 'hono';
import { createHonoApp } from '@tablecraft/adapter-hono';

const app = new Hono();

app.route('/api/data', createHonoApp({
  db, // Use D1 or other CF-compatible database
  schema,
  configs,
  getContext: (c) => ({
    tenantId: c.env.TENANT_ID,
    user: c.get('user'),
  }),
}));

export default app;
```

### With middleware

```ts
import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import { createHonoApp } from '@tablecraft/adapter-hono';

const app = new Hono();

app.use('/api/data/*', bearerAuth({ token: 'your-secret-token' }));

app.route('/api/data', createHonoApp({
  db,
  schema,
  configs,
  getContext: (c) => ({
    tenantId: c.req.header('x-tenant-id'),
  }),
}));
```

## Configuration Options

```ts
createHonoApp({
  db,                    // Drizzle database instance
  schema,                // Drizzle schema object
  configs,               // Table configs map
  getContext: (c) => ({
    tenantId: string,
    user: { id: string, roles: string[] },
  }),
  onError: (error, c) => {
    // Custom error handling
    return c.json({ error: error.message }, 500);
  },
});
```

## License

MIT
