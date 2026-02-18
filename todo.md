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
| - [x] Create `docs/custom-adapter.md` | 🔴 P0 | ⭐⭐ | ✅ Done |
| - [ ] Document `DataAdapter` interface | 🔴 P0 | ⭐ | Pending |
| - [ ] Example: REST API adapter | 🔴 P0 | ⭐⭐ | Pending |
| - [ ] Example: GraphQL adapter | 🟡 P2 | ⭐⭐⭐ | Pending |
| - [ ] Example: Supabase adapter | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Example: Firebase/Firestore adapter | 🟢 P3 | ⭐⭐⭐ | Pending |
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
| - [ ] Create `docs/faq.md` | 🟠 P1 | ⭐ | Pending |
| - [ ] Add common errors section | 🟠 P1 | ⭐ | Pending |
| - [ ] Add debugging tips | 🟠 P1 | ⭐ | Pending |
| - [ ] Add performance troubleshooting | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Add "Why is my query slow?" section | 🟡 P2 | ⭐ | Pending |
| - [ ] Add "Why is filter not working?" section | 🟠 P1 | ⭐ | Pending |
| - [ ] Add TypeScript error solutions | 🟡 P2 | ⭐ | Pending |

### 4. Performance Guide

> **Why:** Critical for production use with large datasets

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `docs/performance.md` | 🟠 P1 | ⭐⭐ | Pending |
| - [ ] Document cursor vs offset pagination | 🟠 P1 | ⭐ | Pending |
| - [ ] Document large dataset handling (100k+ rows) | 🟠 P1 | ⭐⭐ | Pending |
| - [ ] Document caching strategies | 🟠 P1 | ⭐⭐ | Pending |
| - [ ] Document bundle size optimization | 🟡 P2 | ⭐ | Pending |
| - [ ] Add performance benchmarks | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Document memory usage patterns | 🟢 P3 | ⭐⭐ | Pending |

### 5. Examples Expansion

> **Why:** Current examples.md is minimal

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Expand `docs/examples.md` | 🟠 P1 | ⭐⭐ | Pending |
| - [ ] Add e-commerce dashboard example | 🟠 P1 | ⭐⭐ | Pending |
| - [ ] Add admin panel example | 🟡 P2 | ⭐⭐ | Pending |
| - [ ] Add multi-tenant SaaS example | 🟡 P2 | ⭐⭐⭐ | Pending |
| - [ ] Add real-time data example (WebSocket) | 🟢 P3 | ⭐⭐⭐ | Pending |
| - [ ] Add mobile-responsive table example | 🟢 P3 | ⭐⭐ | Pending |

### 6. Changelog

> **Why:** Version tracking for users

| Task | Priority | Difficulty | Status |
|------|----------|------------|--------|
| - [ ] Create `CHANGELOG.md` in root | 🟠 P1 | ⭐ | Pending |
| - [ ] Document v0.1.0 release | 🟠 P1 | ⭐ | Pending |
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

## 📊 Summary

| Category | Total Tasks | Done | Pending |
|----------|-------------|------|---------|
| Action Plan | 35 | 13 | 22 |
| Future Plan | 34 | 0 | 34 |
| Long-term Vision | 11 | 0 | 11 |
| Seeking Contributors | 14 | 0 | 14 |
| **Total** | **94** | **13** | **81** |

---

## 📝 Notes

- This TODO was generated from analysis of `docs/` and `plan/` folders
- Existing `plan/task/todo.md` contains backend implementation details (completed)
- Priority and difficulty are subjective and can be adjusted
- Check off items as they are completed

---

*Last updated: 2026-02-18*

---

## 📝 Changelog

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
