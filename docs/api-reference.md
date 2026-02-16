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
