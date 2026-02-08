# Backend Engine Plan

## 1. Overview & Vision
The "Backend Engine" is a configuration-driven query builder that sits between the API and the Database (via Drizzle ORM). It is designed to:
- **Abstract Complexity:** Generates complex Drizzle queries (joins, subqueries, filters, aggregations) from a simple JSON/TypeScript configuration.
- **Type-Safe:** Outputs fully typed Drizzle query objects, ensuring TypeScript safety throughout the stack.
- **Secure:** Prevents SQL injection by using Drizzle's parameterization and avoiding raw SQL strings.
- **Flexible:** Supports both "Config Mode" (JSON) for standard use cases and "Code Mode" (TypeScript functions) for complex logic.

## 2. Core Concepts

### 2.1 Configuration-Driven Architecture
The engine consumes a `TableConfig` object that fully describes the data requirement.
- **Input:** JSON/Object configuration.
- **Process:** Validation -> Query Building -> Execution -> Transformation.
- **Output:** JSON Response or Drizzle Query Object.

### 2.2 Schema Extraction & Validation
The engine reads Drizzle schema definitions to:
- Validate that tables and columns exist.
- Infer types for filters and search.
- Prevent runtime SQL errors by catching config typos at startup.

### 2.3 Query Builder Pipeline
The `buildQuery(db, schema, config, params, context)` function follows this pipeline:
1.  **Context Injection:** Applies tenant filters (`tenantId`) and soft-delete logic (`deletedAt is null`) automatically.
2.  **Base Selection:** Constructs `.select()` based on `config.columns` and `config.subqueries`.
3.  **Joins:** Applies `.leftJoin()`, `.innerJoin()` recursively based on `config.joins`.
4.  **Filtering:**
    *   Applies `config.backendConditions` (static WHERE).
    *   Applies `params.filters` (dynamic WHERE) mapping to `config.filters`.
5.  **Search:** Applies `ILIKE`, `OR`, or Full-Text Search based on `config.search`.
6.  **Sorting:** Applies `.orderBy()` based on `params.sort` or `config.defaultSort`.
7.  **Pagination:** Applies `.limit()` and `.offset()`.

### 2.4 Two-Layer Transform System
To support both SQL-level and Application-level logic:
1.  **Layer 1 (DB):** Drizzle `sql` templates.
    *   `dbTransform: ['upper', 'trim']` -> `sql<string>\`trim(upper(${col}))\``
2.  **Layer 2 (JS):** JavaScript functions after fetching.
    *   `jsTransform: ['slice(0,3)', 'formatDate']` -> `row.val.slice(0,3)`

## 3. Configuration Schema (Full Spec)

Based on `table4-full-plan.md`, the `TableConfig` interface includes:

```typescript
interface TableConfig {
  // Core
  name: string;
  base: string; // Drizzle table name
  columns: ColumnConfig[];

  // Relationships
  joins?: JoinConfig[];

  // Data Operations
  filters?: FilterConfig[];
  search?: SearchConfig;
  defaultSort?: SortConfig[];
  pagination?: PaginationConfig;

  // Advanced Logic
  backendConditions?: ConditionConfig[]; // Static filters (security)
  aggregations?: AggregationConfig[];    // COUNT, SUM, etc.
  subqueries?: SubqueryConfig[];         // Nested selects
  
  // Platform Features
  tenant?: TenantConfig;       // Multi-tenancy auto-filter
  softDelete?: SoftDeleteConfig; // Soft delete handling
  cache?: CacheConfig;         // API response caching
  export?: ExportConfig;       // CSV/JSON export settings
  
  // Access Control
  access?: {
    roles?: string[];
    permissions?: string[];
  };
}
```

## 4. Development Roadmap (Backend)

### Phase 1: Core Engine (Weeks 1-3)
*   **Week 1: Foundation & Validation**
    *   Project setup (Monorepo).
    *   Define full `TableConfig` schema using Zod.
    *   Implement `validateConfig(config, drizzleSchema)` to ensure config validity.
*   **Week 2: Basic Query Building**
    *   Implement `buildSelect()` with `dbTransform` support.
    *   Implement `buildJoins()` with recursive joining support.
    *   Implement `buildBackendConditions()` (Fixed WHERE).
*   **Week 3: Interactive Features**
    *   Implement `buildFilters()` (Dynamic WHERE from URL).
    *   Implement `buildSearch()` (Global search across fields).
    *   Implement `buildSort()` and `buildPagination()`.

### Phase 2: SDK & Platform Logic (Weeks 4-5)
*   **Week 4: The SDK**
    *   Create `createTableEngine()` factory.
    *   Implement `parseRequest()` (URL -> Structured Params).
    *   Implement `formatResponse()` (Data + Meta + JS Transforms).
*   **Week 5: Framework Adapters**
    *   **Next.js:** `createNextHandler()` for App Router.
    *   **Express:** `createExpressMiddleware()`.
    *   **Context:** Handle `tenantId` and `user` context injection.

### Phase 3: Advanced Features (Weeks 6-7)
*   **Week 6: Complex Data Logic**
    *   **Aggregations:** Implement `buildAggregations()` (COUNT/SUM/AVG).
    *   **Subqueries:** Implement nested select logic (e.g., `lastOrderDate`).
    *   **Soft Delete:** Implement middleware to auto-filter deleted rows.
    *   **Caching:** Add `unstable_cache` (Next.js) or memory cache wrapper.
*   **Week 7: Code Generation & Export**
    *   **Export:** Implement CSV/JSON stream generation.
    *   **Eject:** Implement `generateDrizzleCode()` to output raw TS files.
    *   **OpenAPI:** Auto-generate Swagger specs from `TableConfig`.

## 5. API Specification (Generated)
The engine automatically serves:

- **Endpoint:** `GET /api/[table]`
- **Parameters:**
    - `page`, `pageSize`
    - `sort` (e.g., `-createdAt`)
    - `filter[key]` (e.g., `filter[status]=active`)
    - `search`
    - `export` (e.g., `csv`)
- **Response:**
    ```json
    {
      "data": [ ... ],
      "meta": {
        "total": 100,
        "page": 1,
        "pageSize": 10,
        "totalPages": 10
      },
      "aggregations": {
        "totalAmount": 5000
      }
    }
    ```

## 6. Security & Performance Strategy
1.  **No Raw SQL:** All user input passes through Drizzle operators (`eq`, `ilike`, etc.).
2.  **Context Injection:** `tenantId` is injected at the engine level, not the query level, making it impossible to forget.
3.  **Field Whitelisting:** Only fields defined in `columns` are selectable.
4.  **Max Limit:** Hard cap on `pageSize` to prevent DOS.