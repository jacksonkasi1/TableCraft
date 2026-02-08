# 3. Advanced Configuration: Logic & Transforms

Sometimes raw database columns aren't enough. You might need to combine fields (FirstName + LastName), calculate values (Price * Tax), or format dates before sending them to the frontend.

## 1. Computed Columns (SQL Expressions)

You can define "virtual" columns using SQL expressions. These are calculated on the fly by the database during the query.

```typescript
// src/config/users.ts
import { defineTable } from '@tablecraft/engine';
import { users } from '../db/schema';
import { sql } from 'drizzle-orm';

export const userConfig = defineTable(users)
  // Create a 'fullName' column from first and last names
  .computed('fullName', sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`)

  // Calculate age from birthdate
  .computed('age', sql`EXTRACT(YEAR FROM AGE(${users.birthDate}))`)

  // Use these computed columns just like real ones!
  .sortable('fullName', 'age')
  .filter('age')
  .toConfig();
```

**API Request:**
`GET /users?sort=age&filter[age][gte]=18`

## 2. Custom Search Logic

By default, `.search('name')` does a simple `ILIKE %query%`. You can customize this behavior by adding computed columns specifically for searching.

```typescript
export const productConfig = defineTable(products)
  // Create a searchable text blob
  .computed('searchVector', sql`
    to_tsvector('english', ${products.name} || ' ' || ${products.description})
  `)
  // Use it for search (Postgres Full Text Search example)
  .search('searchVector')
  .toConfig();
```

Alternatively, you can just search across multiple existing columns:
```typescript
.search('name', 'sku', 'category') // Matches ANY of these
```

## 3. Data Transformation

You often need to format data before sending it to the client.

### Database Transforms (`dbTransform`)
Use SQL functions to transform the data *before* it leaves the database.

```typescript
.dbTransform('email', 'LOWER') // Always return lowercase emails
.dbTransform('createdAt', "TO_CHAR(?, 'YYYY-MM-DD')") // Format date string
```

### JavaScript Transforms (`jsTransform`)
Use JavaScript functions to transform the data *after* fetching it. This is useful for logic that is hard to write in SQL.

```typescript
.transform('metadata', (meta) => {
  // Parse JSON or clean up object
  return meta?.publicArgs || {};
})
.transform('price', (cents) => {
  // Convert cents to dollars
  return (cents / 100).toFixed(2);
})
```

## 4. Static Filters (Base Conditions)

Sometimes you want to enforce a filter that the API user cannot change. For example, ensuring a user can only see "published" posts.

```typescript
// src/config/posts.ts
export const postConfig = defineTable(posts)
  // This filter is ALWAYS applied.
  // The API user sees it as if the table only contains published posts.
  .staticFilter('status', 'eq', 'published')
  .toConfig();
```

## Next Steps

Learn how to handle [Security & Access Control](./4-security.md) to protect sensitive data.