# Export Configuration

TableCraft's `<DataTable>` includes a built-in export system that lets users download table data as **CSV** or **Excel (XLSX)** files. The `exportConfig` prop gives you full control over what gets exported and how.

> All `exportConfig` fields are **fully type-safe** — `headers` and `columnMapping` only accept valid column names from your row type.

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

This enables export with default settings — all visible columns are exported with their raw values.

---

## Controlling Exported Columns (`headers`)

Use `headers` to explicitly list which columns appear in the export. Columns not listed are excluded, even if visible in the UI.

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  headers: ['id', 'status', 'email', 'total', 'createdAt'],
  // tenantId, userId, deletedAt etc. are excluded from export
});
```

> **Type Safety**: If you type `headers: ['s']`, TypeScript will error — only valid column names from `OrdersRow` are accepted.

If `headers` is omitted, all visible columns are exported in their current display order.

---

## Renaming Columns in Export (`columnMapping`)

Use `columnMapping` to change column header names in the exported file without affecting the UI:

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  headers: ['id', 'status', 'email', 'total', 'vatAmount', 'createdAt'],
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

## Transforming Values for Export (`transformFunction`)

The `transformFunction` runs on every row **before** it's written to the file. Use it to:
- Convert booleans to human-readable text
- Format dates and currencies
- Add computed fields

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  headers: ['id', 'status', 'total', 'isActive', 'createdAt'],
  columnMapping: { isActive: 'Active?', createdAt: 'Order Date' },
  transformFunction: (row) => ({
    ...row,
    // Boolean → "Yes" / "No"
    isActive: row.isActive ? 'Yes' : 'No',
    // Format date
    createdAt: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString('en-IN')
      : '',
    // Format currency
    total: `₹${Number(row.total).toFixed(2)}`,
  }),
});
```

> **Important**: Custom column renderers (JSX from `columnOverrides`) are **not** exported. The export always works on raw data values. Use `transformFunction` if you need custom text representations in the exported file.

---

## Custom Columns in Export

The `transformFunction` can create entirely new computed fields. To include them in the export, list them in `headers` and set `allowExportNewColumns: true` in the table config:

```tsx
<DataTable<OrdersRow>
  adapter={adapter}
  config={{
    enableExport: true,
    allowExportNewColumns: true,  // Required for computed columns
  }}
  exportConfig={{
    entityName: 'orders',
    headers: ['id', 'status', 'total', 'discountedTotal'],
    columnMapping: { discountedTotal: 'Total After Discount' },
    transformFunction: (row) => ({
      ...row,
      discountedTotal: Number(row.total) * 0.9,  // New computed field
    }),
  }}
/>
```

---

## Toggling CSV / Excel

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  enableCsv: true,    // default: true
  enableExcel: false,  // disable Excel export
});
```

> **Note**: Excel export requires the `exceljs` package as an optional peer dependency. Install it with `npm install exceljs`.

---

## Column Widths (Excel Only)

Control column widths in the Excel export — matched by index with `headers`:

```tsx
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  headers: ['id', 'email', 'total'],
  columnWidths: [
    { wch: 8 },   // id — narrow
    { wch: 30 },  // email — wide
    { wch: 12 },  // total — medium
  ],
});
```

---

## Cross-Page Export

When users select rows across multiple pages and export, the table automatically:

1. **Same-page selections** — uses in-memory data instantly (no API call)
2. **Cross-page selections** — fetches all selected IDs from the backend via `queryByIds`, sorted in the same order as the current table view

This is handled automatically by the `DataTable` component — no extra configuration needed.

---

## Type-Safe Helper: `defineExportConfig<T>()`

For configs defined outside JSX (hoisted, shared, etc.), use the helper for full autocomplete:

```tsx
import { defineExportConfig } from '@tablecraft/table';
import type { OrdersRow } from './generated/orders';

// Full autocomplete on headers and columnMapping keys
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  headers: ['id', 'status', 'email'],
  columnMapping: { email: 'Customer Email' },
});
```

Inline usage within `<DataTable<OrdersRow>>` is also fully type-safe — no helper needed:

```tsx
<DataTable<OrdersRow>
  exportConfig={{
    entityName: 'orders',
    headers: ['id', 'status'],  // ✅ autocomplete works
  }}
/>
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Column visible in UI but not in `headers` | Excluded from export |
| Column in `headers` but hidden in UI | Included only if `allowExportNewColumns` is `true` |
| `transformFunction` adds a new field | Included only if listed in `headers` AND `allowExportNewColumns` is `true` |
| `columnOverrides` renders JSX (badges, icons) | JSX is **not** exported — raw data value is used |
| Null / undefined values | Exported as empty string `""` |
| Column has `columnMapping` but not in `headers` | Column is excluded entirely |
| No `headers` specified | All visible columns are exported in display order |
| `enableExport: false` in config | Export button is hidden entirely |

---

## Full Example

```tsx
import { DataTable, defaultColumnOrder, defineExportConfig } from '@tablecraft/table';
import { createOrdersAdapter, type OrdersRow } from './generated/orders';
import type { OrdersColumn } from './generated/orders';

const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  headers: ['id', 'status', 'email', 'total', 'vatAmount', 'itemCount', 'createdAt'],
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
      config={{
        enableSearch: true,
        enableExport: true,
        enableColumnResizing: true,
      }}
      exportConfig={exportConfig}
      defaultColumnOrder={defaultColumnOrder<OrdersColumn>([
        'id', 'status', 'email', 'total', 'vatAmount', 'itemCount', 'createdAt',
      ])}
    />
  );
}
```
