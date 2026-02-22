# FAQ & Troubleshooting

Here are some common developer friction points and how to resolve them when working with TableCraft.

## Common Errors

### "Request failed: 404" (Initialization Error)
This usually means your client is pointing to an endpoint that does not exist or your backend server is not running.
* **Solution:** Ensure your `baseUrl` is correct in the `createTableCraftAdapter` or `createClient` setup, and check that your backend server is actually up and listening.

### Missing Schema Errors
If the server crashes complaining about missing tables or columns during startup:
* **Solution:** Ensure you are passing the actual Drizzle schema objects (like `schema.users`) to `defineTable()`, and that your database migrations have been applied.

## How do I handle Codegen if my server has authentication?

If your TableCraft API requires authentication (e.g., JWT, session cookies, API keys), the `tablecraft-codegen` CLI will fail to fetch metadata unless you provide credentials.

You can securely pass any required authentication headers using the `--header` or `-H` flag:

**Using a Bearer Token:**
```bash
npx @tablecraft/codegen --url http://localhost:3000/api --out ./src/generated -H "Authorization: Bearer <your-token>"
```

**Using Session Cookies:**
If your backend uses standard cookie-based sessions, you can pass the session cookie directly via the `Cookie` header:
```bash
npx @tablecraft/codegen --url http://localhost:3000/api --out ./src/generated -H "Cookie: session_id=<your-session-cookie>"
```

**Using Custom API Keys or Multiple Headers:**
```bash
npx @tablecraft/codegen --url http://localhost:3000/api --out ./src/generated -H "x-api-key: <your-key>" -H "x-tenant-id: <tenant>"
```

## Why is my filter not working?

There are a few reasons why a global search or column filter might not be taking effect:
1. **Column Not Included:** Ensure the column is explicitly defined in your `.search('email', 'firstName')` or `.filter()` configuration block on the backend.
2. **Type Mismatch:** Trying to apply a string operation (like `contains`) on an `integer` column will fail. Use the appropriate operators for your data types.
3. **Date Formatting:** Date strings must be in ISO 8601 format when sent from the client or custom adapter.
4. **Adapter Drop:** If you wrote a custom adapter (like GraphQL or Firebase), double-check that your adapter isn't swallowing the `params.filters` or `params.globalSearch` payload before passing it to the database query.

## Why is my query slow?

Performance issues usually stem from one of two database constraints:
1. **Missing Indexes:** Ensure you have database indexes on columns you frequently filter or sort by (e.g., `createdAt`, `tenantId`, `status`).
2. **The `COUNT(*)` Problem:** If you are using standard offset pagination (`page`, `pageSize`) and dealing with hundreds of thousands of rows, computing the total row count becomes extremely expensive for SQL databases.
* **Solution:** Switch to **Cursor Pagination**, which bypasses the `OFFSET` scanning penalty entirely and operates in O(1) time. Alternatively, disable the `.count()` request on massive datasets.

## Client Error Handling

How does the Client SDK handle errors? TableCraft surfaces errors as standard JavaScript `Error` objects, but attaches additional metadata straight from the backend response.

If you are using the `fetch` client (or the Axios adapter), you can catch these errors gracefully:

```typescript
try {
  const result = await table.query({ page: 1, pageSize: 20 });
} catch (error) {
  // TypeScript catches are 'unknown' by default
  const err = error as any;
  console.error("Status:", err.status); // e.g. 400, 500
  console.error("Code:", err.code);     // e.g. 'VALIDATION_ERROR'
  console.error("Details:", err.details); // Additional context
  console.error("Message:", err.message);
}
```

## Debugging Tips

* **Inspect Network Payload:** Use your browser's Developer Tools (Network tab) to inspect the outgoing request to the engine. Verify that the query parameters (like `filters`, `sort`, `cursor`) match what you expect.
* **Check React Query Keys:** If you are using `useTableQuery` and data isn't updating when state changes, ensure the query key includes all dependencies (which TableCraft handles automatically under the hood, but it's good to verify using the React Query DevTools).

---

## Subqueries

### Why do I get a 400 when I sort by a `first` subquery field?

The `'first'` subquery type uses PostgreSQL's `row_to_json()` function, which returns a **JSON object**, not a scalar value. SQL databases cannot use a JSON object in an `ORDER BY` clause — attempting to do so produces a cryptic database error.

TableCraft prevents this by marking `'first'` subquery columns as `sortable: false` and rejecting the request with a `FieldError` (HTTP 400) before the query is sent:

```
GET /orders?sort=firstItem  →  400 Bad Request
{ "error": "Field 'firstItem': is not sortable. ..." }
```

Use `'count'` (integer) or `'exists'` (boolean) if you need a sortable subquery field.

### Why does my `first` subquery throw a `DialectError` on MySQL/SQLite?

`'first'` mode relies on `row_to_json()`, which is **PostgreSQL-only**. If the engine detects a non-PostgreSQL dialect (MySQL, SQLite), it throws a `DialectError` (HTTP 400) instead of sending a query that will fail at the database level:

```
DialectError: 'first' is not supported on mysql. Use PostgreSQL or write a raw query.
```

Switch to PostgreSQL, or use `'count'` / `'exists'` which work on all dialects.

### Can I filter by a subquery field?

No. All subquery types (`count`, `exists`, `first`) have `filterable: false`. Subquery expressions are computed per-row in the SELECT clause — they cannot be used in a `WHERE` clause without wrapping the entire query in a subquery, which TableCraft does not do automatically. Use a join or a backend condition instead.

---

## Cursor Pagination

### Why do I get duplicate or skipped rows when using cursor pagination with a multi-column sort?

This happens when the cursor only encodes the **primary** sort field. If multiple rows share the same primary sort value, the engine cannot tell which ones were already seen.

TableCraft's cursor encodes **all** sort field values from the last row, and the continuation `WHERE` uses a lexicographic OR-expansion:

```sql
-- ORDER BY status ASC, createdAt ASC, cursor after ("paid", "2026-01-15")
WHERE (status > 'paid')
   OR (status = 'paid' AND createdAt > '2026-01-15T10:00:00Z')
```

If you are still seeing duplicates, ensure your sort includes a **unique tiebreaker** (e.g., `?sort=status,id`), which guarantees a strict total order across all rows.

### What happens if I sort by a computed column and use cursor pagination?

Cursor pagination resolves `WHERE` conditions against **base table columns only**. If a sort field resolves exclusively to a SQL expression (e.g., a subquery or computed column), the engine currently includes it in `ORDER BY` but skips it in the cursor `WHERE`. This means cursor pagination with computed-only sort fields behaves correctly for ordering but may not produce a perfectly stable continuation on ties.

For stable cursor pagination, always include at least one base column (e.g., `id`) as a tiebreaker in your sort.

---

## Computed Columns

### Can I mark a computed column as non-sortable?

Yes. Pass `{ sortable: false }` as the third argument to `.computed()`:

```typescript
.computed('jsonMeta', sql`row_to_json(meta)`, { type: 'string', sortable: false })
```

This prevents users from requesting `?sort=jsonMeta` and getting a database error from a non-scalar expression.

