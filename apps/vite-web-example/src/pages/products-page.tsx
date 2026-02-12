import { DataTable } from '@tablecraft/table';
import { createTableCraftAdapter } from '@tablecraft/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Products Page - Demonstrates TableCraft integration
 * 
 * This page showcases:
 * - Native TableCraft adapter connecting to Hono backend
 * - Auto-generated columns from backend metadata
 * - Server-side filtering, sorting, and pagination
 * - URL state synchronization for shareable links
 */
export function ProductsPage() {
  // Create adapter that connects to the Hono backend engine
  const adapter = createTableCraftAdapter({
    baseUrl: '/api/engine',
    table: 'products',
  });

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your product catalog with powerful filtering and search
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            Browse and filter products. All operations are server-side powered by TableCraft Engine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            adapter={adapter}
            config={{
              enableSearch: true,
              enableFilters: true,
              enableExport: true,
              enableColumnResizing: true,
              enableMultiSort: false,
              defaultPageSize: 10,
              pageSizeOptions: [5, 10, 20, 50],
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About This Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">🔌 Native Integration</h3>
            <p className="text-sm text-muted-foreground">
              The table connects directly to the Hono backend using the TableCraft adapter. 
              No custom API code needed - just point to your endpoint.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">🎨 Auto-Generated UI</h3>
            <p className="text-sm text-muted-foreground">
              Columns, filters, and cell renderers are automatically generated from backend metadata.
              The table fetches schema information from <code>/api/engine/products/_meta</code>.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">⚡ Server-Side Everything</h3>
            <p className="text-sm text-muted-foreground">
              Filtering, sorting, searching, and pagination all happen on the server. 
              Only the current page of data is transferred.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">🔗 URL State</h3>
            <p className="text-sm text-muted-foreground">
              All table state is synced to the URL, making every view shareable. 
              Try filtering and share the URL!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}