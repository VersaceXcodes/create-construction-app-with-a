# Review System "Write a Review" Button Fix

## Issue Summary
The "Write a Review" button was not appearing on the product detail page for customers who had received delivered orders containing that product.

## Root Cause
**Express Route Ordering Issue**

The API endpoint `/api/reviews/can-review/:product_id` was returning a 404 error because it was defined **after** the more generic route `/api/reviews/:review_id` in the Express router.

Express matches routes in the order they are defined. When a request came in for `/api/reviews/can-review/prod_010`, Express matched it against `/api/reviews/:review_id` first, treating "can-review" as a review_id parameter, which then failed to find a review with that ID.

## Files Changed
- `/app/backend/server.ts`

## Changes Made

### Before (Incorrect Order)
```typescript
// Line 2853
app.get('/api/reviews', async (req, res) => { ... });

// Line 2982 - This catches "can-review" as a parameter!
app.get('/api/reviews/:review_id', async (req, res) => { ... });

// Line 3107 - Never reached when called with "can-review"
app.get('/api/reviews/can-review/:product_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => { ... });
```

### After (Correct Order)
```typescript
// Line 2853
app.get('/api/reviews', async (req, res) => { ... });

// Line 2983 - Specific route comes FIRST
app.get('/api/reviews/can-review/:product_id', authenticateToken, requireCustomer, async (req: AuthRequest, res: Response) => { ... });

// Line 3031 - Generic parameterized route comes AFTER
app.get('/api/reviews/:review_id', async (req, res) => { ... });
```

## Technical Details

### Express Route Matching Order
Express.js matches routes in the order they are defined. When multiple routes could potentially match a URL:
1. More specific routes must be defined before generic parameterized routes
2. A route like `/:review_id` will match any path segment
3. Routes like `/can-review/:product_id` with fixed path segments are more specific

### Verification
Network logs showed:
- Request: `GET /api/reviews/can-review/prod_010`
- Response: `404 Cannot GET /api/reviews/can-review/prod_010`
- Error: The route existed but wasn't being matched correctly

## Frontend Behavior
The frontend component `UV_ProductDetail_Customer.tsx` conditionally shows the "Write a Review" button based on the API response:

```typescript
// Line 272-277: Check eligibility
const { data: canReviewData } = useQuery({
  queryKey: ['can-review', product_id],
  queryFn: () => checkCanReview(product_id!, authToken!),
  enabled: !!product_id && !!authToken && activeTab === 'reviews',
});

// Line 1010-1017: Show button only if can_review is true
{canReviewData?.can_review && (
  <button onClick={() => setShowReviewModal(true)}>
    Write a Review
  </button>
)}
```

Without a successful API response with `can_review: true`, the button never rendered.

## Testing Recommendations

### Manual Testing
1. Log in as customer `sarah.builder@example.com`
2. Navigate to Orders page
3. View product `prod_010` from delivered order `ORD-2024-002`
4. Click on the "Reviews" tab
5. Verify "Write a Review" button now appears
6. Click button and verify review modal opens

### API Testing
```bash
# Test the endpoint directly (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://123create-construction-app-with-a.launchpulse.ai/api/reviews/can-review/prod_010

# Expected response:
{
  "can_review": true,
  "order_id": "order_002",
  "order_number": "ORD-2024-002",
  "supplier_id": "sup_003"
}
```

## Build Status
✅ Backend built successfully with TypeScript compilation
✅ No TypeScript errors
✅ Route ordering verified

## Next Steps
1. Restart the backend server to apply changes
2. Run E2E tests for the review system
3. Monitor production logs for any related issues

## Prevention
**Best Practice**: Always define specific routes before parameterized routes in Express.js to avoid routing conflicts.

### Linting Rule Suggestion
Consider adding an ESLint rule or code review checklist item:
- "Verify specific routes are defined before parameterized routes"
- "Check for potential route matching conflicts"
