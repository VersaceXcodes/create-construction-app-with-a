import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

const UV_Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const errorMessage = useAppStore(state => state.authentication_state.error_message);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  const loginUser = useAppStore(state => state.login_user);
  const clearAuthError = useAppStore(state => state.clear_auth_error);
  
  // Local form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email: string | null;
    password: string | null;
  }>({ email: null, password: null });
  
  // URL params
  const redirectUrl = searchParams.get('redirect_url');
  const urlEmail = searchParams.get('email');
  
  // Pre-populate email from URL on mount
  useEffect(() => {
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [urlEmail]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (redirectUrl && isInternalPath(redirectUrl)) {
        navigate(redirectUrl, { replace: true });
      } else {
        // Navigate to appropriate dashboard based on user type
        if (userType === 'customer') {
          navigate('/dashboard', { replace: true });
        } else if (userType === 'supplier') {
          navigate('/supplier/dashboard', { replace: true });
        } else if (userType === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [isAuthenticated, userType, navigate, redirectUrl]);
  
  // Validate internal path (security: prevent open redirects)
  const isInternalPath = (path: string): boolean => {
    if (!path) return false;
    // Must start with / and not contain protocol or domain
    return path.startsWith('/') && !path.includes('://');
  };
  
  // Client-side email validation
  const validateEmail = (value: string): string | null => {
    if (!value.trim()) {
      return 'Email address is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  };
  
  // Client-side password validation
  const validatePassword = (value: string): string | null => {
    if (!value) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return null;
  };
  
  // Handle email field change
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    // Clear validation error on change
    if (validationErrors.email) {
      setValidationErrors(prev => ({ ...prev, email: null }));
    }
    // Clear backend error on change
    if (errorMessage) {
      clearAuthError();
    }
  };
  
  // Handle password field change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    // Clear validation error on change
    if (validationErrors.password) {
      setValidationErrors(prev => ({ ...prev, password: null }));
    }
    // Clear backend error on change
    if (errorMessage) {
      clearAuthError();
    }
  };
  
  // Handle email blur (validate)
  const handleEmailBlur = () => {
    const error = validateEmail(email);
    setValidationErrors(prev => ({ ...prev, email: error }));
  };
  
  // Handle password blur (validate)
  const handlePasswordBlur = () => {
    const error = validatePassword(password);
    setValidationErrors(prev => ({ ...prev, password: error }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clearAuthError();
    
    // Client-side validation
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    if (emailError || passwordError) {
      setValidationErrors({
        email: emailError,
        password: passwordError,
      });
      return;
    }
    
    // Clear validation errors
    setValidationErrors({ email: null, password: null });
    
    // Call store action (handles API call, state update, navigation)
    try {
      await loginUser(email.toLowerCase().trim(), password);
      // Store action handles success navigation
      // Component will unmount when navigation occurs
    } catch (error) {
      // Error is handled by store and set in errorMessage
      console.error('Login error:', error);
    }
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Navigate to forgot password with email
  const handleForgotPassword = () => {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    navigate(`/forgot-password${params}`);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Card Container */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header Section */}
            <div className="px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome Back
                </h1>
                <p className="text-blue-100 text-sm">
                  Sign in to access your BuildEasy account
                </p>
              </div>
            </div>
            
            {/* Form Section */}
            <div className="px-8 py-8">
              {/* Backend Error Banner */}
              {errorMessage && (
                <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      onBlur={handleEmailBlur}
                      disabled={isLoading}
                      placeholder="you@example.com"
                      className={`
                        block w-full pl-10 pr-4 py-3 
                        border-2 rounded-lg
                        bg-white text-gray-900 placeholder-gray-400
                        focus:outline-none focus:ring-4 focus:ring-blue-100
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${validationErrors.email 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-blue-500'
                        }
                      `}
                      style={{ WebkitTextFillColor: '#111827' }}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>
                
                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      disabled={isLoading}
                      placeholder="Enter your password"
                      className={`
                        block w-full pl-10 pr-12 py-3 
                        border-2 rounded-lg
                        bg-white text-gray-900 placeholder-gray-400
                        focus:outline-none focus:ring-4 focus:ring-blue-100
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${validationErrors.password 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-gray-200 focus:border-blue-500'
                        }
                      `}
                      style={{ WebkitTextFillColor: '#111827' }}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center hover:opacity-70 transition-opacity disabled:opacity-50"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {validationErrors.password}
                    </p>
                  )}
                </div>
                
                {/* Remember Me Checkbox */}
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                    Keep me signed in for 7 days
                  </label>
                </div>
                
                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      w-full flex justify-center items-center
                      px-6 py-3 rounded-lg
                      bg-blue-600 hover:bg-blue-700
                      text-white font-medium
                      shadow-lg hover:shadow-xl
                      transition-all duration-200
                      focus:outline-none focus:ring-4 focus:ring-blue-100
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {isLoading ? (
                      <>
                        <svg 
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                          xmlns="http://www.w3.org/2000/svg" 
                          fill="none" 
                          viewBox="0 0 24 24"
                        >
                          <circle 
                            className="opacity-25" 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke="currentColor" 
                            strokeWidth="4"
                          />
                          <path 
                            className="opacity-75" 
                            fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>
              </form>
              
              {/* Divider */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      New to BuildEasy?
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Sign Up Link */}
              <div className="mt-6">
                <Link
                  to="/register"
                  className="
                    w-full flex justify-center items-center
                    px-6 py-3 rounded-lg
                    bg-gray-100 hover:bg-gray-200
                    text-gray-900 font-medium
                    border-2 border-gray-300
                    transition-all duration-200
                    focus:outline-none focus:ring-4 focus:ring-gray-100
                  "
                >
                  Create an Account
                </Link>
              </div>
              
              {/* Help Links */}
              <div className="mt-8 text-center space-y-2">
                <p className="text-xs text-gray-500">
                  Need help?{' '}
                  <Link 
                    to="/help" 
                    className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                  >
                    Visit our Help Center
                  </Link>
                </p>
                <p className="text-xs text-gray-500">
                  By signing in, you agree to our{' '}
                  <Link 
                    to="/terms" 
                    className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link 
                    to="/privacy" 
                    className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
          
          {/* Security Badge */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center bg-white rounded-full px-4 py-2 shadow-md border border-gray-100">
              <svg 
                className="h-4 w-4 text-green-600 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
                />
              </svg>
              <span className="text-xs font-medium text-gray-700">
                Secure Login • 256-bit Encryption
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Login;