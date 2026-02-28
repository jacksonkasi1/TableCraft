# Quick Start

Get up and running with TableCraft in 5 minutes.

{% stepper %}
{% step %}

### Installation

Install the core engine, frontend components, and the adapter for your backend framework.

{% tabs %}
{% tab title="Hono" %}

```bash
# Install core, table, and Hono adapter
pnpm add @tablecraft/engine @tablecraft/table @tablecraft/adapter-hono

# Install codegen as dev dependency
pnpm add -D @tablecraft/codegen
```

{% endtab %}

{% tab title="Express" %}

```bash
# Install core, table, and Express adapter
pnpm add @tablecraft/engine @tablecraft/table @tablecraft/adapter-express

# Install codegen as dev dependency
pnpm add -D @tablecraft/codegen
```

{% endtab %}

{% tab title="Next.js" %}

```bash
# Install core, table, and Next.js adapter
pnpm add @tablecraft/engine @tablecraft/table @tablecraft/adapter-next

# Install codegen as dev dependency
pnpm add -D @tablecraft/codegen
```

{% endtab %}

{% tab title="Elysia" %}

```bash
# Install core, table, and Elysia adapter
pnpm add @tablecraft/engine @tablecraft/table @tablecraft/adapter-elysia

# Install codegen as dev dependency
pnpm add -D @tablecraft/codegen
```

{% endtab %}
{% endtabs %}
{% endstep %}

{% step %}

### Define Your Table

Create a table configuration file. This defines how your table behaves, including search, sort, and filter capabilities.

```typescript
// src/tables/products.ts
import { defineTable } from "@tablecraft/engine";
import { products } from "../db/schema";

export const productsConfig = defineTable(products)
  .name("products")
  .search("name", "description")
  .sort("-createdAt")
  .filter("category", "isArchived")
  .pageSize(20)
  .toConfig();
```

{% hint style="info" %}
Make sure your database schema is already defined. TableCraft works with your existing Drizzle ORM schema.
{% endhint %}
{% endstep %}

{% step %}

### Create API Routes

Mount the TableCraft engine at `/api/engine`. Choose your framework below:

{% tabs %}
{% tab title="Hono" %}

```typescript
// src/index.ts
import { Hono } from "hono";
import { createHonoApp } from "@tablecraft/adapter-hono";
import { db } from "./db";
import * as schema from "./db/schema";
import { productsConfig } from "./tables/products";

const app = new Hono();

// Mount TableCraft engine at /api/engine
app.route(
  "/api/engine",
  createHonoApp({
    db,
    schema,
    configs: { products: productsConfig },
  }),
);

export default app;
```

{% endtab %}

{% tab title="Express" %}

```typescript
// src/server.ts
import express from "express";
import { createExpressMiddleware } from "@tablecraft/adapter-express";
import { db } from "./db";
import * as schema from "./db/schema";
import { productsConfig } from "./tables/products";

const app = express();

// Mount TableCraft engine at /api/engine/:table
// The adapter handles the dynamic :table route automatically
app.use(
  "/api/engine",
  createExpressMiddleware({
    db,
    schema,
    configs: { products: productsConfig },
  }),
);

app.listen(3000);
```

{% endtab %}

{% tab title="Next.js" %}

```typescript
// app/api/engine/[table]/route.ts
import { createNextHandler } from "@tablecraft/adapter-next";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { productsConfig } from "@/tables/products";

const handler = createNextHandler({
  db,
  schema,
  configs: { products: productsConfig },
});

export const GET = handler;
```

{% endtab %}

{% tab title="Elysia" %}

```typescript
// src/index.ts
import { Elysia } from "elysia";
import { createElysiaPlugin } from "@tablecraft/adapter-elysia";
import { db } from "./db";
import * as schema from "./db/schema";
import { productsConfig } from "./tables/products";

const app = new Elysia()
  .use(
    createElysiaPlugin({
      db,
      schema,
      configs: { products: productsConfig },
      prefix: "/api/engine", // Mounts at /api/engine/:table
    }),
  )
  .listen(3000);
```

{% endtab %}
{% endtabs %}
{% endstep %}

{% step %}

### Setup Styles (Tailwind CSS v4)

Import the table styles and add the `@source` directive so Tailwind picks up the utility classes used by `@tablecraft/table`:

```css
/* src/index.css */
@import "tailwindcss";
@import "@tablecraft/table/styles.css";

@source "../node_modules/@tablecraft/table/src";
```

{% hint style="info" %}
The `@source` path is **relative to your CSS file**, not the project root. If your CSS file is deeper (e.g. `apps/web/src/index.css`), adjust accordingly: `@source "../../../node_modules/@tablecraft/table/src";`
{% endhint %}
{% endstep %}

{% step %}

### Generate Types

Run the codegen tool to introspect your API and generate type-safe client adapters.

```bash
npx @tablecraft/codegen --url http://localhost:3000/api/engine --out ./src/generated
```

{% hint style="warning" %}
Ensure your backend server is running before executing this command, as it needs to fetch metadata from the API.
{% endhint %}
{% endstep %}

{% step %}

### Create DataTable Page

Import the generated adapter and use it with the `DataTable` component.

```tsx
// src/pages/products-page.tsx
import { DataTable } from "@tablecraft/table";
import { createProductsAdapter, type ProductsRow } from "../generated";

export function ProductsPage() {
  // Initialize the adapter with your API base URL
  const adapter = createProductsAdapter({
    baseUrl: "/api/engine",
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

{% endstep %}
{% endstepper %}

## Next Steps

Explore more features to customize your tables.

<table data-view="cards"><thead><tr><th>Topic</th><th>Description</th><th data-card-target data-type="content-ref">Link</th></tr></thead><tbody><tr><td>Advanced Config</td><td>Learn about custom cells, actions, and detailed configuration.</td><td><a href="3-advanced.md">3-advanced.md</a></td></tr><tr><td>Relationships</td><td>Display data from related tables (joins).</td><td><a href="2-relationships.md">2-relationships.md</a></td></tr><tr><td>Metadata API</td><td>Understand the underlying metadata API.</td><td><a href="metadata-api.md">metadata-api.md</a></td></tr><tr><td>Security</td><td>Implement Role-Based Access Control (RBAC).</td><td><a href="4-security.md">4-security.md</a></td></tr></tbody></table>
