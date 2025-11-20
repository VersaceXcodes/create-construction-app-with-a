import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock database to store registered users
const mockUserDatabase = new Map<string, { email: string; password: string; name: string; token: string }>();

// Mock fetch API for E2E tests with simulated network delay
global.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
  const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.parse(options.body as string) : null;

  // Simulate network delay (50ms)
  await new Promise(resolve => setTimeout(resolve, 50));

  // Mock register endpoint
  if (urlString.includes('/api/auth/register') && method === 'POST') {
    const { email, password, name } = body;
    
    // Check if user already exists
    if (mockUserDatabase.has(email)) {
      return {
        ok: false,
        status: 400,
        json: async () => ({ message: 'User already exists' }),
      } as Response;
    }

    // Create new user
    const token = `mock-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    mockUserDatabase.set(email, { email, password, name, token });

    return {
      ok: true,
      status: 200,
      json: async () => ({ token, user: { email, name } }),
    } as Response;
  }

  // Mock login endpoint
  if (urlString.includes('/api/auth/login') && method === 'POST') {
    const { email, password } = body;
    
    // Check if user exists
    const user = mockUserDatabase.get(email);
    if (!user) {
      return {
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response;
    }

    // Check password
    if (user.password !== password) {
      return {
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response;
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ token: user.token, user: { email: user.email, name: user.name } }),
    } as Response;
  }

  // Default: return 404
  return {
    ok: false,
    status: 404,
    json: async () => ({ message: 'Not found' }),
  } as Response;
}) as typeof fetch;
