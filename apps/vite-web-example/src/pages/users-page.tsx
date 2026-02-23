// ** import core packages
import { useMemo } from 'react';

// ** import table
import { DataTable, hiddenColumns, useUrlState } from '@tablecraft/table';

// ** import types
import type { UsersRow, UsersColumn } from '../generated';

// ** import generated adapter
import { createUsersAdapter } from '../generated';

// ** import ui
import { Checkbox } from '../components/ui/checkbox';

// ** import apis
import { API_BASE_URL } from '../api';

export function UsersPage() {
  // useUrlState keeps activeOnly in sync with the URL automatically
  const [activeOnly, setActiveOnly] = useUrlState<boolean>("active_only", false);

  const adapter = useMemo(() => createUsersAdapter({
    baseUrl: API_BASE_URL,
    customFilters: {
      // Falsy values are omitted from the request automatically — no manual cleanup needed
      isActive: activeOnly || null,
    },
  }), [activeOnly]);

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>

      <DataTable<UsersRow>
        adapter={adapter}
        hiddenColumns={hiddenColumns<UsersColumn>(['id', 'createdAt'])}
        startToolbarContent={
          <div className="flex items-center space-x-2 mr-2">
            <Checkbox
              checked={activeOnly}
              onCheckedChange={(checked) => setActiveOnly(!!checked)}
              id="active-only"
            />
            <label htmlFor="active-only" className="text-sm font-medium cursor-pointer">
              Active users only
            </label>
          </div>
        }
        config={{
          enableSearch: true,
          enableExport: true,
          enableColumnResizing: true,
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
          enableUrlState: true,
        }}
      />
    </div>
  );
}
