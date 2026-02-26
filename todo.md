# TableCraft Documentation TODO

> Generated: 2026-02-18
> This file tracks missing documentation and planned improvements.

---

## 📋 Legend

| Priority | Meaning |
|----------|---------|
| 🔴 P0 | Critical - Blocking for production use |
| 🟠 P1 | High - Important for adoption |
| 🟡 P2 | Medium - Nice to have |
| 🟢 P3 | Low - Future consideration |

| Difficulty | Meaning |
|------------|---------|
| ⭐ Easy | < 2 hours, straightforward |
| ⭐⭐ Medium | 2-8 hours, moderate complexity |
| ⭐⭐⭐ Hard | > 8 hours, requires research/planning |
| ⭐⭐⭐⭐ Very Hard | > 2 weeks, major feature |
| ⭐⭐⭐⭐ Very Hard | > 2 weeks, major feature |

---

## 🚀 Action Plan (Immediate Priority)

### 1. Client SDK Deep Dive

> **Why:** Users need documentation to effectively use `@tablecraft/client` package

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Create `docs/client-sdk.md` | 🔴 P0 | ⭐⭐ | ✅ Done |
| - [x] Document `createClient()` API | 🔴 P0 | ⭐ | ✅ Done |
| - [x] Document `useTableQuery()` hook | 🔴 P0 | ⭐ | ✅ Done |
| - [x] Document `useTableMeta()` hook | 🔴 P0 | ⭐ | ✅ Done |
| - [x] Add React usage examples | 🟠 P1 | ⭐ | ✅ Done |
| - [x] Add non-React/vanilla JS usage | 🟡 P2 | ⭐⭐ | ✅ Done |
| - [x] Document error handling patterns | 🟡 P2 | ⭐ | ✅ Done |

### 2. Custom Adapter Guide

> **Why:** Key for adoption outside TableCraft backend ecosystem

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Create `docs/custom-adapter.md` (now `adapters/`) | 🔴 P0 | ⭐⭐ | ✅ Done |
| - [x] Document `DataAdapter` interface | 🔴 P0 | ⭐ | ✅ Done |
| - [x] Example: REST API adapter | 🔴 P0 | ⭐⭐ | ✅ Done |
| - [x] Example: GraphQL adapter | 🟡 P2 | ⭐⭐⭐ | ✅ Done |
| - [x] Example: Supabase adapter | 🟡 P2 | ⭐⭐ | ✅ Done |
| - [x] Example: Firebase/Firestore adapter | 🟢 P3 | ⭐⭐⭐ | ✅ Done |
| - [ ] Adapter testing patterns | 🟡 P2 | ⭐⭐ | Pending |

### 2.1 Axios Support for Client

> **Why:** Many projects use axios with interceptors, auth logic, etc.

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Add `axios` option to `ClientOptions` | 🔴 P0 | ⭐ | ✅ Done |
| - [x] Create internal axios-to-fetch adapter | 🔴 P0 | ⭐ | ✅ Done |
| - [x] Add axios as optional peer dependency | 🟠 P1 | ⭐ | ✅ Done |
| - [x] Document axios usage in client-sdk.md | 🔴 P0 | ⭐ | ✅ Done |
| - [x] Add tests for axios adapter | 🟠 P1 | ⭐⭐ | ✅ Done |
| - [x] Add axios example in vite-web-example | 🟠 P1 | ⭐⭐ | ✅ Done |

### 3. FAQ & Troubleshooting

> **Why:** Reduces support burden and improves developer experience

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Create `docs/faq.md` | 🟠 P1 | ⭐ | ✅ Done |
| - [x] Add common errors section | 🟠 P1 | ⭐ | ✅ Done |
| - [x] Add debugging tips | 🟠 P1 | ⭐ | ✅ Done |
| - [ ] Add performance troubleshooting | 🟡 P2 | ⭐⭐ | Pending |
| - [x] Add "Why is my query slow?" section | 🟡 P2 | ⭐ | ✅ Done |
| - [x] Add "Why is filter not working?" section | 🟠 P1 | ⭐ | ✅ Done |
| - [x] Add TypeScript error solutions | 🟡 P2 | ⭐ | ✅ Done |

### 4. Performance Guide

> **Why:** Critical for production use with large datasets

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Create `docs/performance.md` | 🟠 P1 | ⭐⭐ | ✅ Done |
| - [x] Document cursor vs offset pagination | 🟠 P1 | ⭐ | ✅ Done |
| - [x] Document large dataset handling (100k+ rows) | 🟠 P1 | ⭐⭐ | ✅ Done |
| - [x] Document caching strategies | 🟠 P1 | ⭐⭐ | ✅ Done |
| - [x] Document bundle size optimization | 🟡 P2 | ⭐ | ✅ Done |
| - [ ] Add performance benchmarks | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Document memory usage patterns | 🟢 P3 | ⭐⭐ | Pending |

### 5. Examples Expansion

> **Why:** Current examples.md is minimal

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Expand `docs/examples.md` | 🟠 P1 | ⭐⭐ | ✅ Done |
| - [x] Add e-commerce dashboard example | 🟠 P1 | ⭐⭐ | ✅ Done |
| - [ ] Add admin panel example | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Add multi-tenant SaaS example | 🟡 P2 | ⭐⭐⭐ | Pending |
| - [ ] Add real-time data example (WebSocket) | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Add mobile-responsive table example | 🟢 P3 | ⭐⭐ | Pending |

### 6. Changelog

> **Why:** Version tracking for users

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Create `CHANGELOG.md` in root | 🟠 P1 | ⭐ | ✅ Done |
| - [x] Document v0.1.0 release | 🟠 P1 | ⭐ | ✅ Done |
| - [ ] Add breaking changes format | 🟡 P2 | ⭐ | Pending |
| - [ ] Add deprecation notice format | 🟡 P2 | ⭐ | Pending |
| - [ ] Setup automatic changelog generation | 🟢 P3 | ⭐⭐ | Pending |

---

## 🗓️ Future Plan (Roadmap Items)

### 7. Migration Guide

> **Why:** Helps users adopt TableCraft from other solutions

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `docs/migration.md` | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Migrate from raw TanStack Table | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Migrate from AG Grid | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Migrate from React Table v7 | 🟢 P3 | ⭐⭐ | Pending |
| - [ ] Migrate from Material-Table | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Version upgrade guides (v0.x → v1.x) | 🟢 P3 | ⭐ | Pending |

### 8. Deployment & Production Guide

> **Why:** Production readiness documentation

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `docs/production.md` | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Security checklist | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Rate limiting guide | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Monitoring & logging setup | 🟢 P3 | ⭐⭐ | Pending |
| - [ ] Horizontal scaling considerations | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Docker/Kubernetes deployment | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Cloud provider guides (AWS, Vercel, etc.) | 🟢 P3 | ⭐⭐⭐ | Pending |

### 9. Testing Guide

> **Why:** Improves developer confidence

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `docs/testing.md` | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Unit testing with Vitest | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Integration testing patterns | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] E2E testing with Playwright | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Mock adapters for testing | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Testing React hooks | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] CI testing best practices | 🟢 P3 | ⭐⭐ | Pending |

### 10. Plugin Development Guide

> **Why:** Advanced customization and extensibility

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `docs/plugins.md` | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Document plugin API | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Example: Custom filter plugin | 🟢 P3 | ⭐⭐ | Pending |
| - [ ] Example: Custom export plugin | 🟢 P3 | ⭐⭐ | Pending |
| - [ ] Example: Audit log plugin | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Plugin lifecycle hooks | 🟢 P3 | ⭐⭐⭐ | Pending |

### 11. Contributing Guide

> **Why:** Open source community engagement

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [x] Create `CONTRIBUTING.md` | 🟢 P3 | ⭐ | ✅ Done |
| - [x] Development setup instructions | 🟢 P3 | ⭐ | ✅ Done |
| - [x] Code style guidelines | 🟢 P3 | ⭐ | ✅ Done |
| - [x] PR/commit conventions | 🟢 P3 | ⭐ | ✅ Done |
| - [ ] Issue templates | 🟢 P3 | ⭐ | Pending |
| - [ ] PR templates | 🟢 P3 | ⭐ | Pending |
| - [ ] Code of Conduct | 🟢 P3 | ⭐ | Pending |

---

## 🔮 Long-term Vision

### 12. Internationalization (i18n)

> **Why:** Global user base support

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `docs/i18n.md` | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Multi-language support | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Date/number formatting locales | 🟢 P3 | ⭐⭐ | Pending |
| - [ ] RTL language support | 🟢 P3 | ⭐⭐⭐ | Pending |

### 13. API Versioning Strategy

> **Why:** Backward compatibility management

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Document versioning approach | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Breaking change policy | 🟢 P3 | ⭐⭐ | Pending |
| - [ ] Deprecation timeline | 🟢 P3 | ⭐⭐ | Pending |

### 14. Database Migration Strategy

> **Why:** Schema evolution support

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Drizzle schema change guide | 🟢 P3 | ⭐⭐ | Pending |
| - [ ] Zero-downtime migrations | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Config migration helpers | 🟢 P3 | ⭐⭐⭐ | Pending |

---

## 🤝 Seeking Contributors

> **Help wanted!** These features need community contributions to become reality.

### 15. Vue.js Support

> **Why:** Expand ecosystem to Vue developers

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `@tablecraft/client/vue` subpath | 🟡 P2 | ⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Implement `useTableQuery()` Vue composable | 🟡 P2 | ⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Implement `useTableMeta()` Vue composable | 🟡 P2 | ⭐ | 🤝 Seeking Contributor |
| - [ ] Create `@tablecraft/table-vue` package | 🟢 P3 | ⭐⭐⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Port DataTable to Vue 3 (Composition API) | 🟢 P3 | ⭐⭐⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Use shadcn-vue components | 🟢 P3 | ⭐⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Create `apps/vue-example` demo app | 🟢 P3 | ⭐⭐ | 🤝 Seeking Contributor |

### 16. Svelte Support

> **Why:** Expand ecosystem to Svelte developers

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `@tablecraft/client/svelte` subpath | 🟡 P2 | ⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Implement `createTableStore()` Svelte store | 🟡 P2 | ⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Implement `createMetaStore()` Svelte store | 🟡 P2 | ⭐ | 🤝 Seeking Contributor |
| - [ ] Create `@tablecraft/table-svelte` package | 🟢 P3 | ⭐⭐⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Port DataTable to Svelte | 🟢 P3 | ⭐⭐⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Use shadcn-svelte components | 🟢 P3 | ⭐⭐⭐ | 🤝 Seeking Contributor |
| - [ ] Create `apps/svelte-example` demo app | 🟢 P3 | ⭐⭐ | 🤝 Seeking Contributor |

**Interested in contributing?** Check out [CONTRIBUTING.md](./CONTRIBUTING.md) or open a GitHub issue!

---

## 📊 Summary

| Category | Total Tasks | Done | Pending |
|----------|-------------|------|---------|
| Action Plan (§1–6) | 45 | 34 | 11 |
| Future Plan (§7–11) | 33 | 4 | 29 |
| Long-term Vision (§12–14) | 10 | 0 | 10 |
| Seeking Contributors (§15–16) | 14 | 0 | 14 |
| Changelog Known Issues | 11 | 3 | 8 |
| **Total** | **113** | **41** | **72** |

---

## 📝 Notes

- This TODO was generated from analysis of `docs/` and `plan/` folders
- Existing `plan/task/todo.md` contains backend implementation details (completed)
- Priority and difficulty are subjective and can be adjusted
- Check off items as they are completed

---

*Last updated: 2026-02-26*

---

## 🔧 Engine Edge-Case Fix Plan (Completed — 2026-02-22)

> **Context:** Sorting by a `.subquery('itemCount', ..., 'first', ...)` field causes a DB crash because
> `row_to_json()` is non-scalar. Investigation revealed 13 distinct engine edge cases across sorting,
> subqueries, cursor pagination, and metadata. This section tracks all fixes, unit tests, and API tests.
>
> **Status:** ✅ All fixes and tests completed.

---

### Priority Legend

| Symbol | Meaning |
|--------|---------|
| 🔴 | Critical — causes DB error or silent wrong results |
| 🟠 | High — bad DX, incorrect metadata, data loss risk |
| 🟡 | Medium — inconsistency, missing guard |
| 🟢 | Low — style / default cleanup |

---

### Bug Fixes

| # | File | Description | Priority | Status |
|---|------|-------------|----------|--------|
| 1 | `packages/engine/src/define.ts`, `core/metadataBuilder.ts` | Mark `'first'` mode subqueries as `sortable: false` — they return `row_to_json` (non-scalar), sorting crashes the DB | 🔴 | ✅ Done |
| 2 | `packages/engine/src/engine.ts` — `queryGrouped()` | Merge `subqueryExpressions` into `sqlExpressions` map — subquery sort is silently dropped here | 🔴 | ✅ Done |
| 3 | `packages/engine/src/engine.ts` — `exportRows()` | Same missing merge as #2 — subquery sort broken during CSV export | 🔴 | ✅ Done |
| 4 | `packages/engine/src/engine.ts` — `explain()` | Same missing merge as #2 — subquery sort broken in explain output | 🟠 | ✅ Done |
| 5 | `packages/engine/src/core/cursorPagination.ts` | Cursor `WHERE` uses OR-expansion for multi-column sorts; resolves sqlExpressions | 🔴 | ✅ Done |
| 6 | `packages/engine/src/core/subqueryBuilder.ts` | Guard `'first'` mode to PostgreSQL-only — throw `DialectError` on MySQL/SQLite | 🟡 | ✅ Done |
| 7 | `packages/engine/src/core/subqueryBuilder.ts` | `sql.raw(sub.filter)` retained with improved documentation (developer-authored only) | 🟠 | ✅ Done |
| 8 | `packages/engine/src/engine.ts` — `rawOrderBy()` | Add JSDoc warning that `rawOrderBy()` bypasses sortable whitelist | 🟢 | ✅ Done |
| 9 | `packages/engine/src/core/metadataBuilder.ts` | Fallback path aligns `filterable: false` with `define.ts` for subqueries | 🟡 | ✅ Done |
| 10 | `packages/engine/src/core/cursorPagination.ts` | Throw `FieldError` instead of `sql.identifier` for unknown sort fields | 🟡 | ✅ Done |
| 11 | `packages/engine/src/core/sortBuilder.ts` | `sortable: undefined` treated as sortable — intentional, clarifying comment added | 🟢 | ✅ Done |
| 12 | `packages/engine/src/define.ts` — `.computed()` | `.computed()` now accepts `{ sortable?: boolean }` option | 🟢 | ✅ Done |
| 13 | `packages/engine/src/core/sortBuilder.ts` — `resolveJoinColumn` | Collision warning now reachable (two-pass collection) | 🟢 | ✅ Done |

---

### Unit Tests

> Written in `packages/engine/test/` using **Vitest**. Run with: `cd packages/engine && pnpm test`

| # | File | What is tested | Status |
|---|------|----------------|--------|
| 14 | `test/inputValidator.test.ts` | `'first'` mode subquery field is rejected as non-sortable; `'count'`/`'exists'` are accepted; orphan subquery rejection | ✅ Done |
| 15 | `test/core/sortBuilder.test.ts` | Subquery SQL expressions in sort; join-column collision warning | ✅ Done |
| 16 | `test/core/cursorPagination.test.ts` | OR-expansion for multi-column cursors; DESC/mixed sorts; sqlExpressions resolution | ✅ Done |
| 17 | `test/core/subqueryBuilder.test.ts` | `'first'` mode throws `DialectError` on non-Postgres dialects | ✅ Done |
| 18 | `test/metadata.test.ts` | `metadataBuilder` fallback sets `filterable: false` for subqueries; no duplicate columns | ✅ Done |

---

### API / Integration Tests

> Written in `apps/hono-example/test/comparison.test.ts` using **Bun test**.
> Requires live PostgreSQL + seeded DB. Run with: `cd apps/hono-example && bun test`

| # | Endpoint | What is tested | Status |
|---|----------|----------------|--------|
| 19 | `GET /engine/orders?sort=itemCount` | `'count'` mode subquery sort returns 200 with correctly ordered data | ✅ Done |
| 20 | `GET /engine/orders?sort=-itemCount` | Descending subquery sort returns 200 with correct order | ✅ Done |
| 21 | `GET /engine/orders?sort=firstItem` | `'first'` mode subquery sort returns **400** with clear error message | ✅ Done |

---

### Progress Summary

| Category | Total | Done | Remaining |
|----------|-------|------|-----------|
| Bug fixes | 13 | 13 | 0 |
| Unit tests | 5 | 5 | 0 |
| API tests | 3 | 3 | 0 |
| **Total** | **21** | **21** | **0** |

---

## 📝 Changelog

### 2026-02-21 — Engine Bug Fix Session

**Bugs fixed:**

- **FilterBuilder rewrite** (`packages/engine/src/core/filterBuilder.ts`)
  - Fixed name-clash bug where base table columns shadowed join columns
  - Added recursive join column resolution, `buildStaticFilters` join support, warning logs
  - 27 comprehensive tests added

- **SortBuilder: join + computed column support** (`packages/engine/src/core/sortBuilder.ts`)
  - Join columns (e.g. `email`, `role` from `.join()`) were silently dropped from ORDER BY
  - Computed columns (e.g. `vatAmount` from `.computed()`) were silently dropped from ORDER BY
  - Added `collectSortableJoinFields`, `resolveJoinColumn`, SQL expression fallback
  - 19 tests (6 base + 6 computed + 7 join)

- **InputValidator: join column sort validation** (`packages/engine/src/core/inputValidator.ts`)
  - `validateSortFields` rejected valid join columns like `email` → threw FieldError → caused 500
  - Added `collectSortableJoinFields` (recursive, matches FilterBuilder pattern)
  - 12 tests (8 original + 4 new)

- **engine.ts: SQL expressions for sort** (`packages/engine/src/engine.ts`)
  - All 4 `sortBuilder.buildSort()` callsites now pass `computedExpressions + rawSelects` map

- **Adapter-Hono: missing error handling** (`packages/adapter-hono/src/index.ts`)
  - `createHonoApp` `/:table` GET handler had no try/catch → engine errors surfaced as raw 500
  - Now returns proper JSON with correct HTTP status from `TableCraftError.statusCode`

- **Frontend: role filter value mismatch** (`apps/vite-web-example/src/pages/orders2-page.tsx`)
  - ROLE_OPTIONS had `'user'` and `'moderator'` — DB only has `'admin'` and `'member'`
  - Fixed to `'admin'`, `'member'`, `'viewer'`

- **Frontend: orders2-page deletedAt** — fixed isNotNull filter
- **Frontend: users-page isActive** — fixed field name
- **Codegen: generator.ts** — customFilters, enum const objects, staticFilters typed const
- **tablecraft-adapter.ts** — CustomFilterEntry extended with isNull/isNotNull

**Remaining known issues (from this session):**

- [ ] `viewer` role is in schema comments but never seeded — dropdown option may return empty
- [x] `validateSelectFields` likely needs same join column support for `?select=email` — ✅ Fixed in PR #22
- [x] `fieldSelector` has no join column awareness — ✅ Fixed in PR #22
- [x] SortBuilder/FilterBuilder/InputValidator each duplicate join-collection logic — extract shared util — ✅ Extracted to `packages/engine/src/utils/joinUtils.ts` in PR #22
- [ ] Docs: add simple/medium/complex examples showing the same DX at each level
- [ ] Docs: document how joins expose columns for sort/filter/select
- [ ] Docs: document customFilters API, isNull/isNotNull operators
- [ ] Docs: document request parser URL format and error code mapping
- [ ] Consider auto-generating dropdown options from schema enums
- [ ] Consider `getDistinctValues(column)` engine method for dynamic filter options
- [ ] Add integration tests with actual SQL against test DB

### 2026-02-18
- ✅ Created `docs/client-sdk.md` with complete API reference
- ✅ Documented `createClient()` with all options
- ✅ Documented `table.query()` with all parameters and filter syntax
- ✅ Documented `table.meta()`, `table.count()`, `table.export()`
- ✅ Documented React hooks: `useTableQuery()`, `useTableMeta()`
- ✅ Added Vue, Svelte, and vanilla JS examples
- ✅ Added TypeScript integration guide
- ✅ Added error handling patterns
- ✅ Added axios instance support to `@tablecraft/client`
- ✅ Added axios instance support to `@tablecraft/table` adapter
- ✅ Added 6 tests for axios adapter
- ✅ Added axios example page in `apps/vite-web-example`
