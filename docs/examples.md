# Examples

## 1. Quick Start: Products Table

The simplest TableCraft setup:

{% tabs %}
{% tab title="Backend" %}
```typescript
import { defineTable } from '@tablecraft/engine';
import { products } from '../db/schema';

export const productsConfig = defineTable(products)
  .name('products')
  .search('name')
  .sort('-createdAt')
  .pageSize(20)
  .toConfig();
```
{% endtab %}

{% tab title="Frontend" %}
```tsx
import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

function ProductsPage() {
  const adapter = createTableCraftAdapter({
    baseUrl: '/api/engine',
    table: 'products',
  });
  
  return <DataTable adapter={adapter} />;
}
```
{% endtab %}
{% endtabs %}

## 2. Type-Safe with Codegen

Generate types for full type safety:

```bash
npx @tablecraft/codegen --url http://localhost:3000/api/engine --out ./src/generated
```

```tsx
import { DataTable } from '@tablecraft/table';
import { createProductsAdapter, type ProductsRow } from '../generated';

function ProductsPage() {
  const adapter = createProductsAdapter({ baseUrl: '/api/engine' });
  
  return <DataTable<ProductsRow> adapter={adapter} />;
}
```

## 3. The "Kitchen Sink" User Table

A comprehensive user configuration with security, search, and transforms.

```typescript
export const users = defineTable(schema.users)
  .as('users')
  // Security
  .autoHide() // Hides password, salt, etc.
  .hide('tenantId', 'internalFlags')
  .access({ roles: ['admin'] })
  
  // UX
  .search('email', 'firstName', 'lastName')
  .sort('-createdAt')
  .pageSize(20)
  
  // Data Shaping
  .computed('fullName', concat(schema.users.firstName, ' ', schema.users.lastName))
  .transform('email', (email) => email.toLowerCase())
  
  // Logic
  .tenant() // Filter by tenantId
  .softDelete(); // Filter deleted users
```

## 4. Analytics Report (Group By)

Get total sales grouped by product category.

```typescript
export const salesReport = defineTable(schema.orders)
  .as('sales-report')
  // We only want the report, not individual rows
  .groupBy('category')
  .aggregate('totalRevenue', 'sum', 'total')
  .aggregate('orderCount', 'count', 'id')
  
  // Filter out cancelled orders before grouping
  .staticFilter('status', 'neq', 'cancelled')
  
  // Sort by revenue
  .sort('-totalRevenue');
```

## 5. Nested E-commerce Fetch

Fetch Orders with their Line Items and the associated Product details.

```typescript
export const orderDetails = defineTable(schema.orders)
  .include(schema.orderItems, {
    foreignKey: 'orderId',
    as: 'items',
    // Nested include: Get product for each item
    include: [{
      table: 'products',
      foreignKey: 'id', // product.id
      localKey: 'productId', // item.productId
      as: 'product',
      columns: ['name', 'sku', 'price']
    }]
  });
```

## 6. Recursive Category Tree

Fetch a category tree (Electronics -> Computers -> Laptops).

```typescript
export const categoryTree = defineTable(schema.categories)
  .recursive({
    parentKey: 'parentId',
    childKey: 'id',
    maxDepth: 5,
    // Start from root categories
    startWith: { field: 'parentId', op: 'isNull', value: null }
  });
```

## 7. Date Filtering with Custom Column

Specify which date column to use for the global date picker:

```typescript
export const orders = defineTable(schema.orders)
  .name('orders')
  .dateRange('shippedAt') // Use shippedAt instead of createdAt
  .filter('status', 'total')
  .toConfig();
```

## 8. Disable Date Filter

Tables without date columns won't show date picker, but you can also disable explicitly:

```typescript
// No date picker shown (no date columns)
export const categories = defineTable(schema.categories)
  .name('categories')
  .toConfig();

// Explicitly disable
export const tags = defineTable(schema.tags)
  .name('tags')
  .dateRange(false)
  .toConfig();
```

## 9. Custom Toolbar

Add custom content to the DataTable toolbar:

```tsx
<DataTable
  adapter={adapter}
  startToolbarContent={({ selectedRows, clearSelection }) => (
    selectedRows.length > 0 && (
      <button onClick={clearSelection}>
        Clear {selectedRows.length} selected
      </button>
    )
  )}
/>
```

## 10. Conditional Column Visibility

Hide columns based on user role:

```typescript
export const users = defineTable(schema.users)
  .hide('salary', 'performanceRating') // Hidden for all
  .column('ssn', { 
    hidden: true, 
    access: { roles: ['admin', 'hr'] } // Only for admin/hr
  })
  .toConfig();
```

## 11. Custom Column Rendering (Column Overrides)

Customize how column values are displayed in the table using `columnOverrides`. This allows you to transform data presentation without modifying the backend.

```tsx
import { DataTable, createTableCraftAdapter, defineColumnOverrides, hiddenColumns } from '@tablecraft/table';
import type { ProductsRow, ProductsColumn } from '../generated';

function ProductsPage() {
  const adapter = createTableCraftAdapter<ProductsRow>({
    baseUrl: '/api/engine',
    table: 'products',
  });

  return (
    <DataTable<ProductsRow>
      adapter={adapter}
      hiddenColumns={hiddenColumns<ProductsColumn>(['id', 'tenantId', 'metadata'])}
      columnOverrides={defineColumnOverrides<ProductsRow>()({
        // Format price as currency
        price: ({ value }) => (
          <span className="font-mono font-semibold text-emerald-500">
            ${value.toFixed(2)}
          </span>
        ),
        // Display status as a badge
        isArchived: ({ value }) => (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            value 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            {value ? 'Archived' : 'Active'}
          </span>
        ),
      })}
    />
  );
}
```

{% hint style="info" %}
`columnOverrides` receives an object with `value`, `row`, and `table` for maximum flexibility.
{% endhint %}

## 12. Row Actions

Add row-level actions (Edit, Delete, etc.) using the `actions` prop. This renders an action menu for each row.

```tsx
import { DataTable, createTableCraftAdapter } from '@tablecraft/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';

function ProductsPage() {
  const adapter = createTableCraftAdapter({ baseUrl: '/api/engine', table: 'products' });

  return (
    <DataTable
      adapter={adapter}
      actions={({ row, table }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(row.id))}>
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit product</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => console.log('Delete', row.name)}
            >
              Delete product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  );
}
```

{% hint style="info" %}
The `actions` callback receives `{ row, table }` where `row` is the current row data and `table` provides utilities like `table.totalSelected` for bulk operations.
{% endhint %}
