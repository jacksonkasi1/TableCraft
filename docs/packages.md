# Packages Overview

TableCraft is a monorepo with multiple packages for different use cases.

## Core Packages

### @tablecraft/engine

The heart of TableCraft - handles query building, filtering, sorting, pagination, and metadata.

```bash
pnpm add @tablecraft/engine
```

**Features:**
- Table configuration with `defineTable()`
- Query building with filtering, sorting, pagination
- Computed columns and transforms
- Relationships and joins
- Group by and aggregations
- Soft delete and tenant isolation
- Metadata API

---

### @tablecraft/table

React DataTable component with zero-config setup.

```bash
pnpm add @tablecraft/table
```

**Features:**
- Auto-generates columns from metadata
- Server-side pagination, filtering, sorting
- Date range picker (auto-shown when applicable)
- Column visibility controls
- Column resizing
- Export to CSV/JSON
- Row selection
- URL state sync

---

### @tablecraft/client

Frontend SDK for direct API calls (non-React).

```bash
pnpm add @tablecraft/client
```

**Features:**
- Type-safe query builder
- Direct API calls without React
- Metadata fetching
- Works with any frontend framework

---

### @tablecraft/codegen

TypeScript type generator from API metadata.

```bash
pnpm add -D @tablecraft/codegen
```

**Features:**
- Generate Row interfaces
- Generate Filters interfaces  
- Generate typed adapter factories
- CLI tool for CI/CD

```bash
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
```

---

## Backend Adapters

### @tablecraft/adapter-hono

Adapter for Hono.js framework.

```bash
pnpm add @tablecraft/adapter-hono
```

```typescript
import { createHonoApp } from '@tablecraft/adapter-hono';

app.route('/engine', createHonoApp({ db, schema, configs }));
```

---

### @tablecraft/adapter-express

Adapter for Express.js framework.

```bash
pnpm add @tablecraft/adapter-express
```

```typescript
import { createExpressRouter } from '@tablecraft/adapter-express';

app.use('/engine', createExpressRouter({ db, schema, configs }));
```

---

### @tablecraft/adapter-next

Adapter for Next.js API routes.

```bash
pnpm add @tablecraft/adapter-next
```

```typescript
// app/api/engine/[...tablecraft]/route.ts
import { createNextHandler } from '@tablecraft/adapter-next';

export { GET, POST } = createNextHandler({ db, schema, configs });
```

---

### @tablecraft/adapter-elysia

Adapter for Elysia (Bun framework).

```bash
pnpm add @tablecraft/adapter-elysia
```

```typescript
import { createElysiaPlugin } from '@tablecraft/adapter-elysia';

app.use(createElysiaPlugin({ db, schema, configs }));
```

---

## Plugins

### @tablecraft/plugin-cache

Caching plugin with multiple backends.

```bash
pnpm add @tablecraft/plugin-cache
```

**Supported Backends:**
- In-memory cache (default)
- Redis
- Upstash Redis

```typescript
import { cachePlugin, memoryCache, redisCache } from '@tablecraft/plugin-cache';

const engine = createTableEngine({
  db,
  schema,
  config,
  plugins: [
    cachePlugin({
      adapter: memoryCache({ ttl: 60000 }),
    }),
  ],
});
```

---

## Package Dependencies

```
@tablecraft/engine
    └── drizzle-orm (peer)

@tablecraft/table
    └── @tanstack/react-table
    └── react-day-picker
    └── date-fns

@tablecraft/codegen
    └── (standalone CLI)
```

## Version Compatibility

| Package | Node | React | Drizzle |
|---------|------|-------|---------|
| engine | >=18 | - | ^0.30 |
| table | - | >=18 | - |
| codegen | >=18 | - | - |
