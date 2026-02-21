# Custom Filters

TableCraft's frontend adapter is built to support **bring-your-own-UI** for advanced filtering. Whether you are building multi-select dropdowns, range sliders, or simple toggle switches, you can easily wire them up to the table.

By passing a `customFilters` object to the `createTableCraftAdapter`, TableCraft will automatically merge your external filters with the table's internal state (search, sorting, pagination), serialize them, and send them to the API.

## 1. The Basics

When defining `customFilters`, the adapter automatically ignores falsy values (`null`, `undefined`, `false`). This means you don't need to write complex `if` statements to conditionally add filters—just pass the raw UI state directly. (Note: `0` and `""` are treated as valid values and will be sent to the API).

```tsx
import { useMemo, useState } from 'react';
import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

function BasicFiltersPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const adapter = useMemo(() => {
    return createTableCraftAdapter({
      baseUrl: '/api/engine',
      table: 'users',
      customFilters: {
        // If status is null (falsy), TableCraft ignores it
        status: status,
        role: role,
      },
    });
  }, [status, role]);

  return (
    <div>
      <select value={status ?? ''} onChange={(e) => setStatus(e.target.value || null)}>
        <option value="">All Statuses</option>
        <option value="active">Active</option>
      </select>
      
      <DataTable adapter={adapter} />
    </div>
  );
}
```

## 2. Advanced Operators

For more complex filters, you can explicitly define an `operator`. If you just pass a raw scalar (like `status: 'active'`), TableCraft assumes you want an exact match (`eq`).

But you can pass an object with `{ operator, value }` to use powerful backend operators like `in`, `gte`, `lte`, `isNotNull`, and more.

| UI Element | Operator | Example `customFilter` Value |
| :--- | :--- | :--- |
| Checkbox array / Multi-select | `in` | `{ operator: 'in', value: ['admin', 'member'] }` |
| "Min Amount" number input | `gte` | `{ operator: 'gte', value: 100 }` |
| "Max Amount" number input | `lte` | `{ operator: 'lte', value: 500 }` |
| "Include Deleted" checkbox | `isNotNull` | `{ operator: 'isNotNull' }` (no value needed) |

## 3. URL State Syncing

For the best user experience, filter state should be stored in the URL so users can refresh, share links, and use the browser's back/forward buttons.

TableCraft exports a framework-agnostic `useUrlState` hook that behaves exactly like React's `useState`, but it syncs the value to the URL search parameters (`?status=active`).

### Complex Example: Multi-select & URL Sync

Here is a comprehensive example combining `useUrlState`, multi-select arrays, and operator objects.

```tsx
import { useMemo } from 'react';
import { DataTable, useUrlState, createTableCraftAdapter } from '@tablecraft/table';

function ComplexFiltersPage() {
  // 1. URL-synced state hooks
  const [statusStr, setStatusStr] = useUrlState<string>('status', '');
  const [minTotal, setMinTotal] = useUrlState<number>('total_min', 0);
  const [includeDeleted, setIncludeDeleted] = useUrlState<boolean>('deleted', false);

  // Parse comma-separated URL string back into an array
  const selectedStatuses = statusStr ? statusStr.split(',') : [];

  // 2. Wire state to adapter
  const adapter = useMemo(() => {
    return createTableCraftAdapter({
      baseUrl: '/api/engine',
      table: 'orders',
      customFilters: {
        // Multi-select array mapped to 'in' operator
        status: selectedStatuses.length > 0 
          ? { operator: 'in', value: selectedStatuses } 
          : null,
          
        // Dynamic operator based on number input
        total: minTotal > 0 
          ? { operator: 'gte', value: minTotal } 
          : null,
          
        // Nullary operators take no value
        deletedAt: includeDeleted 
          ? { operator: 'isNotNull' } 
          : null,
      },
    });
  }, [statusStr, minTotal, includeDeleted]);

  // 3. Build UI controls
  const filters = (
    <div className="flex gap-4 mb-4">
      {/* Example Status Checkbox */}
      <label>
        <input 
          type="checkbox" 
          checked={selectedStatuses.includes('shipped')}
          onChange={(e) => {
             const newStatuses = e.target.checked 
               ? [...selectedStatuses, 'shipped']
               : selectedStatuses.filter(s => s !== 'shipped');
             setStatusStr(newStatuses.join(','));
          }} 
        />
        Shipped
      </label>

      {/* Example Min Total Input */}
      <input 
        type="number" 
        value={minTotal || ''} 
        onChange={(e) => setMinTotal(Number(e.target.value))} 
        placeholder="Min Total"
      />
    </div>
  );

  return (
    <DataTable
      adapter={adapter}
      startToolbarContent={filters}
      config={{ enableUrlState: true }} // Also sync internal table state to URL
    />
  );
}
```

### Why use `useUrlState`?
- **Framework Agnostic:** Works in Vite, Next.js, Remix, or vanilla React. It relies purely on native browser History APIs.
- **Batching:** If you update 3 different filters in the same millisecond, it intelligently batches them into a single URL push to prevent history stack overflow.
- **Auto-Cleanup:** If a value matches the default value (e.g. `minTotal` goes back to `0`), it removes the parameter from the URL to keep the URL clean.