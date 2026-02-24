import { DataTable, defaultColumnOrder, defineExportConfig } from '@tablecraft/table';
import { createOrdersAdapter, type OrdersRow } from '../generated';
import type { OrdersColumn } from '../generated';

// ** import apis
import { API_BASE_URL } from '../api';

// ** Type-safe export config — only valid column names are accepted
const exportConfig = defineExportConfig<OrdersRow>()({
  entityName: 'orders',
  headers: ['id', 'status', 'email', 'total', 'vatAmount', 'itemCount', 'createdAt'],
  columnMapping: {
    createdAt: 'Order Date',
    vatAmount: 'VAT Amount',
    itemCount: 'Items',
  },
  transformFunction: (row) => ({
    ...row,
    createdAt: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString('en-IN')
      : '',
    total: `₹${Number(row.total).toFixed(2)}`,
  }),
});

export function OrdersPage() {
  const adapter = createOrdersAdapter({
    baseUrl: API_BASE_URL,
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
        exportConfig={exportConfig}
        defaultColumnOrder={defaultColumnOrder<OrdersColumn>([
          'id',
          'status',
          'statusLabel',
          'email',
          'total',
          'vatAmount',
          'itemCount',
          'role',
          'userId',
          'createdAt',
          'tenantId',
          'deletedAt',
        ])}
      />
    </div>
  );
}
