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

## 6. Subquery Columns

Subquery columns let you attach a correlated subquery to every row — useful for counts, existence checks, or fetching a single related record without a full join.

The `filter` parameter accepts **three forms** — pick whichever fits your style:

### Form 1 — Drizzle `sql\`...\`` expression *(recommended for Drizzle users)*

Import `sql` from `drizzle-orm` and reference your schema columns directly.
TableCraft passes the expression through unchanged — the full power of Drizzle is available.
You own the safety of the expression.

```typescript
import { sql } from 'drizzle-orm';
import { defineTable } from '@tablecraft/engine';
import { orders, orderItems } from '../db/schema';

export const orderConfig = defineTable(orders)
  // Count how many items are in each order
  .subquery('itemCount', orderItems, 'count',
    sql`${orderItems.orderId} = ${orders.id}`)

  // With an extra condition — anything valid in Drizzle works here
  .subquery('activeItemCount', orderItems, 'count',
    sql`${orderItems.orderId} = ${orders.id} AND ${orderItems.status} = ${'active'}`)

  // Check whether any items exist (boolean flag)
  .subquery('hasItems', orderItems, 'exists',
    sql`${orderItems.orderId} = ${orders.id}`)

  // Fetch the first item row as a JSON object (PostgreSQL only)
  .subquery('firstItem', orderItems, 'first',
    sql`${orderItems.orderId} = ${orders.id}`);
```

### Form 2 — Structured `SubqueryCondition[]` *(typed, injection-safe)*

Pass an array of condition objects. Each has `left`, `op` (default `'eq'`), and `right`.
Operands are `{ column: 'table.column' }` or `{ value: literal }`.
Conditions are AND-combined; literal values are parameterized automatically.

```typescript
export const orderConfig = defineTable(orders)
  .subquery('itemCount', orderItems, 'count', [
    { left: { column: 'order_items.order_id' }, op: 'eq', right: { column: 'orders.id' } },
  ])

  // Multiple conditions — AND-combined:
  .subquery('activeItemCount', orderItems, 'count', [
    { left: { column: 'order_items.order_id' }, op: 'eq', right: { column: 'orders.id' } },
    { left: { column: 'order_items.status' },   op: 'eq', right: { value: 'active' } },
  ]);
```

Available operators: `eq` `neq` `gt` `gte` `lt` `lte` `like` `ilike`

### Form 3 — Raw SQL string *(@deprecated)*

Still accepted for backwards compatibility.
Must be a hardcoded developer-authored string — never user input.
Prefer form 1 or 2 for new code.

```typescript
// @deprecated
.subquery('itemCount', orderItems, 'count', 'order_items.order_id = orders.id')
```

### Subquery types

| Type      | Return value         | Sortable | Dialect        |
| --------- | -------------------- | -------- | -------------- |
| `count`   | `integer`            | ✅ Yes   | All            |
| `exists`  | `boolean`            | ✅ Yes   | All            |
| `first`   | JSON object (`{}`)   | ❌ No    | PostgreSQL only |

### Sorting rules

`count` and `exists` return scalar values and can be used in `?sort=itemCount`.

`first` uses `row_to_json()` which returns a JSON object — not a scalar. Attempting to sort by it will return a **400 FieldError** before the query reaches the database:

```
GET /orders?sort=itemCount   → 200 OK  (scalar integer, sortable)
GET /orders?sort=firstItem   → 400 Bad Request  (non-scalar JSON, not sortable)
```

### Dialect requirement for `first`

Because `first` relies on `row_to_json()`, it is **PostgreSQL-only**. Using it with MySQL or SQLite throws a `DialectError` (HTTP 400):

```
DialectError: 'first' is not supported on mysql. Use PostgreSQL or write a raw query.
```

`count` and `exists` work on all dialects.

### Sortable flag on `.computed()`

The `.computed()` builder also accepts a `sortable` option for cases where a SQL expression is non-scalar:

```typescript
.computed('jsonMeta', sql`row_to_json(meta)`, { type: 'string', sortable: false })
```

## Next Steps

Learn how to handle [Security & Access Control](4-security.md) to protect sensitive data.
