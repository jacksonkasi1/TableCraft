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
