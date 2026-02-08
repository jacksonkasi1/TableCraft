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
- [ ] **Filter Builder (Dynamic WHERE)**
    - [ ] Create `src/core/filterBuilder.ts`
    - [ ] Implement `buildFilters(query, config, params)`
    - [ ] Support basic operators (`eq`, `neq`, `gt`, `lt`, `contains`)
    - [ ] Support range filters (`between`)
    - [ ] Support list filters (`in`, `notIn`)
- [ ] **Search Builder**
    - [ ] Create `src/core/searchBuilder.ts`
    - [ ] Implement `buildSearch(query, config, searchTerm)`
    - [ ] Support `ILIKE` across multiple columns (`OR` logic)
    - [ ] Support PostgreSQL Full-Text Search (`tsvector`) if enabled
- [ ] **Sort & Pagination**
    - [ ] Implement `buildSort(query, config, sortParams)`
    - [ ] Implement `buildPagination(query, page, pageSize)`
    - [ ] Add safety limits (max page size)

## Phase 2: SDK & Platform Logic

### Week 4: The SDK
- [ ] **Engine Factory**
    - [ ] Create `src/engine.ts`
    - [ ] Implement `createTableEngine({ schema, config })`
    - [ ] Expose `buildQuery` and `execute` methods
- [ ] **Request Parser**
    - [ ] Create `src/utils/requestParser.ts`
    - [ ] Implement `parseRequest(urlParams)` -> `EngineParams`
    - [ ] Handle nested filter syntax (`filter[status]=active`)
    - [ ] Handle sort syntax (`sort=-createdAt`)
- [ ] **Response Formatter**
    - [ ] Create `src/utils/responseFormatter.ts`
    - [ ] Implement `formatResponse(data, meta, config)`
    - [ ] Apply `jsTransform` functions (Layer 2 transforms)
    - [ ] Format dates and currency based on config

### Week 5: Framework Adapters
- [ ] **Next.js Adapter**
    - [ ] Create `src/adapters/next.ts`
    - [ ] Implement `createNextHandler({ db, schema, configs })`
    - [ ] Handle Request/Response objects
- [ ] **Express Adapter**
    - [ ] Create `src/adapters/express.ts`
    - [ ] Implement `createExpressMiddleware({ db, schema, configs })`
- [ ] **Context Injection**
    - [ ] Implement context middleware for `tenantId` extraction

## Phase 3: Advanced Features

### Week 6: Complex Data Logic
- [ ] **Aggregations**
    - [ ] Implement `buildAggregations(query, config)`
    - [ ] Support `count`, `sum`, `avg`, `min`, `max`
- [ ] **Subqueries**
    - [ ] Implement `buildSubqueries(query, config)`
    - [ ] Support `count` subqueries (e.g., `ordersCount`)
    - [ ] Support `exists` subqueries
- [ ] **Soft Delete**
    - [ ] Implement global soft-delete filter injection
    - [ ] Support "include deleted" override for admins
- [ ] **Caching**
    - [ ] Implement basic memory cache wrapper
    - [ ] Add hooks for external cache (Redis/Vercel KV)

### Week 7: Code Generation & Export
- [ ] **Export Logic**
    - [ ] Implement `exportData(query, format)`
    - [ ] Support CSV generation
    - [ ] Support JSON generation
- [ ] **Eject (Code Generation)**
    - [ ] Implement `generateDrizzleCode(config)`
    - [ ] Output TypeScript code string for manual use
- [ ] **OpenAPI Spec**
    - [ ] Implement `generateOpenApiSpec(config)`
    - [ ] Output JSON schema for API documentation
