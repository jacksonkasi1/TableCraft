import { DataTable, createTableCraftAdapter, hiddenColumns } from '@tablecraft/table';
import type { UsersRow, UsersColumn } from '../generated';

export function UsersPage() {
  const adapter = createTableCraftAdapter<UsersRow>({
    baseUrl: '/api/engine',
    table: 'users',
  });

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      
      <DataTable<UsersRow>
        adapter={adapter}
        hiddenColumns={hiddenColumns<UsersColumn>(['id', 'createdAt'])}
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
