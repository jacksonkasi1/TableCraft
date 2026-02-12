// API Response Types based on Hono example schema

export interface Product {
  id: number;
  tenantId: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  isArchived: boolean;
}

export interface User {
  id: number;
  tenantId: number;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface Order {
  id: number;
  tenantId: number;
  userId: number;
  status: string;
  total: string;
  createdAt: string;
  deletedAt: string | null;
  // Joined/computed fields from engine
  customerEmail?: string;
  customerName?: string;
  itemCount?: number;
  vatAmount?: string;
  statusLabel?: string;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
