# Backend Engine Implementation Plan (TODO)

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

