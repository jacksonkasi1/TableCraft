# TanStack React Table compatibility

| Installed TanStack version | TableCraft component import |
| --- | --- |
| v8 (tested with 8.21.3) | `@tablecraft/table` |
| v9.3.1 and later in v9 | `@tablecraft/table/v9` |
| v10 and v11 | No published versions to test as of November 21, 2026 |

The npm `latest` tag for `@tanstack/react-table` was **9.3.1** when this guide was written.
Use these examples with a TableCraft release that includes the v9 entry point.

## Keep using TanStack v8

```bash
npm install @tablecraft/table @tanstack/react-table@^8 react react-dom
```

```tsx
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, createStaticAdapter } from "@tablecraft/table";

type User = { id: string; name: string };
const columns: ColumnDef<User>[] = [{ accessorKey: "name", header: "Name" }];
const adapter = createStaticAdapter<User>([{ id: "1", name: "Erkka" }]);

export function UsersTable() {
  return <DataTable adapter={adapter} columns={columns} />;
}
```

## Move to TanStack v9

```bash
npm install @tablecraft/table @tanstack/react-table@^9.3.1 react react-dom
```

```tsx
import { createStaticAdapter } from "@tablecraft/table";
import { DataTable, type ColumnDef } from "@tablecraft/table/v9";

type User = { id: string; name: string };
const columns: ColumnDef<User>[] = [{ accessorKey: "name", header: "Name" }];
const adapter = createStaticAdapter<User>([{ id: "1", name: "Erkka" }]);

export function UsersTable() {
  return <DataTable adapter={adapter} columns={columns} />;
}
```

For schema-generated columns, change the `DataTable` import and keep the existing adapter.
For manual columns, use the `ColumnDef` exported by the v9 entry point. If a custom column
sets `sortingFn`, review TanStack's v9 `sortFn` API before migrating it. Both entry points
use the same CSS import, `@tablecraft/table/styles.css`.

The v9 entry point runs TanStack v9 through `useLegacyTable`. TanStack marks that hook
deprecated and loads all table features through it. This can increase bundle size compared
with a native v9 setup that selects its features. The v8 entry point does not load the v9 hook.
Check the [TanStack v9 migration guide](https://tanstack.com/table/latest/docs/framework/react/guide/migrating)
for changes to custom column and table APIs.
