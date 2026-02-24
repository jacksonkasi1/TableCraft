# Export Configuration

TableCraft's `<DataTable>` includes a built-in export system that lets users download table data as **CSV** or **Excel (XLSX)** files. The `exportConfig` prop gives you full control over what gets exported and how.

## Quick Start

```tsx
import { DataTable, defineExportConfig } from '@tablecraft/table';
import type { OrdersRow } from './generated/orders';

const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
});

<DataTable<OrdersRow>
  adapter={adapter}
  config={{ enableExport: true }}
  exportConfig={exportConfig}
/>
```

All visible columns are exported with their raw values by default.

---

## Excluding Columns (`removeHeaders`)

Use `removeHeaders` to hide specific columns from the export. All other visible columns are included automatically.

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  removeHeaders: ['deletedAt', 'tenantId'],
  // everything else is exported
});
```

> **Why `removeHeaders`?** If you have 20 columns and only want to hide 2, it's much simpler to list the 2 to exclude than the 18 to include.

---

## Renaming Columns (`columnMapping`)

Rename column headers in the export without affecting the UI. Works independently from `removeHeaders`.

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  removeHeaders: ['deletedAt'],
  columnMapping: {
    createdAt: 'Order Date',
    vatAmount: 'VAT (₹)',
    email: 'Customer Email',
  },
});
```

| In UI | In Export File |
|-------|---------------|
| `createdAt` | Order Date |
| `vatAmount` | VAT (₹) |
| `email` | Customer Email |
| `status` | status (unchanged) |

---

## Transforming Values (`transformFunction`)

Format values before they're written to the file:

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  columnMapping: { createdAt: 'Order Date' },
  transformFunction: (row) => ({
    ...row,
    createdAt: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString('en-IN')
      : '',
    total: `₹${Number(row.total).toFixed(2)}`,
  }),
});
```

> Custom column renderers (JSX from `columnOverrides`) are **not** exported. Use `transformFunction` for custom text in the exported file.

---

## CSV / Excel Toggle

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  enableCsv: true,    // default: true
  enableExcel: false,  // disable Excel
});
```

---

## Column Widths (Excel Only)

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  removeHeaders: ['deletedAt'],
  columnWidths: [
    { wch: 8 },   // first column — narrow
    { wch: 30 },  // second column — wide
    { wch: 12 },  // third column — medium
  ],
});
```

---

## Cross-Page Export

When users select rows across multiple pages:
- **Same-page selections** — uses in-memory data (no API call)
- **Cross-page selections** — fetches selected IDs from backend via `queryByIds`

This is automatic — no extra config needed.

---

## Type-Safe Helper: `defineExportConfig<T>()`

For configs defined outside JSX, use the helper for autocomplete:

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  removeHeaders: ['deletedAt'],      // ← autocomplete works
  columnMapping: { email: 'Email' }, // ← autocomplete works
});
```

Inline usage within `<DataTable<OrdersRow>>` is also type-safe — no helper needed.

---

## Full Example

```tsx
import { DataTable, defaultColumnOrder, defineExportConfig } from '@tablecraft/table';
import { createOrdersAdapter, type OrdersRow } from './generated/orders';
import type { OrdersColumn } from './generated/orders';

const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  removeHeaders: ['deletedAt', 'tenantId'],
  columnMapping: {
    createdAt: 'Order Date',
    vatAmount: 'VAT Amount',
    itemCount: 'Items',
  },
  transformFunction: (row) => ({
    ...row,
    createdAt: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString('en-IN')
      : '',
    total: `₹${Number(row.total).toFixed(2)}`,
  }),
});

export function OrdersPage() {
  const adapter = createOrdersAdapter({ baseUrl: '/api/engine' });

  return (
    <DataTable<OrdersRow>
      adapter={adapter}
      config={{ enableExport: true }}
      exportConfig={exportConfig}
      defaultColumnOrder={defaultColumnOrder<OrdersColumn>([
        'id', 'status', 'email', 'total', 'vatAmount', 'itemCount', 'createdAt',
      ])}
    />
  );
}
```
