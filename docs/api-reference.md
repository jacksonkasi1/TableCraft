# API Reference

The `defineTable(drizzleTable)` function returns a builder with a fluent API. Here are all available methods.

## Core

### `defineTable(table, options?)`
Initializes the builder. Auto-introspects the table to create a default configuration.

```typescript
const config = defineTable(schema.users);
```

## Visibility & Transforms

{% columns %}
{% column %}
### `.hide(...columns)`
Hides columns from the API response.
```typescript
.hide('passwordHash', 'salt')
```

### `.show(...columns)`
Explicitly show specific columns.

### `.only(...columns)`
Hides everything except the specified columns.
{% endcolumn %}

{% column %}
### `.autoHide()`
Automatically hides common sensitive columns (password, token, secret, etc.).
```typescript
.autoHide() // Returns list of hidden columns
```

### `.transform(column, fn)`
Applies a JavaScript transformation **after** fetching data.
```typescript
.transform('email', (email) => email.toLowerCase())
```
{% endcolumn %}
{% endcolumns %}

## Search & Filtering

{% columns %}
{% column %}
### `.search(...columns)`
Enables fuzzy search (`?search=foo`) on specific columns.
```typescript
.search('name', 'email')
```

### `.searchAll()`
Enables search on ALL text columns detected in the table.
{% endcolumn %}

{% column %}
### `.filter(...columns)`
Allows filtering by exact match in the URL (`?filter[role]=admin`).
```typescript
.filter('role', 'status')
```

### `.staticFilter(field, operator, value)`
Applies a permanent filter that the user cannot remove.
```typescript
.staticFilter('isArchived', 'eq', false)
```
{% endcolumn %}
{% endcolumns %}

### Advanced Filtering

### `.where({ field, op, value })`
Adds a backend condition (supports context variables like `$user.id`).

### `.whereOr(...conditions)`
Adds an OR condition group.
```typescript
.whereOr(
  { field: 'status', op: 'eq', value: 'pending' },
  { field: 'priority', op: 'eq', value: 'high' }
)
```

## Sorting & Pagination

{% columns %}
{% column %}
### `.sort(...columns)`
Sets default sort order. Use `-` for descending.
```typescript
.sort('-createdAt', 'name')
```

### `.sortable(...columns)`
Controls which columns can be sorted by the user.
{% endcolumn %}

{% column %}
### `.pageSize(size, options)`
Sets default and max page size.
```typescript
.pageSize(20, { max: 100 })
```

### `.noSort()`
Disables sorting entirely.
{% endcolumn %}
{% endcolumns %}

## Joins & Relations

### `.join(table, options)`
Joins another table.
- `on`: Join condition (SQL or string).
- `type`: 'left', 'right', 'inner', 'full'.
- `columns`: Whitelist columns to select from the joined table.

```typescript
.join(schema.posts, {
  on: sql`${schema.users.id} = ${schema.posts.userId}`,
  columns: ['title']
})
```

### `.include(table, options)`
Fetches related data in a separate query and attaches it (Nested Relation).
Effective for 1:N relations to avoid row duplication.

```typescript
.include(schema.posts, {
  foreignKey: 'userId',
  as: 'posts',
  limit: 5
})
```

## Advanced Logic

### `.computed(name, sqlExpression)`
Adds a virtual column calculated in the database.
```typescript
.computed('fullName', sql`${s.firstName} || ' ' || ${s.lastName}`)
```

### `.subquery(alias, table, type, filter?)`
Runs a subquery for every row.
```typescript
.subquery('orderCount', s.orders, 'count', 'orders.user_id = users.id')
```

### `.groupBy(...columns)` / `.aggregate(...)`
Groups results and calculates aggregates.
```typescript
.groupBy('category')
.aggregate('totalSales', 'sum', 'amount')
```

### `.recursive(options)`
Enables CTE-based recursive queries for tree structures.
```typescript
.recursive({ parentKey: 'parentId', maxDepth: 5 })
```

## Platform Features

{% columns %}
{% column %}
### `.tenant(field?)`
Auto-filters by `context.tenantId`. Default field: `tenantId`.

### `.softDelete(field?)`
Auto-filters rows where `deletedAt` is not null.
{% endcolumn %}

{% column %}
### `.access({ roles, permissions })`
Simple role-based access control metadata.

### `.exportable(...formats)`
Enables `/api/table?export=csv`.
{% endcolumn %}
{% endcolumns %}

---

## DataTable Props (Frontend)

The `<DataTable>` component accepts the following props:

### Core Props

| Prop | Type | Description |
|------|------|-------------|
| `adapter` | `DataAdapter<T>` | Data adapter for fetching data |
| `columns` | `ColumnDef<T>[]` | Manual column definitions (optional) |
| `config` | `Partial<TableConfig>` | Table configuration overrides |
| `hiddenColumns` | `string[]` | Columns to hide from UI (data still received) |

### Configuration Options

```tsx
<DataTable
  adapter={adapter}
  config={{
    enableSearch: true,
    enableExport: true,
    enableColumnResizing: true,
    enableRowSelection: true,
    enableDateFilter: true,
    enableColumnVisibility: true,
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  }}
/>
```

### Hidden Columns

Hide specific columns from the table UI while still receiving the data from the API:

```tsx
import { DataTable, hiddenColumns } from '@tablecraft/table';
import type { ProductsRow, ProductsColumn } from './generated';

<DataTable<ProductsRow>
  adapter={adapter}
  hiddenColumns={hiddenColumns<ProductsColumn>(['id', 'tenantId', 'metadata'])}
/>
```

> **Note:** The `hiddenColumns` helper function provides type safety when using generated `*Column` types from `@tablecraft/codegen`.

### All Props

| Prop | Type | Description |
|------|------|-------------|
| `adapter` | `DataAdapter<T>` | Required. Data adapter instance |
| `columns` | `ColumnDef<T>[]` | Manual column definitions |
| `renderers` | `Record<string, CellRenderer>` | Custom cell renderers |
| `config` | `Partial<TableConfig>` | Table configuration |
| `exportConfig` | `ExportConfig<T>` | Export settings |
| `idField` | `keyof T` | ID field for row tracking (default: 'id') |
| `onRowClick` | `(row: T, index: number) => void` | Row click handler |
| `hiddenColumns` | `string[]` | Columns to hide from UI |
| `startToolbarContent` | `React.ReactNode \| (ctx: ToolbarContext<T>) => React.ReactNode` | Content before built-in toolbar controls |
| `toolbarContent` | `React.ReactNode` | Content after built-in toolbar controls |
| `renderToolbar` | `(ctx: ToolbarContext<T>) => React.ReactNode` | Custom toolbar renderer |
| `className` | `string` | CSS class for outer wrapper |
| `pageSizeOptions` | `number[]` | Page size options |
