# Advanced

Sometimes raw database columns aren't enough. You might need to combine fields (FirstName + LastName), calculate values (Price \* Tax), or format dates before sending them to the frontend.

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

{% hint style="success" %}
**API Request:** `GET /users?sort=age&filter[age][gte]=18`
{% endhint %}

## 2. Custom Search Logic

By default, `.search('name')` does a simple `ILIKE %query%`. You can customize this behavior by adding computed columns specifically for searching.

{% tabs %}
{% tab title="Search Vector" %}
Create a computed column that concatenates searchable text, then use it for search.

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
{% endtab %}

{% tab title="Multi-Column" %}
Alternatively, you can just search across multiple existing columns:

```typescript
.search('name', 'sku', 'category') // Matches ANY of these
```
{% endtab %}
{% endtabs %}

## 3. Data Transformation

You often need to format data before sending it to the client.

{% tabs %}
{% tab title="Database Transforms" %}
Use SQL functions to transform the data _before_ it leaves the database.

```typescript
// Always return lowercase emails
.dbTransform('email', 'LOWER')

// Format date string
.dbTransform('createdAt', "TO_CHAR(?, 'YYYY-MM-DD')")
```
{% endtab %}

{% tab title="JavaScript Transforms" %}
Use JavaScript functions to transform the data _after_ fetching it.

```typescript
// Clean up metadata object
.transform('metadata', (meta) => {
  return meta?.publicArgs || {};
})

// Convert cents to dollars
.transform('price', (cents) => {
  return (cents / 100).toFixed(2);
})
```
{% endtab %}
{% endtabs %}

## 4. Static Filters (Base Conditions)

Sometimes you want to enforce a filter that the API user cannot change.

```typescript
// src/config/posts.ts
export const postConfig = defineTable(posts)
  // This filter is ALWAYS applied.
  // The API user sees it as if the table only contains published posts.
  .staticFilter('status', 'eq', 'published')
  .toConfig();
```

## 5. Type-Safe Date Filters

Working with dates in SQL can be tricky. We provide type-safe helpers to make common date operations easy and readable.

{% columns %}
{% column %}
#### Relative Time (`ago`)

Filter for records within a relative time range (e.g., "last 30 days").

```typescript
import { defineTable, ago } from '@tablecraft/engine';

export const recentOrders = defineTable(orders)
  // Only show orders from the last 30 days
  .where({
    field: 'createdAt',
    op: 'gt',
    value: ago(30, 'days')
  })
  .toConfig();
```
{% endcolumn %}

{% column %}
#### Date Truncation (`dateTrunc`)

Group data by time periods (day, month, year).

```typescript
import { defineTable, dateTrunc } from '@tablecraft/engine';

export const monthlySales = defineTable(orders)
  // Group by month
  .groupBy(dateTrunc('month', orders.createdAt))
  .aggregate('total', 'sum', 'amount')
  .toConfig();
```
{% endcolumn %}
{% endcolumns %}

## Next Steps

Learn how to handle [Security & Access Control](4-security.md) to protect sensitive data.
