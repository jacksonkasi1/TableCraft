import { DataTable } from '@tablecraft/table';
import { createTableCraftAdapter } from '@tablecraft/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="container mx-auto py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Track and manage customer orders with real-time filtering
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>
            View all orders with automatic status tracking and filtering.
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
              defaultPageSize: 10,
              pageSizeOptions: [5, 10, 20, 50],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}