# Firebase / Firestore Adapter

Google's Firebase Cloud Firestore is a powerful NoSQL document database. However, it does not support traditional `OFFSET` and `LIMIT` pagination, nor does it natively return a total `COUNT` of documents in a collection efficiently.

Instead, Firestore relies on **Cursor-based Pagination** (using `startAfter`).

This makes a Firestore custom adapter for TableCraft a great example of how to handle APIs that **do not return a `total` row count** and how TableCraft's `<DataTable>` gracefully adapts its UI to a "Next/Previous" only model.

---

## 1. The Firestore Adapter

In this example, we keep a reference to the last visible document from the previous query. When the user clicks "Next Page" in TableCraft, we pass that document snapshot to Firestore's `startAfter()` method.

```typescript
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs,
  where,
  QueryDocumentSnapshot 
} from "firebase/firestore";
import { db } from "../firebase-config"; // Your initialized Firestore db
import type { DataAdapter, QueryParams } from '@tablecraft/table';

export function createFirestoreAdapter<T>(
  collectionName: string,
  // We accept a reference to a mutable cursor object from the caller.
  // This ensures SSR safety and instance-level isolation.
  cursorState: { lastVisibleDocs: Record<number, QueryDocumentSnapshot> }
): DataAdapter<T> {
  return {
    async query(params: QueryParams) {
      // 1. Base Query reference
      let q = collection(db, collectionName);

      // 2. Map Column Filtering (Where clauses)
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          // Note: Firestore requires composite indexes for multiple where clauses
          q = query(q, where(key, "==", value));
        });
      }

      // 3. Map Sorting (Order By)
      // Note: You MUST order by a field before using startAfter()
      const sortField = params.sort || 'createdAt'; // Fallback if no sort selected
      const sortDir = params.sortOrder || 'desc';
      q = query(q, orderBy(sortField, sortDir));

      // 4. Map Pagination (Cursor + Limit)
      // If we are on page > 0, we need the cursor from the PREVIOUS page
      if (params.page > 0) {
        const lastVisible = cursorState.lastVisibleDocs[params.page - 1];
        if (lastVisible) {
          q = query(q, startAfter(lastVisible));
        }
      }

      // Always apply the limit
      q = query(q, limit(params.pageSize));

      // 5. Execute the Query
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      // 6. Save the Cursor for the NEXT page
      // Store the last document in our dictionary mapped to the CURRENT page index
      if (snapshot.docs.length > 0) {
        cursorState.lastVisibleDocs[params.page] = snapshot.docs[snapshot.docs.length - 1];
      }

      // 7. Return TableCraft QueryResult shape
      // Notice we return `total: null` because Firestore doesn't provide it cheaply.
      return {
        data,
        meta: {
          total: null, // Unknown total count
          page: params.page,
          pageSize: params.pageSize,
          totalPages: null, // Unknown total pages
          countMode: 'estimated' // Tell TableCraft to use Next/Prev only pagination
        }
      };
    }
  };
}

// Usage in React:
// import { useRef, useMemo } from 'react';
// 
// function MyTable() {
//   // Keep the cursor state isolated to this specific component instance
//   const cursorRef = useRef({ lastVisibleDocs: {} });
//   
//   const adapter = useMemo(() => {
//     return createFirestoreAdapter<User>('users', cursorRef.current);
//   }, []);
//   
//   return <DataTable adapter={adapter} />;
// }
```

---

## 2. Important Notes on Firestore Pagination

### Missing "Total Pages"
Because Firestore charges per document read, running a `COUNT()` on a collection with 100,000 documents would be extremely expensive. Our adapter explicitly returns `total: null` and `countMode: 'estimated'`.

When TableCraft sees this, it will:
1. Hide the "Page X of Y" text.
2. Hide the "Go to Page X" input.
3. Only display "Previous" and "Next" buttons.
4. It will automatically disable the "Next" button if the returned `data` array length is strictly less than `pageSize` (indicating you reached the end of the collection).

### Sorting Limitations
Firestore requires composite indexes if you sort by one field but filter (`where()`) by another. If a user tries to sort a column in TableCraft that isn't indexed, Firestore will throw an error with a URL to build the index in your Firebase console.

### Going Backwards
The example above maintains a dictionary of cursors (`lastVisibleDocs`). If a user is on Page 3, and clicks "Previous" to Page 2, TableCraft passes `params.page = 1` (0-indexed). The adapter looks up the cursor for Page 1 (`params.page - 1`), which it saved previously, allowing the user to seamlessly navigate backward.