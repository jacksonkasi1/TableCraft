# 1. Basics: Defining Your First Table

The core of the TableCraft Engine is the `defineTable` function. It takes your Drizzle schema and creates a rich configuration object that the engine uses to build queries automatically.

## 1. Define a Table

Instead of writing `SELECT` queries manually, you define *how* a table should be accessed.

```typescript
// src/config/products.ts
import { defineTable } from '@tablecraft/engine';
import { products } from '../db/schema'; // Your Drizzle schema

export const productConfig = defineTable(products)
  // --- Display ---
  .label('name', 'Product Name')       // Rename column in UI/API
  .hide('internal_id', 'supplier_code') // Hide sensitive/useless columns

  // --- Filtering & Search ---
  .search('name', 'description')       // Allow search on these fields
  .filter('category', 'status')        // Allow exact match filtering

  // --- Sorting ---
  .sort('-createdAt')                  // Default sort: Newest first
  .sortable('price', 'name')           // Allow user to sort by these

  // --- Pagination ---
  .pageSize(20)                        // Default page size

  .toConfig();                         // Export the final config
```

## 2. Create the Engine

Once you have a config, you create an engine instance. This is usually done once per request (or cached) to handle context like the current user or tenant.

```typescript
// src/routes/products.ts
import { createTableEngine } from '@tablecraft/engine';
import { db } from '../db';
import { productConfig } from '../config/products';

// In your route handler (e.g., Hono, Express, Next.js)
app.get('/products', async (c) => {
  const engine = createTableEngine({
    db,
    config: productConfig,
  });

  const query = c.req.query(); // Get URL params
  const result = await engine.query(query);

  return c.json(result);
});
```

## 3. Querying the API

Now your API automatically supports a powerful query syntax. You don't need to write any extra code to handle these.

### Search
Use `search` to find rows matching the configured search fields.
`GET /products?search=phone`

### Filtering
Use `filter[field]=value` for exact matches.
`GET /products?filter[category]=electronics`

You can also use operators (if your adapter supports parsing them, or pass them manually):
`GET /products?filter[price][gte]=100`

#### Date Range Filtering
To filter by a date range (e.g., "orders created between Jan 1st and Jan 31st"), use the `gte` (Greater Than or Equal) and `lte` (Less Than or Equal) operators in the URL query string.

**1. Configure the Table:**
Ensure the date column is marked as filterable.

```typescript
export const orders = defineTable(schema.orders)
  .filter('createdAt', 'status') // Enable filtering on 'createdAt'
  .toConfig();
```

**2. Make the API Request:**
Pass the start and end dates as filters.

*   `filter[createdAt][gte]=2024-01-01T00:00:00Z` (Start Date)
*   `filter[createdAt][lte]=2024-01-31T23:59:59Z` (End Date)

**URL Example:**
`GET /orders?filter[createdAt][gte]=2024-01-01&filter[createdAt][lte]=2024-01-31`

This will generate a SQL query equivalent to:
`WHERE "createdAt" >= '2024-01-01' AND "createdAt" <= '2024-01-31'`

### Sorting
Use `sort` with a field name. Prefix with `-` for descending.
`GET /products?sort=-price` (High to Low)
`GET /products?sort=name` (A-Z)

### Pagination
The engine supports both **Offset-based** and **Cursor-based** pagination.

#### Offset Pagination (Default)
Use `page` and `pageSize`.
`GET /products?page=2&pageSize=50`

#### Cursor Pagination (Performance)
For infinite scrolling or large datasets, use `cursor`. This is faster as it avoids `OFFSET`.
The `nextCursor` is returned in the `meta` response of the previous page.
`GET /products?cursor=eyJpZCI6MTB9&pageSize=50`

### Field Selection (Partial Response)
You can limit the fields returned by the API using the `select` parameter. This is useful for reducing payload size.
`GET /products?select=id,name,price`

*   **Note:** The `id` field is always returned if available.
*   **Security:** Hidden fields cannot be selected.

## 4. Response Format

The engine returns a standardized JSON structure:

```json
{
  "data": [
    {
      "id": 1,
      "name": "iPhone 15",
      "price": 999,
      "category": "electronics"
    },
    ...
  ],
  "meta": {
    "total": 150,       // Total rows matching filter
    "page": 2,          // Current page
    "pageSize": 50,     // Current page size
    "totalPages": 3,    // Total pages
    "nextCursor": "..." // Cursor for the next page (if using cursor pagination)
  }
}
```

## Next Steps

Now that you have a basic table working, learn how to [Join Related Tables](./2-relationships.md).