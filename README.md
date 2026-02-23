<p align="center">
  <img src="./assets/demo.gif" alt="TableCraft - Complex table setup in 5 minutes" width="100%" />
</p>

# TableCraft

<div align="center">
  <a href="https://github.com/sponsors/jacksonkasi1">
    <img src="https://img.shields.io/badge/Sponsor-%E2%9D%A4-ff69b4?style=for-the-badge&logo=github" alt="Sponsor TableCraft" />
  </a>
</div>

🚀 Drizzle table query builder engine + Shadcn + Airtable = Complex table setup in 5 minutes instead of 1 hour.

🎉 **[Explore the Demo](https://tablecraft-demo.vercel.app/)** | 📚 **[Explore the Docs](https://jacksonkasi.gitbook.io/tablecraft)**

---

## ✨ Quick Example

### Backend (Hono)

```ts
import { Hono } from 'hono'
import { createHonoApp } from '@tablecraft/adapter-hono'
import { defineTable } from '@tablecraft/engine'
import { db } from './db'
import * as schema from './db/schema'

const users = defineTable(schema.users)
  .hide('password')
  .search('email', 'name')
  .sort('-createdAt')

const app = createHonoApp({
  db,
  schema,
  configs: { users },
})

new Hono().route('/api/engine', app)
```

### Frontend (React)

```tsx
import { DataTable, createTableCraftAdapter } from '@tablecraft/table'

const adapter = createTableCraftAdapter({
  baseUrl: '/api/engine',
  table: 'users',
})

export function UsersPage() {
  return <DataTable adapter={adapter} />
}
```

That's it! 🎉 No column definitions needed.

---

## 🔥 Features

| Feature | Description |
|---------|-------------|
| 🏗️ **Auto Columns** | Columns generated from your Drizzle schema automatically |
| 🔍 **Global Search** | Full-text search across all columns with operator support |
| 📅 **Date Filters** | Smart date range picker (auto-detects date columns) |
| 📤 **Export** | CSV & Excel export with selected/all rows |
| 📊 **Sorting** | Multi-column sorting with URL sync |
| 📑 **Pagination** | Cursor or offset-based pagination |
| 🎨 **Column Resizing** | Drag-to-resize columns with persistence |
| 👁️ **Column Visibility** | Show/hide columns with URL state sync |
| 🔗 **URL State Sync** | Search, filters, sort, page stored in URL for shareable links |
| ⌨️ **Keyboard Navigation** | Full keyboard accessibility |
| 🔐 **Role-based Visibility** | Control column visibility by user role |
| 🗑️ **Soft Delete Support** | Built-in soft delete filtering |

**Plus:** Caching plugin, multiple backend adapters (Hono, Express, Next.js, Elysia), computed columns, relationships & joins, type generation, OpenAPI spec, and more...

📚 **[Explore all features in the docs →](https://jacksonkasi.gitbook.io/tablecraft)**

---

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@tablecraft/engine` | Backend query engine for Drizzle ORM |
| `@tablecraft/table` | React data table component (TanStack Table + Shadcn) |
| `@tablecraft/codegen` | Generate types & adapters from schema |
| `@tablecraft/client` | Client utilities for API communication |
| `@tablecraft/adapter-hono` | Hono server adapter |
| `@tablecraft/adapter-next` | Next.js server adapter |
| `@tablecraft/adapter-express` | Express server adapter |
| `@tablecraft/adapter-elysia` | Elysia server adapter |
| `@tablecraft/plugin-cache` | Caching plugin |

---

## 📚 Documentation

For full guides, API reference, and examples:

👉 **[jacksonkasi.gitbook.io/tablecraft](https://jacksonkasi.gitbook.io/tablecraft)**

---

## 🌟 Related Projects

- [**tnks-data-table**](https://github.com/jacksonkasi1/tnks-data-table): An example application exploring the capabilities of TableCraft's data table component.

---

## 📄 License

MIT
