# FAQ & Troubleshooting

Here are some common developer friction points and how to resolve them when working with TableCraft.

## Common Errors

### "Request failed: 404" (Initialization Error)
This usually means your client is pointing to an endpoint that does not exist or your backend server is not running.
* **Solution:** Ensure your `baseUrl` is correct in the `createTableCraftAdapter` or `createClient` setup, and check that your backend server is actually up and listening.

### Missing Schema Errors
If the server crashes complaining about missing tables or columns during startup:
* **Solution:** Ensure you are passing the actual Drizzle schema objects (like `schema.users`) to `defineTable()`, and that your database migrations have been applied.

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
