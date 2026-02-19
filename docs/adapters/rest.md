# REST & Axios Adapter

If your backend is a standard REST API, or if your project relies heavily on `axios` for request interceptors (like automatically attaching auth tokens or handling 401 refreshes), TableCraft makes it incredibly easy to connect your data.

---

## 1. "Hello World" (Static Data Adapter)

To understand how simple an adapter can be, here is one that returns static, hardcoded data. It ignores pagination and filtering entirely but satisfies the contract.

```typescript
import type { DataAdapter } from '@tablecraft/table';

interface User { id: number; name: string; }

const myStaticAdapter: DataAdapter<User> = {
  async query(params) {
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" }
    ];
    
    return {
      data,
      meta: {
        total: data.length,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: 1
      }
    };
  }
};
```

---

## 2. Example: Native `fetch` Adapter

TableCraft provides a built-in helper called `createRestAdapter`. You just need to supply the `queryFn` that maps the `QueryParams` to your URL string.

This is a robust example of connecting TableCraft to a generic REST API using the native `fetch` API.

```typescript
import { createRestAdapter } from '@tablecraft/table';
import type { QueryParams } from '@tablecraft/table';

export function createMyFetchAdapter<T>(baseUrl: string, getToken: () => string | null) {
  return createRestAdapter<T>({
    queryFn: async (params: QueryParams) => {
      const url = new URL(baseUrl);
      
      // 1. Map Pagination (Assuming your API uses 1-indexed pages)
      url.searchParams.set('page', String(params.page + 1));
      url.searchParams.set('limit', String(params.pageSize));

      // ... map sorting, searching, and filtering

      // 5. Fetch the Data (Inject token via function argument)
      const token = getToken();
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) throw new Error('Failed to fetch data');
      
      // Assume API returns: { items: [...], totalCount: 150 }
      const json = await response.json();

      // 6. Return strict QueryResult shape
      return {
        data: json.items,
        meta: {
          total: json.totalCount,
          page: params.page,
          pageSize: params.pageSize,
          totalPages: Math.ceil(json.totalCount / params.pageSize)
        }
      };
    }
  });
}

// Usage in React:
// const getToken = () => localStorage.getItem('token'); // Safe for CSR, modify for SSR
// const adapter = createMyFetchAdapter('/api/users', getToken);
// <DataTable adapter={adapter} />
```

---

## 3. Example: `axios` Adapter

Many enterprise applications use `axios` because it allows you to configure global instances with interceptors. You can easily wrap your existing Axios setup in a `DataAdapter`.

First, you might have an Axios instance set up in your project:

```typescript
// src/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

Then, you create an adapter that uses that instance:

```typescript
import { createRestAdapter } from '@tablecraft/table';
import { apiClient } from '../api/client';
import type { QueryParams } from '@tablecraft/table';

export function createAxiosTableAdapter<T>(endpoint: string) {
  return createRestAdapter<T>({
    queryFn: async (params: QueryParams) => {
      try {
        // Axios makes parameter mapping clean
        const response = await apiClient.get(endpoint, {
          params: {
            page: params.page + 1,
            limit: params.pageSize,
            sortBy: params.sort,
            sortOrder: params.sortOrder,
            search: params.search,
            ...params.filters // Spreading simple key/value filters
          }
        });

        // Your backend response structure
        const { data, meta } = response.data;

        return {
          data,
          meta: {
            total: meta.totalCount,
            page: params.page,
            pageSize: params.pageSize,
            totalPages: Math.ceil(meta.totalCount / params.pageSize)
          }
        };
      } catch (error) {
        console.error("Table fetch failed:", error);
        // Throwing the error allows TableCraft's <DataTable /> to catch it
        // and display an Error State component to the user automatically.
        throw error; 
      }
    }
  });
}
```

This pattern completely decouples your `<DataTable>` component from knowing *how* the data is fetched. The component just renders, and the Axios adapter handles all the heavy lifting and interceptor logic.