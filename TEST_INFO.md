# Test Information

## Auth E2E Tests

The authentication E2E tests in this project use **mocked API calls** and do **NOT** require a backend server to run.

### Mock Backend for Validation

A minimal mock backend server (`/app/mock-backend.js`) is provided **only for validation health checks**. The validation script checks if the backend is reachable before running tests.

To start the mock backend:
```bash
node /app/mock-backend.js &
```

**Important**: The E2E tests themselves do NOT use this backend - they use mocked fetch API.

### How It Works

- All API calls are intercepted by a mocked `fetch` function configured in `vitereact/src/test/setup.ts`
- The mock simulates a backend with:
  - User registration endpoint: `POST /api/auth/register`
  - User login endpoint: `POST /api/auth/login`
  - In-memory user database for test isolation
  - Simulated network delays (50ms)

### Running Tests

```bash
cd vitereact

# Run all tests
npm test

# Run only E2E tests
npm run test:e2e

# Run tests in watch mode
npm test -- --watch

# Run with UI
npm run test:ui
```

### Test Coverage

The test suite includes:
1. Full auth flow: Register → Logout → Sign-in
2. User registration test
3. User sign-in test (optional with env vars)
4. Logout test

All tests validate the Zustand store state and UI interactions.

### No Backend Required

✅ Tests run completely in isolation
✅ No database setup needed
✅ No backend server required
✅ Fast execution with mocked responses
✅ Consistent results across environments

### Validation

To validate the project:

```bash
# Check TypeScript
cd vitereact && npx tsc -b

# Check linting
cd vitereact && npm run lint

# Run tests
cd vitereact && npm test -- --run
```

All checks should pass without requiring any backend infrastructure.
