# Packages Overview

TableCraft is a monorepo with multiple packages for different use cases.

## Core Packages

{% tabs %}
{% tab title="@tablecraft/engine" %}
The heart of TableCraft - handles query building, filtering, sorting, pagination, and metadata.

```bash
pnpm add @tablecraft/engine
```

**Features:**
*   Table configuration with `defineTable()`
*   Query building with filtering, sorting, pagination
*   Computed columns and transforms
*   Relationships and joins
*   Metadata API
{% endtab %}

{% tab title="@tablecraft/table" %}
React DataTable component with zero-config setup.

```bash
pnpm add @tablecraft/table
```

**Features:**
*   Auto-generates columns from metadata
*   Server-side pagination, filtering, sorting
*   Date range picker
*   Column visibility & resizing
*   Export to CSV/JSON
{% endtab %}

{% tab title="@tablecraft/client" %}
Frontend SDK for direct API calls (non-React).

```bash
pnpm add @tablecraft/client
```

**Features:**
*   Type-safe query builder
*   Direct API calls
*   Metadata fetching
{% endtab %}

{% tab title="@tablecraft/codegen" %}
TypeScript type generator from API metadata.

```bash
pnpm add -D @tablecraft/codegen
```

**Features:**
*   Generate Row & Filters interfaces
*   Generate typed adapter factories
*   CLI tool for CI/CD
{% endtab %}
{% endtabs %}

## Backend Adapters

{% tabs %}
{% tab title="Hono" %}
Adapter for Hono.js framework.

```bash
pnpm add @tablecraft/adapter-hono
```

```typescript
import { createHonoApp } from '@tablecraft/adapter-hono';
app.route('/engine', createHonoApp({ db, schema, configs }));
```
{% endtab %}

{% tab title="Express" %}
Adapter for Express.js framework.

```bash
pnpm add @tablecraft/adapter-express
```

```typescript
import { createExpressRouter } from '@tablecraft/adapter-express';
app.use('/engine', createExpressRouter({ db, schema, configs }));
```
{% endtab %}

{% tab title="Next.js" %}
Adapter for Next.js API routes.

```bash
pnpm add @tablecraft/adapter-next
```

```typescript
// app/api/engine/[...tablecraft]/route.ts
import { createNextHandler } from '@tablecraft/adapter-next';
export { GET, POST } = createNextHandler({ db, schema, configs });
```
{% endtab %}

{% tab title="Elysia" %}
Adapter for Elysia (Bun framework).

```bash
pnpm add @tablecraft/adapter-elysia
```

```typescript
import { createElysiaPlugin } from '@tablecraft/adapter-elysia';
app.use(createElysiaPlugin({ db, schema, configs }));
```
{% endtab %}
{% endtabs %}

## Plugins

### @tablecraft/plugin-cache

Caching plugin with multiple backends.

```bash
pnpm add @tablecraft/plugin-cache
```

**Supported Backends:**
*   In-memory cache (default)
*   Redis
*   Upstash Redis

```typescript
import { cachePlugin, memoryCache } from '@tablecraft/plugin-cache';

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

## Version Compatibility

| Package | Node | React | Drizzle |
|---------|------|-------|---------|
| engine | >=18 | - | ^0.30 |
| table | - | >=18 | - |
| codegen | >=18 | - | - |
