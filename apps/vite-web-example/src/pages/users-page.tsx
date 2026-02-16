import { DataTable, createTableCraftAdapter, hiddenColumns } from '@tablecraft/table';
import type { UsersRow, UsersColumn } from '../generated';

export function UsersPage() {
  const adapter = createTableCraftAdapter<UsersRow>({
    baseUrl: '/api/engine',
    table: 'users',
  });

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

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
