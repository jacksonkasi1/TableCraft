# Examples

## 1. The "Kitchen Sink" User Table

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

## 2. Analytics Report (Group By)

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

## 3. Nested E-commerce Fetch

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

## 4. Recursive Category Tree

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
