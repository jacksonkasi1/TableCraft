# @tablecraft/adapter-next

Next.js App Router adapter for TableCraft — build powerful data APIs in your Next.js application.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-next
# or
npm install @tablecraft/engine @tablecraft/adapter-next
# or
yarn add @tablecraft/engine @tablecraft/adapter-next
# or
pnpm add @tablecraft/engine @tablecraft/adapter-next
```

## Features

- **App Router support** — Native Next.js App Router integration
- **Dynamic routes** — Single endpoint for multiple tables
- **Type-safe** — Full TypeScript support
- **Server-side rendering** — Works with SSR and SSG
- **Edge runtime** — Compatible with Edge runtime

## Usage

### Dynamic route (multiple tables)

```ts
// app/api/data/[table]/route.ts
import { createNextHandler } from '@tablecraft/adapter-next';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { configs } from '@/tablecraft.config';

const handler = createNextHandler({
  db,
  schema,
  configs,
  getContext: async (request) => {
    // Extract from session, JWT, etc.
    return { tenantId: 'tenant_123', user: { id: '1', roles: ['admin'] } };
  },
});

export const GET = handler;
```

### Single route (one table)

```ts
// app/api/users/route.ts
import { createNextRouteHandler } from '@tablecraft/adapter-next';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { usersConfig } from '@/tablecraft.config';

export const GET = createNextRouteHandler({
  db,
  schema,
  config: usersConfig,
});
```

### With NextAuth.js

```ts
// app/api/data/[table]/route.ts
import { createNextHandler } from '@tablecraft/adapter-next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = createNextHandler({
  db,
  schema,
  configs,
  getContext: async (request) => {
    const session = await getServerSession(authOptions);
    return {
      tenantId: session?.user?.tenantId,
      user: session?.user,
    };
  },
});

export const GET = handler;
```

### Query from the client

```text
GET /api/data/users?page=1&pageSize=25&sort=-createdAt&filter[status]=active&search=john
GET /api/data/orders?export=csv
GET /api/data/products?filter[category]=electronics&filter[price][gte]=100
```

## Configuration Options

```ts
interface NextHandlerOptions {
  db: DrizzleDb;                  // Drizzle database instance
  schema: Record<string, unknown>; // Drizzle schema object
  configs: TableConfigs;          // Table configs map
  getContext?: (request: Request) => Promise<{
    tenantId?: string;
    user?: { id: string; roles: string[] };
  }>;
  onError?: (error: Error, request: Request) => void;
}

createNextHandler({
  db,
  schema,
  configs,
  getContext: async (request) => ({
    tenantId: 'tenant_123',
    user: { id: '1', roles: ['admin'] },
  }),
  onError: (error, request) => {
    console.error(error);
  },
});
```

## License

MIT
