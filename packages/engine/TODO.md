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
- [ ] **Build All**: `bun run build` (root)
- [ ] **Typecheck**: `bun run typecheck`
- [ ] **Test**: `bun test`
