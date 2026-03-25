## 📝 TableCraft Sub-Row Technical Specification (Pattern 1: Master-Detail)

This document outlines the exact codebase changes required to implement the Master-Detail sub-row pattern in TableCraft.

> **💡 The "Master-Detail" Philosophy**
> This pattern treats the expanded area as an isolated "Detail" view. Instead of trying to force TanStack to process hierarchical data with nested `<tbody>` hacks, we simply inject a full-width React container below the row. 
> 
> **The magic:** Developers can render a completely separate `<DataTable>` instance inside this container. The backend requires **zero custom code**, and the frontend nested table handles its own sorting, resizing, and metadata natively!

### 📦 1. Type Definitions (`packages/table/src/types.ts`)
- [ ] **Update `DataTableProps` interface:**
  ```typescript
  // Allow developers to control exactly WHICH rows can expand (Optional, defaults to all if renderSubRow is provided)
  getRowCanExpand?: (row: T) => boolean;
  // Add the renderSubRow function prop
  renderSubRow?: (props: { row: T; table: TableContext<T> }) => React.ReactNode;
  ```
- [ ] **Update `TableConfig` interface:**
  ```typescript
  // Add default expanded state option
  defaultExpanded?: boolean | Record<string, boolean>;
  ```

### ⚙️ 2. Core Config & Hook Updates
- [ ] **Update `packages/table/src/core/table-config.ts`:**
  - Add `defaultExpanded: false` to the `defaultConfig` object.
- [ ] **Imports (`packages/table/src/data-table.tsx`):**
- [ ] **Imports:** 
  - Add `ExpandedState` to the type imports from `@tanstack/react-table`.
  - Add `getExpandedRowModel` to the core imports from `@tanstack/react-table`.
- [ ] **State Management:**
  - Add `[expanded, setExpanded]` state using `useState<ExpandedState>({})`.
  - Initialize the state using `configOverrides?.defaultExpanded`.
- [ ] **TanStack Table Config (`useReactTable`):**
  - Add `state: { ..., expanded }` to the table options.
  - Add `onExpandedChange: setExpanded`.
  - Add `getExpandedRowModel: getExpandedRowModel()`.
  - Update `getRowCanExpand` to use the provided prop, or default to `() => !!renderSubRow` if not provided.

### 🧩 3. Column Injection (`packages/table/src/data-table.tsx`)
- [ ] **Update `resolvedColumns` useMemo block:**
  - Check if `renderSubRow` exists.
  - If true, unshift (prepend) an `__expand` column to the `cols` array.
  - **Column Definition:**
    - `id: "__expand"`
    - `size: 40, enableResizing: false, enableSorting: false, enableHiding: false`
    - `header: () => null`
    - `cell: ({ row }) => <div className="px-2"><ExpandIcon row={row} /></div>` (Import and reuse the existing ExpandIcon component from `packages/table/src/expand-icon.tsx`!).
  - *Note: Ensure this column interacts correctly with `normalizeColumnOrder` so it always stays on the left (before or after the checkbox).*

### 🎨 4. Rendering Logic (`packages/table/src/data-table.tsx`)
- [ ] **Update the `<TableBody>` mapping loop:**
  - Change `table.getRowModel().rows.map(row => ( ... ))` to wrap the standard `<TableRow>` in a `<React.Fragment>`.
  - Immediately below the standard `<TableRow>`, add a conditional check:
    ```tsx
    {row.getIsExpanded() && renderSubRow && (
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={row.getVisibleCells().length} className="p-0 border-b">
          {renderSubRow({ row: row.original, table: tableContextRef.current })}
        </TableCell>
      </TableRow>
    )}
    ```

---

### 🧑‍💻 5. Usage Example (How Developers Will Use It)
*No changes required to TableCraft core, but this is how developers will consume the new API.*

**Parent Table Component (`app/orders/page.tsx`):**
```tsx
import { DataTable } from "@tablecraft/table";
import { orderAdapter } from "./adapters";
import { OrderItemsTable } from "./order-items-table"; 

export default function OrdersPage() {
  return (
    <DataTable
      adapter={orderAdapter}
      renderSubRow={({ row }) => <OrderItemsTable orderId={row.id} />}
    />
  );
}
```

**Child Table Component (`app/orders/order-items-table.tsx`):**
```tsx
import { DataTable } from "@tablecraft/table";
import { useOrderItemsAdapter } from "./adapters"; // Your custom adapter hook

export function OrderItemsTable({ orderId }: { orderId: string }) {
  // Get an adapter instance specifically for this order's items
  const childAdapter = useOrderItemsAdapter(orderId);

  return (
    <DataTable 
      adapter={childAdapter} 
      config={{ 
        enablePagination: false, 
        enableUrlState: false, // CRITICAL: Prevent sub-table from conflicting with the parent's URL state
        enableToolbar: false,
      }} 
      hiddenColumns={['orderId']} 
    />
  );
}
```

---

### 🛡️ 6. Architectural Edge Cases & Solutions (Pre-Flight Check)
Before implementing, we analyzed the TableCraft architecture to ensure this pattern won't introduce bugs. Here is how the architecture natively solves common sub-row issues:

1. **The CSS Truncation Trap (Solved):**
   - **Issue:** Standard TableCraft cells use `truncate max-w-0` to prevent long text from breaking column resizing. If applied to our full-width sub-row cell, the content would disappear.
   - **Solution:** We explicitly use `className="p-0 border-b"` for the sub-row `<TableCell>` so it can expand to the full width of the table.

2. **Selective Expansion UX (Solved):**
   - **Issue:** By default, providing `renderSubRow` makes *every* row expandable. What if a developer only wants "Shipped" orders to expand?
   - **Solution:** We added the `getRowCanExpand?: (row: T) => boolean` prop. 
     - **Default DX:** If omitted, all rows get an expand button.
     - **Advanced DX:** If provided (e.g., `row => row.status === 'shipped'`), the expand button is hidden for unshipped rows.

3. **Sub-Row Exports (Solved):**
   - **Issue:** Does exporting the parent table include the expanded sub-rows?
   - **Solution:** No, and it shouldn't! The Master-Detail pattern treats them as separate datasets. 
     - **How developers export sub-rows:** They simply pass `config={{ enableExport: true }}` to their nested `<DataTable>`. The child table will render its own "Export CSV" button! No custom hooks required.

4. **Dropdown Clipping & Z-Index (Solved):**
   - **Issue:** Nested tables often suffer from "clipped dropdowns" (e.g., the Actions menu gets trapped inside the parent row's boundaries).
   - **Solution:** TableCraft's Radix UI/floating UI implementation ensures dropdowns portalled to the body will float perfectly over the parent table without getting cut off.
