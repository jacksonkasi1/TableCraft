import { defineTable } from "@tablecraft/engine";
import { sql } from "drizzle-orm";
import * as s from "@/db/schema";

export const orderItems = defineTable(s.orderItems)
  .as("orderItems")
  .join(s.products, {
    on: "order_items.product_id = products.id",
    alias: "product",
    columns: ["name", "price"]
  });
