# Client SDK — @tablecraft/client

The `@tablecraft/client` package provides a type-safe frontend client for TableCraft APIs. It works seamlessly with React (via hooks) or any JavaScript environment (vanilla JS, Vue, Svelte, etc).

## Installation

```bash
# Using bun
bun add @tablecraft/client

# Using npm
npm install @tablecraft/client

# Using pnpm
pnpm add @tablecraft/client

# Using yarn
yarn add @tablecraft/client
```

---

## Quick Start

### 1. Create a Client

```typescript
import { createClient } from '@tablecraft/client';

const tc = createClient({
  baseUrl: '/api/engine', // Your TableCraft API endpoint
});
```

### 2. Query a Table

```typescript
const users = tc.table('users');

// Fetch data
const result = await users.query({
  page: 1,
  pageSize: 25,
  sort: ['-createdAt'],
  search: 'john',
});

console.log(result.data);     // Array of users
console.log(result.meta);      // Pagination info
console.log(result.aggregations); // Sum, count, etc. (if configured)
```

### 3. Fetch Metadata

```typescript
const metadata = await users.meta();

console.log(metadata.columns);     // Column definitions
console.log(metadata.filters);     // Available filters
console.log(metadata.capabilities); // Search, export, pagination settings
```

---

## API Reference

### `createClient(options)`

Creates a new TableCraft client instance.

```typescript
import { createClient, type ClientOptions } from '@tablecraft/client';

const options: ClientOptions = {
  baseUrl: '/api/engine',
  // fetch: customFetch,
  // axios: axiosInstance,
  // headers: { 'Authorization': 'Bearer ...' },
};
const tc = createClient(options);
```

#### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `baseUrl` | `string` | Yes | Base URL of your TableCraft API (e.g., `/api/engine`) |
| `fetch` | `typeof fetch` | No | Custom fetch function for testing or custom environments |
| `axios` | `AxiosInstance` | No | Axios instance. Takes precedence over `fetch` if provided |
| `headers` | `Record<string, string>` or `() => Record<string, string>` | No | Default headers for all requests (e.g., auth tokens) |

#### Examples

**Basic Usage:**
```typescript
const tc = createClient({
  baseUrl: '/api/engine',
});
```

**With Static Headers:**
```typescript
const tc = createClient({
  baseUrl: '/api/engine',
  headers: {
    'Authorization': 'Bearer your-token',
    'X-Tenant-Id': 'tenant-123',
  },
});
```

**With Dynamic Headers (async):**
```typescript
const tc = createClient({
  baseUrl: '/api/engine',
  headers: async () => {
    const token = await getAuthToken(); // Your auth logic
    return {
      'Authorization': `Bearer ${token}`,
    };
  },
});
```

**With Custom Fetch (for testing):**
```typescript
const tc = createClient({
  baseUrl: '/api/engine',
  fetch: customFetch, // Mock fetch for tests
});
```

**With Axios Instance:**
```typescript
import axios from 'axios';
import { createClient } from '@tablecraft/client';

// Create axios instance with interceptors
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Add auth interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Just pass the axios instance - no wrapper needed!
const tc = createClient({
  baseUrl: '/api/engine',
  axios: axiosInstance, // ✅ Direct axios support
});
```

---

### `tc.table<T>(name)`

Returns a typed client for a specific table.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

const users = tc.table<User>('users');
```

---

### `table.query(params?)`

Fetches data from the table with optional parameters.

```typescript
const result = await users.query({
  page?: number;
  pageSize?: number;
  cursor?: string;
  sort?: string | string[];
  filters?: Record<string, unknown>;
  search?: string;
  select?: string[];
  distinct?: boolean;
  includeDeleted?: boolean;
});
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | `number` | Page number (1-based) |
| `pageSize` | `number` | Rows per page |
| `cursor` | `string` | Cursor for cursor-based pagination |
| `sort` | `string \| string[]` | Sort fields. Prefix with `-` for descending |
| `filters` | `Record<string, unknown>` | Filter conditions |
| `search` | `string` | Global search term |
| `select` | `string[]` | Fields to select |
| `distinct` | `boolean` | Return distinct rows only |
| `includeDeleted` | `boolean` | Include soft-deleted rows |

#### Filter Syntax

**Simple Equality:**
```typescript
await users.query({
  filters: { status: 'active' }
});
// GET /users?filter[status]=active
```

**With Operators:**
```typescript
await users.query({
  filters: {
    age: { operator: 'gte', value: 18 },
    price: { operator: 'between', value: [10, 100] },
    status: { operator: 'in', value: ['active', 'pending'] },
  }
});
// GET /users?filter[age][gte]=18&filter[price][between]=10,100&filter[status][in]=active,pending
```

**Available Operators:**
| Operator | Description |
|----------|-------------|
| `eq` | Equal (default) |
| `neq` | Not equal |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `between` | Between two values |
| `in` | In a list of values |
| `notIn` | Not in a list |
| `contains` | Contains substring |
| `startsWith` | Starts with |
| `endsWith` | Ends with |

#### Sorting

```typescript
// Single sort
await users.query({ sort: '-createdAt' }); // Descending

// Multiple sorts
await users.query({ sort: ['-createdAt', 'name'] }); // Primary desc, secondary asc
```

#### Selecting Fields

```typescript
await users.query({
  select: ['id', 'name', 'email']
});
// Returns only these fields
```

#### Return Type

```typescript
interface QueryResult<T> {
  data: T[];
  meta: {
    total: number | null;
    page: number;
    pageSize: number;
    totalPages: number | null;
    nextCursor?: string | null;
    countMode?: string;
  };
  aggregations?: Record<string, number>;
}
```

---

### `table.meta()`

Fetches table metadata (columns, filters, capabilities).

```typescript
const metadata = await users.meta();
```

#### Return Type

```typescript
interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  capabilities: {
    search: boolean;
    searchFields: string[];
    export: boolean;
    exportFormats: string[];
    pagination: {
      enabled: boolean;
      defaultPageSize: number;
      maxPageSize: number;
      cursor: boolean;
    };
    sort: {
      enabled: boolean;
      defaultSort: { field: string; order: string }[];
    };
    groupBy: boolean;
    groupByFields: string[];
    recursive: boolean;
  };
  filters: FilterMetadata[];
  aggregations: AggregationMetadata[];
  includes: IncludeMetadata[];
  staticFilters: string[];
}
```

#### Column Metadata

```typescript
interface ColumnMetadata {
  name: string;
  type: string;           // 'string', 'number', 'boolean', 'date', etc.
  label: string;          // Display name
  hidden: boolean;
  sortable: boolean;
  filterable: boolean;
  computed?: boolean;     // SQL expression, not real column
  source?: 'base' | 'join' | 'computed' | 'subquery';
  joinTable?: string;     // For join columns
  format?: string;        // 'currency', 'date', 'percent', etc.
  align?: string;         // 'left', 'center', 'right'
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  options?: { value: string | number | boolean; label: string; color?: string }[];
  datePresets?: string[];
  operators: string[];    // Available filter operators
}
```

---

### `table.count(params?)`

Returns the total count matching the query (without fetching data).

```typescript
const total = await users.count({ filters: { status: 'active' } });
console.log(total); // 150
```

---

### `table.export(format, params?)`

Exports data as CSV or JSON string.

```typescript
// Export all users as CSV
const csv = await users.export('csv');

// Export filtered data as JSON
const json = await users.export('json', {
  filters: { status: 'active' }
});

// Download in browser
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'users.csv';
a.click();
```

---

### `table.buildUrl(params?)`

Builds the URL without making a request. Useful for debugging or custom fetch.

```typescript
const url = users.buildUrl({ page: 2, pageSize: 25, sort: '-createdAt' });
// "/api/engine/users?page=2&pageSize=25&sort=-createdAt"
```

---

## React Hooks

Import React hooks from the `/react` subpath:

```typescript
import { useTableQuery, useTableMeta } from '@tablecraft/client/react';
```

### `useTableQuery(client, initialParams?)`

A React hook for fetching and managing table data with automatic request cancellation.

```typescript
import { createClient } from '@tablecraft/client';
import { useTableQuery } from '@tablecraft/client/react';

const tc = createClient({ baseUrl: '/api/engine' });

function UsersTable() {
  const {
    data,
    meta,
    loading,
    error,
    params,
    setPage,
    setPageSize,
    setSort,
    setFilter,
    removeFilter,
    setSearch,
    refresh,
  } = useTableQuery(tc.table('users'), {
    page: 1,
    pageSize: 25,
    sort: ['-createdAt'],
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => setSearch(e.target.value)}
      />

      <table>
        <tbody>
          {data.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <button onClick={() => setPage(meta.page - 1)} disabled={meta.page === 1}>
          Previous
        </button>
        <span>Page {meta.page} of {meta.totalPages ?? '—'}</span>
        <button onClick={() => setPage(meta.page + 1)} disabled={meta.totalPages !== null && meta.page >= meta.totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T[]` | Array of rows |
| `meta` | `QueryMeta` | Pagination metadata |
| `aggregations` | `Record<string, number>` | Aggregation results (if configured) |
| `loading` | `boolean` | Loading state |
| `error` | `Error \| null` | Error if request failed |
| `params` | `QueryParams` | Current query parameters |
| `setParams` | `(params: QueryParams) => void` | Set all params at once |
| `setPage` | `(page: number) => void` | Change page |
| `setPageSize` | `(size: number) => void` | Change page size (resets to page 1) |
| `setSort` | `(sort: string \| string[]) => void` | Change sort (resets to page 1) |
| `setFilter` | `(field: string, value: unknown) => void` | Set a filter (resets to page 1) |
| `removeFilter` | `(field: string) => void` | Remove a filter |
| `setSearch` | `(search: string) => void` | Set search term (resets to page 1) |
| `refresh` | `() => void` | Re-fetch current data |

---

### `useTableMeta(client)`

A React hook for fetching table metadata.

```typescript
import { createClient } from '@tablecraft/client';
import { useTableMeta, useTableQuery } from '@tablecraft/client/react';

const tc = createClient({ baseUrl: '/api/engine' });

function DynamicTable() {
  const usersClient = tc.table('users');
  const { metadata, loading, error } = useTableMeta(usersClient);
  const { data, meta } = useTableQuery(usersClient);

  if (loading) return <div>Loading schema...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <table>
      <thead>
        <tr>
          {metadata.columns
            .filter(col => !col.hidden)
            .map(col => (
              <th key={col.name}>{col.label}</th>
            ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id}>
            {metadata.columns
              .filter(col => !col.hidden)
              .map(col => (
                <td key={col.name}>{String(row[col.name])}</td>
              ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `metadata` | `TableMetadata \| null` | Table metadata |
| `loading` | `boolean` | Loading state |
| `error` | `Error \| null` | Error if request failed |

---

## TypeScript Integration

### Type-Safe Rows

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
}

const users = tc.table<User>('users');

// TypeScript knows the row type
const result = await users.query();
result.data[0].name;     // ✅ Typed as string
result.data[0].role;     // ✅ Typed as 'admin' | 'user' | 'guest'
result.data[0].invalid;  // ❌ TypeScript error
```

### With Generated Types

Use `@tablecraft/codegen` to generate types automatically:

```bash
npx @tablecraft/codegen --url http://localhost:3000/api/engine --out ./src/generated
```

```typescript
import { createProductsAdapter, type ProductsRow } from './generated';

const adapter = createProductsAdapter({ baseUrl: '/api/engine' });

// Fully typed!
const result = await adapter.query();
result.data[0].price; // ✅ Typed as number
```

---

## Error Handling

The client throws errors with additional properties:

```typescript
try {
  const result = await users.query();
} catch (error) {
  console.log(error.message);    // Error message
  console.log(error.status);     // HTTP status code (e.g., 404)
  console.log(error.code);       // Error code (e.g., 'NOT_FOUND')
  console.log(error.details);    // Additional details
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input format |
| `FIELD_ERROR` | 400 | Unknown or hidden field |
| `ACCESS_DENIED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Table or resource not found |
| `QUERY_ERROR` | 500 | Database query failed |

---

## Framework Support

The `@tablecraft/client` package is **framework-agnostic** for core functionality, with React hooks built-in:

| Feature | React | Vue | Svelte | Vanilla JS |
|---------|-------|-----|--------|------------|
| `createClient()` | ✅ | ✅ | ✅ | ✅ |
| `table.query()` | ✅ | ✅ | ✅ | ✅ |
| `table.meta()` | ✅ | ✅ | ✅ | ✅ |
| `table.count()` | ✅ | ✅ | ✅ | ✅ |
| `table.export()` | ✅ | ✅ | ✅ | ✅ |
| `useTableQuery()` hook | ✅ | ❌ | ❌ | ❌ |
| `useTableMeta()` hook | ✅ | ❌ | ❌ | ❌ |

### What's Supported
- **Core client** works everywhere (makes HTTP requests)
- **React hooks** are built-in (`@tablecraft/client/react`)

### What's NOT Included (Yet)
- No Vue composables (like `useTableQuery`)
- No Svelte stores

> 💡 **Want Vue or Svelte support?** We're seeking contributors! See [Contributing](#contributing) section below.

---

## Non-React Usage

The client works in any JavaScript environment:

### Vanilla JS

```javascript
import { createClient } from '@tablecraft/client';

const tc = createClient({ baseUrl: '/api/engine' });

async function loadUsers() {
  const users = tc.table('users');
  const result = await users.query({ page: 1, pageSize: 10 });
  return result.data;
}
```

### Vue 3

```vue
<script setup>
import { ref, onMounted, watch } from 'vue';
import { createClient } from '@tablecraft/client';

const tc = createClient({ baseUrl: '/api/engine' });
const users = tc.table('users');

const data = ref([]);
const loading = ref(true);
const page = ref(1);

async function fetchData() {
  loading.value = true;
  const result = await users.query({ page: page.value, pageSize: 25 });
  data.value = result.data;
  loading.value = false;
}

onMounted(fetchData);
watch(page, fetchData);
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else>
    <div v-for="user in data" :key="user.id">
      {{ user.name }}
    </div>
  </div>
</template>
```

### Svelte

```svelte
<script>
  import { createClient } from '@tablecraft/client';
  import { onMount } from 'svelte';

  const tc = createClient({ baseUrl: '/api/engine' });
  const users = tc.table('users');

  let data = [];
  let loading = true;

  onMount(async () => {
    const result = await users.query({ page: 1, pageSize: 25 });
    data = result.data;
    loading = false;
  });
</script>

{#if loading}
  <div>Loading...</div>
{:else}
  {#each data as user}
    <div>{user.name}</div>
  {/each}
{/if}
```

---

## Best Practices

### 1. Create a Shared Client Instance

```typescript
// lib/tablecraft.ts
import { createClient } from '@tablecraft/client';

export const tc = createClient({
  baseUrl: '/api/engine',
  headers: async () => {
    const token = await getAuthToken();
    return { Authorization: `Bearer ${token}` };
  },
});
```

### 2. Use Type Assertions for Better DX

```typescript
import { tc } from '@/lib/tablecraft';

interface Order {
  id: number;
  total: number;
  status: string;
}

export const orders = tc.table<Order>('orders');
```

### 3. Combine with DataTable Component

```tsx
import { DataTable } from '@tablecraft/table';
import { tc } from '@/lib/tablecraft';

function OrdersPage() {
  return (
    <DataTable
      adapter={{ query: (p) => tc.table('orders').query(p) }}
    />
  );
}
```

### 4. Cache Metadata for Performance

```typescript
let cachedMeta: TableMetadata | null = null;

async function getUsersMeta() {
  if (!cachedMeta) {
    cachedMeta = await tc.table('users').meta();
  }
  return cachedMeta;
}
```

---

## Contributing

We're actively seeking contributors to expand framework support!

### Help Wanted

| Framework | Status | What's Needed |
|-----------|--------|---------------|
| **Vue 3** | 🤝 Seeking Contributor | `useTableQuery()` composable, `useTableMeta()` composable |
| **Svelte** | 🤝 Seeking Contributor | `createTableStore()` store, `createMetaStore()` store |

### How to Contribute

1. Fork the repository
2. Create a new branch: `git checkout -b feature/vue-support`
3. Add your implementation in `packages/client/src/vue.ts` or `packages/client/src/svelte.ts`
4. Add tests in `packages/client/test/`
5. Submit a pull request

### Vue 3 Composable Example (Expected API)

```typescript
// Expected API for @tablecraft/client/vue
import { useTableQuery, useTableMeta } from '@tablecraft/client/vue';

// In Vue component
const { data, loading, error, setPage, setFilter } = useTableQuery(usersClient, {
  page: 1,
  pageSize: 25,
});
```

### Svelte Store Example (Expected API)

```typescript
// Expected API for @tablecraft/client/svelte
import { createTableStore, createMetaStore } from '@tablecraft/client/svelte';

// In Svelte component
const tableStore = createTableStore(usersClient, {
  page: 1,
  pageSize: 25,
});

// Use as regular Svelte store
$: data = $tableStore.data;
$: loading = $tableStore.loading;
```

Interested? Open an issue on [GitHub](https://github.com/jacksonkasi1/TableCraft/issues) to discuss!

---

## FAQ

### Does using axios increase my bundle size?

**No!** Axios is an **optional peer dependency**. If you don't use it, it won't be installed or bundled.

```json
// How we configured it
{
  "peerDependencies": {
    "axios": ">=0.21.0"
  },
  "peerDependenciesMeta": {
    "axios": { "optional": true }
  }
}
```

| Your Choice | Bundle Size Impact |
|-------------|-------------------|
| Use fetch (default) | **0 bytes** - no axios code included |
| Use axios | ~13KB - only if you explicitly install axios |

The axios adapter avoids a static import of the axios library (so axios itself won't be bundled if you don't use it), but the `createAxiosFetchAdapter` function will still be included in consumer bundles.

### When should I use axios vs fetch?

| Use fetch (default) when | Use axios when |
|--------------------------|----------------|
| You want minimal dependencies | You already have axios in your project |
| Simple API calls | You need request/response interceptors |
| Fastest bundle size | You use axios features (timeouts, retries, etc.) |
| Modern browsers/server | You have complex auth/token refresh logic |

### Can I use other HTTP libraries?

Currently only `fetch` (native) and `axios` are supported. For other libraries, you can create a custom adapter by wrapping them to match the fetch API:

```typescript
const customFetch = async (url: string, options?: RequestInit) => {
  // Call your HTTP library
  const response = await yourLibrary.get(url, { headers: options?.headers });
  
  // Return fetch-like Response object
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => response.data,
    text: async () => JSON.stringify(response.data),
  } as Response;
};

const tc = createClient({ baseUrl: '/api', fetch: customFetch });
```
