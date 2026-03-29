# Features

TableCraft provides a comprehensive set of features for building data tables quickly and efficiently.

{% columns %}
{% column %}
### 🏗️ Auto Columns

Columns are automatically generated from your Drizzle schema. No manual column definitions needed.

```typescript
const users = defineTable(schema.users)
  // Columns auto-detected from schema
  .toConfig()
```
{% endcolumn %}

{% column %}
### 🔍 Global Search

Full-text search across specified columns with operator support.

```typescript
defineTable(schema.users)
  .search('email', 'name', 'company')
  // Supports: ?search=john
```
{% endcolumn %}
{% endcolumns %}

{% columns %}
{% column %}
### 📅 Date Filters

Smart date range filtering with auto-detection.

```typescript
defineTable(schema.orders)
  .dateRangeColumn('createdAt')
  // Auto-detects if column is date type
```
{% endcolumn %}

{% column %}
### 📤 Export

Export data to CSV or Excel.

```tsx
<DataTable
  adapter={adapter}
  config={{ enableExport: true }}
/>
```
{% endcolumn %}
{% endcolumns %}

{% columns %}
{% column %}
### 📊 Sorting

Multi-column sorting with URL synchronization.

```typescript
defineTable(schema.users)
  .sort('-createdAt', 'name')
```
{% endcolumn %}

{% column %}
### 📑 Pagination

Cursor or offset-based pagination.

```typescript
defineTable(schema.users)
  .pageSize(20)
  .paginationMode('cursor') // or 'offset'
```
{% endcolumn %}
{% endcolumns %}

## 🎨 Advanced UI Features

{% tabs %}
{% tab title="Column Order" %}
Set the default column order on first load. Two ways to use it:

**Quick — plain array (no extra import):**

```tsx
import { DataTable } from '@tablecraft/table';
import type { OrdersRow } from './generated';

<DataTable<OrdersRow>
  adapter={adapter}
  defaultColumnOrder={['status', 'email', 'total', 'createdAt']}
/>
```

**Type-safe — with helper (recommended):**

```tsx
import { DataTable, defaultColumnOrder } from '@tablecraft/table';
import type { OrdersRow, OrdersColumn } from './generated';

<DataTable<OrdersRow>
  adapter={adapter}
  defaultColumnOrder={defaultColumnOrder<OrdersColumn>([
    'status',   // ✅ autocomplete + compile-time checked
    'email',
    'total',
    'createdAt',
    // 'typo'   // ❌ TypeScript error
  ])}
/>
```

- First mount with no saved order → uses `defaultColumnOrder`
- User reorders → their order persists in `localStorage`
- "Reset Column Order" → restores `defaultColumnOrder`
- `select` (checkbox) is always **first**, `__actions` is always **last** — pinned automatically; never include them in the array
{% endtab %}

{% tab title="Resizing" %}
Drag-to-resize columns with localStorage persistence.

```tsx
<DataTable
  adapter={adapter}
  config={{ enableColumnResizing: true }}
/>
```
{% endtab %}

{% tab title="Hidden Columns" %}
Hide specific columns from the table UI. Data is still received from the API.

**Quick — plain array (no extra import):**

```tsx
<DataTable
  adapter={adapter}
  hiddenColumns={['id', 'tenantId', 'metadata']}
/>
```

**Type-safe — with helper (recommended):**

```tsx
import { hiddenColumns } from '@tablecraft/table';
import type { ProductsColumn } from './generated';

<DataTable
  adapter={adapter}
  hiddenColumns={hiddenColumns<ProductsColumn>(['id', 'tenantId', 'metadata'])}
  // ✅ autocomplete + compile-time safety — typos are a TypeScript error
/>
```
{% endtab %}

{% tab title="Visibility" %}
Show/hide columns with URL state sync.

```typescript
defineTable(schema.users)
  .hide('password', 'internalNotes')
```
{% endtab %}

{% tab title="URL Sync" %}
All table state stored in URL for shareable links:

* Search query
* Filters & Sort
* Page & PageSize
* Column visibility
* Date range
{% endtab %}

{% tab title="Sub-Rows" %}
Build master-detail interfaces with nested expandable rows.

```tsx
<DataTable
  adapter={parentAdapter}
  renderSubRow={({ row }) => <OrderItemsTable orderId={row.id} />}
  config={{
    // Removes the outer card wrapper for a seamless nested look
    removeOuterBorder: true,
  }}
/>
```
{% endtab %}

{% tab title="Keyboard" %}
Full keyboard accessibility:

* Arrow keys: Navigate cells
* Enter: Activate
* Escape: Close
{% endtab %}
{% endtabs %}

## 🔐 Security Features

{% columns %}
{% column %}
#### Role-Based Access

Control column visibility by user role.

```typescript
defineTable(schema.users)
  .roleVisibility('admin', ['salary'])
  .roleVisibility('manager', ['department'])
```
{% endcolumn %}

{% column %}
#### Data Protection

* Hide sensitive columns (passwords, tokens)
* Tenant isolation
* Soft delete support

```typescript
defineTable(schema.users)
  .hide('password')
  .tenant('orgId')
  .softDelete('deletedAt')
```
{% endcolumn %}
{% endcolumns %}

## 🔌 Plugins & Adapters

{% columns %}
{% column %}
#### Caching Plugin

Cache query results with multiple backends (Redis, Upstash, Memory).

```typescript
import { cachePlugin } from '@tablecraft/plugin-cache'
// ...
plugins: [
  cachePlugin({ adapter: redisCache({ url: '...' }) })
]
```
{% endcolumn %}

{% column %}
#### Backend Adapters

Support for major frameworks:

| Adapter                       | Framework    |
| ----------------------------- | ------------ |
| `@tablecraft/adapter-hono`    | Hono.js      |
| `@tablecraft/adapter-express` | Express      |
| `@tablecraft/adapter-next`    | Next.js      |
| `@tablecraft/adapter-sveltekit` | SvelteKit  |
| `@tablecraft/adapter-elysia`  | Elysia (Bun) |
{% endcolumn %}
{% endcolumns %}

## 🧮 Data Logic

{% tabs %}
{% tab title="Relationships" %}
Fetch related data with automatic joins.

```typescript
defineTable(schema.orders)
  .include('user', (q) => q.fields('name', 'email'))
  .include('items', (q) => q.fields('quantity'))
```
{% endtab %}

{% tab title="Computed" %}
Create virtual columns with SQL expressions.

```typescript
import { sql } from 'drizzle-orm';

defineTable(schema.users)
  .computed('fullName', sql`CONCAT(first, ' ', last)`)
```
{% endtab %}
{% endtabs %}

## 🛠 Developer Tools

* **Type Generation:** `npx @tablecraft/codegen`
* **OpenAPI Specs:** Auto-generate Swagger/OpenAPI 3.0 specs
