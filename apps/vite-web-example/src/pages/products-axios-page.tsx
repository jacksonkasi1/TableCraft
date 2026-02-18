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
import { axiosInstance } from '@/lib/api-client-axios';

export function ProductsAxiosPage() {
  const adapter = useMemo(() => createTableCraftAdapter<ProductsRow>({
    baseUrl: '/api/engine',
    table: 'products',
    axios: axiosInstance, // Pass axios instance directly!
  }), []);

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Products (Axios)</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            Axios Client
          </span>
        </div>
        <p className="text-muted-foreground">
          This page uses an Axios instance with interceptors for authentication and logging
        </p>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="font-medium mb-2">How it works:</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Created an Axios instance with request/response interceptors</li>
          <li>Passed it to <code className="bg-muted px-1 rounded">createTableCraftAdapter(&#123; axios: axiosInstance &#125;)</code></li>
          <li>Interceptors handle auth tokens, logging, and error handling</li>
          <li>Open browser console to see request logs in dev mode</li>
        </ul>
      </div>

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
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(String(row.id))}
              >
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
    </div>
  );
}
