# DateTime Input Best Practices for React Applications

## Quick Reference Guide

### ✅ DO: Simple and Reliable Pattern

```typescript
// Good: Single onChange handler, always update state
<input
  type="datetime-local"
  required
  value={normalizeDateTime(formData.start_date)}
  onChange={(e) => {
    const inputValue = e.target.value;
    const normalized = normalizeDateTime(inputValue);
    setFormData(prev => ({ 
      ...prev, 
      start_date: inputValue || normalized 
    }));
  }}
/>
```

### ❌ DON'T: Conditional Updates and Multiple Handlers

```typescript
// Bad: Conditional checks can prevent state updates
<input
  type="datetime-local"
  value={normalizeDateTime(formData.start_date)}
  onChange={(e) => {
    const normalized = normalizeDateTime(e.target.value);
    if (normalized) {  // ❌ Don't do this
      setFormData(prev => ({ ...prev, start_date: normalized }));
    }
  }}
  onInput={(e) => { /* ❌ Redundant handler */ }}
  onBlur={(e) => { /* ❌ Redundant handler */ }}
/>
```

---

## Common Pitfalls and Solutions

### Pitfall 1: Browser Validation Errors
**Problem**: "Please enter a valid value. The field is incomplete or has an invalid date."

**Solution**: Always add `required` attribute and ensure value updates on every change:
```typescript
<input
  type="datetime-local"
  required  // ✅ Native validation
  value={normalizedValue}
  onChange={(e) => updateValue(e.target.value)} // ✅ Always update
/>
```

### Pitfall 2: State Synchronization Issues
**Problem**: Input shows one value, React state has another.

**Solution**: Don't conditionally update state:
```typescript
// Bad
if (value !== currentValue) {
  updateState(value); // ❌ Can cause sync issues
}

// Good
updateState(value); // ✅ Always update
```

### Pitfall 3: Automation Testing Failures
**Problem**: Tests fail because programmatic value setting doesn't trigger validation.

**Solution**: Use proper controlled component pattern with native validation:
```typescript
<input
  type="datetime-local"
  required  // ✅ Browser validates
  value={value}  // ✅ Controlled component
  onChange={handleChange}  // ✅ Single handler
/>
```

---

## Normalization Function Template

```typescript
/**
 * Normalizes datetime values to YYYY-MM-DDTHH:mm format
 * Compatible with datetime-local input
 */
function normalizeDateTime(value: string): string {
  if (!value) return '';
  
  // Already in correct format (YYYY-MM-DDTHH:mm or with :ss)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.substring(0, 16); // Remove seconds if present
  }
  
  // Handle ISO 8601 with timezone (e.g., 2025-11-22T08:00:00Z)
  if (value.includes('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return formatDateTimeLocal(date);
      }
    } catch (error) {
      console.warn('Failed to parse ISO date:', value);
    }
  }
  
  // General date parsing
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return formatDateTimeLocal(date);
    }
  } catch (error) {
    console.warn('Failed to parse date:', value);
  }
  
  return '';
}

/**
 * Formats a Date object to datetime-local format
 */
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
```

---

## Validation Pattern

### Client-Side Validation
```typescript
function validateDateRange(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) {
    return 'Start and end dates are required';
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Please enter valid dates';
  }
  
  if (end <= start) {
    return 'End date must be after start date';
  }
  
  return null; // Valid
}
```

### Form Submission Handler
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate dates
  const error = validateDateRange(formData.start_date, formData.end_date);
  if (error) {
    showError(error);
    return;
  }
  
  // Submit to API
  submitForm(formData);
};
```

---

## Testing Guidelines

### Manual Testing Checklist
- [ ] Fill dates manually via date picker
- [ ] Type dates directly into input
- [ ] Clear dates and submit (should show required error)
- [ ] Set end date before start date (should show validation error)
- [ ] Submit with valid dates (should succeed)

### Automated Testing (Playwright/Selenium)
```typescript
// Fill datetime-local input in automation
await page.fill('#start-date', '2025-12-25T10:00');
await page.fill('#end-date', '2025-12-31T23:59');

// Verify values were set
const startValue = await page.inputValue('#start-date');
expect(startValue).toBe('2025-12-25T10:00');

// Check form validity
const isValid = await page.evaluate(() => {
  const form = document.querySelector('form');
  return form?.checkValidity();
});
expect(isValid).toBe(true);
```

---

## Browser Compatibility

| Browser | datetime-local Support | Notes |
|---------|------------------------|-------|
| Chrome 20+ | ✅ Full | Native date/time picker |
| Edge 12+ | ✅ Full | Native date/time picker |
| Firefox 57+ | ✅ Full | Native date/time picker |
| Safari 14.1+ | ✅ Full | Native date/time picker |
| Safari < 14.1 | ⚠️ Partial | Falls back to text input |

### Fallback for Older Browsers
```typescript
// Check if browser supports datetime-local
const supportsDateTimeLocal = (() => {
  const input = document.createElement('input');
  input.type = 'datetime-local';
  return input.type === 'datetime-local';
})();

// Use polyfill or alternative UI if not supported
if (!supportsDateTimeLocal) {
  // Import date picker library
  // e.g., react-datepicker, flatpickr, etc.
}
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Using `value !== prevValue` Check
```typescript
// Don't do this
onChange={(e) => {
  const newValue = e.target.value;
  if (newValue !== formData.date) {  // ❌
    setFormData({ ...formData, date: newValue });
  }
}}
```

### ❌ Mistake 2: Not Handling Empty Values
```typescript
// Don't do this
onChange={(e) => {
  const normalized = normalize(e.target.value);
  if (normalized) {  // ❌ Blocks empty value updates
    updateDate(normalized);
  }
}}
```

### ❌ Mistake 3: Multiple Competing Event Handlers
```typescript
// Don't do this
<input
  onChange={handler1}  // ❌
  onInput={handler2}   // ❌
  onBlur={handler3}    // ❌
/>
```

### ❌ Mistake 4: Forgetting `required` Attribute
```typescript
// Don't do this
<input
  type="datetime-local"
  // Missing: required attribute
/>
```

---

## Accessibility Considerations

### Proper Labeling
```typescript
<label htmlFor="start-date" className="...">
  Start Date *
</label>
<input
  id="start-date"
  name="start_date"
  type="datetime-local"
  required
  aria-label="Promotion Start Date"
  aria-required="true"
/>
```

### Error Messages
```typescript
{error && (
  <div role="alert" className="error-message">
    {error}
  </div>
)}
```

### Keyboard Navigation
- ✅ Tab to navigate between inputs
- ✅ Enter/Space to open date picker
- ✅ Arrow keys to navigate dates
- ✅ Escape to close picker

---

## Summary Checklist

When implementing datetime-local inputs:

- [ ] Use `type="datetime-local"`
- [ ] Add `required` attribute if mandatory
- [ ] Implement single `onChange` handler
- [ ] Always update state (no conditional checks)
- [ ] Normalize value for display
- [ ] Validate before submission
- [ ] Add proper labels and ARIA attributes
- [ ] Test with manual and automated tools
- [ ] Handle empty values gracefully
- [ ] Provide clear error messages

---

## Additional Resources

- [MDN: datetime-local input](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local)
- [React Controlled Components](https://react.dev/learn/sharing-state-between-components#controlled-and-uncontrolled-components)
- [HTML5 Form Validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated**: 2025-11-22  
**Maintained By**: Development Team
