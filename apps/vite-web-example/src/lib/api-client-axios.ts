import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

// ** import apis
import { API_BASE_URL } from '../api';

// Create axios instance with interceptors
// This is a common pattern - users may have auth logic, logging, etc.
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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
