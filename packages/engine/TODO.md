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

## Phase 6: Limitations & Features Expansion (Current)

### 1. The "OR" Problem (Complex Filtering)
- [ ] **Config Schema**: Update `TableConfig` to support filter groups (nested AND/OR).
- [ ] **Builder**: Add `.whereOr()` and `.whereGroup()` to `TableDefinitionBuilder`.
- [ ] **Engine**: Update `FilterGroupBuilder` to construct recursive SQL conditions.
- [ ] **Example**: Add demo route/test for complex filtering (e.g., `(A AND B) OR C`).

### 2. GROUP BY & Aggregation Reports
- [ ] **Config Schema**: Add `GroupByConfig` (fields, having).
- [ ] **Builder**: Add `.groupBy()` and `.having()` methods.
- [ ] **Engine**:
    - [ ] Create `GroupByBuilder`.
    - [ ] Implement `queryGrouped()` mode in engine (returns `GroupedResult`).
- [ ] **Example**: Add "Sales by Month" or similar report endpoint.

### 3. Nested Relations (Includes)
- [ ] **Config Schema**: Add `IncludeConfig` (table, keys, nested includes).
- [ ] **Builder**: Add `.include()` method for fetching related data.
- [ ] **Engine**:
    - [ ] Create `RelationBuilder` to execute secondary queries (batching IDs).
    - [ ] Merge results in JS (post-processing).
- [ ] **Example**: Fetch User -> Orders -> Items hierarchy.

### 4. Recursive Queries (CTEs)
- [ ] **Config Schema**: Add `RecursiveConfig` (parentKey, childKey, maxDepth).
- [ ] **Builder**: Add `.recursive()` method.
- [ ] **Engine**:
    - [ ] Create `RecursiveBuilder` to generate `WITH RECURSIVE` SQL.
    - [ ] Implement `queryRecursive()` mode.
- [ ] **Example**: Fetch Category tree (electronics -> laptops -> gaming).

### 5. Advanced Joins & Raw SQL
- [ ] **Builder**:
    - [ ] Update `.join()` to accept `sql` template literal for `ON` condition.
    - [ ] Add `.rawSelect()`, `.rawWhere()`, `.rawJoin()`, `.rawOrderBy()`.
- [ ] **Engine**:
    - [ ] Pass runtime SQL objects from builder to engine.
    - [ ] Inject raw SQL fragments into the query pipeline.
- [ ] **Example**: Join with complex condition (e.g., email domain match).

### Verification
- [ ] **Typecheck**: Ensure all new types resolve correctly.
- [ ] **Build**: Verify all packages build.
- [ ] **Tests**: Add specific tests for each new feature in `apps/hono-example`.
