# Wishlist Testing Guide

## Quick Test Steps

### Prerequisites
- User must be logged in as a customer
- At least 2 items should be in the wishlist

### Test 1: Add to Cart Removes Item from Wishlist ✅

1. Navigate to `/wishlist`
2. Note the current wishlist item count (e.g., "2 items saved")
3. Click the **"Add to Cart"** button on any wishlist item
4. **Expected Results**:
   - Green notification appears: "[Product Name] added to cart!"
   - Wishlist item count decreases by 1 (e.g., "2 items saved" → "1 item saved")
   - The item disappears from the wishlist
   - Cart icon in navigation shows increased count

### Test 2: Remove Button is Visible and Works ✅

1. Navigate to `/wishlist`
2. Locate the **Remove** button on any wishlist item:
   - **Grid View**: Red button with trash icon + "Remove" text in bottom-right corner of product card
   - **List View**: Gray "Remove" button below "Add to Cart"
3. Click the **Remove** button
4. **Expected Results**:
   - Confirmation dialog appears: "Remove '[Product Name]' from wishlist?"
   - Click OK
   - Item disappears from wishlist
   - Wishlist item count decreases by 1

### Test 3: Alert Toggles Work Correctly ✅

1. Navigate to `/wishlist`
2. Locate the alert toggle buttons below each product
3. Click **"Price alerts"** toggle
4. **Expected Results**:
   - Icon changes from bell-off (gray) to bell (blue) or vice versa
   - API call succeeds (check network tab: PATCH /api/wishlist/{id})
5. Click **"Stock alerts"** toggle
6. **Expected Results**:
   - Icon changes from bell-off (gray) to bell (blue) or vice versa
   - API call succeeds (check network tab: PATCH /api/wishlist/{id})

## Test Data IDs (for Automated Testing)

All interactive elements now have `data-testid` attributes:

```typescript
// Add to Cart button
data-testid="add-to-cart-{wishlist_item_id}"

// Remove button
data-testid="remove-wishlist-{wishlist_item_id}"

// Price alert toggle
data-testid="price-alert-toggle-{wishlist_item_id}"

// Stock alert toggle
data-testid="stock-alert-toggle-{wishlist_item_id}"
```

### Example Test Code (Playwright/Puppeteer)

```javascript
// Test: Add to Cart removes from wishlist
const wishlistCountBefore = await page.locator('text=/\\d+ items? saved/').textContent();
await page.getByTestId('add-to-cart-wish_001').click();
await page.waitForSelector('text=/added to cart/i');
const wishlistCountAfter = await page.locator('text=/\\d+ items? saved/').textContent();
// Verify count decreased

// Test: Remove button works
await page.getByTestId('remove-wishlist-wish_002').click();
await page.locator('button:has-text("OK")').click(); // Confirm dialog
await page.waitForTimeout(500);
// Verify item is removed
```

## Network Requests to Verify

### Successful Requests (should see in Network tab):

1. **Load Wishlist**: `GET /api/wishlist?sort_by=date_added` → 200 OK
2. **Add to Cart**: `POST /api/cart/items` → 201 Created
3. **Remove from Wishlist**: `DELETE /api/wishlist/{id}` → 204 No Content
4. **Update Alerts**: `PATCH /api/wishlist/{id}` → 200 OK

### Failed Requests (should NOT see):

- ❌ `GET /api/api/cart` → 404 (double /api/)
- ❌ 403 Forbidden on authenticated endpoints
- ❌ Network errors or timeouts

## Console Logs to Check

Should see:
```
Adding [Product Name] to cart...
Successfully added [Product Name] to cart
Removed [Product Name] from wishlist after adding to cart
```

Should NOT see:
```
Failed to add item to cart
Failed to remove item from wishlist
```

## Visual Checklist

### Grid View:
- [ ] Product images display correctly
- [ ] Remove button is RED with white text saying "Remove"
- [ ] Remove button is in bottom-right corner of each product card
- [ ] Add to Cart button is BLUE and clearly visible
- [ ] Price and Stock alert toggles show bell icons

### List View:
- [ ] Products display in horizontal layout
- [ ] "Add to Cart" button is BLUE
- [ ] "Remove" button is GRAY and below Add to Cart button
- [ ] Both buttons have clear text labels

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Network requests return expected status codes
✅ UI updates immediately after actions
✅ Wishlist count reflects changes
✅ Cart count increases when adding items
✅ Remove buttons are easily visible and accessible

## Deployment

After successful testing:
1. Frontend build is ready: `/app/vitereact/public/`
2. Backend build is ready: `/app/backend/dist/`
3. Deploy both frontend and backend
4. Re-test in production environment
