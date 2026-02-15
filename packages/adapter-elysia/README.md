# @tablecraft/adapter-elysia

Elysia (Bun) adapter for TableCraft — build powerful data APIs with Elysia framework.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-elysia elysia
# or
npm install @tablecraft/engine @tablecraft/adapter-elysia elysia
```

## Features

- **Bun native** — Optimized for Bun runtime with excellent performance
- **Type-safe** — Full TypeScript support with Elysia's Eden treaty
- **Plugin system** — Integrates as an Elysia plugin
- **Minimal overhead** — Lightweight adapter with near-zero performance cost

## Usage

### As a plugin (multiple tables)

```ts
import { Elysia } from 'elysia';
import { createElysiaPlugin } from '@tablecraft/adapter-elysia';
import { db } from './db';
import * as schema from './db/schema';
import { configs } from './tablecraft.config';

const app = new Elysia()
  .use(createElysiaPlugin({
    db,
    schema,
    configs,
    getContext: ({ request }) => ({
      tenantId: request.headers.get('x-tenant-id') ?? undefined,
    }),
    prefix: '/api/data', // Optional: defaults to '/api/data'
  }))
  .listen(3000);

console.log('Server running at http://localhost:3000');
```

### Single route

```ts
import { Elysia } from 'elysia';
import { createElysiaHandler } from '@tablecraft/adapter-elysia';

const app = new Elysia()
  .get('/api/users', createElysiaHandler({
    db,
    schema,
    config: usersConfig,
    getContext: ({ request }) => ({
      tenantId: request.headers.get('x-tenant-id') ?? undefined,
    }),
  }))
  .listen(3000);
```

### With authentication

```ts
import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { createElysiaPlugin } from '@tablecraft/adapter-elysia';

const app = new Elysia()
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
  }))
  .use(createElysiaPlugin({
    db,
    schema,
    configs,
    getContext: async ({ jwt, request }) => {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) return {};
      
      const user = await jwt.verify(token);
      return {
        tenantId: user.tenantId,
        user,
      };
    },
  }))
  .listen(3000);
```

### With Eden Treaty (type-safe client)

```ts
// server.ts
import { Elysia, t } from 'elysia';
import { createElysiaPlugin } from '@tablecraft/adapter-elysia';

const app = new Elysia()
  .use(createElysiaPlugin({ db, schema, configs }))
  .listen(3000);

export type App = typeof app;

// client.ts
import { treaty } from '@elysiajs/eden';
import type { App } from './server';

const client = treaty<App>('http://localhost:3000');

// Type-safe API calls
const users = await client.api.data.users.get({
  query: { page: 1, pageSize: 25 }
});
```

## Configuration Options

```ts
createElysiaPlugin({
  db,                    // Drizzle database instance
  schema,                // Drizzle schema object
  configs,               // Table configs map
  prefix: '/api/data',   // Route prefix (optional)
  getContext: async ({ request, store, ...context }) => ({
    tenantId: string,
    user: { id: string, roles: string[] },
  }),
  onError: (error, context) => {
    // Custom error handling
    console.error(error);
  },
});
```

## License

MIT
