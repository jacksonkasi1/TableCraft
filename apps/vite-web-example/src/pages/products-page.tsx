import { DataTable, createTableCraftAdapter } from '@tablecraft/table';
import { CalendarDatePicker } from '@/components/calendar-date-picker';

/**
 * Products Page - Demonstrates TableCraft integration
 *
 * This page showcases:
 * - Native TableCraft adapter connecting to Hono backend
 * - Auto-generated columns from backend metadata
 * - Server-side filtering, sorting, and pagination
 * - URL state synchronization for shareable links
 * - Custom date filter with CalendarDatePicker
 */
export function ProductsPage() {
  // Create adapter that connects to the Hono backend engine
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
        startToolbarContent={(ctx) => (
          <CalendarDatePicker
            date={{
              from: ctx.dateRange.from ? new Date(ctx.dateRange.from) : undefined,
              to: ctx.dateRange.to ? new Date(ctx.dateRange.to) : undefined,
            }}
            onDateSelect={(range) => {
              ctx.setDateRange({
                from: range.from?.toISOString() ?? "",
                to: range.to?.toISOString() ?? "",
              });
            }}
            className="w-fit cursor-pointer"
            variant="outline"
          />
        )}
        config={{
          enableSearch: true,
          enableExport: true,
          enableColumnResizing: true,

          enableDateFilter: false, // Disable built-in date filter since we're using custom
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
        }}
      />
    </div>
  );
}
