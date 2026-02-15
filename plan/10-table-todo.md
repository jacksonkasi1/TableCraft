Now I have a complete picture. Let me formulate the comprehensive plan.

---

# 🏗️ Universal Table — Complete Implementation Plan

## Executive Summary

After thoroughly analyzing:
1. Your existing `tnks-data-table` (700+ lines main component, 15+ utility files, full Shadcn registry)
2. The `@tablecraft/engine` metadata API (`buildMetadata()` → `TableMetadata`)
3. The `@tablecraft/client` SDK (`createClient`, `useTableQuery`, `useTableMeta`)
4. Your monorepo architecture (`packages/*`, `apps/*`)

Here's my honest assessment and plan:

### Key Design Decisions

**1. Single package, not split packages.**
Your instinct was right — the data table has no reason to be split into multiple packages. Unlike adapters (which have different framework dependencies), every piece of the table (toolbar, pagination, filters, export, resize, column reorder) is always used together. Splitting would just create dependency hell for no gain. One package: `@tablecraft/table`.

**2. Native TableCraft support, but NOT exclusively.**
The table should work beautifully out-of-the-box with `@tablecraft/client`, auto-consuming `/_meta` to generate columns, filters, etc. But it should ALSO work with raw data + manual column definitions (like your current table does). This is the developer-friendly approach — every table library does this (TanStack, AG Grid, etc). If we lock it to only TableCraft, nobody outside your ecosystem can use it, and you lose the Shadcn registry value.

**3. Client-side only (no SSR) — correct for now.**
SSR adds complexity with no real user demand yet. We keep everything `"use client"`. Can add SSR later as an enhancement.

**4. Leverage your existing code heavily.**
Your existing data table is 90% there. The core TanStack integration, URL state sync, column resize, export, pagination — all excellent. We're refactoring the architecture, not rewriting from scratch. The main changes are:
- Remove subrow complexity (move to optional plugin/addon later)
- Add auto-column generation from metadata
- Add cell renderers registry
- Clean up the prop API surface
- Make it framework-agnostic (remove Next.js `useSearchParams` dependency)

---

## Package Structure

```
packages/
  table/                          ← NEW: @tablecraft/table
    src/
      index.ts                    ← Public API exports
      types.ts                    ← All TypeScript types
      data-table.tsx              ← Main <DataTable /> component
      toolbar.tsx                 ← Toolbar (search, date filter, export, view options)
      pagination.tsx              ← Pagination controls
      column-header.tsx           ← Sortable column header
      resizer.tsx                 ← Column resize handle
      view-options.tsx            ← Column visibility + reorder
      export.tsx                  ← Export dropdown (CSV/Excel)
      expand-icon.tsx             ← Row expand toggle

      core/
        use-table-data.ts         ← Hook: fetching + state management (the brain)
        use-url-state.ts          ← Hook: URL state sync (framework-agnostic)
        use-column-resize.ts      ← Hook: column sizing persistence
        table-config.ts           ← Default config + merge logic

      renderers/
        index.ts                  ← Registry: cellType → React component
        text.tsx                  ← Default text renderer
        number.tsx                ← Number with formatting
        date.tsx                  ← Date with formatting
        boolean.tsx               ← Checkbox/Yes-No
        badge.tsx                 ← Status badge with color variants
        link.tsx                  ← Clickable link
        image.tsx                 ← Image/Avatar cell
        progress.tsx              ← Progress bar
        tags.tsx                  ← Array of badges
        actions.tsx               ← Row action buttons

      auto/
        auto-columns.ts           ← Generate TanStack columns from TableMetadata
        auto-filters.ts           ← Generate filter UI from FilterMetadata
        meta-client.ts            ← Fetch + cache /_meta endpoint

      utils/
        search.ts                 ← Search preprocessing
        export-utils.ts           ← CSV/Excel generation
        deep-utils.ts             ← Deep equality, debounce
        keyboard-navigation.ts    ← Keyboard handlers
        cn.ts                     ← Tailwind merge (bundled, no @/lib dependency)

    package.json
    tsconfig.json
    registry.json                 ← Shadcn registry manifest
```

**Why this structure?**
- `core/` = stateful hooks (the logic layer)
- `renderers/` = visual cell components (the display layer)
- `auto/` = TableCraft-specific auto-generation (the magic layer)
- `utils/` = pure functions (no React dependencies)
- Root-level `.tsx` files = the assembled UI components

---

## Phased Implementation Plan

### Phase 1: Package Foundation & Core Refactor (Week 1)

#### 1.1 Scaffold Package
- [ ] Create `packages/table/package.json`
  ```json
  {
    "name": "@tablecraft/table",
    "version": "0.1.0",
    "type": "module",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
    "peerDependencies": {
      "react": ">=18.0.0",
      "react-dom": ">=18.0.0",
      "@tanstack/react-table": ">=8.0.0",
      "tailwindcss": ">=3.0.0"
    },
    "dependencies": {
      "lucide-react": ">=0.300.0",
      "class-variance-authority": ">=0.7.0",
      "clsx": ">=2.0.0",
      "tailwind-merge": ">=2.0.0",
      "sonner": ">=1.0.0"
    },
    "devDependencies": {
      "@tablecraft/client": "workspace:*",
      "typescript": "^5.0.0",
      "tsup": "^8.0.0"
    }
  }
  ```
- [ ] Create `packages/table/tsconfig.json`
- [ ] Create build script with `tsup` (bundle ESM, emit declarations)
- [ ] Create `packages/table/src/index.ts` entry point

#### 1.2 Core Types (types.ts)
Define the complete type system — this is the foundation everything else builds on.

```typescript src/types.ts
import type { ColumnDef, Table, Row, ColumnSizingState } from "@tanstack/react-table";

// ─── Table Configuration ───
export interface TableConfig {
  enableRowSelection: boolean;
  enableKeyboardNavigation: boolean;
  enableClickRowSelect: boolean;
  enablePagination: boolean;
  enableSearch: boolean;
  enableDateFilter: boolean;
  enableColumnVisibility: boolean;
  enableExport: boolean;
  enableUrlState: boolean;
  enableColumnResizing: boolean;
  enableToolbar: boolean;
  size: 'sm' | 'default' | 'lg';
  columnResizingTableId?: string;
  searchPlaceholder?: string;
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

// ─── Data Fetching ───
export interface QueryParams {
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, unknown>;
  dateRange: { from: string; to: string };
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[];
  meta: {
    total: number | null;
    page: number;
    pageSize: number;
    totalPages: number | null;
  };
}

// ─── Data Adapter (how we talk to backends) ───
export interface DataAdapter<T = Record<string, unknown>> {
  /** Fetch data given current table params */
  query(params: QueryParams): Promise<QueryResult<T>>;
  /** Fetch items by IDs (for cross-page export) */
  queryByIds?(ids: (string | number)[]): Promise<T[]>;
  /** Fetch table metadata (optional — enables auto-columns) */
  meta?(): Promise<TableMetadata>;
  /** Export data */
  export?(format: 'csv' | 'json', params?: QueryParams): Promise<string>;
}

// ─── Cell Renderer Registry ───
export type CellRenderer<T = unknown> = React.ComponentType<{
  value: T;
  row: Record<string, unknown>;
  column: ColumnMetadataForRenderer;
}>;

export interface ColumnMetadataForRenderer {
  name: string;
  type: string;
  format?: string;
  options?: { value: string | number | boolean; label: string; color?: string }[];
}

// ─── Export Config ───
export interface ExportConfig {
  entityName: string;
  columnMapping?: Record<string, string>;
  columnWidths?: Array<{ wch: number }>;
  headers?: string[];
  transformFunction?: <T>(row: T) => Record<string, unknown>;
  enableCsv?: boolean;
  enableExcel?: boolean;
}

// ─── Main DataTable Props ───
export interface DataTableProps<T extends Record<string, unknown>> {
  /** Table configuration overrides */
  config?: Partial<TableConfig>;

  /** Data adapter — the bridge to your backend */
  adapter: DataAdapter<T>;

  /** Manual column definitions (skip auto-generation) */
  columns?: ColumnDef<T, unknown>[];

  /** Cell renderer overrides: columnName → Component */
  renderers?: Record<string, CellRenderer>;

  /** Export configuration */
  exportConfig?: ExportConfig;

  /** ID field for row tracking */
  idField?: keyof T;

  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;

  /** Custom toolbar content */
  toolbarContent?: React.ReactNode;

  /** Render custom toolbar with selection context */
  renderToolbar?: (ctx: ToolbarContext<T>) => React.ReactNode;

  /** className for outer wrapper */
  className?: string;
}

export interface ToolbarContext<T> {
  selectedRows: T[];
  selectedIds: string[];
  totalSelected: number;
  clearSelection: () => void;
}

// Re-export TableMetadata from client types (or define inline)
export type { TableMetadata, ColumnMetadata, FilterMetadata } from '@tablecraft/client';
```

#### 1.3 Framework-Agnostic URL State Hook
Remove the Next.js `useSearchParams()` dependency. Make it work everywhere.

```typescript src/core/use-url-state.ts
// Pure browser-based URL state. No Next.js imports.
// Uses window.history.replaceState + popstate events.
// Batches updates in microtasks (keep existing logic from tnks-data-table).
// Falls back to regular useState when enableUrlState=false.
```

**Key changes from existing:**
- Remove `import { useSearchParams } from "next/navigation"`
- Use only `window.location.search` + `history.replaceState`
- Keep the batch update system (it's excellent)
- Keep the conditional state hook pattern

#### 1.4 Core Data Hook (use-table-data.ts)
This replaces the massive `useEffect` data fetching in the current `data-table.tsx`.

```typescript src/core/use-table-data.ts
export function useTableData<T>(adapter: DataAdapter<T>, config: TableConfig) {
  // URL state for: page, pageSize, search, sort, sortOrder, dateRange, columnVisibility, filters
  // Calls adapter.query() on param change
  // Returns: { data, meta, isLoading, isError, error }
  // Handles: abort controller, error state, loading state
}
```

**This is the single most important hook.** It replaces ~200 lines of scattered state in the current component.

---

### Phase 2: UI Components Refactor (Week 2)

#### 2.1 DataTable Component (Simplified)
Refactor from ~700 lines to ~200 lines by extracting logic into hooks.

```typescript src/data-table.tsx
// Simplified structure:
export function DataTable<T>({ adapter, columns, config, ... }: DataTableProps<T>) {
  const tableConfig = useTableConfig(config);
  const { data, meta, isLoading, isError, params, setParam } = useTableData(adapter, tableConfig);
  const { columnSizing, setColumnSizing, resetColumnSizing } = useColumnResize(tableConfig);
  
  // Auto-generate columns from metadata if no manual columns provided
  const resolvedColumns = useAutoColumns(adapter, columns, renderers);
  
  // Selection state (simplified — no subrow complexity)
  const [rowSelection, setRowSelection] = useState({});
  
  const table = useReactTable({ ... });
  
  return (
    <div>
      {tableConfig.enableToolbar && <Toolbar ... />}
      <TableContainer table={table} isLoading={isLoading} columns={resolvedColumns} />
      {tableConfig.enablePagination && <Pagination ... />}
    </div>
  );
}
```

**What's removed vs. current:**
- All subrow logic (~300 lines) — move to a future addon
- React Query integration hack (`isQueryHook`) — the adapter pattern replaces this
- The `fetchDataFn` / `fetchByIdsFn` dual-function pattern — replaced by `DataAdapter`
- Multiple export configs for parent/subrow — simplified to single config

**What's kept/improved:**
- Column resize with localStorage persistence
- URL state sync
- Keyboard navigation
- Column reorder via drag-drop
- All Shadcn UI components

#### 2.2 Toolbar Refactor
```typescript src/toolbar.tsx
// Same visual design, but simplified props:
interface ToolbarProps<T> {
  table: Table<T>;
  params: QueryParams;
  setParam: (key: string, value: unknown) => void;
  config: TableConfig;
  exportConfig?: ExportConfig;
  totalSelected: number;
  clearSelection: () => void;
  getSelectedItems: () => Promise<T[]>;
  getAllItems: () => T[];
  resetColumnSizing?: () => void;
  resetColumnOrder?: () => void;
  customContent?: React.ReactNode;
}
```

#### 2.3 Other UI Components
Refactor with minimal changes (mostly prop cleanup):
- [ ] `pagination.tsx` — keep as-is, remove direct `window.history` manipulation
- [ ] `column-header.tsx` — keep as-is
- [ ] `resizer.tsx` — keep as-is
- [ ] `view-options.tsx` — keep as-is
- [ ] `export.tsx` — simplify (remove subrow export logic)
- [ ] `expand-icon.tsx` — keep for future use

---

### Phase 3: Cell Renderers & Auto-Column Generation (Week 3)

#### 3.1 Cell Renderer Registry

```typescript src/renderers/index.ts
const defaultRenderers: Record<string, CellRenderer> = {
  string: TextRenderer,
  number: NumberRenderer,
  date: DateRenderer,
  boolean: BooleanRenderer,
  badge: BadgeRenderer,
  link: LinkRenderer,
  image: ImageRenderer,
  progress: ProgressRenderer,
  tags: TagsRenderer,
};

export function resolveRenderer(
  type: string,
  customRenderers?: Record<string, CellRenderer>
): CellRenderer {
  return customRenderers?.[type] ?? defaultRenderers[type] ?? TextRenderer;
}
```

Each renderer is a small focused component:

```typescript src/renderers/badge.tsx
export function BadgeRenderer({ value, column }: CellRendererProps) {
  const option = column.options?.find(o => o.value === value);
  return (
    <Badge variant="outline" style={{ borderColor: option?.color }}>
      {option?.label ?? String(value)}
    </Badge>
  );
}
```

#### 3.2 Auto-Column Generation from Metadata

This is the **magic** that makes TableCraft special:

```typescript src/auto/auto-columns.ts
import type { ColumnDef } from "@tanstack/react-table";
import type { TableMetadata, ColumnMetadata } from "../types";
import { resolveRenderer } from "../renderers";

/**
 * Generates TanStack Table column definitions from TableCraft metadata.
 * This is what makes `<DataTable adapter={adapter} />` work with zero column config.
 */
export function generateColumns<T>(
  metadata: TableMetadata,
  customRenderers?: Record<string, CellRenderer>
): ColumnDef<T, unknown>[] {
  return metadata.columns
    .filter(col => !col.hidden)
    .map(col => ({
      id: col.name,
      accessorKey: col.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title={col.label} />,
      cell: ({ getValue, row }) => {
        const Renderer = resolveRenderer(col.type, customRenderers);
        return <Renderer value={getValue()} row={row.original} column={col} />;
      },
      enableSorting: col.sortable,
      enableHiding: true,
      size: col.width,
      minSize: col.minWidth,
      maxSize: col.maxWidth,
      meta: { label: col.label, type: col.type },
    }));
}
```

#### 3.3 Auto-Filters from Metadata

```typescript src/auto/auto-filters.ts
/**
 * Generates filter configuration from metadata.
 * For columns with `options`, renders a select/multi-select.
 * For date columns with `datePresets`, renders preset buttons.
 * For string columns, renders a text input.
 */
export function generateFilterConfig(metadata: TableMetadata): FilterConfig[] {
  return metadata.filters.map(filter => ({
    field: filter.field,
    type: filter.type,
    label: filter.label,
    operators: filter.operators,
    options: filter.options,
    datePresets: filter.datePresets,
  }));
}
```

---

### Phase 4: TableCraft Adapter (Native Backend Support) (Week 3-4)

#### 4.1 Built-in TableCraft Adapter

```typescript src/auto/meta-client.ts
import type { DataAdapter, QueryParams, QueryResult, TableMetadata } from "../types";

/**
 * Creates a DataAdapter that talks to a TableCraft backend.
 * This is the "native" adapter — zero config needed.
 *
 * Usage:
 *   import { createTableCraftAdapter } from '@tablecraft/table';
 *   const adapter = createTableCraftAdapter({ baseUrl: '/api/data', table: 'users' });
 *   <DataTable adapter={adapter} />
 */
export function createTableCraftAdapter<T = Record<string, unknown>>(options: {
  baseUrl: string;
  table: string;
  headers?: Record<string, string> | (() => Promise<Record<string, string>>);
  fetch?: typeof fetch;
}): DataAdapter<T> {
  // Uses @tablecraft/client under the hood
  const client = createClient({ baseUrl: options.baseUrl, headers: options.headers, fetch: options.fetch });
  const tableClient = client.table<T>(options.table);
  
  return {
    async query(params: QueryParams): Promise<QueryResult<T>> {
      return tableClient.query({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search || undefined,
        sort: params.sort ? [`${params.sortOrder === 'desc' ? '-' : ''}${params.sort}`] : undefined,
        filters: params.filters,
      });
    },
    async meta(): Promise<TableMetadata> {
      return tableClient.meta();
    },
    async export(format, params) {
      return tableClient.export(format, params ? { ... } : undefined);
    },
  };
}
```

#### 4.2 Simple REST Adapter (for non-TableCraft backends)

```typescript src/auto/simple-adapter.ts
/**
 * Creates a DataAdapter for any REST API.
 * Developer provides the URL building + response parsing logic.
 *
 * Usage:
 *   const adapter = createRestAdapter({
 *     queryFn: async (params) => {
 *       const res = await fetch(`/api/users?page=${params.page}&limit=${params.pageSize}`);
 *       const json = await res.json();
 *       return { data: json.results, meta: { total: json.count, ... } };
 *     }
 *   });
 */
export function createRestAdapter<T>(options: {
  queryFn: (params: QueryParams) => Promise<QueryResult<T>>;
  queryByIdsFn?: (ids: (string | number)[]) => Promise<T[]>;
}): DataAdapter<T> {
  return {
    query: options.queryFn,
    queryByIds: options.queryByIdsFn,
  };
}
```

---

### Phase 5: Export & Utilities (Week 4)

#### 5.1 Export Utils
Keep your existing excellent export logic, but:
- [ ] Move `exceljs` to an optional peer dependency (it's 2MB+ and many users won't need Excel)
- [ ] Keep CSV export built-in (zero deps)
- [ ] Excel export gracefully degrades: shows toast "Install exceljs for Excel export"

#### 5.2 cn() utility
Bundle a local `cn()` so users don't need `@/lib/utils`:

```typescript src/utils/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

#### 5.3 Other Utilities
Migrate from existing (minimal changes):
- [ ] `search.ts` — keep as-is
- [ ] `deep-utils.ts` — keep `isDeepEqual`, `debounce`, `resetUrlState`
- [ ] `keyboard-navigation.ts` — keep as-is
- [ ] `export-utils.ts` — refactor (remove subrow export, add optional exceljs)

---

### Phase 6: Shadcn Registry & Documentation (Week 5)

#### 6.1 Registry Setup

```json registry.json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "tablecraft-table",
  "homepage": "https://github.com/your-org/tablecraft",
  "items": [
    {
      "name": "data-table",
      "type": "registry:ui",
      "title": "TableCraft Data Table",
      "description": "Schema-driven data table with auto-column generation, built on TanStack Table + Shadcn UI. Native support for TableCraft engine or any REST API.",
      "dependencies": [
        "@tanstack/react-table",
        "sonner",
        "lucide-react",
        "class-variance-authority",
        "clsx",
        "tailwind-merge"
      ],
      "registryDependencies": [
        "button", "checkbox", "input", "select", "popover",
        "calendar", "dropdown-menu", "separator", "table",
        "command", "skeleton", "alert", "badge"
      ],
      "files": [
        // All component files...
      ]
    }
  ]
}
```

#### 6.2 Two Installation Methods

**Method A: npm package (recommended for TableCraft users)**
```bash
npm install @tablecraft/table
```

**Method B: Shadcn registry (for customization lovers)**
```bash
npx shadcn@latest add https://tablecraft.dev/r/data-table
```

#### 6.3 Documentation
- [ ] README with quick start (3 usage patterns)
- [ ] API reference for all props
- [ ] Cell renderer customization guide
- [ ] Adapter creation guide

---

### Phase 7: Testing & Polish (Week 6)

#### 7.1 Unit Tests
- [ ] `use-url-state` hook tests
- [ ] `use-table-data` hook tests
- [ ] `auto-columns` generation tests
- [ ] Cell renderer tests
- [ ] Export utility tests
- [ ] Adapter tests

#### 7.2 Integration Tests
- [ ] Full DataTable render with mock adapter
- [ ] Auto-column generation from real metadata
- [ ] Search/filter/sort/pagination flow
- [ ] Export flow (CSV)
- [ ] Column resize + persist
- [ ] Column reorder + persist

#### 7.3 Build Verification
- [ ] `bun run build` — all packages
- [ ] `bun run typecheck` — all packages
- [ ] `bun test` — all packages
- [ ] Test in a fresh Next.js app
- [ ] Test in a fresh Vite app (framework-agnostic verification)

---

### Phase 8: Demo App (Week 6-7)

#### 8.1 Example App (`apps/table-demo`)
- [ ] Create a simple app showing all 3 usage patterns:
  1. **Zero-config** (TableCraft adapter + auto-columns from metadata)
  2. **Manual columns** (custom column definitions + TableCraft adapter)
  3. **Custom adapter** (REST API + manual columns)
- [ ] Show custom cell renderers
- [ ] Show toolbar customization
- [ ] Show export functionality

---

## Usage Examples (What the DX looks like)

### Pattern 1: Zero-Config with TableCraft Engine
```tsx
import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

const adapter = createTableCraftAdapter({
  baseUrl: '/api/data',
  table: 'users',
});

export default function UsersPage() {
  return <DataTable adapter={adapter} />;
  // That's it. Columns auto-generated from /_meta.
  // Search, filter, sort, pagination, export — all automatic.
}
```

### Pattern 2: Custom Columns + TableCraft
```tsx
import { DataTable, createTableCraftAdapter } from '@tablecraft/table';

const adapter = createTableCraftAdapter({ baseUrl: '/api/data', table: 'users' });

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <MyCustomBadge status={getValue()} /> },
];

export default function UsersPage() {
  return <DataTable adapter={adapter} columns={columns} />;
}
```

### Pattern 3: Any REST API
```tsx
import { DataTable, createRestAdapter } from '@tablecraft/table';

const adapter = createRestAdapter({
  queryFn: async (params) => {
    const res = await fetch(`/api/users?page=${params.page}&limit=${params.pageSize}&q=${params.search}`);
    const json = await res.json();
    return { data: json.results, meta: { total: json.count, page: params.page, pageSize: params.pageSize, totalPages: Math.ceil(json.count / params.pageSize) } };
  },
});

const columns = [/* ... */];

export default function UsersPage() {
  return <DataTable adapter={adapter} columns={columns} />;
}
```

---

## What Stays, What Changes, What's Removed

| Feature | Current (tnks-data-table) | New (@tablecraft/table) |
|---|---|---|
| TanStack Table core | ✅ Keep | ✅ Same |
| Column resize + persist | ✅ Keep | ✅ Same |
| Column reorder (drag) | ✅ Keep | ✅ Same |
| Column visibility toggle | ✅ Keep | ✅ Same |
| URL state sync | ✅ Keep logic | 🔄 Remove Next.js dep |
| Search with debounce | ✅ Keep | ✅ Same |
| Date range filter | ✅ Keep | ✅ Same |
| Export (CSV) | ✅ Keep | ✅ Same |
| Export (Excel) | ✅ Keep | 🔄 Optional peer dep |
| Pagination | ✅ Keep | ✅ Same |
| Keyboard navigation | ✅ Keep | ✅ Same |
| Sortable column headers | ✅ Keep | ✅ Same |
| Row selection | ✅ Keep | ✅ Simplified |
| Loading skeletons | ✅ Keep | ✅ Same |
| Error alerts | ✅ Keep | ✅ Same |
| Settings popover | ✅ Keep | ✅ Same |
| Subrow system | ✅ Complex | ❌ Remove (future addon) |
| React Query hook hack | ✅ Exists | ❌ Remove (adapter replaces) |
| fetchDataFn/fetchByIdsFn | ✅ Exists | ❌ Replace with DataAdapter |
| Auto-columns from metadata | ❌ None | ✅ NEW |
| Cell renderer registry | ❌ None | ✅ NEW |
| TableCraft native adapter | ❌ None | ✅ NEW |
| REST adapter | ❌ None | ✅ NEW |
| Shadcn registry | ✅ Keep | ✅ Updated |
| Framework-agnostic | ❌ Next.js only | ✅ Any React app |

---

This plan gives you a production-ready, developer-friendly table component that is the natural frontend companion to the TableCraft engine, while remaining useful as a standalone Shadcn component for anyone.

Want me to switch to **Agent mode** to start implementing Phase 1?