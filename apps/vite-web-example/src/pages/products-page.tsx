import { DataTable, createTableCraftAdapter, hiddenColumns } from '@tablecraft/table';
import type { ProductsRow, ProductsColumn } from '../generated';

export function ProductsPage() {
  const adapter = createTableCraftAdapter<ProductsRow>({
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
      />
    </div>
  );
}
