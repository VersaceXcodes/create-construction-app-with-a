# Promotion DateTime Input Validation Fix

## Issue
Browser validation was failing on datetime inputs with the error: "Please enter a valid value. The field is incomplete or has an invalid date."

## Root Causes Identified

1. **Custom Format Validation Conflict**: The component had custom regex validation (`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/`) that was redundant and potentially conflicting with browser's native validation.

2. **Programmatic Value Setting**: When test automation set values programmatically via `window.__setPromotionFormData`, the input elements weren't being properly synchronized with the DOM, causing browser validation to fail.

3. **API Date Format**: The datetime values weren't being properly converted to ISO 8601 format when sending to the API.

## Changes Made

### 1. Simplified Date Validation (lines 384-445)
- **Removed** custom regex format validation that was conflicting with browser validation
- **Kept** essential validation: empty checks, date parseability, and date range logic
- **Relies** on browser's native `datetime-local` input validation for format checking

### 2. Improved API Date Formatting (lines 81-111)
- **Updated** `formatDateTimeForAPI` function to properly convert to ISO 8601
- **Uses** `Date.toISOString()` for consistent, standards-compliant formatting
- **Handles** errors gracefully with fallback to original value

### 3. Enhanced Programmatic Value Setting (lines 215-242)
- **Added** refs for datetime input elements (`startDateInputRef`, `endDateInputRef`)
- **Updated** `window.__setPromotionFormData` to directly update input DOM elements
- **Calls** `setCustomValidity('')` to clear any custom validation errors
- **Ensures** browser validation state is properly reset

### 4. Added Input References (lines 922-959)
- **Connected** refs to actual input elements
- **Enables** direct DOM manipulation when setting values programmatically
- **Maintains** React state synchronization

## Technical Details

### DateTime Format Flow
1. **User Input/Programmatic Set**: `YYYY-MM-DDTHH:mm` (datetime-local format)
2. **React State**: Stored as-is in `promotionForm.start_date` and `promotionForm.end_date`
3. **API Submission**: Converted to ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`) via `Date.toISOString()`

### Browser Validation
- Native HTML5 `datetime-local` input validation handles format checking
- Required attribute ensures fields are not empty
- Custom validation removed to prevent conflicts
- Programmatic updates now properly sync with DOM validation state

## Testing Recommendations

1. **Manual Testing**:
   - Open promotion creation modal
   - Enter dates manually via date picker
   - Enter dates manually via keyboard
   - Verify form submits successfully

2. **Automated Testing**:
   - Use `window.__setPromotionFormData({ start_date: '2025-11-23T10:00', end_date: '2025-11-24T10:00' })`
   - Verify input elements show correct values
   - Verify browser validation passes
   - Verify form submission succeeds

3. **API Testing**:
   - Verify dates are received in ISO 8601 format
   - Verify timezone handling is correct
   - Verify database stores datetime properly

## Files Modified

- `/app/vitereact/src/components/views/UV_PricingPromotions_Supplier.tsx`

## Verification Steps

```bash
# Build the project
cd /app/vitereact && npm run build

# Test datetime input programmatically (in browser console)
window.__setPromotionFormData({
  promotion_name: 'Test Promotion',
  discount_value: 10,
  start_date: '2025-11-23T10:00',
  end_date: '2025-11-24T10:00'
});

# Verify input values are set correctly
document.getElementById('promotion-start-date').value;
document.getElementById('promotion-end-date').value;

# Check validation state
document.getElementById('promotion-start-date').checkValidity();
document.getElementById('promotion-end-date').checkValidity();
```

## Expected Behavior

After this fix:
- ✅ Browser validation should pass when dates are set programmatically
- ✅ Form submission should succeed with valid datetime values
- ✅ API should receive properly formatted ISO 8601 datetime strings
- ✅ Manual date entry should continue to work as expected
- ✅ Date picker should work correctly
