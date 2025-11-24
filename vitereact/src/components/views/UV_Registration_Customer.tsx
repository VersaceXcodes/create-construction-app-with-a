import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Eye, EyeOff, Check, X, AlertCircle, ShoppingCart, Briefcase, Loader2 } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface RegistrationFormData {
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  account_type: 'retail' | 'trade';
  default_delivery_address: {
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
  } | null;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirm_password?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  account_type?: string;
  terms?: string;
  general?: string;
}

interface RegistrationPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  account_type: 'retail' | 'trade';
  default_delivery_address?: {
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
  };
}

interface RegistrationResponse {
  token: string;
  user: {
    user_id: string;
    email: string;
    user_type: string;
    first_name: string;
    last_name: string;
    status: string;
    email_verified: boolean;
  };
  customer: {
    customer_id: string;
    account_type: string;
    onboarding_completed: boolean;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  return Math.min(strength, 4);
};

const getPasswordStrengthLabel = (strength: number): { label: string; color: string } => {
  switch (strength) {
    case 0:
    case 1:
      return { label: 'Weak', color: 'text-red-600' };
    case 2:
      return { label: 'Fair', color: 'text-yellow-600' };
    case 3:
      return { label: 'Good', color: 'text-blue-600' };
    case 4:
      return { label: 'Strong', color: 'text-green-600' };
    default:
      return { label: 'Weak', color: 'text-red-600' };
  }
};

const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhoneNumber = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
};

// Sanitize text input to prevent XSS and SQL injection
const sanitizeTextInput = (value: string): string => {
  // Remove any HTML tags, script tags, and SQL injection patterns
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .trim();
};

// Check if input contains dangerous patterns
const containsDangerousPatterns = (value: string): boolean => {
  const dangerousPatterns = [
    /<script/i,
    /<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /'.*OR.*'/i,
    /".*OR.*"/i,
    /--/,
    /;.*DROP/i,
    /;.*DELETE/i,
    /;.*INSERT/i,
    /;.*UPDATE/i,
    /UNION.*SELECT/i,
    /EXEC\s*\(/i,
    /EXECUTE\s*\(/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(value));
};

// Validate name input (letters, spaces, hyphens, apostrophes only)
const validateNameInput = (value: string): boolean => {
  // Allow letters (including international), spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  return nameRegex.test(value) || value === '';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Registration_Customer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  void searchParams; // Reserved for future use (e.g., return_url)
  
  // CRITICAL: Individual Zustand selectors
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const registerCustomer = useAppStore(state => state.register_customer);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // ============================================================================
  // FORM STATE
  // ============================================================================
  
  const [formData, setFormData] = useState<RegistrationFormData>({
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    account_type: 'retail',
    default_delivery_address: null,
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
  
  // ============================================================================
  // API MUTATION
  // ============================================================================
  
  const registrationMutation = useMutation({
    mutationFn: async (payload: RegistrationPayload) => {
      const response = await axios.post<RegistrationResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register/customer`,
        payload
      );
      return response.data;
    },
    onSuccess: async () => {
      // Call Zustand action to update auth state
      await registerCustomer({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        account_type: formData.account_type,
      });
      
      // If backend returns token, user is auto-logged in
      // Navigate to onboarding (Zustand store handles this automatically)
      // Otherwise, show success message and prompt to check email
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        // Email already exists
        setValidationErrors(prev => ({
          ...prev,
          email: 'An account with this email already exists. Try signing in instead.',
        }));
      } else if (error.response?.status === 400) {
        // Validation errors from backend
        const backendErrors = error.response.data.errors || {};
        setValidationErrors(prev => ({ ...prev, ...backendErrors }));
      } else {
        // General error
        setValidationErrors(prev => ({
          ...prev,
          general: 'Registration failed. Please try again.',
        }));
      }
    },
  });
  
  // ============================================================================
  // VALIDATION HANDLERS
  // ============================================================================
  
  const handlePasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, password: value }));
    setPasswordStrength(calculatePasswordStrength(value));
    
    // Clear password errors when user types
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated.password;
      delete updated.confirm_password;
      return updated;
    });
  };
  
  const handleConfirmPasswordChange = (value: string) => {
    setFormData(prev => ({ ...prev, confirm_password: value }));
    
    // Clear confirm password error
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated.confirm_password;
      return updated;
    });
  };
  
  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
    
    // Validate email in real-time
    if (value && !validateEmail(value)) {
      setValidationErrors(prev => ({
        ...prev,
        email: 'Please enter a valid email address',
      }));
    } else {
      // Clear email error
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated.email;
        return updated;
      });
    }
  };
  
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({ ...prev, phone_number: formatted }));
    
    // Clear phone error
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated.phone_number;
      return updated;
    });
  };
  
  const validateForm = useCallback((): boolean => {
    const errors: ValidationErrors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // First name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    } else if (containsDangerousPatterns(formData.first_name)) {
      errors.first_name = 'Invalid characters detected. Please use only letters, spaces, hyphens, and apostrophes.';
    } else if (!validateNameInput(formData.first_name)) {
      errors.first_name = 'Please use only letters, spaces, hyphens, and apostrophes.';
    } else if (formData.first_name.length > 50) {
      errors.first_name = 'First name must be 50 characters or less';
    }
    
    // Last name validation
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    } else if (containsDangerousPatterns(formData.last_name)) {
      errors.last_name = 'Invalid characters detected. Please use only letters, spaces, hyphens, and apostrophes.';
    } else if (!validateNameInput(formData.last_name)) {
      errors.last_name = 'Please use only letters, spaces, hyphens, and apostrophes.';
    } else if (formData.last_name.length > 50) {
      errors.last_name = 'Last name must be 50 characters or less';
    }
    
    // Phone validation
    if (!formData.phone_number) {
      errors.phone_number = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phone_number)) {
      errors.phone_number = 'Please enter a valid 10-digit phone number';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength < 2) {
      errors.password = 'Password is too weak. Add uppercase, numbers, or special characters.';
    }
    
    // Confirm password validation
    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    
    // Terms acceptance
    if (!termsAccepted) {
      errors.terms = 'You must accept the Terms of Service and Privacy Policy';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, passwordStrength, termsAccepted]);
  
  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Build payload
    const payload: RegistrationPayload = {
      email: formData.email.toLowerCase(),
      password: formData.password,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number.replace(/\D/g, ''), // Send digits only
      account_type: formData.account_type,
    };
    
    // Add address if provided
    if (formData.default_delivery_address && formData.default_delivery_address.street_address) {
      payload.default_delivery_address = formData.default_delivery_address;
    }
    
    // Submit registration
    registrationMutation.mutate(payload);
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const passwordStrengthInfo = getPasswordStrengthLabel(passwordStrength);
  
  // Form validation check (currently unused but reserved for future validation)
  void (
    formData.email &&
    formData.password &&
    formData.confirm_password &&
    formData.first_name &&
    formData.last_name &&
    formData.phone_number &&
    termsAccepted &&
    Object.keys(validationErrors).length === 0
  );
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Create Your Customer Account
            </h1>
            <p className="text-lg text-gray-600">
              Start ordering construction materials from 100+ verified suppliers
            </p>
          </div>
          
          {/* Main Form Card */}
          <div className="bg-white shadow-xl shadow-gray-200/50 rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-8 lg:p-12">
              
              {/* General Error Banner */}
              {validationErrors.general && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{validationErrors.general}</p>
                </div>
              )}
              
              {/* Success Message (if registration successful but needs verification) */}
              {registrationMutation.isSuccess && !registrationMutation.data?.token && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-green-700 font-medium mb-1">
                      Account created successfully!
                    </p>
                    <p className="text-sm text-green-600">
                      Please check your email to verify your account before signing in.
                    </p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Personal Information Section */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
                    Personal Information
                  </h2>
                  
                  {/* First Name & Last Name (Side by side on desktop) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-900 mb-2">
                        First Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        maxLength={50}
                        onChange={(e) => {
                          const value = e.target.value;
                          
                          // Check for dangerous patterns first
                          if (containsDangerousPatterns(value)) {
                            setValidationErrors(prev => ({
                              ...prev,
                              first_name: 'Invalid characters detected. Please use only letters, spaces, hyphens, and apostrophes.',
                            }));
                            return;
                          }
                          
                          // Validate name format
                          if (!validateNameInput(value) && value !== '') {
                            setValidationErrors(prev => ({
                              ...prev,
                              first_name: 'Please use only letters, spaces, hyphens, and apostrophes.',
                            }));
                            return;
                          }
                          
                          // Sanitize and set value
                          const sanitized = sanitizeTextInput(value);
                          setFormData(prev => ({ ...prev, first_name: sanitized }));
                          setValidationErrors(prev => {
                            const updated = { ...prev };
                            delete updated.first_name;
                            return updated;
                          });
                        }}
                        disabled={registrationMutation.isPending}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          validationErrors.first_name
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder="John"
                        autoComplete="given-name"
                      />
                      {validationErrors.first_name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                          <X className="h-4 w-4" />
                          <span>{validationErrors.first_name}</span>
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.first_name.length}/50 characters
                      </p>
                    </div>
                    
                    {/* Last Name */}
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-900 mb-2">
                        Last Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        maxLength={50}
                        onChange={(e) => {
                          const value = e.target.value;
                          
                          // Check for dangerous patterns first
                          if (containsDangerousPatterns(value)) {
                            setValidationErrors(prev => ({
                              ...prev,
                              last_name: 'Invalid characters detected. Please use only letters, spaces, hyphens, and apostrophes.',
                            }));
                            return;
                          }
                          
                          // Validate name format
                          if (!validateNameInput(value) && value !== '') {
                            setValidationErrors(prev => ({
                              ...prev,
                              last_name: 'Please use only letters, spaces, hyphens, and apostrophes.',
                            }));
                            return;
                          }
                          
                          // Sanitize and set value
                          const sanitized = sanitizeTextInput(value);
                          setFormData(prev => ({ ...prev, last_name: sanitized }));
                          setValidationErrors(prev => {
                            const updated = { ...prev };
                            delete updated.last_name;
                            return updated;
                          });
                        }}
                        disabled={registrationMutation.isPending}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                          validationErrors.last_name
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder="Doe"
                        autoComplete="family-name"
                      />
                      {validationErrors.last_name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                          <X className="h-4 w-4" />
                          <span>{validationErrors.last_name}</span>
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.last_name.length}/50 characters
                      </p>
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      disabled={registrationMutation.isPending}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        validationErrors.email
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      placeholder="john.doe@example.com"
                      autoComplete="email"
                    />
                    {validationErrors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <X className="h-4 w-4" />
                        <span>{validationErrors.email}</span>
                      </p>
                    )}
                    {!validationErrors.email && formData.email && validateEmail(formData.email) && (
                      <p className="mt-2 text-sm text-green-600 flex items-center space-x-1">
                        <Check className="h-4 w-4" />
                        <span>Valid email format</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Phone Number */}
                  <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-900 mb-2">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      disabled={registrationMutation.isPending}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        validationErrors.phone_number
                          ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                    />
                    {validationErrors.phone_number && (
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <X className="h-4 w-4" />
                        <span>{validationErrors.phone_number}</span>
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">
                      We'll use this for order and delivery updates
                    </p>
                  </div>
                </div>
                
                {/* Account Type Section */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
                    Account Type
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Professional/Trade Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, account_type: 'trade' }));
                        setValidationErrors(prev => {
                          const updated = { ...prev };
                          delete updated.account_type;
                          return updated;
                        });
                      }}
                      disabled={registrationMutation.isPending}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                        formData.account_type === 'trade'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${
                          formData.account_type === 'trade' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Briefcase className={`h-6 w-6 ${
                            formData.account_type === 'trade' ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">Professional/Trade</h3>
                            {formData.account_type === 'trade' && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            For contractors and construction professionals
                          </p>
                          <ul className="mt-3 space-y-1">
                            <li className="text-xs text-gray-500 flex items-center space-x-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>Trade pricing available</span>
                            </li>
                            <li className="text-xs text-gray-500 flex items-center space-x-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>Bulk order discounts</span>
                            </li>
                            <li className="text-xs text-gray-500 flex items-center space-x-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>Trade credit options</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </button>
                    
                    {/* DIY/Personal Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, account_type: 'retail' }));
                        setValidationErrors(prev => {
                          const updated = { ...prev };
                          delete updated.account_type;
                          return updated;
                        });
                      }}
                      disabled={registrationMutation.isPending}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                        formData.account_type === 'retail'
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg ${
                          formData.account_type === 'retail' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <ShoppingCart className={`h-6 w-6 ${
                            formData.account_type === 'retail' ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">DIY/Personal Use</h3>
                            {formData.account_type === 'retail' && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            For home improvement and personal projects
                          </p>
                          <ul className="mt-3 space-y-1">
                            <li className="text-xs text-gray-500 flex items-center space-x-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>Retail pricing</span>
                            </li>
                            <li className="text-xs text-gray-500 flex items-center space-x-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>Project planning tools</span>
                            </li>
                            <li className="text-xs text-gray-500 flex items-center space-x-1">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>DIY guides & tips</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Security Section */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">
                    Account Security
                  </h2>
                  
                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
                      Password <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        disabled={registrationMutation.isPending}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 pr-12 ${
                          validationErrors.password
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder="Create a strong password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Password strength:</span>
                          <span className={`text-sm font-medium ${passwordStrengthInfo.color}`}>
                            {passwordStrengthInfo.label}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordStrength === 0 || passwordStrength === 1
                                ? 'bg-red-500'
                                : passwordStrength === 2
                                ? 'bg-yellow-500'
                                : passwordStrength === 3
                                ? 'bg-blue-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${(passwordStrength / 4) * 100}%` }}
                          />
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-gray-500 flex items-center space-x-1">
                            {formData.password.length >= 8 ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-gray-400" />
                            )}
                            <span>At least 8 characters</span>
                          </p>
                          <p className="text-xs text-gray-500 flex items-center space-x-1">
                            {/[A-Z]/.test(formData.password) ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-gray-400" />
                            )}
                            <span>One uppercase letter</span>
                          </p>
                          <p className="text-xs text-gray-500 flex items-center space-x-1">
                            {/\d/.test(formData.password) ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <X className="h-3 w-3 text-gray-400" />
                            )}
                            <span>One number</span>
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {validationErrors.password && (
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <X className="h-4 w-4" />
                        <span>{validationErrors.password}</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-900 mb-2">
                      Confirm Password <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirm_password"
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        disabled={registrationMutation.isPending}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 pr-12 ${
                          validationErrors.confirm_password
                            ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : formData.confirm_password && formData.password === formData.confirm_password
                            ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {validationErrors.confirm_password && (
                      <p className="mt-2 text-sm text-red-600 flex items-center space-x-1">
                        <X className="h-4 w-4" />
                        <span>{validationErrors.confirm_password}</span>
                      </p>
                    )}
                    {!validationErrors.confirm_password && 
                     formData.confirm_password && 
                     formData.password === formData.confirm_password && (
                      <p className="mt-2 text-sm text-green-600 flex items-center space-x-1">
                        <Check className="h-4 w-4" />
                        <span>Passwords match</span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Optional Address Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Delivery Address <span className="text-sm font-normal text-gray-500">(Optional)</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowAddressForm(!showAddressForm)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {showAddressForm ? 'Skip for now' : 'Add address'}
                    </button>
                  </div>
                  
                  {showAddressForm && (
                    <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                      {/* Street Address */}
                      <div>
                        <label htmlFor="street_address" className="block text-sm font-medium text-gray-900 mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          id="street_address"
                          value={formData.default_delivery_address?.street_address || ''}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              default_delivery_address: {
                                street_address: e.target.value,
                                city: prev.default_delivery_address?.city || '',
                                state: prev.default_delivery_address?.state || '',
                                postal_code: prev.default_delivery_address?.postal_code || '',
                              }
                            }));
                          }}
                          disabled={registrationMutation.isPending}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50"
                          placeholder="123 Main St"
                          autoComplete="street-address"
                        />
                      </div>
                      
                      {/* City, State, Zip (Grid) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label htmlFor="city" className="block text-sm font-medium text-gray-900 mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            id="city"
                            value={formData.default_delivery_address?.city || ''}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                default_delivery_address: {
                                  street_address: prev.default_delivery_address?.street_address || '',
                                  city: e.target.value,
                                  state: prev.default_delivery_address?.state || '',
                                  postal_code: prev.default_delivery_address?.postal_code || '',
                                }
                              }));
                            }}
                            disabled={registrationMutation.isPending}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50"
                            placeholder="Austin"
                            autoComplete="address-level2"
                          />
                        </div>
                        
                        <div className="md:col-span-1">
                          <label htmlFor="state" className="block text-sm font-medium text-gray-900 mb-2">
                            State
                          </label>
                          <input
                            type="text"
                            id="state"
                            value={formData.default_delivery_address?.state || ''}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                default_delivery_address: {
                                  street_address: prev.default_delivery_address?.street_address || '',
                                  city: prev.default_delivery_address?.city || '',
                                  state: e.target.value,
                                  postal_code: prev.default_delivery_address?.postal_code || '',
                                }
                              }));
                            }}
                            disabled={registrationMutation.isPending}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50"
                            placeholder="TX"
                            maxLength={2}
                            autoComplete="address-level1"
                          />
                        </div>
                        
                        <div className="md:col-span-1">
                          <label htmlFor="postal_code" className="block text-sm font-medium text-gray-900 mb-2">
                            Zip Code
                          </label>
                          <input
                            type="text"
                            id="postal_code"
                            value={formData.default_delivery_address?.postal_code || ''}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                default_delivery_address: {
                                  street_address: prev.default_delivery_address?.street_address || '',
                                  city: prev.default_delivery_address?.city || '',
                                  state: prev.default_delivery_address?.state || '',
                                  postal_code: e.target.value,
                                }
                              }));
                            }}
                            disabled={registrationMutation.isPending}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50"
                            placeholder="78701"
                            maxLength={10}
                            autoComplete="postal-code"
                          />
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        You can add more addresses later in your account settings
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Terms & Conditions */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="terms_accepted"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        setValidationErrors(prev => {
                          const updated = { ...prev };
                          delete updated.terms;
                          return updated;
                        });
                      }}
                      disabled={registrationMutation.isPending}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-4 focus:ring-blue-100 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label htmlFor="terms_accepted" className="text-sm text-gray-700 leading-relaxed">
                      I agree to the{' '}
                      <Link
                        to="/terms"
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link
                        to="/privacy"
                        target="_blank"
                        className="text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        Privacy Policy
                      </Link>
                      <span className="text-red-600 ml-1">*</span>
                    </label>
                  </div>
                  
                  {validationErrors.terms && (
                    <p className="text-sm text-red-600 flex items-center space-x-1 ml-8">
                      <X className="h-4 w-4" />
                      <span>{validationErrors.terms}</span>
                    </p>
                  )}
                </div>
                
                {/* Submit Button */}
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={registrationMutation.isPending || !termsAccepted}
                    className="w-full px-6 py-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-lg"
                  >
                    {registrationMutation.isPending ? (
                      <span className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Creating Account...</span>
                      </span>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                  
                  <p className="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Sign in instead
                    </Link>
                  </p>
                </div>
                
              </form>
              
              {/* Benefits Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">
                  What you'll get with your account:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Compare Suppliers</p>
                      <p className="text-xs text-gray-600">See prices from 100+ suppliers instantly</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Real-Time Inventory</p>
                      <p className="text-xs text-gray-600">Know exactly what's in stock</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Check className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Track Deliveries</p>
                      <p className="text-xs text-gray-600">Live GPS tracking for every order</p>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
          
          {/* Security Badge */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center space-x-2">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Your information is secure and encrypted</span>
            </p>
          </div>
          
        </div>
      </div>
    </>
  );
};

export default UV_Registration_Customer;