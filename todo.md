# Backend Engine Implementation Plan (TODO)

## Phase 1: Core Engine

### Week 1: Foundation & Validation
- [x] **Project Setup**
    - [x] Initialize package (`packages/engine`)
    - [x] Configure TypeScript (`tsconfig.json`)
    - [x] Install dependencies (`drizzle-orm`, `zod`, `vitest`)
    - [x] Create folder structure (`src/types`, `src/core`, `src/utils`)
    - [x] Add strict type checking script to `package.json`
- [x] **Configuration Schema (Zod)**
    - [x] Define primitive types (JoinType, FilterType, Operator)
    - [x] Define Column Config Schema
    - [x] Define Join Config Schema (Recursive)
    - [x] Define Filter & Search Config Schemas
    - [x] Define Advanced Features (Aggregations, Subqueries)
    - [x] Define Platform Features (Tenant, SoftDelete, Cache)
    - [x] Create `TableConfig` interface export in `src/index.ts`
- [x] **Config Validator**
    - [x] Create `src/core/validator.ts`
    - [x] Implement `validateConfig(config)` using Zod
    - [x] Implement `validateAgainstSchema(config, drizzleSchema)`
        - [x] Verify base table exists
        - [x] Verify columns exist in table
        - [x] Verify join tables and keys exist
    - [x] Add unit tests for validator (`test/validator.test.ts`)

### Week 2: Basic Query Building
- [x] **Select Builder**
    - [x] Create `src/core/queryBuilder.ts`
    - [x] Implement `buildSelect(schema, config)`
    - [x] Handle basic column selection
    - [x] Handle computed columns (`sql` function)
    - [x] Handle database-level transforms (`dbTransform`)
- [x] **Join Builder**
    - [x] Implement `buildJoins(query, schema, config)`
    - [x] Support `leftJoin`, `innerJoin`, `rightJoin`
    - [x] Support recursive joins (joins within joins)
    - [x] Validate join relationships against Drizzle schema references
- [x] **Backend Conditions (Fixed WHERE)**
    - [x] Implement `buildBackendConditions(query, config, context)`
    - [x] Handle static values
    - [x] Handle dynamic context values (e.g., `tenantId`)
    - [x] Handle relative date values (e.g., `last 30 days`)

### Week 3: Interactive Features
- [x] **Filter Builder (Dynamic WHERE)**
    - [x] Create `src/core/filterBuilder.ts`
    - [x] Implement `buildFilters(query, config, params)`
    - [x] Support basic operators (`eq`, `neq`, `gt`, `lt`, `contains`)
    - [x] Support range filters (`between`)
    - [x] Support list filters (`in`, `notIn`)
- [x] **Search Builder**
    - [x] Create `src/core/searchBuilder.ts`
    - [x] Implement `buildSearch(query, config, searchTerm)`
    - [x] Support `ILIKE` across multiple columns (`OR` logic)
    - [x] Support PostgreSQL Full-Text Search (`tsvector`) if enabled
- [x] **Sort & Pagination**
    - [x] Implement `buildSort(query, config, sortParams)`
    - [x] Implement `buildPagination(query, page, pageSize)`
    - [x] Add safety limits (max page size)

## Phase 2: SDK & Platform Logic

### Week 4: The SDK
- [x] **Engine Factory**
    - [x] Create `src/engine.ts`
    - [x] Implement `createTableEngine({ schema, config })`
    - [x] Expose `buildQuery` and `execute` methods
- [x] **Request Parser**
    - [x] Create `src/utils/requestParser.ts`
    - [x] Implement `parseRequest(urlParams)` -> `EngineParams`
    - [x] Handle nested filter syntax (`filter[status]=active`)
    - [x] Handle sort syntax (`sort=-createdAt`)
- [x] **Response Formatter**
    - [x] Create `src/utils/responseFormatter.ts`
    - [x] Implement `formatResponse(data, meta, config)`
    - [x] Apply `jsTransform` functions (Layer 2 transforms)
    - [x] Format dates and currency based on config

### Week 5: Framework Adapters
- [x] **Next.js Adapter**
    - [x] Create `src/adapters/next.ts`
    - [x] Implement `createNextHandler({ db, schema, configs })`
    - [x] Handle Request/Response objects
- [x] **Express Adapter**
    - [x] Create `src/adapters/express.ts`
    - [x] Implement `createExpressMiddleware({ db, schema, configs })`
- [x] **Context Injection**
    - [x] Implement context middleware for `tenantId` extraction

## Phase 3: Advanced Features

### Week 6: Complex Data Logic
- [x] **Aggregations**
    - [x] Implement `buildAggregations(query, config)`
    - [x] Support `count`, `sum`, `avg`, `min`, `max`
- [x] **Subqueries**
    - [x] Implement `buildSubqueries(query, config)`
    - [x] Support `count` subqueries (e.g., `ordersCount`)
    - [x] Support `exists` subqueries
- [x] **Soft Delete**
    - [x] Implement global soft-delete filter injection
    - [x] Support "include deleted" override for admins
- [x] **Caching**
    - [x] Implement basic memory cache wrapper
    - [x] Add hooks for external cache (Redis/Vercel KV)

### Week 7: Code Generation & Export
- [x] **Export Logic**
    - [x] Implement `exportData(query, format)`
    - [x] Support CSV generation
    - [x] Support JSON generation
- [x] **Eject (Code Generation)**
    - [x] Implement `generateDrizzleCode(config)`
    - [x] Output TypeScript code string for manual use
- [x] **OpenAPI Spec**
    - [x] Implement `generateOpenApiSpec(config)`
    - [x] Output JSON schema for API documentation

## Phase 4: Monorepo Restructuring (Planned)

### Package Split
The engine will be split into multiple scoped packages to reduce dependencies and improve modularity.

- [x] **Core Engine** (`packages/engine`)
    - [x] Contains core logic, builders, and types
    - [x] Zero framework dependencies
- [x] **Next.js Adapter** (`packages/adapter-next`)
    - [x] Dependencies: `@tablecraft/engine`, `next`
    - [x] Wraps engine for App Router route handlers
- [x] **Express Adapter** (`packages/adapter-express`)
    - [x] Dependencies: `@tablecraft/engine`, `express`
    - [x] Express middleware implementation
- [x] **Hono Adapter** (`packages/adapter-hono`)
    - [x] Dependencies: `@tablecraft/engine`, `hono`
    - [x] Hono middleware implementation
- [x] **Elysia Adapter** (`packages/adapter-elysia`)
    - [x] Dependencies: `@tablecraft/engine`, `elysia`
    - [x] Elysia plugin implementation


## Phase 5: Major Refactor (Completed)

### Core Engine Refactor (@tablecraft/engine)
- [x] **Remove Adapters**
    - [x] Remove `src/adapters/` directory
    - [x] Update `package.json` to remove framework dependencies if any remain
- [x] **Remove Cache**
    - [x] Remove `src/core/cache.ts`
    - [x] Remove cache logic from `src/engine.ts`
    - [x] Remove cache types from `src/types/table.ts`
- [x] **Developer Experience Improvements**
    - [x] Update `src/utils/introspect.ts`: `autoHide`, `detectSensitiveColumns`, defaults to "show all"
    - [x] Update `src/define.ts`:
        - [x] Add `autoHide()`, `hide()`, `only()`, `show()`
        - [x] Add `searchAll()`, `noSearch()`
        - [x] Add `sort()`, `sortable()`, `noSort()`
        - [x] Add `computed()` (store SQL expressions in builder)
        - [x] Add `transform()` (store JS transforms in builder)
    - [x] Update `src/engine.ts`:
        - [x] Handle computed SQL expressions from builder
        - [x] Handle JS transforms from builder
- [x] **Shared Adapter Utilities**
    - [x] Create `src/utils/adapterUtils.ts` (checkAccess, getExportMeta)
    - [x] Export from `src/index.ts`

### Plugin Cache (@tablecraft/plugin-cache)
- [x] **Initialize Package**
    - [x] Create `packages/plugin-cache/package.json`
    - [x] Create `packages/plugin-cache/tsconfig.json`
- [x] **Implement Core**
    - [x] Define `CacheProvider` interface in `src/types.ts`
    - [x] Implement `memoryProvider` in `src/providers/memory.ts`
    - [x] Implement `withCache`, `withCacheAll`, `withCacheMap` in `src/withCache.ts`
- [x] **Implement Providers**
    - [x] Redis provider (`src/providers/redis.ts`)
    - [x] Upstash provider (`src/providers/upstash.ts`)
- [x] **Tests**
    - [x] Unit tests for `withCache` and memory provider

### Adapter Updates (All Adapters)
- [x] **Structure Update**
    - [x] Ensure all adapters use `createEngines`
    - [x] Implement `checkAccess` callback option
    - [x] Use shared utilities from engine
- [x] **@tablecraft/adapter-next**
    - [x] Update `createNextHandler`
    - [x] Update `createNextRouteHandler`
- [x] **@tablecraft/adapter-express**
    - [x] Update `createExpressMiddleware`
    - [x] Update `createExpressHandler`
- [x] **@tablecraft/adapter-hono**
    - [x] Update `createHonoApp`
    - [x] Update `createHonoHandler`
- [x] **@tablecraft/adapter-elysia**
    - [x] Update `createElysiaPlugin`
    - [x] Update `createElysiaHandler`

### Demo App Update (apps/hono-example)
- [x] **Reflect Changes**
    - [x] Update `package.json` to include `@tablecraft/plugin-cache` (if used)
    - [x] Update `src/tablecraft.config.ts` (or equivalent) to use new `defineTable` API
- [x] **Developer Experience Examples**
    - [x] Implement examples for `hide`, `search`, `sort`, `computed`, `join`, `tenant`
    - [x] Add tests for these examples in `test/dev-experience.test.ts`

### Verification
- [x] **Build All**: `bun run build` (root)
- [x] **Typecheck**: `bun run typecheck`
- [x] **Test**: `bun test`

## Phase 6: Limitations & Features Expansion (Completed)

### 1. The "OR" Problem (Complex Filtering)
- [x] **Config Schema**: Update `TableConfig` to support filter groups (nested AND/OR).
- [x] **Builder**: Add `.whereOr()` and `.whereGroup()` to `TableDefinitionBuilder`.
- [x] **Engine**: Update `FilterGroupBuilder` to construct recursive SQL conditions.
- [x] **Example**: Add demo route/test for complex filtering (e.g., `(A AND B) OR C`).

### 2. GROUP BY & Aggregation Reports
- [x] **Config Schema**: Add `GroupByConfig` (fields, having).
- [x] **Builder**: Add `.groupBy()` and `.having()` methods.
- [x] **Engine**:
    - [x] Create `GroupByBuilder`.
    - [x] Implement `queryGrouped()` mode in engine (returns `GroupedResult`).
- [x] **Example**: Add "Sales by Month" or similar report endpoint.

### 3. Nested Relations (Includes)
- [x] **Config Schema**: Add `IncludeConfig` (table, keys, nested includes).
- [x] **Builder**: Add `.include()` method for fetching related data.
- [x] **Engine**:
    - [x] Create `RelationBuilder` to execute secondary queries (batching IDs).
    - [x] Merge results in JS (post-processing).
- [x] **Example**: Fetch User -> Orders -> Items hierarchy.

### 4. Recursive Queries (CTEs)
- [x] **Config Schema**: Add `RecursiveConfig` (parentKey, childKey, maxDepth).
- [x] **Builder**: Add `.recursive()` method.
- [x] **Engine**:
    - [x] Create `RecursiveBuilder` to generate `WITH RECURSIVE` SQL.
    - [x] Implement `queryRecursive()` mode.
- [x] **Example**: Fetch Category tree (electronics -> laptops -> gaming).

### 5. Advanced Joins & Raw SQL
- [x] **Builder**:
    - [x] Update `.join()` to accept `sql` template literal for `ON` condition.
    - [x] Add `.rawSelect()`, `.rawWhere()`, `.rawJoin()`, `.rawOrderBy()`.
- [x] **Engine**:
    - [x] Pass runtime SQL objects from builder to engine.
    - [x] Inject raw SQL fragments into the query pipeline.
- [x] **Example**: Join with complex condition (e.g., email domain match).

## Phase 7: Type Safety Improvements (Current)

### Type-Safe SQL Helpers
- [x] **Create Helpers**: Add `packages/engine/src/utils/typedSql.ts`
    - [x] `column()`: Type-safe column reference
    - [x] `caseWhen()`: Type-safe CASE WHEN builder
    - [x] `coalesce()`: Type-safe COALESCE
    - [x] `concat()`: Type-safe CONCAT
    - [x] `dateTrunc()`: Type-safe DATE_TRUNC
    - [x] `interval()`: Type-safe INTERVAL
    - [x] `ago()`: Type-safe NOW() - INTERVAL
- [x] **Export**: Export helpers from `packages/engine/src/index.ts`
- [x] **Test**: Add unit tests in `packages/engine/test/typedSql.test.ts`


### Verification
- [x] **Build All**: `bun run build` (root)
- [x] **Typecheck**: `bun run typecheck`
- [x] **Test**: `bun test`

## Phase 8: Production Readiness (New)

### 1. New Types & Errors
- [x] **Types**: Update `packages/engine/src/types/engine.ts` with new request/response types (cursor, select, distinct, countMode).
- [x] **Errors**: Create `packages/engine/src/errors.ts` with standardized error classes (TableCraftError, ConfigError, etc.).

### 2. Validation & Dialect
- [x] **Input Validator**: Create `packages/engine/src/core/inputValidator.ts` to validate params against config before DB hit.
- [x] **Dialect Detection**: Create `packages/engine/src/core/dialect.ts` to handle DB-specific features (ILIKE, recursive CTEs).

### 3. Core Features
- [x] **Field Selector**: Create `packages/engine/src/core/fieldSelector.ts` for `?select=id,name`.
- [x] **Cursor Pagination**: Create `packages/engine/src/core/cursorPagination.ts` for scalable pagination.
- [x] **Request Parser**: Update `packages/engine/src/utils/requestParser.ts` to parse new params (select, distinct, cursor).

### 4. Engine Integration
- [x] **Builder**: Update `packages/engine/src/define.ts` with `.countMode()`, `.distinct()`, and hooks (`beforeQuery`, `afterQuery`, `onError`).
- [x] **Engine Logic**: Update `packages/engine/src/engine.ts` to integrate all new components.
- [x] **Exports**: Update `packages/engine/src/index.ts` to export new modules.

### 5. Testing
- [x] **Unit Tests**: Add tests for errors, validation, and cursor pagination.
- [x] **Integration Tests**: Verify end-to-end functionality.

### Verification
- [x] **Build All**: `bun run build` (root)
- [x] **Typecheck**: `bun run typecheck`
- [x] **Test**: `bun test`

## Phase 9: Client SDK (Completed)

### 1. Metadata & Config Improvements
- [x] **Types**: Update `ColumnConfigSchema` in `types/table.ts` with `format`, `align`, `width`, `options`, `datePresets`, `visibleTo`.
- [x] **Builder**: Update `define.ts` with methods for frontend metadata (`format`, `options`, `datePresets`, `visibleTo`).
- [x] **Metadata API**: Create `core/metadataBuilder.ts` to generate schema JSON for frontend.
- [x] **Role Filter**: Create `core/roleFilter.ts` to hide columns based on user roles.
- [x] **Date Presets**: Create `core/datePresets.ts` to handle `last7days`, `thisMonth`, etc.

### 2. Engine Integration
- [x] **Get Metadata**: Add `getMetadata()` method to `TableEngine` interface and implementation.
- [x] **Role Logic**: Integrate `applyRoleBasedVisibility` into `engine.query()`.
- [x] **Date Logic**: Integrate `buildDatePresetCondition` into `filterBuilder.ts`.
- [x] **Adapter Updates**: Update all adapters (Next, Express, Hono, Elysia) to handle `/_meta` endpoint.

### 3. Client Package (@tablecraft/client)
- [x] **Scaffold**: Create package structure (package.json, tsconfig).
- [x] **Core**: Implement `createClient` with type-safe methods (`query`, `meta`, `export`).
- [x] **React**: Implement optional React hooks (`useTableQuery`, `useTableMeta`).

### 4. Verification
- [x] **Unit Tests**: Test metadata generation, role filtering, and date presets.
- [ ] **Integration**: Verify client SDK against example app.

## Phase 10: Final Polish (Pending)

### Minor Technical Debt

#### 1. CountMode Storage Location
**Issue**: `countMode` is stored as `(config as any)._countMode` (hacky type cast)
**Location**: `packages/engine/src/engine.ts` line 119
**Fix**: Move to `RuntimeExtensions` instead of `TableConfig`
**Impact**: Low - works but not elegant
**Priority**: Medium

#### 2. Client Package Peer Dependencies
**Issue**: Missing `react` as optional peer dependency
**Location**: `packages/client/package.json`
**Fix**: Add peerDependencies section:
```json
"peerDependencies": {
  "react": ">=18.0.0"
},
"peerDependenciesMeta": {
  "react": { "optional": true }
}
```
**Impact**: Low - only affects React users
**Priority**: Low

#### 3. Next.js Meta Endpoint Routing
**Issue**: `/_meta` suffix may not work with App Router `[table]` dynamic route
**Location**: All adapters currently use `/:table/_meta`
**Alternative**: Use query param `?_meta=true` instead
**Status**: Needs testing with actual Next.js app
**Priority**: Low (current implementation works in other frameworks)

#### 4. OpenAPI Generator Currency
**Issue**: May not include newest features (cursor, select, distinct, _meta)
**Location**: `packages/engine/src/utils/openapi.ts`
**Status**: Needs audit and update
**Priority**: Low

### Verification
- [ ] Move countMode to RuntimeExtensions
- [ ] Add React peer dependency to client
- [ ] Test Next.js _meta endpoint
- [ ] Audit and update OpenAPI generator
- [ ] Full integration test with demo app

### Demo App Update (apps/hono-example)
- [ ] **Reflect Changes**
    - [ ] Update `package.json` to include `@tablecraft/plugin-cache` (if used)
    - [ ] Update `src/tablecraft.config.ts` (or equivalent) to use new `defineTable` API
- [ ] **Developer Experience Examples**
    - [ ] Implement examples for `hide`, `search`, `sort`, `computed`, `join`, `tenant`
    - [ ] Add tests for these examples in `test/dev-experience.test.ts`

### Verification
- [ ] **Build All**: `bun run build` (root)
- [ ] **Typecheck**: `bun run typecheck`
- [ ] **Test**: `bun test`

---

# Universal Table Implementation Plan (TODO)

## Phase 11: Package Foundation & Core Refactor

### 11.1 Scaffold Package (`packages/table`)
- [ ] Create `packages/table/package.json` with proper peer dependencies
- [ ] Create `packages/table/tsconfig.json`
- [ ] Create build script with `tsup` (ESM bundle + declarations)
- [ ] Create `packages/table/src/index.ts` entry point
- [ ] Add to root `workspaces` (already covered by `packages/*`)

### 11.2 Core Types (`src/types.ts`)
- [ ] Define `TableConfig` interface (enableRowSelection, enableSearch, enablePagination, etc.)
- [ ] Define `QueryParams` interface (page, pageSize, search, sort, sortOrder, filters, dateRange)
- [ ] Define `QueryResult<T>` interface (data, meta)
- [ ] Define `DataAdapter<T>` interface (query, queryByIds?, meta?, export?)
- [ ] Define `CellRenderer` type (React component for cell rendering)
- [ ] Define `ColumnMetadataForRenderer` interface
- [ ] Define `ExportConfig` interface
- [ ] Define `DataTableProps<T>` interface (adapter, columns?, config?, renderers?, exportConfig?, etc.)
- [ ] Define `ToolbarContext<T>` interface
- [ ] Re-export `TableMetadata`, `ColumnMetadata`, `FilterMetadata` from `@tablecraft/client`

### 11.3 Framework-Agnostic URL State Hook (`src/core/use-url-state.ts`)
- [ ] Port URL state hook from `tnks-data-table` (remove `next/navigation` dependency)
- [ ] Use pure `window.location.search` + `history.replaceState`
- [ ] Keep batch update system (microtask batching)
- [ ] Port `history-sync.ts` (patch pushState/replaceState for event emission)
- [ ] Port `url-events.ts` (custom event name constant)
- [ ] Port conditional state hook (`createConditionalStateHook`)

### 11.4 Table Config (`src/core/table-config.ts`)
- [ ] Port `TableConfig` defaults and `useTableConfig()` hook
- [ ] Add new defaults: `defaultPageSize`, `pageSizeOptions`

### 11.5 Column Resize Hook (`src/core/use-column-resize.ts`)
- [ ] Port `useTableColumnResize` hook from `tnks-data-table`
- [ ] Keep localStorage persistence with debounce

### 11.6 Utility Functions (`src/utils/`)
- [ ] Create `src/utils/cn.ts` — bundled `cn()` (no `@/lib/utils` dependency)
- [ ] Port `src/utils/search.ts` — search preprocessing/sanitization
- [ ] Port `src/utils/deep-utils.ts` — `isDeepEqual`, `debounce`, `resetUrlState`
- [ ] Port `src/utils/keyboard-navigation.ts` — keyboard handlers
- [ ] Port `src/utils/export-utils.ts` — CSV built-in, Excel optional (exceljs peer dep)
- [ ] Port `src/utils/date-format.ts` — date formatting
- [ ] Port `src/utils/column-sizing.ts` — column size init/tracking

### Verification
- [ ] `bun run build` passes for `packages/table`
- [ ] `bun run typecheck` passes for `packages/table`

## Phase 12: Core Data Hook & UI Components

### 12.1 Core Data Hook (`src/core/use-table-data.ts`)
- [ ] Implement `useTableData(adapter, config)` — the brain of the table
- [ ] Manage URL state: page, pageSize, search, sort, sortOrder, dateRange, columnVisibility, columnFilters
- [ ] Call `adapter.query()` on param change with AbortController
- [ ] Return: `{ data, meta, isLoading, isError, error, params, setParam }`
- [ ] Handle page reset on filter/search/pageSize change

### 12.2 Main DataTable Component (`src/data-table.tsx`)
- [ ] Refactor from ~700 lines to ~200 lines using extracted hooks
- [ ] Wire `useTableData`, `useColumnResize`, `useTableConfig`
- [ ] Auto-generate columns from metadata when no manual columns provided
- [ ] Simplified row selection (no subrow complexity)
- [ ] Column order state with localStorage persistence
- [ ] Keyboard navigation support
- [ ] Row click handler with interactive element conflict prevention
- [ ] Loading skeleton state
- [ ] Empty state
- [ ] Error state

### 12.3 Toolbar Component (`src/toolbar.tsx`)
- [ ] Port toolbar with simplified props
- [ ] Search input with debounce
- [ ] Date range picker integration
- [ ] Reset filters button
- [ ] Export button slot
- [ ] View options button slot
- [ ] Settings popover (reset column sizes, reset order, clear selection, show all columns)
- [ ] Custom toolbar content slot

### 12.4 Pagination Component (`src/pagination.tsx`)
- [ ] Port pagination with cleanup (remove direct `window.history` manipulation)
- [ ] Page size selector
- [ ] First/Prev/Next/Last buttons
- [ ] "X of Y rows selected" display
- [ ] Size variants (sm, default, lg)

### 12.5 Column Header Component (`src/column-header.tsx`)
- [ ] Port sortable column header (dropdown: Asc, Desc, Hide)
- [ ] Keep as-is — clean component

### 12.6 Column Resizer Component (`src/resizer.tsx`)
- [ ] Port column resize handle
- [ ] Keep as-is — clean component

### 12.7 View Options Component (`src/view-options.tsx`)
- [ ] Port column visibility toggle + drag-to-reorder
- [ ] Keep search within columns
- [ ] Keep reset column order

### 12.8 Export Component (`src/export.tsx`)
- [ ] Port export dropdown (simplified — no subrow export)
- [ ] Export selected as CSV/Excel
- [ ] Export current page as CSV/Excel
- [ ] Export all pages as CSV/Excel (when adapter supports)
- [ ] Respect column visibility and order in export

### 12.9 Expand Icon Component (`src/expand-icon.tsx`)
- [ ] Port expand icon for future row expansion support

### Verification
- [ ] `bun run build` passes for `packages/table`
- [ ] `bun run typecheck` passes for `packages/table`

## Phase 13: Cell Renderers & Auto-Column Generation

### 13.1 Cell Renderer Registry (`src/renderers/index.ts`)
- [ ] Create `resolveRenderer(type, customRenderers?)` function
- [ ] Map column types to React components
- [ ] Allow user overrides via `renderers` prop

### 13.2 Built-in Cell Renderers
- [ ] `src/renderers/text.tsx` — default text (truncated)
- [ ] `src/renderers/number.tsx` — number with optional formatting
- [ ] `src/renderers/date.tsx` — date with format support
- [ ] `src/renderers/boolean.tsx` — checkbox or Yes/No display
- [ ] `src/renderers/badge.tsx` — status badge with color from `options`
- [ ] `src/renderers/link.tsx` — clickable URL
- [ ] `src/renderers/image.tsx` — image/avatar with fallback
- [ ] `src/renderers/progress.tsx` — progress bar
- [ ] `src/renderers/tags.tsx` — array of badges
- [ ] `src/renderers/actions.tsx` — row action buttons

### 13.3 Auto-Column Generation (`src/auto/auto-columns.ts`)
- [ ] Implement `generateColumns<T>(metadata, customRenderers?)` function
- [ ] Map `TableMetadata.columns` → `ColumnDef<T>[]`
- [ ] Use `DataTableColumnHeader` for sortable headers
- [ ] Use cell renderer registry for cell rendering
- [ ] Respect `hidden`, `sortable`, `width`, `minWidth`, `maxWidth`

### 13.4 Auto-Filter Generation (`src/auto/auto-filters.ts`)
- [ ] Implement `generateFilterConfig(metadata)` function
- [ ] Map `FilterMetadata` to filter UI configuration
- [ ] Support `options` → select/multi-select
- [ ] Support `datePresets` → preset buttons

### 13.5 Auto-Columns Hook
- [ ] Create `useAutoColumns(adapter, manualColumns?, renderers?)` hook
- [ ] If `manualColumns` provided, use them directly
- [ ] If not, call `adapter.meta()` and generate columns
- [ ] Cache metadata to avoid refetching

### Verification
- [ ] `bun run build` passes for `packages/table`
- [ ] `bun run typecheck` passes for `packages/table`

## Phase 14: Adapters (Data Source Bridges)

### 14.1 TableCraft Adapter (`src/auto/tablecraft-adapter.ts`)
- [ ] Implement `createTableCraftAdapter<T>(options)` function
- [ ] Options: `baseUrl`, `table`, `headers?`, `fetch?`
- [ ] Use `@tablecraft/client` internally
- [ ] Map `QueryParams` → client `query()` params
- [ ] Implement `meta()` via client `meta()`
- [ ] Implement `export()` via client `export()`

### 14.2 Simple REST Adapter (`src/auto/rest-adapter.ts`)
- [ ] Implement `createRestAdapter<T>(options)` function
- [ ] Accept `queryFn: (params) => Promise<QueryResult<T>>`
- [ ] Accept optional `queryByIdsFn`, `metaFn`
- [ ] Zero assumptions about backend API shape

### 14.3 Static Data Adapter (`src/auto/static-adapter.ts`)
- [ ] Implement `createStaticAdapter<T>(data, options?)` function
- [ ] Client-side pagination, sorting, filtering
- [ ] For small datasets / prototyping

### Verification
- [ ] `bun run build` passes for `packages/table`
- [ ] `bun run typecheck` passes for `packages/table`

## Phase 15: Shadcn Registry & Exports

### 15.1 Package Exports (`src/index.ts`)
- [ ] Export `DataTable` component
- [ ] Export `DataTableColumnHeader` component
- [ ] Export `DataTablePagination` component
- [ ] Export `DataTableToolbar` component
- [ ] Export `DataTableViewOptions` component
- [ ] Export `DataTableExport` component
- [ ] Export `DataTableResizer` component
- [ ] Export `ExpandIcon` component
- [ ] Export all adapters (`createTableCraftAdapter`, `createRestAdapter`, `createStaticAdapter`)
- [ ] Export all hooks (`useTableData`, `useUrlState`, `useTableConfig`, `useColumnResize`)
- [ ] Export all types
- [ ] Export all cell renderers
- [ ] Export `resolveRenderer` and `generateColumns`

### 15.2 Shadcn Registry (`packages/table/registry.json`)
- [ ] Create registry manifest for `npx shadcn@latest add` support
- [ ] List all component files with proper targets
- [ ] List all dependencies and registryDependencies

### 15.3 Peer Dependency Strategy
- [ ] `react`, `react-dom`, `@tanstack/react-table`, `tailwindcss` — required peers
- [ ] `exceljs` — optional peer (Excel export)
- [ ] `@tablecraft/client` — optional peer (TableCraft adapter)
- [ ] `date-fns` — optional peer (date formatting)
- [ ] `sonner` — required (toast notifications for export)

### Verification
- [ ] `bun run build` passes for `packages/table`
- [ ] `bun run typecheck` passes for `packages/table`

## Phase 16: Testing & Polish

### 16.1 Unit Tests
- [ ] URL state hook tests
- [ ] Table data hook tests (mock adapter)
- [ ] Auto-column generation tests (mock metadata)
- [ ] Cell renderer tests
- [ ] Export utility tests (CSV)
- [ ] Adapter tests (TableCraft, REST, Static)
- [ ] Deep equality utility tests

### 16.2 Build Verification
- [ ] `bun run build` — all packages
- [ ] `bun run typecheck` — all packages
- [ ] `bun test` — all packages

## Phase 17: Demo App & Documentation

### 17.1 Example App (`apps/table-demo`)
- [ ] Create demo app (Vite + React or Next.js)
- [ ] Pattern 1: Zero-config with TableCraft adapter (auto-columns from `/_meta`)
- [ ] Pattern 2: Custom columns + TableCraft adapter
- [ ] Pattern 3: REST adapter + manual columns
- [ ] Pattern 4: Static data adapter
- [ ] Show custom cell renderers
- [ ] Show toolbar customization
- [ ] Show export functionality

### 17.2 Documentation
- [ ] README with quick start (3 usage patterns)
- [ ] API reference for `DataTableProps`
- [ ] Cell renderer customization guide
- [ ] Adapter creation guide
- [ ] Migration guide from `tnks-data-table`

### Final Verification
- [ ] **Build All**: `bun run build` (root)
- [ ] **Typecheck**: `bun run typecheck`
- [ ] **Test**: `bun test`
