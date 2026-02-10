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

## Next Steps

- **Try it**: Add `.format()`, `.options()`, `.datePresets()` to your configs and call `/_meta`
- **Build a UI**: Use `@tablecraft/client` with React hooks to auto-generate data tables
- **Advanced**: Use `.columnMeta()` to describe complex raw SQL columns

The metadata endpoint closes the loop — backend defines, frontend discovers, UI auto-builds.