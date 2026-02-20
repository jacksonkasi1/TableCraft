# Extending

The TableCraft Engine is designed to handle 90% of your API needs (CRUD, filtering, sorting, joins). However, for complex analytics, CTEs, window functions, or highly specific database optimizations, you might need to drop down to raw Drizzle or SQL.

You don't have to lose the benefits of TableCraft (pagination, consistent response format, export logic) just because you write a manual query.

## 1. Using `manualResult`

The `manualResult` utility allows you to write _any_ Drizzle query you want, and then format the output exactly like a standard Engine response. This ensures your API remains consistent across the entire application.

### Example: Complex Analytics Report

Suppose you need a report with `GROUP BY`, `HAVING`, and a subquery—features that might be cumbersome or impossible to configure purely via `defineTable`.

{% stepper %}
{% step %}
### Define Formatting Config

Define a config just for formatting (labels, hidden fields). This doesn't control the query, just the output shape.

```typescript
// src/config/reports.ts
import { defineTable } from '@tablecraft/engine';
import { orders } from '@/db/schema';

export const reportConfig = defineTable(orders)
  .label('totalRevenue', 'Revenue')
  .toConfig();
```
{% endstep %}

{% step %}
### Write the Route Handler

Use full control with raw Drizzle/SQL features.

```typescript
// src/routes/analytics.ts
import { db } from '@/db';
import { orders } from '@/db/schema';
import { sql, desc, count, sum } from 'drizzle-orm';
import { manualResult } from '@tablecraft/engine';
import { reportConfig } from '../config/reports';

export async function GET(request: Request) {
  const page = 1;
  const pageSize = 25;

  // 1. Your Complex Query (Raw Drizzle)
  const data = await db
    .select({
      month: sql<string>`DATE_TRUNC('month', ${orders.createdAt})`,
      totalRevenue: sum(orders.total),
      orderCount: count(orders.id),
    })
    .from(orders)
    .groupBy(sql`DATE_TRUNC('month', ${orders.createdAt})`)
    .orderBy(desc(sql`DATE_TRUNC('month', ${orders.createdAt})`))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // 2. Count Total (for pagination metadata)
  const [{ total }] = await db
    .select({ total: count() })
    .from(orders);

  // 3. Format Response
  // Wraps data + meta into the standard { data, meta } shape.
  return Response.json(
    manualResult(data, total, reportConfig, { page, pageSize })
  );
}
```
{% endstep %}
{% endstepper %}

{% hint style="success" %}
**The Result:** The API response will look standard, identical to auto-generated endpoints.

```json
{
  "data": [
    { "month": "2023-10-01", "totalRevenue": 5000, "orderCount": 10 }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 25,
    "totalPages": 4
  }
}
```
{% endhint %}

## 2. Manual Exports

If you need to export data from a raw query (e.g., to CSV), use `manualExport`. This applies the same transforms and column labels defined in your config.

```typescript
import { manualExport } from '@tablecraft/engine';

// ... (fetch data as above, usually without limit/offset for exports) ...

const csv = manualExport(data, 'csv', reportConfig);
// Returns string: "Month,Revenue,Order Count\n2023-10-01,5000,10..."
```

## 3. Hybrid Approach: Wrapping the Engine

Sometimes you don't need a full manual query, but you want to inject custom logic _before_ or _after_ the standard engine execution. You can wrap the engine instance.

```typescript
import { createTableEngine } from '@tablecraft/engine';

const engine = createTableEngine({ db, config });

// Custom wrapper
const customEngine = {
  ...engine,
  async query(params, ctx) {
    // 1. Modify Params (e.g. enforce a filter)
    const newParams = {
      ...params,
      filters: { ...params.filters, status: 'active' }
    };

    // 2. Run Standard Engine
    const result = await engine.query(newParams, ctx);

    // 3. Modify Result (e.g. add a calculated field in JS)
    result.data = result.data.map(row => ({
      ...row,
      flag: row.value > 100 ? 'high' : 'low'
    }));

    return result;
  }
};
```

This gives you the flexibility to use the engine for 90% of the work and custom code for the remaining 10%.
