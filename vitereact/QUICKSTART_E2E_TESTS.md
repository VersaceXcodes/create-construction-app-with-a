# Quick Start Guide - E2E Auth Tests

## Prerequisites Check

Before running tests, ensure the backend is running:

```bash
# Check if backend is running
curl http://localhost:3000/api/products?limit=1

# If not running, start it:
cd /app/backend
npm run dev
```

## Running Tests

### Option 1: Run all tests (watch mode)
```bash
cd /app/vitereact
npm test
```

### Option 2: Run tests once
```bash
cd /app/vitereact
npm run test:run
```

### Option 3: Run only auth E2E tests
```bash
cd /app/vitereact
npx vitest run src/__tests__/auth.e2e.test.tsx
```

### Option 4: Run with verbose output
```bash
cd /app/vitereact
npx vitest run src/__tests__/auth.e2e.test.tsx --reporter=verbose
```

## What Gets Tested

✅ **Complete auth flow:** Register → Logout → Login  
✅ **Invalid credentials handling:** Error messages and state  
✅ **Email validation:** Client-side validation  
✅ **Supplier registration:** Different user type flow  

## Expected Output

When tests pass, you should see:

```
✓ src/__tests__/auth.e2e.test.tsx (4)
  ✓ Authentication E2E (Real API) (4)
    ✓ completes full auth flow: register customer -> logout -> login (38s)
    ✓ handles login with invalid credentials gracefully (15s)
    ✓ validates email format before submission (8s)
    ✓ registers a new supplier and logs out successfully (12s)

Test Files  1 passed (1)
Tests  4 passed (4)
Duration  73s
```

## Test Details

### Test 1: Complete Auth Flow (~40s)
- Registers new customer with unique timestamped email
- Verifies authentication state is correct
- Logs out user
- Logs back in via UI component
- Verifies all state transitions

### Test 2: Invalid Credentials (~20s)
- Attempts login with non-existent credentials
- Verifies error message appears
- Verifies user remains unauthenticated

### Test 3: Email Validation (~10s)
- Tests client-side validation
- Ensures invalid email formats are caught

### Test 4: Supplier Registration (~15s)
- Registers supplier (requires admin approval)
- Verifies registration completes without error

## Troubleshooting

### "ECONNREFUSED" Error
**Cause:** Backend is not running  
**Fix:**
```bash
cd /app/backend
npm run dev
```

### "Email already exists" Error
**Cause:** Database has leftover test data (shouldn't happen with timestamped emails)  
**Fix:** Tests use `testuser${Date.now()}@example.com` to avoid duplicates

### Tests Timeout
**Cause:** Backend is slow or tests need more time  
**Fix:** Increase timeout in `vitest.config.ts`:
```typescript
testTimeout: 60000  // 60 seconds
```

### Import Errors
**Cause:** Path aliases not configured  
**Fix:** Already configured in `vitest.config.ts`

## Configuration Files

All configuration files are already set up:

- ✅ `vitest.config.ts` - Test runner config with jsdom and aliases
- ✅ `.env.test` - API base URL configuration
- ✅ `src/test/setup.ts` - Test setup with jest-dom matchers
- ✅ `package.json` - Test scripts added

## Key Features

1. **Real API Testing** - No mocks, tests against actual backend
2. **Zustand Store Integration** - Tests read/write from real store
3. **Component Testing** - Tests actual UI components (UV_Login)
4. **Unique Test Data** - Timestamped emails prevent conflicts
5. **Comprehensive Coverage** - Tests success and failure paths

## Next Steps

After verifying tests pass, you can:

1. **Add more test cases** - Test edge cases and error scenarios
2. **Test other auth flows** - Password reset, email verification
3. **Add integration tests** - Test multiple components together
4. **Add API tests** - Test backend endpoints directly
5. **Set up CI/CD** - Run tests automatically on push/PR

## Documentation

For detailed documentation, see:
- `E2E_AUTH_TESTS_README.md` - Comprehensive test documentation

## Support

If you encounter issues:
1. Check backend logs: `cd /app/backend && npm run dev`
2. Check test output for specific error messages
3. Verify all configuration files are correct
4. Ensure PostgreSQL database is running and accessible

---

**Created:** 2025-11-21  
**Test Framework:** Vitest + React Testing Library  
**Backend API:** http://localhost:3000
