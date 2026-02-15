# TableCraft Implementation Plan

> Date: 2025-02-15
> Status: ✅ **COMPLETED**
> Related Issue: Date filter throws error when table has no date column

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Root Cause Analysis](#2-root-cause-analysis)
3. [Architecture Design](#3-architecture-design)
4. [Edge Cases](#4-edge-cases)
5. [Implementation Phases](#5-implementation-phases)
6. [Type Generation Design](#6-type-generation-design)
7. [Testing Strategy](#7-testing-strategy)

---

## 1. Problem Statement

### Initial Issue
```
GET /engine/products?filter[createdAt][gte]=...&filter[createdAt][lte]=...
→ FieldError: Field 'createdAt': does not exist
```

The `products` table has NO date column, but frontend sends date range filters, causing a 500 error.

### Core Question
> "Why does the frontend show a date filter when the table has no date column?"

### Design Philosophy
- **80/20 Rule**: 80% zero-config auto, 20% full control
- **No Limitations**: Developer should never feel limited by the engine
- **Type Safety**: Full TypeScript support, even in decoupled architecture
- **Decoupled**: Frontend and backend can be separate repos

---

## 2. Root Cause Analysis

### Problem Chain

| Layer | File | Issue |
|-------|------|-------|
| Database | `schema.ts` | `products` table has NO `createdAt` column |
| Backend Metadata | `metadataBuilder.ts` | ✅ Returns `dateRangeColumn: null` |
| Frontend Adapter | `tablecraft-adapter.ts:94-99` | ❌ Hardcodes `filter[createdAt][gte/lte]` |
| Frontend Page | `products-page.tsx:33-47` | ❌ Hardcodes date picker regardless of metadata |
| Backend Validator | `inputValidator.ts:42-43` | ❌ Throws `FieldError` on non-existent field |

### Backend Metadata (Correct)
```json
{
  "name": "products",
  "dateRangeColumn": null,
  "filters": ["price", "category", "isArchived"]
}
```

---

## 3. Architecture Design

### 3.1 Multi-Date Column Support

```
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Engine)                          │
│                                                                  │
│  TableConfig                                                     │
│  ├── name: string (API endpoint name)                           │
│  ├── base: string (DB table name)                               │
│  ├── columns: ColumnConfig[]                                    │
│  ├── dateRangeColumn: string | null (default for global picker) │
│  └── ...                                                         │
│                                                                  │
│  Metadata API (GET /:table/_meta)                               │
│  ├── dateRangeColumn: string | null                             │
│  ├── dateColumns: string[] (ALL date-type columns)              │
│  └── filterableColumns: { field, type, operators }[]            │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Table)                          │
│                                                                  │
│  DataTable Modes:                                                │
│  ├── Auto Mode (80%) - Zero config, everything auto-generated   │
│  ├── Custom Mode (20%) - Full control via renderToolbar         │
│  └── Hybrid Mode - Mix auto + custom                            │
│                                                                  │
│  DataAdapter Interface:                                          │
│  ├── query(params) → data                                       │
│  ├── meta() → TableMetadata                                     │
│  └── Types flow through automatically                           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Type Safety in Decoupled Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  SAME REPO (Monorepo)                                            │
│  Direct import: import type { ProductsRow } from '@repo/types'  │
├─────────────────────────────────────────────────────────────────┤
│  SEPARATE REPOS (Decoupled)                                      │
│  Option A: Codegen CLI                                           │
│  $ npx @tablecraft/codegen --url https://api.com --out ./types  │
│                                                                  │
│  Option B: Runtime metadata (no compile-time types)             │
│  Option C: OpenAPI/Swagger integration                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Naming Convention

| API Name | File Name | Type Name | Factory Name |
|----------|-----------|-----------|--------------|
| `products` | `products.ts` | `ProductsRow` | `createProductsAdapter` |
| `orderDetails` | `order-details.ts` | `OrderDetailsRow` | `createOrderDetailsAdapter` |
| `salesAnalytics` | `sales-analytics.ts` | `SalesAnalyticsRow` | `createSalesAnalyticsAdapter` |

**One API endpoint = One file = One type = One factory**

---

## 4. Edge Cases

### 4.1 Raw SQL Without Type Hints

**Problem:**
```typescript
defineTable(rawQuery`SELECT * FROM some_table`).name('rawData');
// Codegen can't infer types
```

**Solution:**
```typescript
// Generated: raw-data.ts
export interface RawDataRow {
  [key: string]: unknown;  // Fallback - works but no autocomplete
}
```

---

### 4.2 Dynamic Columns

**Problem:**
```typescript
// Columns change based on context
.columnsDynamic((context) => context.user.role === 'admin' ? adminCols : userCols)
```

**Solution:**
```typescript
export interface DynamicDataRow {
  id: number;  // Common columns
  name: string;
  [key: string]: unknown;  // Dynamic columns
}
```

---

### 4.3 JSON Columns

**Problem:**
```typescript
.column('metadata', 'json')  // Unknown structure
```

**Solution:**
```typescript
// Option A: Declare type
.jsonType<EventTypeMetadata>('metadata')

// Option B: Fallback
export interface EventsRow {
  metadata: Record<string, unknown>;
}
```

---

### 4.4 Computed Columns

**Problem:** Columns computed in backend, not in DB

**Solution:**
```typescript
export interface OrdersRow {
  id: number;
  totalItems: number;  // Computed, always present after fetch
}
```

---

### 4.5 Hidden Columns

**Problem:** Hidden from UI but used in backend

**Solution:**
```typescript
// Full row (backend/internal)
export interface UsersRow {
  passwordHash: string;  // Included
}

// Public row (frontend display)
export interface UsersRowPublic {
  // Hidden columns excluded
}
```

---

### 4.6 Nullable Columns

**Problem:** Column can be null in DB

**Solution:**
```typescript
export interface OrdersRow {
  shippedAt: Date | null;
  notes: string | null;
}
```

---

### 4.7 Enum Columns

**Problem:** Column with predefined values

**Solution:**
```typescript
export type OrderStatus = 'pending' | 'shipped' | 'delivered';

export interface OrdersRow {
  status: OrderStatus;  // Union type with autocomplete
}
```

---

### 4.8 Date Serialization

**Problem:** Date in DB → String in JSON

**Solution:**
```typescript
export interface OrdersRow {
  createdAt: string;  // ISO string from JSON
}

// Optional transformer
export const OrdersTransformers = {
  createdAt: (v: string) => new Date(v),
};
```

---

### 4.9 Schema Version Changes

**Problem:** Backend schema changed, frontend types stale

**Solution:**
```typescript
// Generated file header
// @tablecraft-version: 2024-02-15T10:30:00Z
// @tablecraft-hash: abc123

// Runtime check in dev mode
if (metadata._version !== GENERATED_VERSION) {
  console.warn('[TableCraft] Backend schema changed! Re-run codegen');
}
```

---

### 4.10 Partial Column Select

**Problem:** Developer only wants some columns

**Solution:**
```typescript
export type ProductsColumn = keyof ProductsRow;

// Type-safe select
const columns: ProductsColumn[] = ['id', 'name'];

// Result type
type SelectedRow = Pick<ProductsRow, 'id' | 'name'>;
```

---

### 4.11 Duplicate API Names

**Problem:** Two APIs with same name

**Solution:**
- Backend validates `name` is unique at config load time
- Codegen double-checks and shows clear error
- Developer must use different `.name()` values

---

### 4.12 Multiple APIs on Same DB Table

**Problem:** Different views of same table

**Solution:**
```typescript
defineTable(products).name('activeProducts').staticFilter('archived', false);
defineTable(products).name('archivedProducts').staticFilter('archived', true);

// Generates separate types:
// active-products.ts → ActiveProductsRow
// archived-products.ts → ArchivedProductsRow
```

---

## 5. Implementation Phases

### Phase 1: Quick Fixes (High Priority) ✅ COMPLETED

| # | Task | Status | File |
|---|------|--------|------|
| 1.1 | Backend: Skip unknown filter fields gracefully | ✅ | `inputValidator.ts` |
| 1.2 | Backend: Add `dateColumns[]` to metadata | ✅ | `metadataBuilder.ts` |
| 1.3 | Backend: Improve `dateRangeColumn` detection | ✅ | `metadataBuilder.ts` |
| 1.4 | Frontend: Use `dateRangeColumn` from metadata | ✅ | `tablecraft-adapter.ts` |
| 1.5 | Frontend: DataTable respects metadata | ✅ | `data-table.tsx` (already had logic) |
| 1.6 | Frontend: Fix products-page example | ✅ | `products-page.tsx` |

### Phase 2: Type Generation (Medium Priority) ✅ COMPLETED

| # | Task | Status | File |
|---|------|--------|------|
| 2.1 | Create `@tablecraft/codegen` package | ✅ | `packages/codegen/` |
| 2.2 | Fetch metadata from API endpoint | ✅ | `codegen/src/fetch-meta.ts` |
| 2.3 | Generate TypeScript interfaces | ✅ | `codegen/src/generator.ts` |
| 2.4 | Generate adapter factory functions | ✅ | `codegen/src/generator.ts` |
| 2.5 | Handle edge cases | ✅ | `codegen/src/generator.ts` |
| 2.6 | Add version tracking | ✅ | `codegen/src/generator.ts` |
| 2.7 | Add `/_tables` endpoint for discovery | ✅ | `adapter-hono/src/index.ts` |

### Phase 3: Unit Tests ✅ COMPLETED

| # | Task | Status | File |
|---|------|--------|------|
| 3.1 | Unit tests for inputValidator | ✅ | `engine/src/__tests__/inputValidator.test.ts` |
| 3.2 | Unit tests for metadataBuilder | ✅ | `engine/src/__tests__/metadataBuilder.test.ts` |

---

## 6. Type Generation Design

### 6.1 Generated File Structure

```
src/generated/
├── index.ts              # Export everything
├── products.ts           # ProductsRow, createProductsAdapter
├── orders.ts             # OrdersRow, createOrdersAdapter
└── sales-analytics.ts    # SalesAnalyticsRow, createSalesAnalyticsAdapter
```

### 6.2 Generated Type Example

```typescript
// products.ts (AUTO-GENERATED)
// @tablecraft-version: 2024-02-15T10:30:00Z
// @tablecraft-hash: abc123

import { createTableCraftAdapter, type DataAdapter } from '@tablecraft/table';

export interface ProductsRow {
  id: number;
  name: string;
  price: number;
  category: string;
  isArchived: boolean;
}

export interface ProductsFilters {
  price?: { operator: 'gt' | 'lt' | 'between'; value: number | [number, number] };
  category?: { operator: 'eq' | 'in'; value: string | string[] };
  isArchived?: { operator: 'eq'; value: boolean };
}

export type ProductsColumn = keyof ProductsRow;

export function createProductsAdapter(options: {
  baseUrl: string;
  headers?: Record<string, string>;
}): DataAdapter<ProductsRow> {
  return createTableCraftAdapter<ProductsRow>({
    ...options,
    table: 'products',
  });
}
```

### 6.3 Developer Usage

```typescript
// Option A: Generated adapter (recommended)
import { createProductsAdapter } from './generated';
const adapter = createProductsAdapter({ baseUrl: '/api/engine' });
// TypeScript KNOWS this returns DataAdapter<ProductsRow>

// Option B: Common function (flexible)
import { createTableCraftAdapter } from '@tablecraft/table';
import type { ProductsRow } from './generated';
const adapter = createTableCraftAdapter<ProductsRow>({
  baseUrl: '/api/engine',
  table: 'products',
});
```

---

## 7. Testing Strategy

### 7.1 Unit Tests Required

| Component | Test File | Coverage |
|-----------|-----------|----------|
| inputValidator | `inputValidator.test.ts` | Unknown fields skipped, valid fields validated |
| metadataBuilder | `metadataBuilder.test.ts` | dateColumns array, dateRangeColumn detection |
| tablecraft-adapter | `tablecraft-adapter.test.ts` | Uses metadata.dateRangeColumn |
| DataTable | `data-table.test.tsx` | Date filter respects metadata |
| codegen | `codegen.test.ts` | Type generation, edge cases |

### 7.2 Test Scenarios

```typescript
// inputValidator.test.ts
describe('validateFilterValues', () => {
  it('should skip unknown filter fields gracefully', () => {
    const params = { filters: { nonexistent: { operator: 'eq', value: 1 } } };
    const config = { columns: [{ name: 'id', type: 'number' }] };
    // Should NOT throw
    expect(() => validateInput(params, config)).not.toThrow();
  });
  
  it('should validate known filter fields', () => {
    const params = { filters: { id: { operator: 'gt', value: 'invalid' } } };
    const config = { columns: [{ name: 'id', type: 'number', filterable: true }] };
    expect(() => validateInput(params, config)).toThrow(ValidationError);
  });
});

// metadataBuilder.test.ts
describe('dateRangeColumn detection', () => {
  it('should return null when no date columns exist', () => {
    const config = { columns: [{ name: 'id', type: 'number' }] };
    const meta = buildMetadata(config);
    expect(meta.dateRangeColumn).toBeNull();
  });
  
  it('should detect createdAt column', () => {
    const config = { columns: [{ name: 'createdAt', type: 'date' }] };
    const meta = buildMetadata(config);
    expect(meta.dateRangeColumn).toBe('createdAt');
  });
  
  it('should use explicit dateRangeColumn', () => {
    const config = {
      dateRangeColumn: 'customDate',
      columns: [{ name: 'customDate', type: 'date' }, { name: 'createdAt', type: 'date' }]
    };
    const meta = buildMetadata(config);
    expect(meta.dateRangeColumn).toBe('customDate');
  });
});
```

### 7.3 Build Verification

Before marking any task complete:
1. ✅ Unit tests pass
2. ✅ `pnpm typecheck` passes
3. ✅ `pnpm build` succeeds
4. ✅ No TypeScript errors

---

## Changelog

### 2025-02-15 - IMPLEMENTATION COMPLETE
- ✅ Fixed inputValidator to skip unknown filter fields gracefully
- ✅ Added `dateColumns[]` array to TableMetadata
- ✅ Improved `dateRangeColumn` detection logic
- ✅ Fixed frontend adapter to use `dateRangeColumn` from metadata
- ✅ Fixed products-page example to use auto date filter
- ✅ Created `@tablecraft/codegen` CLI package
- ✅ Added `/_tables` endpoint for codegen discovery
- ✅ Generated TypeScript types with full type safety
- ✅ Generated adapter factory functions with baked-in types
- ✅ Unit tests for inputValidator (14 tests)
- ✅ Unit tests for metadataBuilder (12 tests)
- ✅ All builds passing, all tests passing

### 2025-02-15 - Initial Design
- Initial design discussion
- Identified root cause chain
- Designed multi-date column support
- Designed type generation for decoupled architecture
- Documented all edge cases
- Created implementation phases

---

## Notes

- `name` in TableConfig is ALWAYS required (API endpoint name)
- `base` is the DB table name (can be same table for multiple APIs)
- File name = kebab-case of API name
- Type name = PascalCase of API name + "Row"
- Factory name = camelCase of API name + "Adapter"
