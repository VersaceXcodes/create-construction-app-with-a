# E2E Authentication Tests - Setup & Documentation

## Overview

This document describes the E2E authentication tests created for the Vite+React+TS application. These tests verify the complete authentication flow (register → logout → login) against the **REAL backend API** without mocks.

## Test File Location

```
/app/vitereact/src/__tests__/auth.e2e.test.tsx
```

## Prerequisites

### 1. Backend Server Must Be Running

The tests require the backend server to be running at `http://localhost:3000`. 

**To start the backend:**
```bash
cd /app/backend
npm run dev
```

**To verify backend is running:**
```bash
curl http://localhost:3000/api/products?limit=1
```

### 2. Required Dependencies

All necessary dependencies are already installed:
- `vitest` - Test runner
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - Browser environment for tests

## Configuration Files

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### .env.test
```
VITE_API_BASE_URL=http://localhost:3000
```

### src/test/setup.ts
```typescript
import '@testing-library/jest-dom';
```

## Running the Tests

### Run all tests
```bash
npm test
```

### Run tests once (no watch mode)
```bash
npm run test:run
```

### Run with UI
```bash
npm run test:ui
```

### Run only auth tests
```bash
npx vitest run src/__tests__/auth.e2e.test.tsx
```

## Test Coverage

The test suite includes the following test cases:

### 1. **Complete Auth Flow: Register → Logout → Login**
- **Duration:** ~40 seconds
- **Flow:**
  1. Register new customer with unique email (timestamped)
  2. Verify registration succeeded and user is authenticated
  3. Logout user
  4. Verify logout succeeded and user is unauthenticated
  5. Render login component
  6. Fill in credentials and submit form
  7. Verify login succeeded and user is authenticated again
- **Key Assertions:**
  - `authentication_state.authentication_status.is_authenticated === true`
  - `authentication_state.auth_token` is truthy
  - `current_user.email` matches registered email
  - `authentication_status.user_type === 'customer'`
  - `customer_profile` is populated

### 2. **Invalid Credentials Handling**
- **Duration:** ~20 seconds
- **Flow:**
  1. Render login component
  2. Enter non-existent email and wrong password
  3. Submit form
  4. Verify error message appears
  5. Verify user is NOT authenticated
- **Key Assertions:**
  - `error_message` contains "invalid", "incorrect", or "failed"
  - `is_authenticated === false`
  - `auth_token === null`

### 3. **Email Format Validation**
- **Duration:** ~10 seconds
- **Flow:**
  1. Render login component
  2. Enter invalid email format (e.g., "not-an-email")
  3. Enter valid password
  4. Trigger validation (blur or submit)
  5. Verify validation prevents submission or shows error
- **Key Assertions:**
  - `is_loading === false` (submission prevented)
  - Client-side validation kicks in

### 4. **Supplier Registration & Logout**
- **Duration:** ~15 seconds
- **Flow:**
  1. Register new supplier with unique email
  2. Verify registration completed (but user is NOT authenticated)
  3. Verify no error occurred
- **Note:** Supplier registration requires admin approval, so user is not auto-authenticated
- **Key Assertions:**
  - `is_authenticated === false` (pending approval)
  - `error_message === null`

## Test Implementation Details

### Store State Management
The tests directly interact with the Zustand store (`useAppStore`) to:
1. **Reset state** in `beforeEach()` to ensure clean slate
2. **Call store actions** (register_customer, logout_user, login_user)
3. **Assert state changes** after operations complete

### No Network Mocks
- Tests use the **real backend API** at `http://localhost:3000`
- API endpoints tested:
  - `POST /api/auth/register/customer`
  - `POST /api/auth/register/supplier`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`

### Unique Test Data
Each test run generates unique credentials using timestamps:
```typescript
const uniqueEmail = `testuser${Date.now()}@example.com`;
```
This prevents duplicate email conflicts in the database.

### Resilient Selectors
The tests use flexible regex patterns for finding UI elements:
```typescript
screen.findByLabelText(/email address|email/i)
screen.findByLabelText(/password/i)
screen.findByRole('button', { name: /sign in|log in/i })
screen.getByText(/signing in/i)
```

### Timeouts
- Individual test timeout: 10-40 seconds (depending on test complexity)
- Default vitest timeout: 30 seconds
- `waitFor` timeout: 5-15 seconds (depending on operation)

## Database Schema Reference

### Users Table
```sql
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN NOT NULL DEFAULT false,
    ...
);
```

**Key Constraints:**
- `email` must be unique
- `email` is case-insensitive (stored as lowercase)
- `status` must be 'active' for login
- Plain text passwords (for development only - should be hashed in production)

### Customers Table
```sql
CREATE TABLE customers (
    customer_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
    account_type VARCHAR(50) NOT NULL,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    ...
);
```

## API Endpoints

### Register Customer
```
POST /api/auth/register/customer
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1-555-0100",
  "account_type": "retail"
}
```
**Response (201):**
```json
{
  "token": "jwt_token_here",
  "user": { "user_id": "...", "email": "...", ... },
  "customer": { "customer_id": "...", "account_type": "retail", ... }
}
```

### Login
```
POST /api/auth/login
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "token": "jwt_token_here",
  "user": { "user_id": "...", "email": "...", ... },
  "customer": { ... }
}
```

### Logout
```
POST /api/auth/logout
```
**Headers:**
```
Authorization: Bearer {token}
```
**Response (200):**
```json
{
  "message": "Logout successful"
}
```

## Troubleshooting

### Backend Not Running
**Error:** Tests fail with network errors
**Solution:** Start the backend server:
```bash
cd /app/backend
npm run dev
```

### Database Connection Issues
**Error:** Backend throws database connection errors
**Solution:** Check PostgreSQL is running and environment variables are set correctly

### Test Timeout
**Error:** Tests timeout waiting for operations
**Solution:** Increase timeout in test file or vitest.config.ts

### Duplicate Email Errors
**Error:** Registration fails with "Email already exists"
**Solution:** Tests use timestamped emails, but if database persists between runs, you may need to clean test data

### Import Path Issues
**Error:** Cannot resolve '@/store/main' or '@/components/views/UV_Login'
**Solution:** Verify `vitest.config.ts` has correct alias configuration:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

## Best Practices

1. **Always run tests with backend running** - These are true E2E tests
2. **Use unique emails** - Prevent duplicate key violations
3. **Clean state in beforeEach** - Ensure test isolation
4. **Use flexible selectors** - Match against patterns, not exact strings
5. **Test the happy path AND edge cases** - Cover both success and failure scenarios
6. **Wait for async operations** - Use `waitFor` with appropriate timeouts
7. **Assert on store state** - Verify Zustand store reflects expected changes

## Future Enhancements

Potential additions to the test suite:

1. **Email verification flow** - Test verification token handling
2. **Password reset flow** - Test forgot password → reset password
3. **Session persistence** - Test token refresh and session restoration
4. **Multi-tab scenarios** - Test concurrent sessions
5. **Onboarding flows** - Test customer/supplier onboarding completion
6. **Error recovery** - Test network failures and retries
7. **Trade credit flow** - Test trade customer registration and approval

## Related Files

- `/app/vitereact/src/store/main.tsx` - Zustand store with auth actions
- `/app/vitereact/src/components/views/UV_Login.tsx` - Login component
- `/app/backend/server.ts` - Backend auth endpoints
- `/app/backend/db.sql` - Database schema
- `/app/vitereact/src/App.tsx` - Route configuration

---

**Created:** 2025-11-21  
**Last Updated:** 2025-11-21  
**Test Framework:** Vitest + React Testing Library  
**Backend:** Express + PostgreSQL
