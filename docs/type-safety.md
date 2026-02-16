# Type Safety & SQL Helpers

TableCraft is built on Drizzle ORM, which means you get excellent type safety out of the box. However, raw SQL strings can be a weak point. We provide a set of helpers to maintain type safety even when doing complex SQL operations.

{% hint style="warning" %}
**The Rule of Thumb:**
*   **Good**: Using `${schema.table.column}` inside `sql` tags.
*   **Bad**: Writing column names as plain strings.
{% endhint %}

## Available Helpers

Import these from `@tablecraft/engine`.

{% tabs %}
{% tab title="caseWhen" %}
Generates a `CASE WHEN` statement safely.

```typescript
import { caseWhen } from '@tablecraft/engine';

// ❌ Risky: Raw SQL string
.computed('status', sql`CASE WHEN ${s.users.role} = 'admin' THEN 1 ELSE 0 END`)

// ✅ Type-Safe: Compiler checks column and types
.computed('status', caseWhen(s.users.role, {
  'admin': 1,
  'user': 0
}, 0)) // Fallback to 0
```
{% endtab %}

{% tab title="column" %}
Getting a column reference dynamically? Use this helper to ensure the column name exists on the table.

```typescript
import { column } from '@tablecraft/engine';

const col = column(s.users, 'email'); // ✅ Works
const bad = column(s.users, 'emial'); // ❌ TypeScript Error: Property 'emial' does not exist
```
{% endtab %}

{% tab title="coalesce" %}
Type-safe `COALESCE` (returns the first non-null value).

```typescript
import { coalesce } from '@tablecraft/engine';

// Returns nickname, or name if nickname is null, or 'Anonymous'
.computed('displayName', coalesce(s.users.nickname, s.users.name, 'Anonymous'))
```
{% endtab %}

{% tab title="concat" %}
Type-safe string concatenation.

```typescript
import { concat } from '@tablecraft/engine';

.computed('fullName', concat(s.users.firstName, ' ', s.users.lastName))
```
{% endtab %}

{% tab title="dateTrunc" %}
Truncates a timestamp to a specific precision (year, month, day, etc.). Useful for grouping.

```typescript
import { dateTrunc } from '@tablecraft/engine';

// Group sales by month
.groupBy(dateTrunc('month', s.orders.createdAt))
```
{% endtab %}

{% tab title="ago" %}
Shorthand for `NOW() - INTERVAL`. Useful for filters.

```typescript
import { ago } from '@tablecraft/engine';

// Users created in the last 7 days
.where({ field: 'createdAt', op: 'gt', value: ago(7, 'days') })
```
{% endtab %}
{% endtabs %}

## Best Practices

1.  **Prefer Helpers**: Always check if a helper exists before writing raw SQL.
2.  **Use Drizzle Columns**: Inside `sql` tags, always interpolate Drizzle column objects (`${s.users.name}`) instead of writing string names (`"name"`).
3.  **Validate Configs**: If you are dynamically generating configs, use `validateConfig` to catch errors early.
