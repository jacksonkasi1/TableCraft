# Supabase Adapter

Supabase is a popular open-source Firebase alternative built on PostgreSQL. Its official client `@supabase/supabase-js` provides a chainable query builder that maps beautifully to TableCraft's `QueryParams`.

By building a custom adapter for Supabase, you can let TableCraft handle the complex UI states (pagination, sorting, filtering) while pushing the actual SQL execution directly to your Postgres database without needing an intermediate API layer.

---

## 1. The Supabase Adapter

This example demonstrates how to build a robust Supabase adapter. It handles exact row counts and range-based pagination, which is exactly how Supabase prefers to paginate data.

```typescript
import { createClient } from '@supabase/supabase-js';
import type { DataAdapter, QueryParams } from '@tablecraft/table';

// Initialize your Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function createSupabaseAdapter<T>(tableName: string): DataAdapter<T> {
  return {
    async query(params: QueryParams) {
      // 1. Start the query with an exact count
      // This is crucial for TableCraft to know the total pages!
      let query = supabase.from(tableName).select('*', { count: 'exact' });

      // 2. Map Column Filtering
      // TableCraft's params.filters is a Record<string, unknown>
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          // You could inspect 'value' here to do complex operators (gt, lt, like)
          // For this example, we assume strict equality
          query = query.eq(key, value);
        });
      }

      // 3. Map Sorting
      if (params.sort) {
        // TableCraft sortOrder is 'asc' | 'desc'
        // Supabase expects a boolean: ascending: true | false
        query = query.order(params.sort, { ascending: params.sortOrder === 'asc' });
      }

      // 4. Map Pagination (Supabase uses range(start, end))
      // e.g., page 0, size 10 -> range(0, 9)
      const from = params.page * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);

      // 5. Execute the query
      const { data, count, error } = await query;

      if (error) {
        console.error("Supabase Error:", error.message);
        throw error; // TableCraft will catch this and display an error state
      }

      // 6. Return TableCraft QueryResult shape
      return {
        data: data as T[],
        meta: {
          total: count ?? 0,
          page: params.page,
          pageSize: params.pageSize,
          totalPages: count !== null && count !== undefined ? Math.ceil(count / params.pageSize) : null,
          countMode: 'exact' // Tell TableCraft this is a reliable total count
        }
      };
    }
  };
}

// Usage in React:
// const adapter = createSupabaseAdapter<Profile>('profiles');
// <DataTable adapter={adapter} />
```

---

## 2. Advanced: Adding Foreign Key Joins

Supabase allows you to perform relational joins in a single query. You can easily extend your adapter to support this. If your table needs to display data from a related `organizations` table, you can hardcode the `.select()` statement in the adapter.

```typescript
let query = supabase
  .from('users')
  .select(`
    id,
    name,
    email,
    organization_id,
    organizations ( id, name )
  `, { count: 'exact' });

// ... the rest of the adapter logic remains identical
```

By decoupling the data fetching logic into the `DataAdapter`, your TableCraft component remains incredibly clean, while your Supabase queries can be as complex as necessary.