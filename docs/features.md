# Features Overview

TableCraft provides a comprehensive set of features for building data tables quickly and efficiently.

## 🏗️ Auto Columns

Columns are automatically generated from your Drizzle schema. No manual column definitions needed.

```typescript
const users = defineTable(schema.users)
  // Columns auto-detected from schema
  .toConfig()
```

## 🔍 Global Search

Full-text search across specified columns with operator support.

```typescript
defineTable(schema.users)
  .search('email', 'name', 'company')
  // Supports: ?search=john
```

**Search Operators:**
- `john` - contains match
- `john*` - starts with
- `*john` - ends with
- `exact:john` - exact match

## 📅 Date Filters

Smart date range filtering with auto-detection.

```typescript
defineTable(schema.orders)
  .dateRangeColumn('createdAt')
  // Auto-detects if column is date type
```

**Date Presets:**
- Today, Yesterday
- This Week, Last Week
- This Month, Last Month
- Last 7/30/90 Days
- Custom range

## 📤 Export

Export data to CSV or Excel.

```typescript
// Frontend
<DataTable
  adapter={adapter}
  config={{ enableExport: true }}
/>
```

- Export all rows or selected rows
- CSV and Excel (XLSX) formats
- Respects current filters and search

## 📊 Sorting

Multi-column sorting with URL synchronization.

```typescript
defineTable(schema.users)
  .sort('-createdAt', 'name')
  // Default: newest first, then by name
```

**URL State:** `?sort=-createdAt&order=desc`

## 📑 Pagination

Cursor or offset-based pagination.

```typescript
defineTable(schema.users)
  .pageSize(20)
  .paginationMode('cursor') // or 'offset'
```

## 🎨 Column Resizing

Drag-to-resize columns with localStorage persistence.

```tsx
<DataTable
  adapter={adapter}
  config={{ enableColumnResizing: true }}
/>
```

## 👁️ Column Visibility

Show/hide columns with URL state sync.

```typescript
defineTable(schema.users)
  .hide('password', 'internalNotes')
```

**URL State:** `?columns=id,name,email`

## 🔗 URL State Sync

All table state stored in URL for shareable links.

**Synced State:**
- Search query
- Filters
- Sort column & direction
- Page number
- Page size
- Column visibility
- Date range

## ⌨️ Keyboard Navigation

Full keyboard accessibility for table navigation.

- Arrow keys: Navigate between cells
- Enter: Activate row/cell
- Escape: Close dialogs
- Tab: Move between controls

## 🔐 Role-based Visibility

Control column visibility by user role.

```typescript
defineTable(schema.users)
  .roleVisibility('admin', ['salary', 'ssn'])
  .roleVisibility('manager', ['department'])
```

## 🗑️ Soft Delete Support

Built-in soft delete filtering.

```typescript
defineTable(schema.posts)
  .softDelete('deletedAt')
  // Automatically filters out deleted records
```

## 🔌 Caching Plugin

Cache query results with multiple backends.

```typescript
import { cachePlugin, memoryCache, redisCache } from '@tablecraft/plugin-cache'

const engine = createTableEngine({
  db, schema, config,
  plugins: [
    cachePlugin({ adapter: memoryCache({ ttl: 60000 }) }),
    // or redisCache({ url: 'redis://localhost:6379' })
  ]
})
```

**Supported Backends:**
- In-memory (default)
- Redis
- Upstash Redis

## 🔗 Relationships & Joins

Fetch related data with automatic joins.

```typescript
defineTable(schema.orders)
  .include('user', (q) => q
    .fields('id', 'name', 'email')
  )
  .include('items', (q) => q
    .fields('id', 'productId', 'quantity')
  )
```

## 🧮 Computed Columns

Create virtual columns with SQL expressions.

```typescript
defineTable(schema.users)
  .computed('fullName', sql`CONCAT(firstName, ' ', lastName)`)
  .computed('age', sql`EXTRACT(YEAR FROM AGE(birthDate))`)
```

## 🎯 Type Generation

Generate TypeScript types from your API.

```bash
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
```

Generates:
- `UsersRow` interface
- `UsersFilters` interface
- `createUsersAdapter()` factory

## 📖 OpenAPI Spec

Auto-generate OpenAPI 3.0 specifications.

```typescript
import { generateOpenApiSpec } from '@tablecraft/engine'

const spec = generateOpenApiSpec(configs, {
  title: 'My API',
  version: '1.0.0'
})
```

## 🏢 Multi-tenancy

Built-in tenant isolation.

```typescript
defineTable(schema.orders)
  .tenant('tenantId')
  // Automatically filters by tenant context
```

## 🔒 Security Features

- Hide sensitive columns (passwords, tokens)
- Tenant isolation
- Soft delete
- Role-based access control

```typescript
defineTable(schema.users)
  .hide('password', 'resetToken')
  .tenant('organizationId')
  .softDelete('deletedAt')
```

## 📦 Multiple Backend Adapters

TableCraft supports multiple backend frameworks:

| Adapter | Framework |
|---------|-----------|
| `@tablecraft/adapter-hono` | Hono.js |
| `@tablecraft/adapter-express` | Express |
| `@tablecraft/adapter-next` | Next.js API Routes |
| `@tablecraft/adapter-elysia` | Elysia (Bun) |

---

📚 **For detailed guides, see the [full documentation](https://jacksonkasi.gitbook.io/tablecraft)**
