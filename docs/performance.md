# Performance Guide

When dealing with massive datasets (100k+ rows) or high concurrency, application performance can become a bottleneck. TableCraft is designed to help you bypass these bottlenecks safely and effectively.

## Cursor vs. Offset Pagination

TableCraft natively supports both standard Offset and high-performance Cursor pagination. The choice significantly affects query latency on large tables.

### 1. Offset Pagination (`page`, `pageSize`)
When you request `{ page: 1000, pageSize: 20 }`, the SQL database computes an `OFFSET` of 19,980.

**The Problem:** The database engine scans through 19,980 discarded rows before reaching the 20 you requested. As the offset increases, performance linearly degrades.

**Best For:**
* Small to medium datasets (<50k rows).
* Applications where users frequently jump directly to specific pages (e.g., jumping from page 1 to 50).

### 2. Cursor Pagination (`cursor`)
Cursor pagination encodes the sort value (e.g., `{ id: 100 }`) of the last fetched item and sends it back to the engine. The engine then creates an indexed O(1) condition like `WHERE id > 100 LIMIT 20`.

**The Advantage:** The database skips directly to the requested row via index lookups, completely avoiding the offset scanning penalty.

**Best For:**
* Massive datasets (100k+ rows) and infinite scrolling APIs.
* High concurrency environments.

**How to Use:**
Simply enable cursor pagination in your config or pass it via the client. If `!!resolvedParams.cursor` evaluates to true on the backend, TableCraft's `CursorPaginationBuilder` takes over entirely.

#### Multi-column sort with cursor pagination

When you sort by more than one field (e.g., `?sort=status,createdAt`), the cursor encodes **all** sort field values from the last row:

```
nextCursor → base64url({ "status": "paid", "createdAt": "2026-01-15T10:00:00Z" })
```

The continuation `WHERE` clause uses a **lexicographic OR-expansion** so rows that share the primary sort value but differ on a secondary value are never skipped:

```sql
-- Correct expansion for ORDER BY status ASC, createdAt ASC
WHERE (status > 'paid')
   OR (status = 'paid' AND createdAt > '2026-01-15T10:00:00Z')
```

A flat `AND` would incorrectly skip rows with the same `status` value but a later `createdAt`. The engine handles this automatically.

{% hint style="info" %}
Add a database index on every column you use in a multi-column sort to keep cursor lookups fast.
{% endhint %}

## Large Dataset Handling

Even with cursor pagination, querying metadata on a massive table can be expensive.

### The `COUNT(*)` Problem
If you request `table.count()` on a table with 10 million rows, the database might perform a full table scan.
* **Solution:** Explicitly disable the total count feature on huge tables if not absolutely necessary. Alternatively, rely solely on `CursorPaginationBuilder`, which checks if a "next page" exists by fetching `pageSize + 1` rows instead of executing a `COUNT(*)`.

## Caching Strategies

A large contributor to UI latency is redundant network requests. Because TableCraft adapters (and React hooks) are entirely deterministic based on query parameters, they are highly cacheable.

### React Query Integration
If you are using `@tablecraft/client/react`, `useTableQuery` natively leverages TanStack React Query.

* **Increase `staleTime`:** Avoid refetching static tables when a user switches tabs or refocuses the window.

```tsx
const { data } = useTableQuery(adapter, {
  staleTime: 60 * 1000, // Data remains "fresh" for 1 minute
});
```

### HTTP Caching for Custom Adapters
If you write a custom REST adapter, ensure your CDN or proxy server recognizes `Cache-Control` headers for idempotent `GET` requests sent by TableCraft. Since filters and sorting are encoded in the URL parameters, identical query strings will safely hit the cache.

## Bundle Size Optimization

To ensure fast load times, TableCraft packages are highly modular:
* Ensure you are tree-shaking your build. Only import the components you need (`DataTable`, `useTableQuery`).
* The `@tablecraft/table` package lazily utilizes generic data structures. If you are deeply optimizing your initial bundle, you can dynamically import the `DataTable` itself using React's `Suspense` and `lazy()` or your framework's equivalent lazy-loading capability.
