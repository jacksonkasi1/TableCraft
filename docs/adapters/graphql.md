# GraphQL Adapter

GraphQL APIs allow clients to specify exactly what data they need. When building a TableCraft adapter for a GraphQL endpoint, you can dynamically construct your query based on the active columns in the table, avoiding over-fetching.

This guide uses a generic `fetch` request, but you can easily adapt this pattern for Apollo Client, URQL, or Relay.

---

## 1. A Simple GraphQL Adapter

If your GraphQL API expects a fixed set of fields, you can just hardcode the query string.

```typescript
import type { DataAdapter, QueryParams } from '@tablecraft/table';

const USERS_QUERY = `
  query GetUsers($first: Int, $offset: Int, $orderBy: String) {
    users(first: $first, offset: $offset, orderBy: $orderBy) {
      totalCount
      nodes {
        id
        name
        email
        role
      }
    }
  }
`;

export function createGraphQLAdapter<T>(endpoint: string): DataAdapter<T> {
  return {
    async query(params: QueryParams) {
      // 1. Map Pagination and Sorting to GraphQL variables
      const variables = {
        first: params.pageSize,
        offset: (params.page - 1) * params.pageSize, // Using 1-based index conversion
        orderBy: params.sort ? `${params.sort}_${params.sortOrder.toUpperCase()}` : null,
      };

      // 2. Execute the Query
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: USERS_QUERY,
          variables,
        }),
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0].message);
      }

      // 3. Return TableCraft QueryResult shape
      const { totalCount, nodes } = data.users;
      
      return {
        data: nodes,
        meta: {
          total: totalCount,
          page: params.page,
          pageSize: params.pageSize,
          totalPages: Math.ceil(totalCount / params.pageSize)
        }
      };
    }
  };
}
```

---

## 2. Dynamic Column Selection

To fully utilize GraphQL, you can dynamically build the `fields` part of your query based on what the user wants to see.

While TableCraft's `QueryParams` doesn't pass the list of visible columns by default to the adapter, you can manage this state externally and pass it into your adapter factory, or use the `TableMetadata` pattern.

Here is a conceptual example of a dynamic GraphQL query builder inside an adapter:

```typescript
export function createDynamicGraphQLAdapter<T>(
  endpoint: string, 
  visibleFields: string[] // Pass the list of columns the user is currently viewing
): DataAdapter<T> {
  return {
    async query(params: QueryParams) {
      
      // Prevent querying without fields
      if (visibleFields.length === 0) {
        return { 
          data: [], 
          meta: { 
            total: 0, 
            page: params.page, 
            pageSize: params.pageSize, 
            totalPages: 0 
          } 
        };
      }

      // 1. Construct the fields string dynamically (avoiding duplicate 'id')
      const uniqueFields = new Set(['id', ...visibleFields]);
      const fieldsString = Array.from(uniqueFields).join('\n              ');

      // 2. Build the query
      const dynamicQuery = `
        query GetDynamicData($limit: Int, $offset: Int) {
          dataset(limit: $limit, offset: $offset) {
            count
            items {
              ${fieldsString}
            }
          }
        }
      `;

      const variables = {
        limit: params.pageSize,
        offset: (params.page - 1) * params.pageSize, // Using 1-based index conversion
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: dynamicQuery, variables }),
      });

      const { data, errors } = await response.json();

      if (errors) {
        throw new Error(errors[0].message);
      }

      return {
        data: data.dataset.items,
        meta: {
          total: data.dataset.count,
          page: params.page,
          pageSize: params.pageSize,
          totalPages: Math.ceil(data.dataset.count / params.pageSize)
        }
      };
    }
  };
}
```

This pattern ensures that if a user hides 5 out of 10 columns in TableCraft's UI, your backend doesn't waste database resources fetching those unused fields!