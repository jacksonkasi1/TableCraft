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
npx @tablecraft/codegen --url http://localhost:5000/engine --out ./src/generated
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
