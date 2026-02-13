import { DataTable, createTableCraftAdapter } from '@tablecraft/table';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { useState, useCallback } from 'react';

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

  // Date range state for the calendar picker
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const handleDateSelect = useCallback((range: { from: Date; to: Date }) => {
    setDateRange(range);
    // Here you would typically update the table's date filter
    // This would be passed to the adapter or table state
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your product catalog with powerful filtering and search
        </p>
      </div>

      {/* Custom toolbar with date picker */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarDatePicker
          date={{
            from: dateRange.from,
            to: dateRange.to,
          }}
          onDateSelect={handleDateSelect}
          className="w-fit cursor-pointer"
          variant="outline"
        />
      </div>

      <DataTable
        adapter={adapter}
        config={{
          enableSearch: true,
          enableExport: true,
          enableColumnResizing: true,
          enableMultiSort: false,
          enableDateFilter: false, // Disable built-in date filter since we're using custom
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
        }}
      />
    </div>
  );
}
