# 2. Relationships: Joining Tables

Data is rarely stored in a single table. You often need to fetch `Orders` with their `User`, or `Products` with their `Category`.

The TableCraft Engine makes joining tables simple and type-safe.

{% stepper %}
{% step %}
## Basic Join

To join another table, use the `.join()` method.

```typescript
// src/config/orders.ts
import { defineTable } from '@tablecraft/engine';
import { orders, users } from '../db/schema';

export const orderConfig = defineTable(orders)
  .join(users, {
    on: 'orders.user_id = users.id', // SQL-like condition
    type: 'left',                    // 'left' | 'inner' | 'right' | 'full'
    columns: ['email', 'name'],      // Columns to select from Users
  })
  .toConfig();
```

{% hint style="info" %}
When you query `orders`, the response will include `users.email` and `users.name`.
{% endhint %}
{% endstep %}

{% step %}
## Filtering by Related Data

Once joined, you can filter the main table based on the related table's columns.

```typescript
// Allow filtering orders by the user's email
export const orderConfig = defineTable(orders)
  .join(users, {
    on: 'orders.user_id = users.id',
    columns: ['email'],
  })
  .filter('users.email') // Enable filtering on this joined column
  .toConfig();
```

**API Request:**
`GET /orders?filter[users.email]=jane@example.com`

This will return only the orders belonging to Jane.
{% endstep %}

{% step %}
## Sorting by Related Data

You can also sort the main list based on a column in the joined table.

```typescript
export const orderConfig = defineTable(orders)
  .join(users, {
    on: 'orders.user_id = users.id',
    columns: ['name'], // We need the name to sort by it
  })
  .sortable('users.name') // Allow sorting by user name
  .toConfig();
```

**API Request:**
*   `GET /orders?sort=users.name` (A-Z by Customer Name)
*   `GET /orders?sort=-users.name` (Z-A)
{% endstep %}
{% endstepper %}

## Advanced Join Options

{% tabs %}
{% tab title="Custom Alias" %}
If you join the same table twice (e.g., `creator` and `assignee` are both Users), use an alias.

```typescript
.join(users, {
  alias: 'creator',
  on: 'tasks.creator_id = creator.id',
  columns: ['name'],
})
.join(users, {
  alias: 'assignee',
  on: 'tasks.assignee_id = assignee.id',
  columns: ['name'],
})
```
{% endtab %}

{% tab title="Complex Conditions" %}
The `on` clause supports standard SQL strings.

```typescript
.join(subscriptions, {
  // Join only active subscriptions
  on: "users.id = subscriptions.user_id AND subscriptions.status = 'active'",
  type: 'inner'
})
```
{% endtab %}
{% endtabs %}

## Next Steps

Learn how to use [Advanced Configuration](./3-advanced.md) like computed columns and custom transforms.
