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
