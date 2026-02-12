import { DataTable } from '@tablecraft/table';
import { createTableCraftAdapter } from '@tablecraft/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Users Page - Demonstrates user management with TableCraft
 */
export function UsersPage() {
  const adapter = createTableCraftAdapter({
    baseUrl: '/api/engine',
    table: 'users',
  });

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and filter users with role-based access control.
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