// ** import core packages
import { useMemo } from 'react';

// ** import table
import { DataTable, hiddenColumns, useUrlState } from '@tablecraft/table';

// ** import types
import type { OrdersColumn, OrdersRow } from '../generated';

// ** import generated adapter
import { createOrdersAdapter } from '../generated';

// ** import ui
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

// ** import shared
import { ALL, STATUS_OPTIONS, ROLE_OPTIONS, columnOverrides } from './shared/orders-shared';
import { useDebouncedUrlNumber } from '../hooks/useDebouncedUrlNumber';

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Orders2Page() {
  // ── URL-synced filter state ──────────────────────────────────────────────
  const [status, setStatus]               = useUrlState<string>('status', '');
  const [role, setRole]                   = useUrlState<string>('role', '');
  const [minTotal, localTotal, setLocalTotal] = useDebouncedUrlNumber('min_total');
  const [includeDeleted, setIncludeDeleted] = useUrlState<boolean>('deleted', false);

  // ── Adapter ──────────────────────────────────────────────────────────────
  const adapter = useMemo(() => createOrdersAdapter({
    baseUrl: '/api/engine',
    customFilters: {
      // Falsy / zero values are automatically omitted from requests
      status:    status    || null,
      role:      role      || null,
      total:     minTotal  ? { operator: 'gte', value: minTotal } : null,
      deletedAt: includeDeleted ? { operator: 'isNotNull' } : null,
    },
  }), [status, role, minTotal, includeDeleted]);

  // ── Toolbar filters ───────────────────────────────────────────────────────
  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status */}
      <Select
        value={status || ALL}
        onValueChange={(v) => setStatus(v === ALL ? '' : v)}
      >
        <SelectTrigger className="h-8 w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Role */}
      <Select
        value={role || ALL}
        onValueChange={(v) => setRole(v === ALL ? '' : v)}
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Min total */}
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <input
          type="number"
          min={0}
          placeholder="Min total"
          value={localTotal}
          onChange={(e) => setLocalTotal(e.target.value)}
          className="h-8 w-[120px] rounded-md border border-input bg-background pl-6 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Include deleted */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          checked={includeDeleted}
          onCheckedChange={(checked) => setIncludeDeleted(!!checked)}
        />
        <span className="text-sm">Include deleted</span>
      </label>
    </div>
  );

  return (
    <div className="p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Orders — Advanced Filters</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Status · Role · Min total · Include deleted — all synced to URL via <code>useUrlState</code>
        </p>
      </div>

      <DataTable<OrdersRow>
        adapter={adapter}
        columnOverrides={columnOverrides}
        hiddenColumns={hiddenColumns<OrdersColumn>(['tenantId', 'userId', 'deletedAt'])}
        startToolbarContent={filters}
        startToolbarPlacement="after-search"
        config={{
          enableSearch: true,
          enableExport: true,
          enableColumnResizing: true,
          enableUrlState: true,
          defaultPageSize: 10,
          pageSizeOptions: [5, 10, 20, 50],
          columnResizingTableId: 'orders2',
          size: 'sm',
        }}
      />
    </div>
  );
}
