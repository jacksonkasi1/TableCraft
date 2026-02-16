# Quick Start

Get up and running with TableCraft in 5 minutes.

## Installation

```bash
# Core engine
pnpm add @tablecraft/engine

# Frontend components
pnpm add @tablecraft/table

# Type generator (dev dependency)
pnpm add -D @tablecraft/codegen

# Choose your backend adapter
pnpm add @tablecraft/adapter-hono    # For Hono
pnpm add @tablecraft/adapter-express # For Express
pnpm add @tablecraft/adapter-next    # For Next.js
pnpm add @tablecraft/adapter-elysia  # For Elysia (Bun)
```

## Backend Setup

### 1. Define Your Table

```typescript
// src/tables/products.ts
import { defineTable } from '@tablecraft/engine';
import { products } from '../db/schema';

export const productsConfig = defineTable(products)
  .name('products')
  .search('name', 'description')
  .sort('-createdAt')
  .filter('category', 'isArchived')
  .pageSize(20)
  .toConfig();
```

### 2. Create API Routes

**With Hono:**

```typescript
// src/index.ts
import { Hono } from 'hono';
import { createHonoApp } from '@tablecraft/adapter-hono';
import { db } from './db';
import * as schema from './db/schema';
import { productsConfig } from './tables/products';

const app = new Hono();

// Mount TableCraft engine at /api/engine
app.route('/api/engine', createHonoApp({
  db,
  schema,
  configs: { products: productsConfig },
}));

export default app;
```

**With Express:**

```typescript
import express from 'express';
import { createExpressMiddleware } from '@tablecraft/adapter-express';
import { db } from './db';
import * as schema from './db/schema';
import { productsConfig } from './tables/products';

const app = express();

// Mount TableCraft engine at /api/engine/:table
app.get('/api/engine/:table', createExpressMiddleware({
  db,
  schema,
  configs: { products: productsConfig }
}));

app.listen(3000);
```

**With Next.js (App Router):**

```typescript
// app/api/engine/[table]/route.ts
import { createNextHandler } from '@tablecraft/adapter-next';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { productsConfig } from '@/tables/products';

const handler = createNextHandler({
  db,
  schema,
  configs: { products: productsConfig },
});

export const GET = handler;
```

**With Elysia (Bun):**

```typescript
import { Elysia } from 'elysia';
import { createElysiaPlugin } from '@tablecraft/adapter-elysia';
import { db } from './db';
import * as schema from './db/schema';
import { productsConfig } from './tables/products';

const app = new Elysia()
  .use(createElysiaPlugin({
    db,
    schema,
    configs: { products: productsConfig },
    prefix: '/api/engine' // Mounts at /api/engine/:table
  }))
  .listen(3000);
```

## Frontend Setup

### 1. Generate Types

```bash
npx @tablecraft/codegen --url http://localhost:3000/api/engine --out ./src/generated
```

### 2. Create DataTable Page

```tsx
// src/pages/products-page.tsx
import { DataTable } from '@tablecraft/table';
import { createProductsAdapter, type ProductsRow } from '../generated';

export function ProductsPage() {
  const adapter = createProductsAdapter({
    baseUrl: '/api/engine',
  });

  return (
    <DataTable<ProductsRow>
      adapter={adapter}
      config={{
        enableSearch: true,
        enableExport: true,
        enableColumnResizing: true,
      }}
    />
  );
}
```

That's it! You now have:

- ✅ Backend API with filtering, sorting, pagination
- ✅ Auto-generated metadata endpoint
- ✅ Type-safe frontend DataTable
- ✅ Date filtering (if table has date columns)
- ✅ Export to CSV/JSON

## Next Steps

- [Configure advanced features](./3-advanced.md)
- [Add relationships](./2-relationships.md)
- [Learn about metadata API](./metadata-api.md)
- [Set up date filtering](./date-filtering.md)
