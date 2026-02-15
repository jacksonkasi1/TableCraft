import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

/**
 * Products Page - Demonstrates TableCraft integration
 *
 * This page showcases:
 * - Native TableCraft adapter connecting to Hono backend
 * - Auto-generated columns from backend metadata
 * - Server-side filtering, sorting, and pagination
 * - URL state synchronization for shareable links
 * - Date filter auto-hidden when table has no date columns (metadata-driven)
 */
export function ProductsPage() {
  const adapter = createTableCraftAdapter({
    baseUrl: '/api/engine',
    table: 'products',
  });

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your product catalog with powerful filtering and search
        </p>
      </div>

      <DataTable
        adapter={adapter}
        config={{
          enableSearch: true,
          enableExport: true,
          enableColumnResizing: true,
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
        }}
      />
    </div>
  );
}
