/**
 * Centralized API Client Configuration
 * 
 * This file provides utilities for making API requests consistently across the application.
 * Axios is already configured with baseURL in store/main.tsx to include '/api' prefix.
 */

import axios from 'axios';

/**
 * Get the base API URL (includes /api suffix)
 * Note: Axios baseURL is already configured in store/main.tsx
 */
export const getApiBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api`;
};

/**
 * Make an API request using relative URL (recommended)
 * Axios baseURL will automatically prepend the full API URL
 * 
 * @example
 * // Instead of: axios.get(`${API_BASE_URL}/products`)
 * // Use: apiClient.get('/products')
 */
export const apiClient = axios;

/**
 * Make an API request with fetch API (for non-axios usage)
 * This constructs the full URL for fetch requests
 * 
 * @param endpoint - Endpoint path (e.g., '/products', '/categories')
 * @param options - Fetch options
 */
export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const url = `${getApiBaseUrl()}${endpoint}`;
  return fetch(url, options);
};

export default apiClient;
