# @tablecraft/table

Schema-driven data table for React — built on TanStack Table + Shadcn UI with native TableCraft engine support.

## Links

- [GitHub](https://github.com/jacksonkasi1/TableCraft)
- [Documentation](https://jacksonkasi.gitbook.io/tablecraft/)

## Install

```bash
bun add @tablecraft/table
# or
npm install @tablecraft/table
# or
yarn add @tablecraft/table
# or
pnpm add @tablecraft/table
```

## Peer Dependencies

```bash
bun add @tanstack/react-table react react-dom
```

## Features

- **Auto-generated columns** — Columns generated from your table config metadata
- **Built-in filtering** — Advanced filter UI with date presets, multi-select, and custom operators
- **Sorting & pagination** — Client-side or server-side with URL state sync
- **Export** — CSV, JSON, and Excel export built-in
- **Responsive** — Mobile-friendly with collapsible columns
- **Accessible** — WCAG compliant with keyboard navigation
- **Theming** — Dark mode support via Tailwind CSS

## Quick Example

```tsx
import { DataTable, useTablecraftAdapter } from '@tablecraft/table';
import { client } from './client';

function UsersPage() {
  const adapter = useTablecraftAdapter({
    client,
    table: 'users',
  });

  return (
    <DataTable
      adapter={adapter}
      columns={[
        { id: 'name', header: 'Name', sortable: true, searchable: true },
        { id: 'email', header: 'Email', sortable: true },
        { id: 'status', header: 'Status', filterable: true },
        { id: 'createdAt', header: 'Created', sortable: true },
      ]}
      features={{
        search: true,
        filters: true,
        sort: true,
        pagination: true,
        export: true,
        columnVisibility: true,
      }}
    />
  );
}
```

## Static Data Example

```tsx
import { DataTable, useStaticAdapter } from '@tablecraft/table';

function UsersTable({ users }: { users: User[] }) {
  const adapter = useStaticAdapter({
    data: users,
    pageSize: 25,
  });

  return (
    <DataTable
      adapter={adapter}
      columns={[
        { id: 'name', header: 'Name' },
        { id: 'email', header: 'Email' },
        { id: 'status', header: 'Status', filterable: true },
      ]}
      features={{
        search: true,
        filters: true,
        pagination: true,
      }}
    />
  );
}
```

## Column Renderers

Built-in renderers for common data types:

```tsx
import { renderers } from '@tablecraft/table';

const columns = [
  { id: 'name', header: 'Name', cell: renderers.text() },
  { id: 'avatar', header: 'Avatar', cell: renderers.image() },
  { id: 'email', header: 'Email', cell: renderers.link({ href: (row) => `mailto:${row.email}` }) },
  { id: 'status', header: 'Status', cell: renderers.badge({ variants: { active: 'success' } }) },
  { id: 'progress', header: 'Progress', cell: renderers.progress() },
  { id: 'createdAt', header: 'Created', cell: renderers.date({ format: 'MMM d, yyyy' }) },
  { id: 'isActive', header: 'Active', cell: renderers.boolean() },
];
```

## URL State Sync

Automatic URL synchronization for filters, sorting, and pagination:

```tsx
import { DataTable, useTablecraftAdapter, useUrlState } from '@tablecraft/table';

function UsersPage() {
  const urlState = useUrlState();
  const adapter = useTablecraftAdapter({
    client,
    table: 'users',
    initialState: urlState,
  });

  return <DataTable adapter={adapter} />;
}
```

## License

MIT
