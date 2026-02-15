# @tablecraft/engine

The backend query engine for TableCraft — transform Drizzle ORM tables into powerful, filterable, sortable APIs in minutes.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/engine
# or
npm install @tablecraft/engine
# or
yarn add @tablecraft/engine
# or
pnpm add @tablecraft/engine
```

## Features

- **Schema-driven queries** — Define your table config once, get filtering, sorting, pagination for free
- **Multi-tenant ready** — Built-in tenant isolation and role-based access control
- **Advanced filtering** — Complex filters with AND/OR logic, date presets, and custom operators
- **Relations support** — Automatic joins and nested data fetching
- **Export capabilities** — CSV, JSON, and Excel export out of the box
- **OpenAPI generation** — Auto-generate API documentation
- **Type-safe** — Full TypeScript support with inference

## Quick Example

```ts
import { createTableConfig, TableCraftEngine } from '@tablecraft/engine';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';

// Define your Drizzle schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Create table config
const usersConfig = createTableConfig({
  table: users,
  columns: {
    id: { label: 'ID', visible: false },
    name: { label: 'Name', sortable: true, searchable: true },
    email: { label: 'Email', sortable: true, searchable: true },
    status: { label: 'Status', filterable: true },
    createdAt: { label: 'Created', sortable: true },
  },
  defaultSort: '-createdAt',
});

// Create engine
const engine = new TableCraftEngine({
  db: drizzle(pool),
  schema: { users },
  configs: { users: usersConfig },
});

// Handle request
const result = await engine.handleRequest({
  table: 'users',
  query: { page: 1, pageSize: 25, sort: '-createdAt', 'filter[status]': 'active' },
  context: { tenantId: 'tenant_123' },
});
```

## License

MIT
