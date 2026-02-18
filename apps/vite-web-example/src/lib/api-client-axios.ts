import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { createClient } from '@tablecraft/client';
import type { TableCraftClient } from '@tablecraft/client';

// ** import types
import type { Product, Order, User, Tenant } from './api-client';

// Create axios instance with interceptors
// This is a common pattern - users may have auth logic, logging, etc.
export const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - useful for adding auth tokens
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Example: Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`[Axios] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 errors (redirect to login, etc.)
    if (error.response?.status === 401) {
      console.warn('[Axios] Unauthorized - redirecting to login');
      // window.location.href = '/login';
    }
    
    // Handle 403 errors
    if (error.response?.status === 403) {
      console.error('[Axios] Forbidden - insufficient permissions');
    }
    
    return Promise.reject(error);
  }
);

// Create TableCraft client with axios
// Just pass the axios instance - no wrapper needed!
export const apiClientWithAxios: TableCraftClient = createClient({
  baseUrl: '/api/engine',
  axios: axiosInstance,
});

// Type-safe table clients using axios
export const productsClientAxios = apiClientWithAxios.table<Product>('products');
export const ordersClientAxios = apiClientWithAxios.table<Order>('orders');
export const usersClientAxios = apiClientWithAxios.table<User>('users');
export const tenantsClientAxios = apiClientWithAxios.table<Tenant>('tenants');
