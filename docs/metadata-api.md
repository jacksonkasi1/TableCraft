# Metadata API — Auto-Generated Frontend Schema

The `_meta` endpoint returns everything your frontend needs to build a data table **without** hardcoding column names, types, or capabilities.

## Why Metadata?

{% columns %}
{% column %}
### Without Metadata
*   Read backend config files to know which columns exist
*   Manually define column types, labels, and widths
*   Hardcode sortable/filterable columns
*   Guess filter operators
*   Manually build enum dropdowns
{% endcolumn %}

{% column %}
### With Metadata
The frontend just calls one endpoint:

```typescript
const meta = await fetch('/api/data/orders/_meta')
  .then(r => r.json());
// Auto-generates table from meta.columns
```
{% endcolumn %}
{% endcolumns %}

## Basic Example

{% stepper %}
{% step %}
### Backend: Define the Table

```typescript
// app/api/data/[table]/route.ts
import { defineTable } from '@tablecraft/engine';
import { orders } from './db/schema';

export const ordersConfig = defineTable(orders)
  // Frontend metadata
  .format('total', 'currency')
  .format('createdAt', 'datetime')
  .align('total', 'right')
  .width('status', 120)
  
  // Enum options for dropdown filter
  .options('status', [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
  ])
  
  // Date filter presets
  .datePresets('createdAt', ['today', 'last7days', 'thisMonth'])
  
  .search('status')
  .sort('-createdAt');
```
{% endstep %}

{% step %}
### Frontend: Fetch Metadata

```typescript
const meta = await fetch('/api/data/orders/_meta').then(r => r.json());
```

**Response:**

```json
{
  "name": "orders",
  "columns": [
    {
      "name": "total",
      "type": "number",
      "label": "total",
      "format": "currency",
      "align": "right",
      "sortable": true,
      "filterable": true
    },
    {
      "name": "status",
      "type": "string",
      "options": [
        { "value": "pending", "label": "Pending", "color": "yellow" },
        { "value": "completed", "label": "Completed", "color": "green" }
      ]
    }
  ]
}
```
{% endstep %}
{% endstepper %}

## Using the Client SDK

Instead of manually fetching, use `@tablecraft/client`.

{% tabs %}
{% tab title="Vanilla JS" %}
```typescript
import { createClient } from '@tablecraft/client';

const tc = createClient({ baseUrl: '/api/data' });

// Fetch metadata
const meta = await tc.table('orders').meta();

// Fetch data
const { data, meta: pagination } = await tc.table('orders').query({
  page: 1,
  pageSize: 25
});
```
{% endtab %}

{% tab title="React" %}
```tsx
import { createClient } from '@tablecraft/client';
import { useTableQuery, useTableMeta } from '@tablecraft/client/react';

const tc = createClient({ baseUrl: '/api/data' });

function OrdersTable() {
  const ordersClient = tc.table('orders');
  const { metadata } = useTableMeta(ordersClient);
  
  // Auto-fetch data with full controls
  const { data, meta, setPage } = useTableQuery(ordersClient, {
    pageSize: 25,
    sort: ['-createdAt'],
  });

  if (!metadata) return <div>Loading schema...</div>;

  return (
    <table>
      <thead>
        <tr>
          {metadata.columns.map(col => (
            <th key={col.name}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
             {/* Render cells */}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```
{% endtab %}
{% endtabs %}

## Advanced Features

### Role-Based Column Visibility

Different users see different columns based on their roles.

**Backend:**
```typescript
export const employees = defineTable(schema.employees)
  .visibleTo('salary', ['admin', 'hr'])
  .visibleTo('ssn', ['admin'])
  .visibleTo('performanceReview', ['admin', 'manager']);
```

**Frontend:**
The metadata endpoint respects the requesting user's roles (passed via context). Admin sees all columns; regular users see neither salary nor SSN.

### Date Presets

Instead of forcing the frontend to calculate date ranges, the backend supports shortcuts.

**Backend:**
```typescript
.datePresets('createdAt', ['today', 'last7days', 'thisMonth'])
```

**Frontend:**
Renders a dropdown with these presets. Selecting "last7days" sends `?filter[createdAt]=last7days`.

### Raw SQL Columns

When you use `.rawSelect()` for complex SQL, you can describe it to the frontend.

```typescript
defineTable(schema.orders)
  .rawSelect('profitMargin', sql`((total - cost) / total * 100)`, {
    type: 'number',
    label: 'Profit Margin',
    format: 'percent',
    align: 'right',
    filterable: true,
    sortable: true,
  });
```

## Universal `.columnMeta()` Method

Override metadata for **any** column — base, join, computed, or even columns that don't exist yet.

```typescript
defineTable(schema.orders)
  // Enrich a join column
  .columnMeta('customerName', {
    label: 'Customer',
    width: 200,
    format: 'text',
  })
  
  // Describe a raw SQL column
  .columnMeta('revenue', {
    type: 'number',
    label: 'Total Revenue',
    format: 'currency',
    align: 'right',
  });
```

## FAQ

{% details %}
<summary>Does metadata respect user roles?</summary>
**Yes.** Metadata is context-aware. Pass the user's roles in `getContext()` and the `_meta` endpoint filters columns based on `visibleTo`.
{% enddetails %}

{% details %}
<summary>Is metadata cached?</summary>
**No.** Metadata is always fresh. Even if you wrap the engine with `withCache()`, `getMetadata()` is never cached to ensure security rules apply correctly.
{% enddetails %}

{% details %}
<summary>What if I use raw SQL for everything?</summary>
Use `.columnMeta()` to manually describe your columns so the frontend still knows how to render them.
{% enddetails %}
