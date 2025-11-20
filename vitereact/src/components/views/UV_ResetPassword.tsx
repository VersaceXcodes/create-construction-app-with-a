import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

interface ResetPasswordResponse {
  message: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

// ============================================================================
// PASSWORD STRENGTH CALCULATOR
// ============================================================================

const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0;
  if (password.length < 8) return 1;
  
  let strength = 2;
  
  // Check for mixed case and numbers
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if ((hasUpperCase || hasLowerCase) && hasNumbers) {
    strength = 3;
  }
  
  if (hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars) {
    strength = 4;
  }
  
  return strength;
};

const getPasswordStrengthLabel = (strength: number): string => {
  switch (strength) {
    case 0: return '';
    case 1: return 'Weak';
    case 2: return 'Fair';
    case 3: return 'Good';
    case 4: return 'Strong';
    default: return '';
  }
};

const getPasswordStrengthColor = (strength: number): string => {
  switch (strength) {
    case 1: return 'bg-red-500';
    case 2: return 'bg-yellow-500';
    case 3: return 'bg-blue-500';
    case 4: return 'bg-green-500';
    default: return 'bg-gray-200';
  }
};

// ============================================================================
// PASSWORD REQUIREMENTS CHECKER
// ============================================================================

const checkPasswordRequirements = (password: string): PasswordRequirement[] => {
  return [
    {
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Contains number',
      met: /\d/.test(password),
    },
    {
      label: 'Contains special character (!@#$%^&*)',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ResetPassword: React.FC = () => {
  // ============================================================================
  // HOOKS & URL PARAMS
  // ============================================================================
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // ============================================================================
  // STATE VARIABLES (from UXSMD datamap)
  // ============================================================================
  
  const [reset_token] = useState<string>(searchParams.get('reset_token') || searchParams.get('token') || '');
  const [email] = useState<string>(searchParams.get('email') || '');
  const [new_password, setNewPassword] = useState<string>('');
  const [confirm_password, setConfirmPassword] = useState<string>('');
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [password_strength, setPasswordStrength] = useState<number>(0);
  const [token_valid, setTokenValid] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const [show_password, setShowPassword] = useState<boolean>(false);
  const [show_confirm_password, setShowConfirmPassword] = useState<boolean>(false);
  const [password_requirements, setPasswordRequirements] = useState<PasswordRequirement[]>([]);
  
  // ============================================================================
  // PASSWORD RESET MUTATION
  // ============================================================================
  
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      const response = await axios.post<ResetPasswordResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/reset-password`,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      setSuccess(true);
      setErrorMessage(null);
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Password reset successfully. Please sign in with your new password.' }
        });
      }, 3000);
    },
    onError: (error: any) => {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.message || 'Failed to reset password. Please try again.';
        setErrorMessage(errorMsg);
        
        if (error.response?.status === 400) {
          setTokenValid(false);
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    },
  });
  
  const is_loading = resetPasswordMutation.isPending;
  
  // ============================================================================
  // VALIDATE TOKEN ON MOUNT
  // ============================================================================
  
  useEffect(() => {
    if (!reset_token) {
      setTokenValid(false);
      setErrorMessage('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [reset_token]);
  
  // ============================================================================
  // PASSWORD STRENGTH VALIDATION (real-time)
  // ============================================================================
  
  useEffect(() => {
    const strength = calculatePasswordStrength(new_password);
    setPasswordStrength(strength);
    
    const requirements = checkPasswordRequirements(new_password);
    setPasswordRequirements(requirements);
    
    // Clear error when user starts typing
    if (error_message) {
      setErrorMessage(null);
    }
  }, [new_password]);
  
  // ============================================================================
  // PASSWORD MATCH VALIDATION
  // ============================================================================
  
  const validatePasswordMatch = (): boolean => {
    if (!confirm_password) return true; // Don't show error until user types
    return new_password === confirm_password;
  };
  
  const passwords_match = validatePasswordMatch();
  
  // ============================================================================
  // FORM VALIDATION
  // ============================================================================
  
  const canSubmit = (): boolean => {
    return (
      token_valid &&
      new_password.length > 0 &&
      confirm_password.length > 0 &&
      passwords_match &&
      password_strength >= 3 && // Require at least "Good" strength
      !is_loading
    );
  };
  
  // ============================================================================
  // SUBMIT HANDLER
  // ============================================================================
  
  const submitPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrorMessage(null);
    
    // Validate all fields
    if (!reset_token) {
      setErrorMessage('Invalid reset token. Please request a new password reset link.');
      return;
    }
    
    if (new_password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    
    if (!passwords_match) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    
    if (password_strength < 3) {
      setErrorMessage('Please choose a stronger password.');
      return;
    }
    
    // Submit to API
    resetPasswordMutation.mutate({
      token: reset_token,
      new_password: new_password,
    });
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Card Container */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                {success ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : !token_valid ? (
                  <XCircle className="w-8 h-8 text-red-600" />
                ) : (
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                )}
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {success ? 'Password Reset!' : !token_valid ? 'Invalid Token' : 'Reset Your Password'}
              </h2>
              
              <p className="text-gray-600 leading-relaxed">
                {success 
                  ? 'Your password has been successfully reset.' 
                  : !token_valid 
                    ? 'This reset link is invalid or has expired.'
                    : 'Choose a strong password for your account.'
                }
              </p>
            </div>
            
            {/* Success State */}
            {success && (
              <div className="px-8 pb-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-green-800 text-sm font-medium">Password Changed Successfully</p>
                      <p className="text-green-700 text-sm mt-1">You can now sign in with your new password.</p>
                    </div>
                  </div>
                </div>
                
                <Link
                  to="/login"
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                >
                  Sign In Now
                </Link>
                
                <p className="text-center text-sm text-gray-500 mt-4">
                  Redirecting to login in 3 seconds...
                </p>
              </div>
            )}
            
            {/* Invalid Token State */}
            {!success && !token_valid && (
              <div className="px-8 pb-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 text-sm font-medium">Reset Link Invalid</p>
                      <p className="text-red-700 text-sm mt-1">
                        This password reset link is invalid or has expired. Links expire after 1 hour.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Link
                  to="/forgot-password"
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                >
                  Request New Reset Link
                </Link>
                
                <div className="mt-4 text-center">
                  <Link
                    to="/login"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </div>
            )}
            
            {/* Reset Password Form */}
            {!success && token_valid && (
              <form onSubmit={submitPasswordReset} className="px-8 pb-8">
                {/* Email Display (if provided) */}
                {email && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      <span className="font-medium">Resetting password for:</span> {email}
                    </p>
                  </div>
                )}
                
                {/* Error Message */}
                {error_message && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-red-800 text-sm">{error_message}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-6">
                  {/* New Password Field */}
                  <div>
                    <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="new_password"
                        name="new_password"
                        type={show_password ? 'text' : 'password'}
                        required
                        value={new_password}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                        placeholder="Enter new password"
                        disabled={is_loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!show_password)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {show_password ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {new_password && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Password strength:</span>
                          <span className="text-xs font-medium text-gray-700">
                            {getPasswordStrengthLabel(password_strength)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${getPasswordStrengthColor(password_strength)}`}
                            style={{ width: `${(password_strength / 4) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm_password"
                        name="confirm_password"
                        type={show_confirm_password ? 'text' : 'password'}
                        required
                        value={confirm_password}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`block w-full px-4 py-3 border-2 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all duration-200 ${
                          confirm_password && !passwords_match
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                        placeholder="Re-enter new password"
                        disabled={is_loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!show_confirm_password)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        tabIndex={-1}
                      >
                        {show_confirm_password ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    
                    {/* Password Match Validation */}
                    {confirm_password && (
                      <div className="mt-2">
                        {passwords_match ? (
                          <p className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Passwords match
                          </p>
                        ) : (
                          <p className="text-sm text-red-600 flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            Passwords do not match
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Password Requirements Checklist */}
                  {new_password && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs font-medium text-gray-700 mb-3">Password Requirements:</p>
                      <div className="space-y-2">
                        {password_requirements.map((req, index) => (
                          <div key={index} className="flex items-center">
                            {req.met ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                            ) : (
                              <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${req.met ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!canSubmit()}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {is_loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resetting Password...
                      </span>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                  
                  {/* Back to Login Link */}
                  <div className="text-center">
                    <Link
                      to="/login"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      ← Back to Sign In
                    </Link>
                  </div>
                </div>
              </form>
            )}
          </div>
          
          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 leading-relaxed">
              For security reasons, password reset links expire after 1 hour. If your link has expired, please request a new one.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ResetPassword;