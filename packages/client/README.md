# @tablecraft/client

Type-safe frontend client for TableCraft APIs — seamlessly connect your React app to TableCraft backends.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/client
# or
npm install @tablecraft/client
# or
yarn add @tablecraft/client
# or
pnpm add @tablecraft/client
```

## Features

- **Type-safe API calls** — Full TypeScript inference from your table configs
- **React hooks** — `useTableQuery` for automatic data fetching and caching
- **URL state sync** — Automatic URL synchronization for filters, sorting, and pagination
- **Optimistic updates** — Built-in support for optimistic UI patterns
- **Error handling** — Structured error responses with retry logic

## Quick Example

```ts
import { TableCraftClient } from '@tablecraft/client';

// Create client instance
const client = new TableCraftClient({
  baseUrl: '/api/data',
  headers: {
    'x-tenant-id': 'tenant_123',
  },
});

// Fetch table data
const result = await client.query('users', {
  page: 1,
  pageSize: 25,
  sort: '-createdAt',
  filter: { status: 'active' },
  search: 'john',
});

console.log(result.data);    // Array of users
console.log(result.meta);    // Pagination info
console.log(result.columns); // Column metadata
```

## React Usage

```tsx
import { useTableQuery } from '@tablecraft/client/react';

function UsersTable() {
  const { data, meta, isLoading, error } = useTableQuery(client, 'users', {
    page: 1,
    pageSize: 25,
    sort: '-createdAt',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
      <p>Page {meta.page} of {meta.totalPages}</p>
    </div>
  );
}
```

## License

MIT
