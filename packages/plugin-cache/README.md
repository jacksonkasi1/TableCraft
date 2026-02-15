# @tablecraft/plugin-cache

Caching plugin for TableCraft — memory, Redis, or bring your own provider.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/plugin-cache @tablecraft/engine
# or
npm install @tablecraft/plugin-cache @tablecraft/engine
# or
yarn add @tablecraft/plugin-cache @tablecraft/engine
# or
pnpm add @tablecraft/plugin-cache @tablecraft/engine
```

## Features

- **Multiple providers** — In-memory, Redis, Upstash, or custom
- **TTL support** — Configure cache expiration per table or query
- **Cache invalidation** — Manual or automatic invalidation on data changes
- **Query-aware caching** — Cache keys include filter, sort, and pagination state
- **Type-safe** — Full TypeScript support

## Quick Example

### In-Memory Cache

```ts
import { withCache, memoryProvider } from '@tablecraft/plugin-cache';
import { TableCraftEngine } from '@tablecraft/engine';

const engine = new TableCraftEngine({
  db,
  schema,
  configs,
  plugins: [
    withCache({
      provider: memoryProvider({ maxSize: 1000 }),
      ttl: 60 * 1000, // 1 minute
    }),
  ],
});
```

### Redis Cache

```bash
bun add ioredis
```

```ts
import { withCache, redisProvider } from '@tablecraft/plugin-cache/redis';
import Redis from 'ioredis';

const engine = new TableCraftEngine({
  db,
  schema,
  configs,
  plugins: [
    withCache({
      provider: redisProvider({
        client: new Redis('redis://localhost:6379'),
        prefix: 'tablecraft:',
      }),
      ttl: 5 * 60 * 1000, // 5 minutes
    }),
  ],
});
```

### Upstash Redis

```bash
bun add @upstash/redis
```

```ts
import { withCache, upstashProvider } from '@tablecraft/plugin-cache/upstash';
import { Redis } from '@upstash/redis';

const engine = new TableCraftEngine({
  db,
  schema,
  configs,
  plugins: [
    withCache({
      provider: upstashProvider({
        client: new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        }),
      }),
      ttl: 5 * 60 * 1000,
    }),
  ],
});
```

## Configuration

```ts
withCache({
  provider: cacheProvider,
  ttl: 60 * 1000,              // Default TTL in milliseconds
  tables: {
    users: { ttl: 30 * 1000 }, // Per-table TTL
    products: { ttl: 5 * 60 * 1000 },
  },
  shouldCache: (query) => {
    // Custom logic to determine if a query should be cached
    return !query.context?.skipCache;
  },
  onCacheHit: (key, data) => {
    console.log('Cache hit:', key);
  },
  onCacheMiss: (key) => {
    console.log('Cache miss:', key);
  },
});
```

## Manual Invalidation

```ts
// Invalidate all cached queries for a table
await engine.invalidateCache('users');

// Invalidate a specific query pattern
await engine.invalidateCache('users', { filter: { status: 'active' } });

// Invalidate all caches
await engine.invalidateCache('*');
```

## Custom Provider

```ts
import type { CacheProvider } from '@tablecraft/plugin-cache';

const customProvider: CacheProvider = {
  async get(key) {
    // Return cached value or null
  },
  async set(key, value, ttl) {
    // Store value with TTL
  },
  async delete(key) {
    // Remove cached value
  },
  async clear() {
    // Clear all cached values
  },
};
```

## License

MIT
