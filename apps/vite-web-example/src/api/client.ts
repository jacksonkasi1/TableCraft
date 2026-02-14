import type { ApiResponse, Product, Order, User, Tenant } from '@/types/api';

const API_BASE = '/api/engine';

async function fetchAPI<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
  const url = new URL(endpoint, window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Products API
  products: {
    list: (params?: { 
      search?: string; 
      'filter[category]'?: string;
      sort?: string;
      page?: number;
      pageSize?: number;
    }) => 
      fetchAPI<Product>(`${API_BASE}/products`, params as Record<string, string>),
  },

  // Orders API
  orders: {
    list: (params?: { 
      page?: number;
      pageSize?: number;
      sort?: string;
    }) => 
      fetchAPI<Order>(`${API_BASE}/orders`, params as Record<string, string>),
  },

  // Users API
  users: {
    list: (params?: { 
      search?: string;
      page?: number;
      pageSize?: number;
    }) => 
      fetchAPI<User>(`${API_BASE}/users`, params as Record<string, string>),
  },

  // Tenants API
  tenants: {
    list: (params?: { 
      page?: number;
      pageSize?: number;
    }) => 
      fetchAPI<Tenant>(`${API_BASE}/tenants`, params as Record<string, string>),
  },
};
