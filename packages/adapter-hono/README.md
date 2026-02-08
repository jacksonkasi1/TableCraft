# @tablecraft/adapter-hono

Hono adapter for [TableCraft](https://github.com/your-org/tablecraft).  
Works on Cloudflare Workers, Bun, Deno, Node.js — anywhere Hono runs.

## Install

```bash
npm install @tablecraft/engine @tablecraft/adapter-hono
```

## Usage

### Sub-app (multiple tables)

```ts
import { Hono } from 'hono';
import { createHonoApp } from '@tablecraft/adapter-hono';

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
import { createHonoHandler } from '@tablecraft/adapter-hono';

app.get('/api/users', createHonoHandler({ db, schema, config: usersConfig }));
```
