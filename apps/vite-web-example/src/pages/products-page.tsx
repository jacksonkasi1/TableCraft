import { useMemo } from 'react';
import { DataTable, createTableCraftAdapter, hiddenColumns, defineColumnOverrides } from '@tablecraft/table';
import type { ProductsRow, ProductsColumn } from '../generated';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';

export function ProductsPage() {
  const adapter = useMemo(() => createTableCraftAdapter<ProductsRow>({
    baseUrl: '/api/engine',
    table: 'products',
  }), []);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Products</h1>
      
      <DataTable<ProductsRow>
        adapter={adapter}
        hiddenColumns={hiddenColumns<ProductsColumn>(['id', 'tenantId', 'metadata'])}
        config={{
          enableSearch: true,
          enableExport: true,
          enableColumnResizing: true,
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
        }}
        columnOverrides={defineColumnOverrides<ProductsRow>()({
          price: ({ value }) => (
            <span className="font-mono font-semibold text-emerald-500">
              ${value.toFixed(2)}
            </span>
          ),
          isArchived: ({ value }) => (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${value
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}
            >
              {value ? 'Archived' : 'Active'}
            </span>
          ),
        })}
        actions={({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <span className="sr-only">More options</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(row.id))}>
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit product</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
    </div>
  );
}
