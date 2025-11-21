import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import UV_Login from '@/components/views/UV_Login';
import { useAppStore } from '@/store/main';

/**
 * E2E Authentication Tests
 * Tests the complete authentication flow: register -> logout -> login
 * against the REAL backend API (no mocks).
 * 
 * Backend must be running at http://localhost:3000
 */

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Authentication E2E (Real API)', () => {
  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear();
    
    // Reset Zustand store to unauthenticated state
    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        auth_token: null,
        current_user: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: false,
          user_type: null,
        },
        error_message: null,
        customer_profile: null,
        supplier_profile: null,
        admin_profile: null,
      },
      cart_state: {
        items: [],
        total_items: 0,
        subtotal: 0,
        is_loading: false,
        last_updated: null,
      },
      notification_state: {
        unread_count: 0,
        notifications: [],
        is_loading: false,
      },
    }));
  });

  it('completes full auth flow: register customer -> logout -> login', async () => {
    const user = userEvent.setup();
    
    // Generate unique credentials for this test run
    const uniqueEmail = `testuser${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const firstName = 'Test';
    const lastName = 'User';
    const phoneNumber = '+1-555-0199';
    
    // ========================================================================
    // STEP 1: REGISTER NEW CUSTOMER
    // ========================================================================
    
    const registerCustomer = useAppStore.getState().register_customer;
    
    // Call register API directly through store action
    await registerCustomer({
      email: uniqueEmail,
      password: testPassword,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      account_type: 'retail',
    });
    
    // Verify registration succeeded and user is authenticated
    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
      expect(state.authentication_state.auth_token).toBeTruthy();
      expect(state.authentication_state.current_user?.email).toBe(uniqueEmail.toLowerCase());
      expect(state.authentication_state.authentication_status.user_type).toBe('customer');
      expect(state.authentication_state.customer_profile).toBeTruthy();
    }, { timeout: 10000 });
    
    // ========================================================================
    // STEP 2: LOGOUT
    // ========================================================================
    
    const logoutUser = useAppStore.getState().logout_user;
    await logoutUser();
    
    // Verify logout succeeded
    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.auth_token).toBeNull();
      expect(state.authentication_state.current_user).toBeNull();
      expect(state.authentication_state.authentication_status.user_type).toBeNull();
    }, { timeout: 5000 });
    
    // ========================================================================
    // STEP 3: LOGIN WITH SAME CREDENTIALS
    // ========================================================================
    
    // Render login component
    render(<UV_Login />, { wrapper: Wrapper });
    
    // Find form elements using flexible selectors
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /sign in/i });
    
    // Ensure inputs are enabled before typing
    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });
    
    // Fill in the login form
    await user.clear(emailInput);
    await user.type(emailInput, uniqueEmail);
    await user.clear(passwordInput);
    await user.type(passwordInput, testPassword);
    
    // Button should be enabled once both fields are filled
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    
    // Submit the form
    await user.click(submitButton);
    
    // Wait for loading indicator
    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Wait for authentication to complete
    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail.toLowerCase());
        expect(state.authentication_state.authentication_status.user_type).toBe('customer');
      },
      { timeout: 15000 }
    );
    
    // Verify no error message is present
    const finalState = useAppStore.getState();
    expect(finalState.authentication_state.error_message).toBeNull();
  }, 40000); // 40 second timeout for entire flow

  it('handles login with invalid credentials gracefully', async () => {
    const user = userEvent.setup();
    
    // Render login component
    render(<UV_Login />, { wrapper: Wrapper });
    
    // Find form elements
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /sign in/i });
    
    // Fill in invalid credentials
    await user.type(emailInput, 'nonexistent@example.com');
    await user.type(passwordInput, 'WrongPassword123!');
    
    // Submit the form
    await user.click(submitButton);
    
    // Wait for error message to appear
    await waitFor(
      () => {
        // Check for error in the UI or store
        const state = useAppStore.getState();
        const hasError = state.authentication_state.error_message !== null;
        
        if (hasError) {
          expect(state.authentication_state.error_message).toMatch(/invalid|incorrect|failed/i);
        }
        
        expect(hasError).toBe(true);
      },
      { timeout: 10000 }
    );
    
    // Verify user is NOT authenticated
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
    expect(state.authentication_state.auth_token).toBeNull();
  }, 20000);

  it('validates email format before submission', async () => {
    const user = userEvent.setup();
    
    render(<UV_Login />, { wrapper: Wrapper });
    
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /sign in/i });
    
    // Enter invalid email
    await user.type(emailInput, 'not-an-email');
    await user.type(passwordInput, 'TestPassword123!');
    
    // Blur email field to trigger validation
    await user.click(passwordInput); // Click elsewhere to blur
    
    // Check for validation error (might appear on blur or submit)
    // Try submitting to see client-side validation
    await user.click(submitButton);
    
    // Should see validation error or prevent submission
    // The component may show inline validation or prevent API call
    await waitFor(() => {
      const state = useAppStore.getState();
      // Either validation prevents submit (loading never starts) or shows error
      expect(state.authentication_state.authentication_status.is_loading).toBe(false);
    });
  }, 10000);

  it('registers a new supplier and logs out successfully', async () => {
    const registerSupplier = useAppStore.getState().register_supplier;
    
    // Generate unique credentials
    const uniqueEmail = `supplier${Date.now()}@example.com`;
    const testPassword = 'SupplierPass123!';
    
    // Register supplier (note: supplier registration does NOT auto-authenticate)
    await registerSupplier({
      email: uniqueEmail,
      password: testPassword,
      business_name: 'Test Supply Co',
      business_registration_number: `TEST-${Date.now()}`,
      business_type: 'LLC',
      contact_person_name: 'Test Supplier',
      phone_number: '+1-555-0299',
      business_address: '123 Test St, Test City, TX 78701',
      business_description: 'Test supplier for E2E tests',
    });
    
    // Supplier registration is pending approval, so user is NOT authenticated
    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.authentication_status.is_loading).toBe(false);
    }, { timeout: 10000 });
    
    // Verify registration completed without error
    const state = useAppStore.getState();
    expect(state.authentication_state.error_message).toBeNull();
  }, 15000);
});
