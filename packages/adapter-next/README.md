# @tablecraft/adapter-next

Next.js App Router adapter for [TableCraft](https://github.com/your-org/tablecraft).

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-next
```

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

export const GET = createNextRouteHandler({
  db,
  schema,
  config: usersConfig,
});
```

### Query from the client

```
GET /api/data/users?page=1&pageSize=25&sort=-createdAt&filter[status]=active&search=john
GET /api/data/orders?export=csv
```
