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
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

// ** import apis
import { API_BASE_URL } from '../api';

// ** import shared
import { ALL, STATUS_OPTIONS, ROLE_OPTIONS, columnOverrides } from './shared/orders-shared';
import { useDebouncedUrlNumber } from '../hooks/useDebouncedUrlNumber';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_OPERATOR_OPTIONS = [
  { value: 'gte', label: 'Min ≥', short: 'Min' },
  { value: 'gt', label: 'Above >', short: '>' },
  { value: 'lte', label: 'Max ≤', short: 'Max' },
  { value: 'lt', label: 'Below <', short: '<' },
] as const;

type TotalOperator = typeof TOTAL_OPERATOR_OPTIONS[number]['value'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseStatusArray(urlValue: string): string[] {
  if (!urlValue) return [];
  // Filter out '__all__' sentinel value (should not be sent to API)
  return urlValue.split(',').filter(s => s && s !== ALL);
}

function stringifyStatusArray(values: string[]): string {
  return values.join(',');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Orders3Page() {
  // ── URL-synced filter state ──────────────────────────────────────────────
  const [statusStr, setStatusStr] = useUrlState<string>('status', '');
  const [rawRole, setRawRole] = useUrlState<string>('role', '');
  const [totalOp, setTotalOp] = useUrlState<TotalOperator>('total_op', 'gte');
  const [totalValue, localTotal, setLocalTotal] = useDebouncedUrlNumber('total');
  const [includeDeleted, setIncludeDeleted] = useUrlState<boolean>('deleted', false);

  // Normalize '__all__' (from URL or manual entry) to empty string
  const role = rawRole === ALL ? '' : rawRole;
  const setRole = (v: string) => setRawRole(v === ALL ? '' : v);

  // Parse status as array (used by both the adapter memo and the UI below)
  const selectedStatuses = parseStatusArray(statusStr);

  // ── Adapter ──────────────────────────────────────────────────────────────
  const adapter = useMemo(() => {
    const statuses = parseStatusArray(statusStr);
    return createOrdersAdapter({
      baseUrl: API_BASE_URL,
      customFilters: {
        status: statuses.length > 0
          ? { operator: 'in', value: statuses }
          : null,
        role: role || null,
        total: totalValue > 0
          ? { operator: totalOp, value: totalValue }
          : null,
        deletedAt: includeDeleted ? { operator: 'isNotNull' } : null,
      },
    });
  }, [statusStr, role, totalOp, totalValue, includeDeleted]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleStatus = (value: string, checked: boolean) => {
    const newValues = checked
      ? [...selectedStatuses, value]
      : selectedStatuses.filter(s => s !== value);
    setStatusStr(stringifyStatusArray(newValues));
  };

  const clearStatuses = () => {
    setStatusStr('');
  };

  const totalOpLabel = TOTAL_OPERATOR_OPTIONS.find(o => o.value === totalOp)?.short ?? 'Min';

  // ── Toolbar filters ───────────────────────────────────────────────────────
  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 min-w-[140px] justify-between">
            {selectedStatuses.length === 0
              ? 'All statuses'
              : selectedStatuses.length === 1
                ? STATUS_OPTIONS.find(o => o.value === selectedStatuses[0])?.label
                : `${selectedStatuses.length} statuses`}
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={selectedStatuses.includes(opt.value)}
              onCheckedChange={(checked) => toggleStatus(opt.value, checked)}
              onSelect={(e) => e.preventDefault()}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
          {selectedStatuses.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={clearStatuses}
                >
                  Clear selection
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role single-select */}
      <Select value={role || ALL} onValueChange={setRole}>
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

      {/* Total with operator selector */}
      <div className="flex items-center">
        <Select value={totalOp} onValueChange={(v) => setTotalOp(v as TotalOperator)}>
          <SelectTrigger className="h-8 w-[80px] rounded-r-none border-r-0 focus:z-10">
            <SelectValue>{totalOpLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TOTAL_OPERATOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>
          <input
            type="number"
            min={0}
            placeholder="Amount"
            value={localTotal}
            onChange={(e) => setLocalTotal(e.target.value)}
            className="h-8 w-[110px] rounded-l-none rounded-r-md border border-input bg-background pl-6 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
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
        <h1 className="text-2xl font-bold">Orders — Complex Filters</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-select status · Operator selector for total · Role · Include deleted — all synced to URL via <code>useUrlState</code>
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
          columnResizingTableId: 'orders3',
          size: 'sm',
        }}
      />
    </div>
  );
}
