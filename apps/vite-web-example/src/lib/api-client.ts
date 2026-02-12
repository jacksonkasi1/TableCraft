import { createClient } from '@tablecraft/client';
import type { TableCraftClient } from '@tablecraft/client';

/**
 * API Client Configuration
 * Uses the Vite proxy configured in vite.config.ts
 * Connects to Hono backend at localhost:5000 via /api proxy
 */
const API_BASE_URL = '/api/engine';

/**
 * Main TableCraft API client instance
 * This is the core client that connects to the backend engine
 */
export const apiClient: TableCraftClient = createClient({
  baseUrl: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Type-safe table clients for each backend table
 * These match the schema in apps/hono-example/src/db/schema.ts
 */

export interface Product {
  id: number;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: number;
  name: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Table clients
export const productsClient = apiClient.table<Product>('products');
export const ordersClient = apiClient.table<Order>('orders');
export const usersClient = apiClient.table<User>('users');
export const tenantsClient = apiClient.table<Tenant>('tenants');

/**
 * Helper to get a table client by name
 */
export function getTableClient(tableName: string) {
  switch (tableName) {
    case 'products':
      return productsClient;
    case 'orders':
      return ordersClient;
    case 'users':
      return usersClient;
    case 'tenants':
      return tenantsClient;
    default:
      return apiClient.table(tableName);
  }
}