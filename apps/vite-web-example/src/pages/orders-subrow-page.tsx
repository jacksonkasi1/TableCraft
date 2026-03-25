import { DataTable } from "@tablecraft/table";
import { createTableCraftAdapter } from "@tablecraft/table";
import { createOrdersAdapter, type OrdersRow } from "../generated";
import { API_BASE_URL } from "../api";
import { useMemo } from "react";

// --- Child Table Component ---
function OrderItemsTable({ orderId }: { orderId: number }) {
  // Create an adapter for the orderItems table, passing the orderId as a custom filter.
  // We use useMemo so the adapter isn't recreated on every render.
  const childAdapter = useMemo(() => {
    return createTableCraftAdapter({
      baseUrl: API_BASE_URL,
      table: "orderItems",
      customFilters: {
        orderId: orderId, // Automatically translates to a filter constraint
      },
    });
  }, [orderId]);

  return (

      <DataTable
        adapter={childAdapter}
        hiddenColumns={["orderId", "id", "tenantId", "deletedAt", "createdAt", "updatedAt"]}
        config={{
          enableUrlState: false,
          enablePagination: false,
          enableSearch: false,
          enableDateFilter: false,
          enableToolbar: false,
          enableRowSelection: false,
          columnResizingTableId: "order-items-table",
          removeOuterBorder: true, // Strips the card wrapper for a seamless nested look!
        }}
      />

  );
}

// --- Parent Table Component ---
export function OrdersSubRowPage() {
  const parentAdapter = useMemo(() => {
    return createOrdersAdapter({
      baseUrl: API_BASE_URL,
    });
  }, []);

  return (
    <div className="p-8 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders (Master-Detail)</h1>
        <p className="text-muted-foreground mt-1">
          Click the arrow next to an order to see its items. The sub-table loads dynamically
          and manages its own state without affecting the parent URL!
        </p>
      </div>

      <DataTable<OrdersRow>
        adapter={parentAdapter}
        renderSubRow={({ row }) => <OrderItemsTable orderId={row.id} />}
        config={{
          enableSearch: true,
          enableColumnResizing: true,
          defaultPageSize: 10,
        }}
        hiddenColumns={["tenantId", "deletedAt", "updatedAt", "userId", "role"]}
      />
    </div>
  );
}
