import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

/**
 * UV_ForgotPassword - Password Reset Request View
 * 
 * Public route for users to request password reset via email.
 * Sends password reset email with secure token link.
 * 
 * Route: /forgot-password
 * Authentication: Not Required
 */
const UV_ForgotPassword: React.FC = () => {
  // ============================================================================
  // LOCAL STATE (No global store involvement)
  // ============================================================================
  
  const [email, setEmail] = useState('');
  const [is_loading, setIsLoading] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);
  const [email_sent, setEmailSent] = useState(false);
  
  // ============================================================================
  // EMAIL VALIDATION
  // ============================================================================
  
  const validateEmailFormat = (emailValue: string): boolean => {
    if (!emailValue) {
      setErrorMessage('Email address is required');
      return false;
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    
    setErrorMessage(null);
    return true;
  };
  
  // ============================================================================
  // FORM SUBMISSION HANDLER
  // ============================================================================
  
  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous messages
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Validate email format
    if (!validateEmailFormat(email)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // API call to password reset endpoint
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/forgot-password`,
        { email: email.toLowerCase().trim() },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Success
      setEmailSent(true);
      setSuccessMessage(
        response.data.message || 'Password reset email sent successfully'
      );
      setEmail(''); // Clear email input
      
    } catch (error: any) {
      // Handle errors
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else if (error.message === 'Network Error') {
        setErrorMessage('Connection error. Please check your internet connection.');
      } else {
        setErrorMessage('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // ============================================================================
  // INPUT CHANGE HANDLER
  // ============================================================================
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error_message) {
      setErrorMessage(null);
    }
  };
  
  // ============================================================================
  // EMAIL INPUT BLUR HANDLER (Real-time validation)
  // ============================================================================
  
  const handleEmailBlur = () => {
    if (email) {
      validateEmailFormat(email);
    }
  };
  
  // ============================================================================
  // FOCUS EMAIL INPUT ON MOUNT
  // ============================================================================
  
  useEffect(() => {
    // Focus email input when component mounts
    const emailInput = document.getElementById('email-input');
    if (emailInput) {
      emailInput.focus();
    }
  }, []);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Back to Login Link - Top */}
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </div>
          
          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-8 py-10">
              
              {/* ============================================ */}
              {/* INITIAL STATE - FORM */}
              {/* ============================================ */}
              
              {!email_sent ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      Forgot Password?
                    </h1>
                    <p className="text-base text-gray-600 leading-relaxed">
                      No worries! Enter your email address and we'll send you a secure link to reset your password.
                    </p>
                  </div>
                  
                  {/* Error Message */}
                  {error_message && (
                    <div 
                      className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg"
                      role="alert"
                      aria-live="polite"
                    >
                      <p className="text-sm font-medium">{error_message}</p>
                    </div>
                  )}
                  
                  {/* Form */}
                  <form onSubmit={submitForgotPassword} className="space-y-6">
                    <div>
                      <label 
                        htmlFor="email-input" 
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Email Address
                      </label>
                      <input
                        id="email-input"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        placeholder="Enter your email address"
                        disabled={is_loading}
                        className={`
                          w-full px-4 py-3 rounded-lg border-2 
                          focus:outline-none focus:ring-4 focus:ring-blue-100
                          transition-all duration-200
                          ${error_message 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-gray-200 focus:border-blue-500'
                          }
                          ${is_loading ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
                        `}
                        aria-invalid={error_message ? 'true' : 'false'}
                        aria-describedby={error_message ? 'email-error' : undefined}
                      />
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={is_loading || !email}
                      className="
                        w-full px-6 py-3 rounded-lg font-medium text-white
                        bg-blue-600 hover:bg-blue-700
                        focus:outline-none focus:ring-4 focus:ring-blue-100
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-lg hover:shadow-xl
                      "
                    >
                      {is_loading ? (
                        <span className="flex items-center justify-center">
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
                          Sending Reset Link...
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </form>
                  
                  {/* Security Notice */}
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-700 leading-relaxed">
                      <strong className="font-semibold">Security Note:</strong> For your protection, the reset link will expire in 1 hour. If you don't receive an email, please check your spam folder.
                    </p>
                  </div>
                </>
              ) : (
                /* ============================================ */
                /* SUCCESS STATE - CONFIRMATION */
                /* ============================================ */
                <>
                  {/* Success Icon */}
                  <div className="text-center mb-8">
                    <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle className="h-12 w-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">
                      Check Your Email
                    </h1>
                    <p className="text-base text-gray-600 leading-relaxed mb-4">
                      We've sent a password reset link to your email address.
                    </p>
                  </div>
                  
                  {/* Success Message */}
                  {success_message && (
                    <div 
                      className="mb-6 bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-lg"
                      role="alert"
                      aria-live="polite"
                    >
                      <p className="text-sm font-medium">{success_message}</p>
                    </div>
                  )}
                  
                  {/* Instructions */}
                  <div className="space-y-4 mb-8">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        What's next?
                      </h3>
                      <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                        <li>Check your email inbox for the reset link</li>
                        <li>Click the link in the email (valid for 1 hour)</li>
                        <li>Create your new password</li>
                        <li>Sign in with your new password</li>
                      </ol>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-800">
                        <strong className="font-semibold">Didn't receive the email?</strong><br />
                        Check your spam or junk folder. If you still don't see it, you can try requesting another reset link.
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="
                        w-full inline-flex items-center justify-center
                        px-6 py-3 rounded-lg font-medium text-white
                        bg-blue-600 hover:bg-blue-700
                        focus:outline-none focus:ring-4 focus:ring-blue-100
                        transition-all duration-200
                        shadow-lg hover:shadow-xl
                      "
                    >
                      Back to Login
                    </Link>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setEmailSent(false);
                        setSuccessMessage(null);
                        setErrorMessage(null);
                      }}
                      className="
                        w-full px-6 py-3 rounded-lg font-medium
                        bg-gray-100 hover:bg-gray-200 text-gray-900
                        border border-gray-300
                        focus:outline-none focus:ring-4 focus:ring-gray-100
                        transition-all duration-200
                      "
                    >
                      Send Another Reset Link
                    </button>
                  </div>
                </>
              )}
              
            </div>
            
            {/* Footer - Help Text */}
            {!email_sent && (
              <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
                <p className="text-center text-sm text-gray-600">
                  Remember your password?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Sign in instead
                  </Link>
                </p>
              </div>
            )}
          </div>
          
          {/* Additional Help Link */}
          <div className="mt-6 text-center">
            <Link
              to="/support"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Need help? Contact Support
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ForgotPassword;