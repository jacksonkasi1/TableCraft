# TableCraft

🚀 Drizzle table query builder engine + Shadcn + Airtable = Complex table setup in 5 minutes instead of 1 hour.

📚 **[Explore the Docs](https://jacksonkasi.gitbook.io/tablecraft)**

---

## ✨ Quick Example

```tsx
import { DataTable, createTableCraftAdapter } from '@tablecraft/table'
import type { UsersRow } from './generated'

export function UsersPage() {
  const adapter = createTableCraftAdapter<UsersRow>({
    baseUrl: '/api/engine',
    table: 'users',
  })

  return (
    <DataTable<UsersRow>
      adapter={adapter}
      config={{
        enableSearch: true,
        enableExport: true,
        enableColumnResizing: true,
      }}
    />
  )
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
| ⌨️ **Keyboard Navigation** | Full keyboard accessibility |
| 🔐 **Role-based Visibility** | Control column visibility by user role |
| 🗑️ **Soft Delete Support** | Built-in soft delete filtering |

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

## 📄 License

MIT
