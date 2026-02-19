import { DataTable } from '@tablecraft/table';
import { createOrdersAdapter, type OrdersRow } from '../generated';

export function OrdersPage() {
  const adapter = createOrdersAdapter({
    baseUrl: '/api/engine',
  });

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      
      <DataTable<OrdersRow>
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
