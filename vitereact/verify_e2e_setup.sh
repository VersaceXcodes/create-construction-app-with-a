#!/bin/bash

echo "🔍 E2E Test Setup Verification"
echo "================================"
echo ""

# Check test file exists
if [ -f "src/__tests__/auth.e2e.test.tsx" ]; then
    echo "✅ Test file exists: src/__tests__/auth.e2e.test.tsx"
    echo "   Lines: $(wc -l < src/__tests__/auth.e2e.test.tsx)"
else
    echo "❌ Test file NOT found: src/__tests__/auth.e2e.test.tsx"
    exit 1
fi

# Check vitest config
if [ -f "vitest.config.ts" ]; then
    echo "✅ Vitest config exists: vitest.config.ts"
    if grep -q "alias" vitest.config.ts; then
        echo "   ✓ Path aliases configured"
    else
        echo "   ⚠ Path aliases might be missing"
    fi
else
    echo "❌ Vitest config NOT found"
    exit 1
fi

# Check .env.test
if [ -f ".env.test" ]; then
    echo "✅ Environment file exists: .env.test"
    if grep -q "VITE_API_BASE_URL" .env.test; then
        echo "   ✓ API base URL configured: $(grep VITE_API_BASE_URL .env.test)"
    fi
else
    echo "❌ .env.test NOT found"
    exit 1
fi

# Check test setup
if [ -f "src/test/setup.ts" ]; then
    echo "✅ Test setup exists: src/test/setup.ts"
else
    echo "❌ Test setup NOT found"
    exit 1
fi

# Check package.json scripts
if grep -q '"test"' package.json; then
    echo "✅ Test scripts configured in package.json:"
    grep -A 3 '"test"' package.json | head -4
else
    echo "❌ Test scripts NOT found in package.json"
    exit 1
fi

# Check dependencies
echo ""
echo "📦 Checking dependencies..."
deps=("vitest" "@testing-library/react" "@testing-library/jest-dom" "@testing-library/user-event" "jsdom")
all_deps_found=true

for dep in "${deps[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        echo "   ✓ $dep"
    else
        echo "   ✗ $dep (MISSING)"
        all_deps_found=false
    fi
done

# Check backend
echo ""
echo "🔌 Checking backend..."
if curl -s http://localhost:3000/api/products?limit=1 > /dev/null 2>&1; then
    echo "✅ Backend is running at http://localhost:3000"
else
    echo "⚠️  Backend is NOT running (tests will fail)"
    echo "   Start backend with: cd /app/backend && npm run dev"
fi

# Check documentation
echo ""
echo "📚 Checking documentation..."
if [ -f "E2E_AUTH_TESTS_README.md" ]; then
    echo "✅ Comprehensive docs: E2E_AUTH_TESTS_README.md"
else
    echo "⚠️  README not found"
fi

if [ -f "QUICKSTART_E2E_TESTS.md" ]; then
    echo "✅ Quick start guide: QUICKSTART_E2E_TESTS.md"
else
    echo "⚠️  Quick start guide not found"
fi

if [ -f "/app/E2E_TEST_SUMMARY.md" ]; then
    echo "✅ Summary document: /app/E2E_TEST_SUMMARY.md"
else
    echo "⚠️  Summary not found"
fi

echo ""
echo "================================"
if [ "$all_deps_found" = true ]; then
    echo "✅ All checks passed! Ready to run tests."
    echo ""
    echo "Run tests with:"
    echo "  npm test              # Watch mode"
    echo "  npm run test:run      # Run once"
    echo "  npx vitest run src/__tests__/auth.e2e.test.tsx  # Specific file"
else
    echo "⚠️  Some dependencies missing. Run: npm install"
fi
echo ""
