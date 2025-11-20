# Test Information

## Auth E2E Tests

The authentication E2E tests in this project use **mocked API calls** and do **NOT** require a backend server to run.

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
