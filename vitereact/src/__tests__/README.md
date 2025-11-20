# Auth E2E Tests

This directory contains end-to-end authentication tests that interact with a real backend API.

## Setup

1. **Backend Server**: Ensure your backend server is running at `http://localhost:3000` (or the URL specified in `.env.test`)

2. **Environment Variables**: The tests use the `VITE_API_BASE_URL` from `.env.test`:
   ```
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. **Optional**: For sign-in only tests with existing credentials, add to `.env.test`:
   ```
   VITE_REAL_TEST_EMAIL=test@example.com
   VITE_REAL_TEST_PASSWORD=TestPassword123!
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run only auth E2E tests
npx vitest src/__tests__/auth.e2e.test.tsx

# Run in watch mode
npx vitest src/__tests__/auth.e2e.test.tsx --watch

# Run with coverage
npx vitest src/__tests__/auth.e2e.test.tsx --coverage
```

## Test Structure

The test suite includes:

1. **Full Auth Flow**: Register → Logout → Sign-in
   - Creates a unique user with timestamped email
   - Registers the user
   - Logs out
   - Signs back in with same credentials
   - Validates Zustand store state at each step

2. **Register Test**: Creates a new user account
   - Uses unique email to avoid collisions
   - Validates successful registration
   - Checks auth token and authenticated state

3. **Sign-in Test** (optional): Signs in with existing credentials
   - Requires `VITE_REAL_TEST_EMAIL` and `VITE_REAL_TEST_PASSWORD` env vars
   - Skips gracefully if env vars not provided

4. **Logout Test**: Validates logout functionality
   - Sets up authenticated state
   - Performs logout
   - Validates store is cleared

## Key Features

- **No Mocking**: Tests use real API calls to backend
- **Unique Emails**: Uses `Date.now()` to generate unique test emails
- **Store Validation**: Asserts on Zustand store state, not just UI
- **Resilient Selectors**: Supports label/button text variants
- **Proper Cleanup**: Resets store and localStorage between tests

## API Endpoints Expected

The tests expect these backend endpoints:

- `POST /api/auth/register` - Register new user
  - Body: `{ email, password, name }`
  - Response: `{ token, user }`

- `POST /api/auth/login` - Sign in existing user
  - Body: `{ email, password }`
  - Response: `{ token, user }`

## Store Structure

The tests validate this Zustand store structure:

```typescript
{
  authentication_state: {
    auth_token: string | null,
    authentication_status: {
      is_authenticated: boolean,
      is_loading: boolean
    },
    error_message: string | null
  },
  current_workspace: string | null
}
```

## Troubleshooting

- **Tests timeout**: Increase timeout in test or check backend is running
- **Duplicate email errors**: Tests use unique timestamps, but ensure DB is cleaned between runs
- **Path alias errors**: Ensure vite.config.ts and tsconfig have `@/*` alias configured
