import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

/**
 * Orders Page - Demonstrates TableCraft with relationships
 *
 * This page showcases:
 * - TableCraft adapter with related data (joins)
 * - Custom column configurations
 * - Badge rendering for status
 */
export function OrdersPage() {
  const adapter = createTableCraftAdapter({
    baseUrl: '/api/engine',
    table: 'orders',
  });

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Track and manage customer orders with real-time filtering
        </p>
      </div>

      <DataTable
        adapter={adapter}
        config={{
          enableSearch: true,
          enableFilters: true,
          enableExport: true,
          enableColumnResizing: true,
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
        }}
      />
    </div>
  );
}
