# Overview & Custom Adapters

TableCraft is designed to be **backend-agnostic**. While it works seamlessly with the TableCraft backend out-of-the-box via the code generator, you can connect it to **any data source**—legacy REST APIs, GraphQL endpoints, Firebase, Supabase, or even static JSON files—by writing a **Custom Adapter**.

An Adapter is a simple object that implements the `DataAdapter` interface. It translates TableCraft's internal state (pagination, sorting, filtering) into requests your backend understands, and formats the response back into a shape TableCraft expects.

---

## 1. The `DataAdapter` Interface

Every custom adapter must implement the `DataAdapter<T>` interface, where `T` represents the shape of a single row in your data.

```typescript
import type { DataAdapter, QueryParams, QueryResult, TableMetadata } from '@tablecraft/table';

export interface MyCustomAdapter<T> extends DataAdapter<T> {
  // REQUIRED: Fetch data based on current table state
  query: (params: QueryParams) => Promise<QueryResult<T>>;
  
  // OPTIONAL: Fetch specific rows by ID (used for cross-page selection/export)
  queryByIds?: (ids: (string | number)[]) => Promise<T[]>;
  
  // OPTIONAL: Fetch schema metadata to auto-generate columns
  meta?: () => Promise<TableMetadata>;
  
  // OPTIONAL: Handle bulk data exports directly from the backend
  export?: (format: "csv" | "json", params?: Partial<QueryParams>) => Promise<string>;
}
```

### The Request: `QueryParams`

When the user interacts with the table (changes pages, sorts, types a search), the `query` method receives a `QueryParams` object:

```typescript
export interface QueryParams {
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  sortOrder: "asc" | "desc";
  filters: Record<string, unknown>; // All column-level and custom filters
  dateRange: { from: string; to: string };
}
```

### The Response: `QueryResult`

Your `query` method **must** map the data from your API into this strict structure:

```typescript
export interface QueryResult<T> {
  data: T[];
  meta: {
    total: number | null; // Total rows matching the query (null if unknown)
    page: number;
    pageSize: number;
    totalPages: number | null; // Math.ceil(total / pageSize)
    countMode?: 'exact' | 'estimated'; // Useful for massive datasets
  };
}
```

---

## 2. Advanced: Custom UI State & External Filters

Often, you want to add custom widgets *above* or *around* the table—like a complex multi-select dropdown, a range slider, or a toggle switch—and have the table fetch new data when they change.

You do **not** need to manage your own `useEffect` hooks to do this! TableCraft's `QueryParams.filters` is a `Record<string, unknown>`, meaning it can hold **any arbitrary data**, not just column names.

**Step 1: Update Table State with Custom Keys**

Assume you built a custom toggle for "Premium Users":

```tsx
// Inside your component, update the table's state using TableCraft's setter
table.setColumnFilters([
  ...table.getState().columnFilters,
  { id: 'isPremiumOnly', value: true } // 'isPremiumOnly' is not a real column
]);
```

**Step 2: Read it in your Adapter**

The adapter automatically receives this custom filter and can translate it into specific backend logic:

```typescript
export function createMyCustomAdapter<T>(): DataAdapter<T> {
  return {
    async query(params: QueryParams) {
      const url = new URL('/api/data');
      
      // Read the CUSTOM UI input!
      const isPremiumOnly = params.filters['isPremiumOnly'];
      
      if (isPremiumOnly) {
        url.searchParams.set('tier', 'premium'); // Translate to backend language
      }
      
      // ... fetch and return QueryResult
    }
  }
}
```

---

## 3. Frequently Asked Questions (FAQ)

### Q: Does the Adapter pattern make DX complex?
**No, it simplifies it by separating concerns.** Without an adapter, UI components become bloated with complex `fetch` logic, `useEffect` hooks, and data mapping. The `DataAdapter` moves all network logic into a reusable, isolated object. The UI developer just writes `<DataTable adapter={myAdapter} />`.

### Q: Does TableCraft's bundle get heavy because of all these adapters?
**No.** The `DataAdapter` is just a TypeScript `interface`—it compiles away to nothing. Built-in factory functions (like `createRestAdapter`) are entirely tree-shakeable. If you don't import them, they don't enter your bundle.

### Q: My external API doesn't return the total row count (`totalPages`). How does TableCraft handle this?
Many modern cursor-based APIs or massive databases do not return exact counts because `COUNT(*)` is slow. 

If you don't know the total pages, your adapter should return:
```typescript
{
  data: items,
  meta: {
    total: null,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: null,
    countMode: 'estimated' // Optional hint
  }
}
```
TableCraft's `<DataTable>` will automatically adjust its pagination UI. Instead of showing "Page 1 of 50", it will gracefully fallback to simple "Previous" and "Next" buttons, disabling "Next" if the returned `data` array is smaller than `pageSize`.

### Q: How do I handle authentication (JWTs) with my custom adapter?
You handle authentication when you *instantiate* the adapter. For example, pass headers into your factory function, or rely on a pre-configured `axios` instance with interceptors:

```typescript
const secureAdapter = createRestAdapter({
  queryFn: async (params) => {
    const res = await fetch('/api/secure-data', {
      headers: { Authorization: `Bearer ${getAuthToken()}` }
    });
    // ...
  }
});
```

### Q: Why not just pass a simple `fetchData` function instead of a whole Adapter object?
TableCraft is an advanced table. While a simple function gets you rows, TableCraft needs to know how to perform other specific tasks, like fetching schema metadata (`meta()`) for auto-column generation, or triggering bulk CSV exports (`export()`). An object interface provides a structured contract for all these capabilities without bloating the React component's props.