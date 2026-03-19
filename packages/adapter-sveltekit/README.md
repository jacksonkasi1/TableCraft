# @tablecraft/adapter-sveltekit

SvelteKit server adapter for TableCraft.

The recommended integration is `hooks.server.ts`, which lets you mount TableCraft behind a configurable prefix such as `/api` or `/api/data` without creating route files.

## Install

```bash
bun add @tablecraft/engine @tablecraft/adapter-sveltekit
# or
npm install @tablecraft/engine @tablecraft/adapter-sveltekit
# or
pnpm add @tablecraft/engine @tablecraft/adapter-sveltekit
```

## Recommended: `hooks.server.ts`

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { createSvelteKitHandle } from '@tablecraft/adapter-sveltekit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { configs } from '$lib/server/tablecraft.config';

export const handle: Handle = createSvelteKitHandle({
  db,
  schema,
  configs,
  prefix: '/api',
  enableDiscovery: true,
  getContext: async (event) => ({
    tenantId: event.locals.tenantId,
    user: event.locals.user,
  }),
  checkAccess: async (config, context) => {
    return context.user?.roles?.includes('admin') ?? false;
  },
});
```

With that setup:

```text
GET /api/users
GET /api/users/_meta
GET /api/_tables
```

If you prefer `/api/data`, change the prefix:

```ts
export const handle: Handle = createSvelteKitHandle({
  db,
  schema,
  configs,
  prefix: '/api/data',
});
```

That gives you:

```text
GET /api/data/users
GET /api/data/users/_meta
GET /api/data/_tables
```

## Using `event.locals`

This adapter is designed to work with auth/session data stored in `locals`.

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { createSvelteKitHandle } from '@tablecraft/adapter-sveltekit';

const tablecraft = createSvelteKitHandle({
  db,
  schema,
  configs,
  prefix: '/api',
  getContext: async (event) => ({
    tenantId: event.locals.tenantId,
    user: event.locals.user,
  }),
});

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.tenantId = 'tenant_123';
  event.locals.user = {
    id: 'user_1',
    roles: ['admin'],
  };

  return tablecraft({ event, resolve });
};
```

## Composing With `sequence`

If your app already has auth, session, or logging hooks, compose them with `sequence`.

Put the handle that populates `event.locals` before the TableCraft handle.

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createSvelteKitHandle } from '@tablecraft/adapter-sveltekit';

const authHandle: Handle = async ({ event, resolve }) => {
  event.locals.tenantId = 'tenant_123';
  event.locals.user = {
    id: 'user_1',
    roles: ['admin'],
  };

  return resolve(event);
};

const tablecraftHandle = createSvelteKitHandle({
  db,
  schema,
  configs,
  prefix: '/api',
  getContext: async (event) => ({
    tenantId: event.locals.tenantId,
    user: event.locals.user,
  }),
});

export const handle: Handle = sequence(authHandle, tablecraftHandle);
```

That order matters:

- `authHandle` runs first and populates `event.locals`
- `tablecraftHandle` reads `event.locals` and serves `/api/*`
- non-TableCraft requests continue through the rest of the chain

## Query Examples

```text
GET /api/users?page=1&pageSize=25&sort=-createdAt
GET /api/orders?filter[status]=paid
GET /api/products?filter[price][gte]=100
GET /api/users?search=john
GET /api/users?export=csv
GET /api/users/_meta
GET /api/_tables
```

## Route-File Alternative

If you prefer explicit route files, the adapter also supports SvelteKit `+server.ts` handlers.

### Single catch-all route

```ts
// src/routes/api/[...table]/+server.ts
import { createSvelteKitHandler } from '@tablecraft/adapter-sveltekit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { configs } from '$lib/server/tablecraft.config';

export const GET = createSvelteKitHandler({
  db,
  schema,
  configs,
  enableDiscovery: true,
  getContext: async (event) => ({
    tenantId: event.locals.tenantId,
    user: event.locals.user,
  }),
});
```

That single file can serve:

```text
GET /api/users
GET /api/users/_meta
GET /api/_tables
```

### Split route files

```ts
// src/lib/server/tablecraft.ts
import { createSvelteKitHandlers } from '@tablecraft/adapter-sveltekit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { configs } from '$lib/server/tablecraft.config';

export const tablecraft = createSvelteKitHandlers({
  db,
  schema,
  configs,
  enableDiscovery: true,
});
```

```ts
// src/routes/api/data/[table]/+server.ts
import { tablecraft } from '$lib/server/tablecraft';

export const GET = tablecraft.GET;
```

```ts
// src/routes/api/data/[table]/_meta/+server.ts
import { tablecraft } from '$lib/server/tablecraft';

export const GET = tablecraft.metaGET;
```

```ts
// src/routes/api/data/_tables/+server.ts
import { tablecraft } from '$lib/server/tablecraft';

export const GET = tablecraft.tablesGET;
```

## Single-Table Routes

If you only want one table per endpoint:

```ts
// src/lib/server/users-tablecraft.ts
import { createSvelteKitRouteHandlers } from '@tablecraft/adapter-sveltekit';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { usersConfig } from '$lib/server/tablecraft.config';

export const usersTablecraft = createSvelteKitRouteHandlers({
  db,
  schema,
  config: usersConfig,
  getContext: async (event) => ({
    tenantId: event.locals.tenantId,
    user: event.locals.user,
  }),
});
```

```ts
// src/routes/api/users/+server.ts
import { usersTablecraft } from '$lib/server/users-tablecraft';

export const GET = usersTablecraft.GET;
```

```ts
// src/routes/api/users/_meta/+server.ts
import { usersTablecraft } from '$lib/server/users-tablecraft';

export const GET = usersTablecraft.metaGET;
```

## API

```ts
import type { Handle, RequestEvent } from '@sveltejs/kit';
import type { EngineContext, TableConfig } from '@tablecraft/engine';
import type {
  SvelteKitHandleOptions,
  SvelteKitHandlerOptions,
  SvelteKitRouteOptions,
} from '@tablecraft/adapter-sveltekit';
```

### `createSvelteKitHandle(options)`

Returns a SvelteKit `Handle` for `hooks.server.ts`.

Options:

- `prefix` mounts the API under a path like `/api` or `/api/data`
- `getContext(event)` receives the full `RequestEvent`
- `checkAccess(config, context, event)` runs before queries/export
- `enableDiscovery` controls `/_tables`
- works cleanly with `sequence(...)` from `@sveltejs/kit/hooks`

### `createSvelteKitHandlers(options)`

Returns:

- `GET` for `[table]/+server.ts`
- `metaGET` for `[table]/_meta/+server.ts`
- `tablesGET` for `_tables/+server.ts`

### `createSvelteKitRouteHandlers(options)`

Returns:

- `GET` for a fixed table route
- `metaGET` for that table's metadata route

### Direct handler helpers

Also exported:

- `createSvelteKitHandler`
- `createSvelteKitMetaHandler`
- `createSvelteKitDiscoveryHandler`
- `createSvelteKitRouteHandler`
- `createSvelteKitRouteMetaHandler`

## Notes

- The adapter is GET-only because TableCraft query endpoints are read-oriented.
- `createSvelteKitHandle()` only intercepts requests under the configured `prefix`; everything else falls through to `resolve(event)`.
- If your app uses SvelteKit `kit.paths.base`, choose a `prefix` that matches the final request pathname seen by the server.
- For hook mode, `prefix` is the API mount path, not the same thing as SvelteKit's app-level base path setting.

## License

MIT
