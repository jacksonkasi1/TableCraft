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

## Optional Dependencies

For Excel export support, install `exceljs`:

```bash
bun add exceljs
```

> **Note:** Excel export is optional — if `exceljs` is not installed, the export feature will gracefully fall back to CSV/JSON formats.

## Tailwind CSS v4 Setup

`@tablecraft/table` uses Tailwind utility classes and ships a standalone CSS file for cursor, column-resizing, and interaction styles.

### 1. Import the styles

Add the following import to your main CSS file (e.g. `index.css`):

```css
@import "tailwindcss";
@import "@tablecraft/table/styles.css";
```

This gives you cursor pointers on interactive elements, column-resize handles, and other table-specific styles out of the box.

### 2. Add the `@source` directive

Tailwind CSS v4 needs to scan the package source to detect utility classes used by the table components. Add the `@source` directive pointing to the package's `src/` directory:

```css
@source "<path-to-root>/node_modules/@tablecraft/table/src";
```

The path is **relative to your CSS file**, not the project root. For example:

| CSS file location        | `@source` path                                           |
| ------------------------ | -------------------------------------------------------- |
| `src/index.css`          | `@source "../node_modules/@tablecraft/table/src";`       |
| `src/styles/global.css`  | `@source "../../node_modules/@tablecraft/table/src";`    |
| `apps/web/src/index.css` | `@source "../../../node_modules/@tablecraft/table/src";` |

> **Tip:** Count the directories between your CSS file and the project root's `node_modules/`. Each level up is one `../`.

### Full example

```css
@import "tailwindcss";
@import "@tablecraft/table/styles.css";
@import "tw-animate-css";

@source "../../../node_modules/@tablecraft/table/src";
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
import { DataTable, useTablecraftAdapter } from "@tablecraft/table";
import { client } from "./client";

function UsersPage() {
  const adapter = useTablecraftAdapter({
    client,
    table: "users",
  });

  return (
    <DataTable
      adapter={adapter}
      columns={[
        { id: "name", header: "Name", sortable: true, searchable: true },
        { id: "email", header: "Email", sortable: true },
        { id: "status", header: "Status", filterable: true },
        { id: "createdAt", header: "Created", sortable: true },
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
import { DataTable, useStaticAdapter } from "@tablecraft/table";

function UsersTable({ users }: { users: User[] }) {
  const adapter = useStaticAdapter({
    data: users,
    pageSize: 25,
  });

  return (
    <DataTable
      adapter={adapter}
      columns={[
        { id: "name", header: "Name" },
        { id: "email", header: "Email" },
        { id: "status", header: "Status", filterable: true },
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
import { renderers } from "@tablecraft/table";

const columns = [
  { id: "name", header: "Name", cell: renderers.text() },
  { id: "avatar", header: "Avatar", cell: renderers.image() },
  { id: "email", header: "Email", cell: renderers.link({ href: (row) => `mailto:${row.email}` }) },
  { id: "status", header: "Status", cell: renderers.badge({ variants: { active: "success" } }) },
  { id: "progress", header: "Progress", cell: renderers.progress() },
  { id: "createdAt", header: "Created", cell: renderers.date({ format: "MMM d, yyyy" }) },
  { id: "isActive", header: "Active", cell: renderers.boolean() },
];
```

## URL State Sync

Automatic URL synchronization for filters, sorting, and pagination:

```tsx
import { DataTable, useTablecraftAdapter, useUrlState } from "@tablecraft/table";

function UsersPage() {
  const urlState = useUrlState();
  const adapter = useTablecraftAdapter({
    client,
    table: "users",
    initialState: urlState,
  });

  return <DataTable adapter={adapter} />;
}
```

## Troubleshooting

### "Invalid hook call" Error (Duplicate React)

If you see this error:

```
Invalid hook call. Hooks can only be called inside of the body of a function component.
You might have more than one copy of React in the same app.
```

**Why it happens:** `@tablecraft/table` depends on packages like `@radix-ui/react-popover` which also depend on React. Some package managers may install a separate copy of React inside the package's own `node_modules`, causing two React instances to run at the same time — which breaks React hooks.

**Fix for Vite:**

```ts
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
```

**Fix for Webpack / Next.js:**

```js
// next.config.js or webpack.config.js
module.exports = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: require.resolve("react"),
      "react-dom": require.resolve("react-dom"),
    };
    return config;
  },
};
```

This forces your bundler to use a single copy of React across all dependencies.

## License

MIT
