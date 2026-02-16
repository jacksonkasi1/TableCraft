# Date Filtering

TableCraft provides powerful date filtering capabilities that work automatically with your database schema.

## Automatic Date Detection

When you define a table with date columns, TableCraft automatically:

1.  Detects date columns from your schema
2.  Sets `dateRangeColumn` in metadata (prefers `createdAt` if present)
3.  Enables the date filter in the frontend DataTable

### Example: Table with Date Columns

```typescript
// Backend config
defineTable(orders)
  .name('orders')
  .columns(
    col('id', 'number'),
    col('status', 'string'),
    col('createdAt', 'date'),    // Auto-detected
    col('shippedAt', 'date'),     // Also detected
  );
```

{% hint style="info" %}
**Generated Metadata:**
```json
{
  "name": "orders",
  "dateRangeColumn": "createdAt",
  "dateColumns": ["createdAt", "shippedAt"],
  "filters": [
    {
      "field": "createdAt",
      "type": "date",
      "operators": ["eq", "neq", "gt", "gte", "lt", "lte", "between"]
    }
  ]
}
```
{% endhint %}

## Date Range Column

The `dateRangeColumn` determines which column the global date picker filters by default.

### Auto-Detection Priority
1.  Explicit `dateRangeColumn` in config
2.  Column named `createdAt` or `created_at`
3.  First column with `type: 'date'`

### Manual Configuration

```typescript
// Use a specific date column
defineTable(orders)
  .name('orders')
  .dateRange('shippedAt');  // Use shippedAt for global filter

// Disable global date filter
defineTable(products)
  .name('products')
  .dateRange(false);  // No date filter shown
```

## Frontend Usage

{% tabs %}
{% tab title="Auto Filter" %}
The DataTable automatically shows a date picker when `dateRangeColumn` is set:

```tsx
import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

function OrdersPage() {
  const adapter = createTableCraftAdapter({
    baseUrl: '/api/engine',
    table: 'orders',  // Has dateRangeColumn
  });

  return <DataTable adapter={adapter} />;
  // Date picker automatically shown
}
```
{% endtab %}

{% tab title="No Filter" %}
When a table has no date columns, no date picker is shown:

```tsx
function ProductsPage() {
  const adapter = createTableCraftAdapter({
    baseUrl: '/api/engine',
    table: 'products',  // No dateRangeColumn
  });

  return <DataTable adapter={adapter} />;
  // No date picker shown
}
```
{% endtab %}

{% tab title="Explicitly Disabled" %}
```tsx
<DataTable 
  adapter={adapter}
  config={{ enableDateFilter: false }}
/>
```
{% endtab %}
{% endtabs %}

## Date Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal to | Same day |
| `neq` | Not equal to | Different day |
| `gt` | Greater than | After date |
| `gte` | Greater than or equal | On or after date |
| `lt` | Less than | Before date |
| `lte` | Less than or equal | On or before date |
| `between` | Between two dates | Date range |

## API Usage

### Query with Date Filter

```bash
# Filter orders after a specific date
GET /engine/orders?filter[createdAt][gte]=2024-01-01T00:00:00Z

# Filter orders between dates
GET /engine/orders?filter[createdAt][between]=2024-01-01,2024-12-31
```

### Multiple Date Columns

Filter on any date column explicitly:

```bash
# Filter by shippedAt instead of createdAt
GET /engine/orders?filter[shippedAt][gte]=2024-01-01T00:00:00Z
```

## Date Picker Component

The frontend uses a full-featured calendar date picker with:

*   Date range selection
*   Quick presets (Today, This Week, This Month, etc.)
*   Month/Year dropdown navigation
*   Scroll wheel date adjustment

## Handling Unknown Date Filters

If a date filter is sent for a non-existent column, TableCraft gracefully ignores it instead of throwing an error.

{% hint style="warning" %}
This ensures frontend caching doesn't cause errors and generic components work across all tables.
{% endhint %}

## TypeScript Support

Generated types include date columns automatically serialized as ISO strings.

```typescript
export interface OrdersRow extends Record<string, unknown> {
  id: number;
  status: string;
  createdAt: string | null;  // ISO string in TypeScript
  shippedAt: string | null;
}
```
