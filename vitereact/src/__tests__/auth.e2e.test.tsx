/**
 * Auth E2E Tests - Uses Mocked API
 * 
 * IMPORTANT: These tests use mocked fetch API (configured in src/test/setup.ts)
 * No backend server is required to run these tests.
 * All API calls are intercepted and mocked with simulated responses.
 */
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import UV_Register from '@/components/views/UV_Register';
import UV_SignIn from '@/components/views/UV_SignIn';
import UV_Dashboard from '@/components/views/UV_Dashboard';
import { useAppStore } from '@/store/main';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Auth E2E Flow (Vitest, mocked API)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store to initial unauthenticated state
    useAppStore.setState({
      authentication_state: {
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: false,
        },
        error_message: null,
      },
      current_workspace: null,
    });
  });

  it('completes full auth flow: register -> logout -> sign-in', async () => {
    // Generate unique email to avoid collisions
    const uniqueEmail = `user${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    const name = 'Test User';

    // ===== STEP 1: REGISTER =====
    const { unmount: unmountRegister } = render(<UV_Register />, { wrapper: Wrapper });

    // Find registration form fields
    const nameInput = await screen.findByLabelText(/name/i);
    const emailInputReg = await screen.findByLabelText(/email address|email/i);
    const passwordInputReg = await screen.findByLabelText(/password/i);
    const registerButton = await screen.findByRole('button', { name: /create account|register|sign up/i });

    // Ensure inputs are enabled before typing
    await waitFor(() => {
      expect(nameInput).not.toBeDisabled();
      expect(emailInputReg).not.toBeDisabled();
      expect(passwordInputReg).not.toBeDisabled();
    });

    const user = userEvent.setup();

    // Fill in registration form
    await user.type(nameInput, name);
    await user.type(emailInputReg, uniqueEmail);
    await user.type(passwordInputReg, password);

    // Button should enable once all fields are filled
    await waitFor(() => expect(registerButton).not.toBeDisabled());
    await user.click(registerButton);

    // Wait for "Creating Account..." loading state
    await waitFor(() => expect(screen.getByText(/creating account/i)).toBeInTheDocument());

    // Wait for registration to complete and store to reflect authenticated state
    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
      },
      { timeout: 20000 }
    );

    // Clean up register component
    unmountRegister();

    // ===== STEP 2: LOGOUT =====
    const { unmount: unmountDashboard } = render(<UV_Dashboard />, { wrapper: Wrapper });

    // Wait for dashboard to render
    await waitFor(() => expect(screen.getByText(/dashboard/i)).toBeInTheDocument());

    // Find and click logout button
    const logoutButton = await screen.findByRole('button', { name: /log out|logout/i });
    await user.click(logoutButton);

    // Wait for logout to complete
    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.auth_token).toBeNull();
    });

    // Clean up dashboard component
    unmountDashboard();

    // ===== STEP 3: SIGN IN =====
    render(<UV_SignIn />, { wrapper: Wrapper });

    // Find sign-in form fields
    const emailInputSignIn = await screen.findByLabelText(/email address|email/i);
    const passwordInputSignIn = await screen.findByLabelText(/password/i);
    const signInButton = await screen.findByRole('button', { name: /sign in|log in/i });

    // Ensure inputs are enabled before typing
    await waitFor(() => {
      expect(emailInputSignIn).not.toBeDisabled();
      expect(passwordInputSignIn).not.toBeDisabled();
    });

    // Fill in sign-in form with same credentials
    await user.type(emailInputSignIn, uniqueEmail);
    await user.type(passwordInputSignIn, password);

    // Button should enable once both fields are filled
    await waitFor(() => expect(signInButton).not.toBeDisabled());
    await user.click(signInButton);

    // Wait for "Signing In..." loading state
    await waitFor(() => expect(screen.getByText(/signing in/i)).toBeInTheDocument());

    // Wait for sign-in to complete and store to reflect authenticated state
    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
      },
      { timeout: 20000 }
    );
  }, 60000); // Extended timeout for full E2E flow

  it('registers a new user successfully', async () => {
    const uniqueEmail = `user${Date.now()}@example.com`;
    const password = 'SecurePass123!';
    const name = 'New User';

    render(<UV_Register />, { wrapper: Wrapper });

    const nameInput = await screen.findByLabelText(/name/i);
    const emailInput = await screen.findByLabelText(/email address|email/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /create account|register|sign up/i });

    await waitFor(() => {
      expect(nameInput).not.toBeDisabled();
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    const user = userEvent.setup();
    await user.type(nameInput, name);
    await user.type(emailInput, uniqueEmail);
    await user.type(passwordInput, password);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await user.click(submitButton);

    await waitFor(() => expect(screen.getByText(/creating account/i)).toBeInTheDocument());

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
      },
      { timeout: 20000 }
    );
  }, 30000);

  it('signs in with existing credentials (if env vars provided)', async () => {
    // This test uses environment variables if they exist
    // Otherwise, it will be skipped or fail gracefully
    const testEmail = import.meta.env.VITE_REAL_TEST_EMAIL;
    const testPassword = import.meta.env.VITE_REAL_TEST_PASSWORD;

    if (!testEmail || !testPassword) {
      console.warn('Skipping sign-in test: VITE_REAL_TEST_EMAIL and VITE_REAL_TEST_PASSWORD not set in .env.test');
      return;
    }

    render(<UV_SignIn />, { wrapper: Wrapper });

    const emailInput = await screen.findByLabelText(/email address|email/i);
    const passwordInput = await screen.findByLabelText(/password/i);
    const submitButton = await screen.findByRole('button', { name: /sign in|log in/i });

    await waitFor(() => {
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
    });

    const user = userEvent.setup();
    await user.type(emailInput, testEmail);
    await user.type(passwordInput, testPassword);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
    await user.click(submitButton);

    await waitFor(() => expect(screen.getByText(/signing in/i)).toBeInTheDocument());

    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
      },
      { timeout: 20000 }
    );
  }, 30000);

  it('logs out successfully', async () => {
    // First, set up authenticated state
    useAppStore.setState({
      authentication_state: {
        auth_token: 'mock-token',
        authentication_status: {
          is_authenticated: true,
          is_loading: false,
        },
        error_message: null,
      },
      current_workspace: null,
    });

    render(<UV_Dashboard />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText(/dashboard/i)).toBeInTheDocument());

    const logoutButton = await screen.findByRole('button', { name: /log out|logout/i });
    
    const user = userEvent.setup();
    await user.click(logoutButton);

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.auth_token).toBeNull();
    });
  }, 30000);
});
