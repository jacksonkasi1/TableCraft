# Metadata API — Auto-Generated Frontend Schema

The `_meta` endpoint returns everything your frontend needs to build a data table **without** hardcoding column names, types, or capabilities.

## Why Metadata?

**Without metadata**, your frontend developer has to:
- Read your backend config files to know which columns exist
- Manually define column types, labels, and widths
- Hardcode which columns are sortable, filterable, searchable
- Guess which filter operators work on each column
- Manually build enum dropdowns for status fields

**With metadata**, the frontend just calls:

```typescript
const meta = await fetch('/api/data/orders/_meta').then(r => r.json());
// Auto-generates the entire data table from meta.columns, meta.filters, meta.capabilities
```

---

## Basic Example

### Backend: Define the Table

```typescript
import { defineTable } from '@tablecraft/engine';
import * as schema from './db/schema';

export const orders = defineTable(schema.orders)
  // Frontend metadata
  .format('total', 'currency')
  .format('createdAt', 'datetime')
  .align('total', 'right')
  .width('status', 120, { min: 80 })
  
  // Enum options for dropdown filter
  .options('status', [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
    { value: 'cancelled', label: 'Cancelled', color: 'red' },
  ])
  
  // Date filter presets
  .datePresets('createdAt', ['today', 'last7days', 'thisMonth', 'lastMonth', 'custom'])
  
  .search('status')
  .sort('-createdAt')
  .pageSize(25);
```

### Backend: Serve the Endpoint

```typescript
// app/api/data/[table]/route.ts
import { createNextHandler } from '@tablecraft/adapter-next';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { orders } from '@/tablecraft.config';

export const GET = createNextHandler({
  db,
  schema,
  configs: { orders },
});
```

This auto-serves two endpoints:
- `GET /api/data/orders` → data
- `GET /api/data/orders/_meta` → metadata

### Frontend: Fetch Metadata

```typescript
const meta = await fetch('/api/data/orders/_meta').then(r => r.json());

console.log(meta);
```

**Response:**

```json
{
  "name": "orders",
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "label": "ID",
      "sortable": true,
      "filterable": true,
      "operators": ["eq", "neq", "in", "notIn", "isNull", "isNotNull"]
    },
    {
      "name": "total",
      "type": "number",
      "label": "total",
      "format": "currency",
      "align": "right",
      "sortable": true,
      "filterable": true,
      "operators": ["eq", "neq", "gt", "gte", "lt", "lte", "between", "in"]
    },
    {
      "name": "status",
      "type": "string",
      "label": "status",
      "width": 120,
      "sortable": true,
      "filterable": true,
      "options": [
        { "value": "pending", "label": "Pending", "color": "yellow" },
        { "value": "completed", "label": "Completed", "color": "green" },
        { "value": "cancelled", "label": "Cancelled", "color": "red" }
      ],
      "operators": ["eq", "neq", "contains", "startsWith", "in"]
    },
    {
      "name": "createdAt",
      "type": "date",
      "label": "createdAt",
      "format": "datetime",
      "datePresets": ["today", "last7days", "thisMonth", "lastMonth", "custom"],
      "sortable": true,
      "filterable": true,
      "operators": ["eq", "gt", "gte", "lt", "lte", "between"]
    }
  ],
  "capabilities": {
    "search": true,
    "searchFields": ["status"],
    "export": true,
    "exportFormats": ["csv", "json"],
    "pagination": {
      "enabled": true,
      "defaultPageSize": 25,
      "maxPageSize": 100,
      "cursor": true
    },
    "sort": {
      "enabled": true,
      "defaultSort": [{ "field": "createdAt", "order": "desc" }]
    },
    "groupBy": false,
    "groupByFields": [],
    "recursive": false
  },
  "filters": [
    {
      "field": "status",
      "type": "string",
      "label": "status",
      "operators": ["eq", "neq", "contains", "startsWith", "in"],
      "options": [
        { "value": "pending", "label": "Pending", "color": "yellow" },
        { "value": "completed", "label": "Completed", "color": "green" },
        { "value": "cancelled", "label": "Cancelled", "color": "red" }
      ]
    },
    {
      "field": "createdAt",
      "type": "date",
      "label": "createdAt",
      "operators": ["gt", "gte", "lt", "lte", "between"],
      "datePresets": ["today", "last7days", "thisMonth", "lastMonth", "custom"]
    }
  ],
  "aggregations": [],
  "includes": [],
  "staticFilters": []
}
```

---

## Using the Client SDK

Instead of manually fetching, use `@tablecraft/client`:

```bash
npm install @tablecraft/client
```

```typescript
import { createClient } from '@tablecraft/client';

const tc = createClient({ baseUrl: '/api/data' });

// Fetch metadata
const meta = await tc.table('orders').meta();

// Fetch data
const { data, meta: pagination } = await tc.table('orders').query({
  page: 1,
  pageSize: 25,
  filters: { status: 'completed' },
  sort: ['-createdAt'],
});
```

### React Integration

```typescript
import { createClient } from '@tablecraft/client';
import { useTableQuery, useTableMeta } from '@tablecraft/client/react';

const tc = createClient({ baseUrl: '/api/data' });

function OrdersTable() {
  const ordersClient = tc.table('orders');
  
  // Auto-fetch metadata
  const { metadata, loading: metaLoading } = useTableMeta(ordersClient);
  
  // Auto-fetch data with full controls
  const {
    data,
    meta,
    loading,
    setPage,
    setFilter,
    setSearch,
  } = useTableQuery(ordersClient, {
    pageSize: 25,
    sort: ['-createdAt'],
  });

  if (metaLoading || !metadata) return <div>Loading schema...</div>;
  if (loading) return <div>Loading data...</div>;

  return (
    <div>
      {/* Search — auto-knows which fields are searchable */}
      <input
        placeholder={`Search ${metadata.capabilities.searchFields.join(', ')}...`}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Status filter — auto-generated dropdown from metadata.filters */}
      {metadata.filters.map(filter => (
        filter.options && (
          <select key={filter.field} onChange={(e) => setFilter(filter.field, e.target.value)}>
            <option value="">All {filter.label}</option>
            {filter.options.map(opt => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        )
      ))}

      {/* Table — auto-generated from metadata.columns */}
      <table>
        <thead>
          <tr>
            {metadata.columns.map(col => (
              <th
                key={col.name}
                style={{
                  width: col.width,
                  textAlign: col.align as any,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {metadata.columns.map(col => (
                <td key={col.name} style={{ textAlign: col.align as any }}>
                  {formatCell(row[col.name], col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div>
        Page {meta.page} of {meta.totalPages}
        <button onClick={() => setPage(meta.page - 1)} disabled={meta.page <= 1}>
          Previous
        </button>
        <button onClick={() => setPage(meta.page + 1)} disabled={meta.page >= (meta.totalPages ?? 0)}>
          Next
        </button>
      </div>
    </div>
  );
}

// Helper: Format cell value based on column metadata
function formatCell(value: unknown, col: ColumnMetadata): string {
  if (value == null) return '—';
  
  switch (col.format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value as number);
    
    case 'datetime':
      return new Date(value as string).toLocaleString();
    
    case 'date':
      return new Date(value as string).toLocaleDateString();
    
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    
    case 'badge':
      const opt = col.options?.find(o => o.value === value);
      return opt?.label ?? String(value);
    
    default:
      return String(value);
  }
}
```

---

## Advanced: Complex Queries with Full Metadata

### Backend: Orders Dashboard (Joins + Computed + Aggregations)

```typescript
export const ordersDashboard = defineTable(schema.orders)
  // Join customer data
  .join(schema.customers, {
    on: 'customerId',
    columns: ['name', 'email', 'region'],
  })
  
  // Computed columns (SQL expressions)
  .computed('profitMargin', sql`(total - cost) / total * 100`, { type: 'number' })
  
  // Describe the computed column for the frontend
  .columnMeta('profitMargin', {
    label: 'Profit Margin',
    format: 'percent',
    align: 'right',
    filterable: true,
    sortable: true,
    visibleTo: ['admin', 'finance'], // Only admins see profit
  })
  
  // Aggregations (returned in response.aggregations)
  .aggregate('totalRevenue', 'sum', 'total')
  .aggregate('avgOrderValue', 'avg', 'total')
  .aggregate('orderCount', 'count', 'id')
  
  // Nested relations
  .include(schema.orderItems, {
    foreignKey: 'orderId',
    as: 'items',
    columns: ['qty', 'price', 'productName'],
  })
  
  // Frontend metadata
  .format('total', 'currency')
  .format('createdAt', 'datetime')
  .options('status', [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'completed', label: 'Completed', color: 'green' },
  ])
  .datePresets('createdAt', ['today', 'last7days', 'thisMonth'])
  
  .search('status')
  .sort('-createdAt')
  .pageSize(50);
```

### Metadata Response

```
GET /api/data/orders-dashboard/_meta
```

```json
{
  "name": "ordersDashboard",
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "source": "base",
      "operators": ["eq", "in", "notIn"]
    },
    {
      "name": "total",
      "type": "number",
      "source": "base",
      "format": "currency",
      "operators": ["eq", "gt", "gte", "lt", "lte", "between"]
    },
    {
      "name": "name",
      "type": "string",
      "source": "join",
      "joinTable": "customers",
      "label": "Customer Name",
      "operators": ["eq", "contains", "startsWith"]
    },
    {
      "name": "profitMargin",
      "type": "number",
      "source": "computed",
      "label": "Profit Margin",
      "format": "percent",
      "align": "right",
      "computed": true,
      "filterable": true,
      "sortable": true,
      "operators": ["eq", "gt", "gte", "lt", "lte"]
    }
  ],
  "aggregations": [
    { "alias": "totalRevenue", "type": "sum", "field": "total" },
    { "alias": "avgOrderValue", "type": "avg", "field": "total" },
    { "alias": "orderCount", "type": "count", "field": "id" }
  ],
  "includes": [
    {
      "as": "items",
      "table": "orderItems",
      "columns": ["qty", "price", "productName"]
    }
  ],
  "staticFilters": ["status"],
  "capabilities": {
    "groupBy": false,
    "recursive": false
  }
}
```

### Frontend: Auto-Build the UI

```typescript
const { metadata } = useTableMeta(tc.table('orders-dashboard'));

// Auto-render filters based on metadata
{metadata.filters.map(filter => (
  <div key={filter.field}>
    {filter.options ? (
      // Enum column → dropdown
      <select onChange={(e) => setFilter(filter.field, e.target.value)}>
        <option value="">All {filter.label}</option>
        {filter.options.map(opt => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    ) : filter.datePresets ? (
      // Date column → preset picker
      <select onChange={(e) => setFilter(filter.field, e.target.value)}>
        <option value="">All dates</option>
        {filter.datePresets.map(preset => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
      </select>
    ) : (
      // Other types → text input
      <input
        placeholder={`Filter by ${filter.label}...`}
        onChange={(e) => setFilter(filter.field, e.target.value)}
      />
    )}
  </div>
))}

// Display aggregations
{data.length > 0 && metadata.aggregations.length > 0 && (
  <div>
    <strong>Total Revenue:</strong> {formatCurrency(aggregations.totalRevenue)}
    <strong>Average Order:</strong> {formatCurrency(aggregations.avgOrderValue)}
    <strong>Order Count:</strong> {aggregations.orderCount}
  </div>
)}

// Nested data (includes)
{data.map(order => (
  <div key={order.id}>
    <h3>Order {order.id}</h3>
    {order.items?.map(item => (
      <div key={item.id}>
        {item.qty}x {item.productName} @ {formatCurrency(item.price)}
      </div>
    ))}
  </div>
))}
```

---

## Role-Based Column Visibility

Different users see different columns based on their roles.

### Backend

```typescript
export const employees = defineTable(schema.employees)
  .visibleTo('salary', ['admin', 'hr'])
  .visibleTo('ssn', ['admin'])
  .visibleTo('performanceReview', ['admin', 'manager'])
  
  .format('salary', 'currency')
  .format('hireDate', 'date')
  
  .search('firstName', 'lastName', 'email');
```

### Frontend

When an **admin** calls `GET /api/data/employees/_meta`:

```json
{
  "columns": [
    { "name": "id", "type": "uuid" },
    { "name": "firstName", "type": "string" },
    { "name": "salary", "type": "number", "format": "currency" },
    { "name": "ssn", "type": "string" },
    { "name": "performanceReview", "type": "string" }
  ]
}
```

When an **HR user** calls `GET /api/data/employees/_meta`:

```json
{
  "columns": [
    { "name": "id", "type": "uuid" },
    { "name": "firstName", "type": "string" },
    { "name": "salary", "type": "number", "format": "currency" },
    { "name": "performanceReview", "type": "string" }
  ]
}
```

When a **regular user** calls `GET /api/data/employees/_meta`:

```json
{
  "columns": [
    { "name": "id", "type": "uuid" },
    { "name": "firstName", "type": "string" }
  ]
}
```

The metadata respects the requesting user's roles — no manual filtering needed.

---

## Date Presets

Instead of forcing the frontend to calculate date ranges, the backend supports shortcuts.

### Backend

```typescript
export const orders = defineTable(schema.orders)
  .datePresets('createdAt', [
    'today',
    'yesterday',
    'last7days',
    'last30days',
    'thisMonth',
    'lastMonth',
    'thisQuarter',
    'custom', // User picks a custom range
  ])
  .format('createdAt', 'datetime');
```

### Frontend

The metadata response includes:

```json
{
  "filters": [
    {
      "field": "createdAt",
      "type": "date",
      "datePresets": ["today", "yesterday", "last7days", "last30days", "thisMonth", "lastMonth", "thisQuarter", "custom"],
      "operators": ["gt", "gte", "lt", "lte", "between"]
    }
  ]
}
```

Render a dropdown:

```typescript
<select onChange={(e) => setFilter('createdAt', e.target.value)}>
  <option value="">All time</option>
  {metadata.filters.find(f => f.field === 'createdAt')?.datePresets?.map(preset => (
    <option key={preset} value={preset}>
      {preset}
    </option>
  ))}
</select>
```

The user selects "last7days" → the client sends:

```
GET /api/data/orders?filter[createdAt]=last7days
```

The backend resolves it to:

```sql
WHERE createdAt >= '2024-06-08T00:00:00.000Z' AND createdAt < '2024-06-16T00:00:00.000Z'
```

**No date math in the frontend.**

---

## Raw SQL Columns with Metadata

When you use `.rawSelect()` for complex SQL, you can describe it to the frontend.

### Backend

```typescript
export const salesAnalytics = defineTable(schema.orders)
  // Complex SQL expression
  .rawSelect('profitMargin', sql`
    CASE
      WHEN total = 0 THEN 0
      ELSE ((total - cost) / total * 100)::numeric(5,2)
    END
  `, {
    type: 'number',
    label: 'Profit Margin',
    format: 'percent',
    align: 'right',
    filterable: true,
    sortable: true,
  })
  
  // Or describe it after creation
  .rawSelect('taxAmount', sql`total * 0.08`)
  .columnMeta('taxAmount', {
    type: 'number',
    label: 'Sales Tax',
    format: 'currency',
    align: 'right',
  });
```

### Metadata Response

```json
{
  "columns": [
    {
      "name": "profitMargin",
      "type": "number",
      "label": "Profit Margin",
      "format": "percent",
      "align": "right",
      "source": "computed",
      "computed": true,
      "filterable": true,
      "sortable": true,
      "operators": ["eq", "gt", "gte", "lt", "lte", "between"]
    },
    {
      "name": "taxAmount",
      "type": "number",
      "label": "Sales Tax",
      "format": "currency",
      "align": "right",
      "source": "computed",
      "computed": true,
      "operators": ["eq", "gt", "gte", "lt", "lte"]
    }
  ]
}
```

The frontend knows:
- `profitMargin` is a **number** (not string)
- It should display as a **percent**
- It's **right-aligned**
- It's **filterable** and **sortable**

---

## Universal `.columnMeta()` Method

Override metadata for **any** column — base, join, computed, or even columns that don't exist yet.

```typescript
defineTable(schema.orders)
  .join(schema.customers, { on: 'customerId', columns: ['name', 'email'] })
  .rawSelect('revenue', sql`SUM(total)`)
  
  // Enrich the join column
  .columnMeta('name', {
    label: 'Customer Name',
    width: 200,
    format: 'text',
  })
  
  // Describe the raw SQL column
  .columnMeta('revenue', {
    type: 'number',
    label: 'Total Revenue',
    format: 'currency',
    align: 'right',
    sortable: true,
    filterable: true,
    visibleTo: ['admin', 'finance'],
  })
  
  // Override a base column's metadata
  .columnMeta('status', {
    label: 'Order Status',
    width: 150,
    options: [
      { value: 'pending', label: '⏳ Pending', color: 'yellow' },
      { value: 'completed', label: '✅ Completed', color: 'green' },
    ],
  });
```

**Use `.columnMeta()` for:**
- Raw SQL columns from `.rawSelect()`
- Join columns you want to enrich
- Base columns you want to override
- Columns created dynamically

---

## Metadata for GroupBy Queries

When you use `.groupBy()`, the metadata tells the frontend.

### Backend

```typescript
export const salesByCategory = defineTable(schema.orders)
  .join(schema.products, { on: 'productId', columns: ['category'] })
  .groupBy('category')
  .aggregate('totalSales', 'sum', 'total')
  .aggregate('orderCount', 'count', 'id')
  .sort('-totalSales');
```

### Metadata

```json
{
  "capabilities": {
    "groupBy": true,
    "groupByFields": ["category"]
  },
  "aggregations": [
    { "alias": "totalSales", "type": "sum", "field": "total" },
    { "alias": "orderCount", "type": "count", "field": "id" }
  ]
}
```

The frontend knows:
- This is a **grouped query** (not row-level data)
- The response will have `aggregations.totalSales` and `aggregations.orderCount`
- Grouped by `category`

---

## Metadata for Recursive Queries

When you use `.recursive()`, the metadata signals it.

### Backend

```typescript
export const categoryTree = defineTable(schema.categories)
  .recursive({
    parentKey: 'parentId',
    childKey: 'id',
    maxDepth: 5,
    depthAlias: 'depth',
  });
```

### Metadata

```json
{
  "capabilities": {
    "recursive": true
  }
}
```

The frontend can:
- Use a different engine method: `tc.table('categories').queryRecursive()`
- Render a tree view instead of a flat table
- Display the `depth` column

---

## Static Filters (Pre-Filtered Data)

When you add `.staticFilter()` or `.where()`, the metadata tells the frontend "this data is already filtered".

### Backend

```typescript
export const activeUsers = defineTable(schema.users)
  .staticFilter('status', 'eq', 'active')
  .where({ field: 'deletedAt', op: 'isNull', value: null });
```

### Metadata

```json
{
  "staticFilters": ["status", "deletedAt"]
}
```

The frontend knows:
- Don't show a filter UI for `status` — it's already locked to `active`
- Don't show a filter UI for `deletedAt` — soft-deleted users are excluded
- Display a badge: "Showing: Active users only"

---

## Full Feature Matrix

| Backend Method | Metadata Field | Frontend Benefit |
|---|---|---|
| `.format('total', 'currency')` | `columns[].format` | Auto-formats as `$1,234.56` |
| `.align('total', 'right')` | `columns[].align` | Right-aligns number columns |
| `.width('status', 120)` | `columns[].width` | Sets column width |
| `.options('status', [...])` | `columns[].options`, `filters[].options` | Renders dropdown filter |
| `.datePresets('createdAt', [...])` | `columns[].datePresets`, `filters[].datePresets` | Renders date shortcuts |
| `.visibleTo('salary', ['admin'])` | Role-filtered `columns[]` | Hides columns from unauthorized users |
| `.join(table, { columns })` | `columns[].source = "join"`, `columns[].joinTable` | Shows data source |
| `.computed('fullName', sql`...`)` | `columns[].computed = true`, `columns[].source = "computed"` | Marks as derived field |
| `.rawSelect('revenue', sql`...`)` | `columns[]` (with `.columnMeta()`) | Describes raw SQL columns |
| `.aggregate('totalRevenue', 'sum', 'total')` | `aggregations[]` | Shows available summary stats |
| `.include(table, { as: 'items' })` | `includes[]` | Shows nested data structure |
| `.groupBy('category')` | `capabilities.groupBy = true`, `capabilities.groupByFields` | Signals grouped query |
| `.recursive({ parentKey })` | `capabilities.recursive = true` | Signals tree structure |
| `.staticFilter('active', 'eq', true)` | `staticFilters[]` | Shows pre-applied filters |

---

## FAQ

### Q: Does metadata respect user roles?

**Yes.** Metadata is context-aware. Pass the user's roles in `getContext()`:

```typescript
export const GET = createNextHandler({
  db,
  schema,
  configs: { orders },
  getContext: async (req) => ({
    user: { id: session.userId, roles: session.roles },
  }),
});
```

The `_meta` endpoint filters columns based on `visibleTo`.

### Q: Is metadata cached?

**No.** Metadata is always fresh. If you wrap the engine with `withCache()`, `getMetadata()` is never cached.

### Q: Can I customize the metadata response?

**Yes.** Override `getMetadata()`:

```typescript
const engine = createTableEngine({ db, schema, config });

const customEngine = {
  ...engine,
  getMetadata: (context) => {
    const base = engine.getMetadata(context);
    return {
      ...base,
      customField: 'my-value',
    };
  },
};
```

### Q: What if I use raw SQL for everything?

Use `.columnMeta()`:

```typescript
defineTable(schema.orders)
  .rawSelect('complex', sql`...`, { type: 'number', label: 'Complex Calc' })
  .columnMeta('complex', {
    format: 'currency',
    align: 'right',
    filterable: true,
    visibleTo: ['admin'],
  });
```

### Q: Does it work with GROUP BY queries?

**Yes.** Metadata includes `capabilities.groupBy` and `aggregations[]`:

```json
{
  "capabilities": { "groupBy": true, "groupByFields": ["status"] },
  "aggregations": [
    { "alias": "totalRevenue", "type": "sum", "field": "total" }
  ]
}
```

The frontend can render a bar chart instead of a table.

---

## Frequently Asked Questions

### Why Format and Align? Aren't They Optional?

**Yes, they're completely optional!** You never need to define them.

**Purpose:** These are display hints for your frontend UI:

- `format: 'currency'` → Frontend shows "$1,234.56" instead of "1234.56"
- `format: 'date'` → Shows "Jan 15, 2024" instead of "2024-01-15"  
- `align: 'right'` → Numbers look better right-aligned in tables
- `align: 'left'` → Text looks better left-aligned

**When to use them:**
- Building a generic data table component that needs display hints
- Want consistent formatting across your frontend
- Don't want to hardcode column formatting logic

**When to skip them:**
- Your frontend handles all formatting
- You're building a custom UI per table
- You prefer full control in React/Vue components

---

### What Does Metadata Return By Default?

For a simple table with **no custom metadata**, here's what you get:

```typescript
defineTable('users', usersTable)
  .columns(['id', 'name', 'email', 'createdAt'])
  .search(['name', 'email'])
```

**Default metadata response:**

```json
{
  "name": "users",
  "columns": [
    {
      "name": "id",
      "type": "uuid",        // ← Inferred from Drizzle schema
      "label": "id",         // ← Defaults to column name
      "hidden": false,
      "sortable": true,      // ← Default true
      "filterable": true,    // ← Default true
      "computed": false,
      "source": "base",
      "operators": ["eq", "neq", "isNull", "isNotNull", "in", "notIn"]
      // NO format, align, width, options, datePresets
    },
    {
      "name": "name",
      "type": "string",
      "label": "name",
      "hidden": false,
      "sortable": true,
      "filterable": true,
      "computed": false,
      "source": "base",
      "operators": ["eq", "neq", "contains", "startsWith", "like", "in"]
    }
    // ... similar for email, createdAt
  ],
  "capabilities": {
    "search": true,
    "searchFields": ["name", "email"],
    "export": false,       // ← Default false unless enabled
    "exportFormats": [],
    "pagination": {
      "enabled": true,
      "defaultPageSize": 25,  // ← Default
      "maxPageSize": 100,     // ← Default
      "cursor": false
    },
    "sort": {
      "enabled": true,
      "defaultSort": []       // ← Empty unless you set it
    },
    "groupBy": false,
    "groupByFields": [],
    "recursive": false
  },
  "filters": [
    { "field": "id", "type": "uuid", "operators": [...] },
    { "field": "name", "type": "string", "operators": [...] }
  ],
  "aggregations": [],
  "includes": [],
  "staticFilters": []
}
```

**Key defaults:**
- ✅ Column `type` comes from Drizzle schema
- ✅ `sortable: true`, `filterable: true` by default
- ✅ `operators` auto-generated based on type
- ❌ NO `format`, `align`, `width`, `options`, `datePresets` unless you add them
- ❌ NO aggregations/includes/groupBy unless configured

---

### Can I Add Custom Metadata to Multiple Columns?

**Yes!** Each column can have different metadata:

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total', 'status', 'priority', 'createdAt'])
  
  // Column 1: Currency with custom width
  .columnMeta('total', {
    label: 'Order Total',
    format: 'currency',
    align: 'right',
    width: 150
  })
  
  // Column 2: Enum with dropdown options
  .columnMeta('status', {
    label: 'Status',
    width: 120,
    options: [
      { value: 'pending', label: 'Pending', color: 'yellow' },
      { value: 'completed', label: 'Completed', color: 'green' }
    ]
  })
  
  // Column 3: Numeric enum with center align
  .columnMeta('priority', {
    label: 'Priority',
    align: 'center',
    width: 100,
    options: [
      { value: 1, label: 'Low', color: 'blue' },
      { value: 2, label: 'High', color: 'red' }
    ]
  })
  
  // Column 4: Date with presets
  .columnMeta('createdAt', {
    label: 'Created Date',
    format: 'date',
    datePresets: ['today', 'last7days', 'thisMonth']
  })
```

**Each column gets its own independent metadata.** Nothing affects other columns.

---

### How Do I Just Change the Width?

**Use `.columnMeta()` with only the fields you want to change:**

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total', 'status'])
  
  // Just set width, everything else stays default
  .columnMeta('total', { width: 150 })
  .columnMeta('status', { width: 100, minWidth: 80 })
```

You can also use the dedicated `.width()` method:

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total', 'status'])
  .width('total', 150)
  .width('status', 100, { min: 80, max: 200 })
```

---

### How Does Sorting Work on Raw SQL Columns?

Great question! Let's compare regular columns vs raw SQL:

#### **Regular Column Sorting (Automatic)**

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total', 'createdAt'])
```

Frontend: `GET /api/data/orders?sort[total]=desc`

**Backend auto-generates:**
```sql
SELECT * FROM orders
ORDER BY total DESC
```

✅ **No extra code needed!**

---

#### **Raw SQL Column Sorting (Also Automatic)**

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total', 'cost'])
  .rawSelect('profitMargin', sql`
    CASE 
      WHEN total = 0 THEN 0 
      ELSE ((total - cost) / total * 100)::numeric(5,2)
    END
  `, {
    type: 'number',
    label: 'Profit Margin',
    format: 'percent',
    sortable: true  // ← Makes it sortable!
  })
```

Frontend: `GET /api/data/orders?sort[profitMargin]=asc`

**Backend auto-generates:**
```sql
SELECT 
  *,
  CASE 
    WHEN total = 0 THEN 0 
    ELSE ((total - cost) / total * 100)::numeric(5,2)
  END AS profitMargin
FROM orders
ORDER BY profitMargin ASC  -- ← Uses the alias!
```

**How it works:**
1. Engine adds the SQL expression to SELECT with an alias
2. When sorting by that alias, it uses the alias name in ORDER BY
3. Database evaluates the expression and sorts

✅ **No manual sorting code needed!**

---

#### **When Sorting Fails**

If you try to sort by a column that **doesn't exist in the database**:

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total'])

// ❌ Frontend tries: ?sort[profitMargin]=asc
// ERROR: column "profitMargin" does not exist
```

**Solution:** Use `.rawSelect()` or `.computed()` to create the column:

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total', 'cost'])
  .rawSelect('profitMargin', sql`((total - cost) / total * 100)`)
  
// ✅ Now sorting works!
```

---

### Are GroupBy and Aggregations Useful for Table Headers?

**Short answer:** Not directly for headers, but **very useful for dashboards and summary views**.

#### **When They're Useful:**

**1. Dashboard Summary Cards**

```typescript
// Backend
defineTable('orders', ordersTable)
  .aggregate('totalRevenue', 'sum', 'total')
  .aggregate('avgOrder', 'avg', 'total')
  .groupBy('status')
```

```typescript
// Frontend request
GET /api/data/orders?groupBy=status&aggregate[totalRevenue]=sum:total
```

**Response:**
```json
{
  "data": [
    { "status": "completed", "totalRevenue": 45000 },
    { "status": "pending", "totalRevenue": 12000 }
  ]
}
```

**Frontend displays:**
```
┌──────────────────┐  ┌──────────────────┐
│ Completed Orders │  │ Pending Orders   │
│    $45,000       │  │    $12,000       │
└──────────────────┘  └──────────────────┘
```

---

**2. Chart Data**

```typescript
// Monthly revenue trend
GET /api/data/orders?groupBy=month&aggregate[revenue]=sum:total
```

Frontend renders a **line chart** with months on X-axis, revenue on Y-axis.

---

**3. Table Footer Totals**

```typescript
// Metadata tells frontend aggregations are available
{
  "aggregations": [
    { "alias": "totalRevenue", "type": "sum", "field": "total" }
  ]
}
```

Frontend can call:
```typescript
GET /api/data/orders?aggregate[totalRevenue]=sum:total
```

To show totals row:
```
Order ID | Total
---------|-------
1001     | $100
1002     | $200
---------|-------
TOTAL    | $300  ← from aggregation
```

---

**Why Metadata Includes Them:**

The metadata response:
```json
{
  "aggregations": [
    { "alias": "totalRevenue", "type": "sum", "field": "total" },
    { "alias": "avgOrderValue", "type": "avg", "field": "total" }
  ],
  "capabilities": {
    "groupBy": true,
    "groupByFields": ["status", "customerId"]
  }
}
```

**Frontend knows:**
- ✅ "I can group by `status` or `customerId`"
- ✅ "I can aggregate `total` as sum or avg"
- ✅ "I can build a dashboard with these dimensions"

**Not for table headers directly**, but for **building rich analytics UIs**.

---

### Can I Modify Metadata Without `.columnMeta()`?

Yes! There are **dedicated helper methods** for common cases:

```typescript
defineTable('orders', ordersTable)
  // These are shortcuts:
  .format('total', 'currency')              // Same as .columnMeta('total', { format: 'currency' })
  .align('total', 'right')                  // Same as .columnMeta('total', { align: 'right' })
  .width('status', 120)                     // Same as .columnMeta('status', { width: 120 })
  .options('status', [...])                 // Same as .columnMeta('status', { options: [...] })
  .datePresets('createdAt', [...])          // Same as .columnMeta('createdAt', { datePresets: [...] })
  .visibleTo('salary', ['admin', 'hr'])     // Same as .columnMeta('salary', { visibleTo: [...] })
```

**Use `.columnMeta()` when:**
- Setting multiple properties at once
- Working with raw SQL columns
- Need fine control (minWidth, maxWidth, etc.)

**Use dedicated methods when:**
- Setting one property
- Want cleaner, more readable code

---

### What If My Column Doesn't Exist Yet?

`.columnMeta()` works even if the column doesn't exist:

```typescript
defineTable('orders', ordersTable)
  .columns(['id', 'total'])
  
  // This column doesn't exist yet!
  .columnMeta('futureColumn', {
    type: 'number',
    label: 'Future Feature',
    format: 'currency',
    hidden: true  // Hide it for now
  })
```

The engine creates a **placeholder column** with your metadata. Later, when you add:

```typescript
.rawSelect('futureColumn', sql`some_calculation`)
```

The metadata you defined earlier is already there!

**Use case:** Planning your UI before implementing backend logic.

---

### Does Filtering Work on Raw SQL Columns?

**Yes**, if you mark them as `filterable`:

```typescript
defineTable('orders', ordersTable)
  .rawSelect('profitMargin', sql`((total - cost) / total * 100)`, {
    type: 'number',
    filterable: true,  // ← Enable filtering
    sortable: true
  })
```

Frontend: `GET /api/data/orders?filter[profitMargin][gte]=20`

**Backend generates:**
```sql
SELECT 
  *,
  ((total - cost) / total * 100) AS profitMargin
FROM orders
WHERE profitMargin >= 20  -- ← Uses the alias in WHERE
```

✅ **Automatic filtering on computed columns!**

---

### What Happens If I Don't Set Any Metadata?

**Your API still works!** Metadata is **optional**.

**Without metadata:**
- ✅ Queries work normally
- ✅ Sorting/filtering/pagination all work
- ✅ Data returns correctly
- ❌ Frontend doesn't know column types, display hints, or capabilities
- ❌ You have to hardcode everything in your UI

**With metadata:**
- ✅ Frontend auto-discovers column types
- ✅ UI auto-generates filters, sorts, presets
- ✅ Display formatting (currency, dates) is consistent
- ✅ Role-based column hiding works automatically

**Metadata is for frontend convenience**, not backend functionality.

---

### Can I Use Metadata with Non-TableCraft Frontends?

**Yes!** The `_meta` endpoint is just JSON. Any frontend can consume it:

```bash
curl https://api.example.com/data/orders/_meta
```

```json
{
  "columns": [...],
  "capabilities": {...},
  "filters": [...]
}
```

You can use it with:
- Vue.js / Svelte / Angular (build your own data table)
- Low-code tools (import schema definitions)
- API documentation (auto-generate field descriptions)
- Mobile apps (know which fields exist before making requests)

The metadata is **framework-agnostic JSON**.

---

## Next Steps

- **Try it**: Add `.format()`, `.options()`, `.datePresets()` to your configs and call `/_meta`
- **Build a UI**: Use `@tablecraft/client` with React hooks to auto-generate data tables
- **Advanced**: Use `.columnMeta()` to describe complex raw SQL columns

The metadata endpoint closes the loop — backend defines, frontend discovers, UI auto-builds.