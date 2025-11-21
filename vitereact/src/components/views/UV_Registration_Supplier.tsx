import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SupplierApplicationForm {
  email: string;
  password: string;
  confirm_password: string;
  business_name: string;
  business_registration_number: string;
  business_type: string;
  contact_person_name: string;
  phone_number: string;
  business_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  business_description: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface SupplierRegistrationPayload {
  email: string;
  password: string;
  business_name: string;
  business_registration_number: string;
  business_type: string;
  contact_person_name: string;
  phone_number: string;
  business_address: string;
  business_description: string;
}

interface SupplierRegistrationResponse {
  message: string;
  application_id: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const submitSupplierApplication = async (payload: SupplierRegistrationPayload): Promise<SupplierRegistrationResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/register/supplier`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};

// ============================================================================
// US STATES DATA
// ============================================================================

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Registration_Supplier: React.FC = () => {
  const navigate = useNavigate();
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [form_step, setFormStep] = useState<number>(1);
  
  const [application_form, setApplicationForm] = useState<SupplierApplicationForm>({
    email: '',
    password: '',
    confirm_password: '',
    business_name: '',
    business_registration_number: '',
    business_type: 'LLC',
    contact_person_name: '',
    phone_number: '',
    business_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    business_description: '',
  });
  
  const [validation_errors, setValidationErrors] = useState<ValidationErrors>({});
  
  const [terms_accepted, setTermsAccepted] = useState<boolean>(false);
  
  const [redirect_countdown, setRedirectCountdown] = useState<number | null>(null);
  
  // ============================================================================
  // API MUTATION
  // ============================================================================
  
  const mutation = useMutation({
    mutationFn: submitSupplierApplication,
    onSuccess: () => {
      // Start redirect countdown
      setRedirectCountdown(5);
    },
    onError: (error: any) => {
      // Handle API errors
      const errorMessage = error.response?.data?.message || error.message || 'Application submission failed. Please try again.';
      
      // Check for specific error types
      if (error.response?.status === 409) {
        setValidationErrors({
          email: 'An account with this email already exists. Please sign in instead.',
        });
        setFormStep(1); // Go back to step 1 where email is
      } else if (error.response?.status === 400) {
        // Validation errors from backend
        const backendErrors = error.response?.data?.errors || {};
        setValidationErrors(backendErrors);
      } else {
        // Generic error
        setValidationErrors({
          general: errorMessage,
        });
      }
    },
  });
  
  // ============================================================================
  // REDIRECT COUNTDOWN EFFECT
  // ============================================================================
  
  useEffect(() => {
    if (redirect_countdown !== null) {
      if (redirect_countdown === 0) {
        navigate('/login');
        return;
      }
      
      const timer = setTimeout(() => {
        setRedirectCountdown(redirect_countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [redirect_countdown, navigate]);
  
  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================
  
  const validateEmail = (email: string): string | null => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
  };
  
  const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    return null;
  };
  
  const validateConfirmPassword = (password: string, confirm: string): string | null => {
    if (!confirm) return 'Please confirm your password';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  };
  
  const validatePhoneNumber = (phone: string): string | null => {
    if (!phone) return 'Phone number is required';
    const phoneRegex = /^[\d\s\-()+]+$/;
    if (!phoneRegex.test(phone)) return 'Please enter a valid phone number';
    if (phone.replace(/\D/g, '').length < 10) return 'Phone number must be at least 10 digits';
    return null;
  };
  
  const validateStep1 = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Business Name
    if (!application_form.business_name) {
      errors.business_name = 'Business name is required';
    } else if (application_form.business_name.length < 2) {
      errors.business_name = 'Business name must be at least 2 characters';
    }
    
    // Business Registration Number
    if (!application_form.business_registration_number) {
      errors.business_registration_number = 'Business registration number is required';
    } else if (application_form.business_registration_number.length < 3) {
      errors.business_registration_number = 'Registration number must be at least 3 characters';
    }
    
    // Business Type (always valid if from dropdown)
    
    // Contact Person Name
    if (!application_form.contact_person_name) {
      errors.contact_person_name = 'Contact person name is required';
    } else if (application_form.contact_person_name.length < 2) {
      errors.contact_person_name = 'Name must be at least 2 characters';
    }
    
    // Email
    const emailError = validateEmail(application_form.email);
    if (emailError) {
      errors.email = emailError;
    }
    
    // Phone Number
    const phoneError = validatePhoneNumber(application_form.phone_number);
    if (phoneError) {
      errors.phone_number = phoneError;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const validateStep2 = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Business Address
    if (!application_form.business_address) {
      errors.business_address = 'Street address is required';
    } else if (application_form.business_address.length < 10) {
      errors.business_address = 'Please enter a complete street address';
    }
    
    // City
    if (!application_form.city) {
      errors.city = 'City is required';
    }
    
    // State
    if (!application_form.state) {
      errors.state = 'State is required';
    }
    
    // Postal Code
    if (!application_form.postal_code) {
      errors.postal_code = 'Postal code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(application_form.postal_code)) {
      errors.postal_code = 'Please enter a valid postal code (e.g., 12345 or 12345-6789)';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const validateStep3 = (): boolean => {
    const errors: ValidationErrors = {};
    
    // Password
    const passwordError = validatePassword(application_form.password);
    if (passwordError) {
      errors.password = passwordError;
    }
    
    // Confirm Password
    const confirmError = validateConfirmPassword(application_form.password, application_form.confirm_password);
    if (confirmError) {
      errors.confirm_password = confirmError;
    }
    
    // Terms Acceptance
    if (!terms_accepted) {
      errors.terms = 'You must agree to the terms to continue';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleInputChange = (field: keyof SupplierApplicationForm, value: string) => {
    setApplicationForm(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field when user starts typing
    const fieldStr = field as string;
    if (validation_errors[fieldStr]) {
      setValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldStr];
        return updated;
      });
    }
  };
  
  const handleContinueToStep2 = () => {
    if (validateStep1()) {
      setFormStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const handleContinueToStep3 = () => {
    if (validateStep2()) {
      setFormStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const handleBackToStep1 = () => {
    setFormStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleBackToStep2 = () => {
    setFormStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSubmitApplication = async () => {
    // Validate step 3
    if (!validateStep3()) {
      return;
    }
    
    // Clear any previous general errors
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated.general;
      return updated;
    });
    
    // Build full business address string
    const full_business_address = `${application_form.business_address}, ${application_form.city}, ${application_form.state} ${application_form.postal_code}, ${application_form.country}`;
    
    // Prepare payload matching OpenAPI spec
    const payload: SupplierRegistrationPayload = {
      email: application_form.email.toLowerCase().trim(),
      password: application_form.password,
      business_name: application_form.business_name.trim(),
      business_registration_number: application_form.business_registration_number.trim(),
      business_type: application_form.business_type,
      contact_person_name: application_form.contact_person_name.trim(),
      phone_number: application_form.phone_number.trim(),
      business_address: full_business_address,
      business_description: application_form.business_description.trim(),
    };
    
    // Submit via mutation
    mutation.mutate(payload);
  };
  
  const handleImmediateRedirect = () => {
    navigate('/login');
  };
  
  // ============================================================================
  // PASSWORD STRENGTH CALCULATION
  // ============================================================================
  
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return Math.min(strength, 4); // 0-4 scale
  };
  
  const password_strength = calculatePasswordStrength(application_form.password);
  
  const getPasswordStrengthLabel = (strength: number): string => {
    if (strength === 0) return 'Too weak';
    if (strength === 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';
    return 'Strong';
  };
  
  const getPasswordStrengthColor = (strength: number): string => {
    if (strength === 0) return 'bg-red-500';
    if (strength === 1) return 'bg-orange-500';
    if (strength === 2) return 'bg-yellow-500';
    if (strength === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      {/* Success Screen */}
      {mutation.isSuccess && mutation.data && (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Success Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-lg">
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  Application Received!
                </h1>
                <p className="text-xl text-green-50">
                  Thank you for applying to join BuildEasy
                </p>
              </div>
              
              {/* Success Body */}
              <div className="px-8 py-10">
                <div className="mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-gray-800 text-lg font-medium mb-4">
                      What happens next?
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700">
                          Your application is now under review by our verification team
                        </span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-700">
                          We've sent a confirmation email to <strong>{application_form.email}</strong>
                        </span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-700">
                          We'll contact you within <strong>2-3 business days</strong> with a decision
                        </span>
                      </li>
                      <li className="flex items-start">
                        <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-700">
                          Application ID: <strong className="font-mono">{mutation.data.application_id}</strong>
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                {/* Redirect Notice */}
                {redirect_countdown !== null && (
                  <div className="text-center mb-6">
                    <p className="text-gray-600 mb-4">
                      Redirecting to login in <strong className="text-blue-600">{redirect_countdown}</strong> seconds...
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${((5 - redirect_countdown) / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleImmediateRedirect}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    Go to Login Now
                  </button>
                  <Link
                    to="/"
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 text-center border border-gray-300"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Registration Form */}
      {!mutation.isSuccess && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Become a BuildEasy Supplier
              </h1>
              <p className="text-lg text-gray-600">
                Join our marketplace and reach thousands of construction professionals
              </p>
            </div>
            
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4">
                {/* Step 1 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${form_step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} font-semibold transition-colors duration-200`}>
                    {form_step > 1 ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      '1'
                    )}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">
                    Business Info
                  </span>
                </div>
                
                {/* Connector Line */}
                <div className={`w-16 h-1 ${form_step >= 2 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-200`}></div>
                
                {/* Step 2 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${form_step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} font-semibold transition-colors duration-200`}>
                    {form_step > 2 ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      '2'
                    )}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">
                    Details
                  </span>
                </div>
                
                {/* Connector Line */}
                <div className={`w-16 h-1 ${form_step >= 3 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-200`}></div>
                
                {/* Step 3 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${form_step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} font-semibold transition-colors duration-200`}>
                    3
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">
                    Account
                  </span>
                </div>
              </div>
            </div>
            
            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="px-6 sm:px-10 py-8">
                {/* General Error Message */}
                {validation_errors.general && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                    <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">{validation_errors.general}</p>
                  </div>
                )}
                
                {/* STEP 1: Business Information */}
                {form_step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Business Information
                      </h2>
                      <p className="text-gray-600">
                        Tell us about your construction supply business
                      </p>
                    </div>
                    
                    {/* Business Name */}
                    <div>
                      <label htmlFor="business_name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Business Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="business_name"
                        value={application_form.business_name}
                        onChange={(e) => handleInputChange('business_name', e.target.value)}
                        placeholder="e.g., Acme Building Supply Co."
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.business_name
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.business_name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.business_name}
                        </p>
                      )}
                    </div>
                    
                    {/* Business Registration Number */}
                    <div>
                      <label htmlFor="business_registration_number" className="block text-sm font-semibold text-gray-700 mb-2">
                        Business Registration Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="business_registration_number"
                        value={application_form.business_registration_number}
                        onChange={(e) => handleInputChange('business_registration_number', e.target.value)}
                        placeholder="e.g., EIN 12-3456789"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.business_registration_number
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.business_registration_number && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.business_registration_number}
                        </p>
                      )}
                    </div>
                    
                    {/* Business Type */}
                    <div>
                      <label htmlFor="business_type" className="block text-sm font-semibold text-gray-700 mb-2">
                        Business Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="business_type"
                        value={application_form.business_type}
                        onChange={(e) => handleInputChange('business_type', e.target.value as any)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:border-blue-500 focus:ring-blue-100 transition-all duration-200"
                      >
                        <option value="Corporation">Corporation</option>
                        <option value="LLC">LLC (Limited Liability Company)</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                      </select>
                    </div>
                    
                    {/* Contact Person Name */}
                    <div>
                      <label htmlFor="contact_person_name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Contact Person Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="contact_person_name"
                        value={application_form.contact_person_name}
                        onChange={(e) => handleInputChange('contact_person_name', e.target.value)}
                        placeholder="e.g., John Smith"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.contact_person_name
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.contact_person_name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.contact_person_name}
                        </p>
                      )}
                    </div>
                    
                    {/* Email Address */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={application_form.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your.email@company.com"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.email
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        We recommend using a business email address
                      </p>
                      {validation_errors.email && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.email}
                        </p>
                      )}
                    </div>
                    
                    {/* Phone Number */}
                    <div>
                      <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone_number"
                        value={application_form.phone_number}
                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                        placeholder="(555) 123-4567"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.phone_number
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.phone_number && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.phone_number}
                        </p>
                      )}
                    </div>
                    
                    {/* Navigation Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button
                        type="button"
                        onClick={handleContinueToStep2}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                      >
                        Continue
                      </button>
                      <Link
                        to="/register"
                        className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 text-center border border-gray-300"
                      >
                        Back
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* STEP 2: Business Details */}
                {form_step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Business Details
                      </h2>
                      <p className="text-gray-600">
                        Provide your business location and description
                      </p>
                    </div>
                    
                    {/* Business Address */}
                    <div>
                      <label htmlFor="business_address" className="block text-sm font-semibold text-gray-700 mb-2">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="business_address"
                        value={application_form.business_address}
                        onChange={(e) => handleInputChange('business_address', e.target.value)}
                        placeholder="123 Main Street"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.business_address
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.business_address && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.business_address}
                        </p>
                      )}
                    </div>
                    
                    {/* City */}
                    <div>
                      <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="city"
                        value={application_form.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Austin"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.city
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.city && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.city}
                        </p>
                      )}
                    </div>
                    
                    {/* State */}
                    <div>
                      <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="state"
                        value={application_form.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.state
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      >
                        <option value="">Select a state...</option>
                        {US_STATES.map((state) => (
                          <option key={state.code} value={state.code}>
                            {state.name}
                          </option>
                        ))}
                      </select>
                      {validation_errors.state && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.state}
                        </p>
                      )}
                    </div>
                    
                    {/* Postal Code */}
                    <div>
                      <label htmlFor="postal_code" className="block text-sm font-semibold text-gray-700 mb-2">
                        Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="postal_code"
                        value={application_form.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        placeholder="78701"
                        maxLength={10}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.postal_code
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.postal_code && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.postal_code}
                        </p>
                      )}
                    </div>
                    
                    {/* Country (Read-only) */}
                    <div>
                      <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        id="country"
                        value={application_form.country}
                        readOnly
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                    </div>
                    
                    {/* Business Description */}
                    <div>
                      <label htmlFor="business_description" className="block text-sm font-semibold text-gray-700 mb-2">
                        Brief Business Description
                        <span className="text-gray-500 font-normal ml-2">(Optional)</span>
                      </label>
                      <textarea
                        id="business_description"
                        value={application_form.business_description}
                        onChange={(e) => {
                          if (e.target.value.length <= 200) {
                            handleInputChange('business_description', e.target.value);
                          }
                        }}
                        placeholder="Tell us about your business and what you specialize in..."
                        rows={4}
                        maxLength={200}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:border-blue-500 focus:ring-blue-100 transition-all duration-200 resize-none"
                      />
                      <p className="mt-1 text-sm text-gray-500 text-right">
                        {application_form.business_description.length}/200 characters
                      </p>
                    </div>
                    
                    {/* Navigation Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button
                        type="button"
                        onClick={handleContinueToStep3}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                      >
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={handleBackToStep1}
                        className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 border border-gray-300"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
                
                {/* STEP 3: Account Setup */}
                {form_step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Account Setup
                      </h2>
                      <p className="text-gray-600">
                        Create your secure login credentials
                      </p>
                    </div>
                    
                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={application_form.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Create a strong password"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.password
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      
                      {/* Password Strength Meter */}
                      {application_form.password && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Password strength:
                            </span>
                            <span className={`text-sm font-semibold ${
                              password_strength === 0 ? 'text-red-600' :
                              password_strength === 1 ? 'text-orange-600' :
                              password_strength === 2 ? 'text-yellow-600' :
                              password_strength === 3 ? 'text-blue-600' :
                              'text-green-600'
                            }`}>
                              {getPasswordStrengthLabel(password_strength)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(password_strength)}`}
                              style={{ width: `${(password_strength / 4) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Password Requirements */}
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-gray-600 font-medium">Password must contain:</p>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${application_form.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                            {application_form.password.length >= 8 ? '✓' : '○'} 8+ characters
                          </span>
                          <span className={`text-xs ${/[A-Z]/.test(application_form.password) ? 'text-green-600' : 'text-gray-500'}`}>
                            {/[A-Z]/.test(application_form.password) ? '✓' : '○'} Uppercase
                          </span>
                          <span className={`text-xs ${/[a-z]/.test(application_form.password) ? 'text-green-600' : 'text-gray-500'}`}>
                            {/[a-z]/.test(application_form.password) ? '✓' : '○'} Lowercase
                          </span>
                          <span className={`text-xs ${/[0-9]/.test(application_form.password) ? 'text-green-600' : 'text-gray-500'}`}>
                            {/[0-9]/.test(application_form.password) ? '✓' : '○'} Number
                          </span>
                        </div>
                      </div>
                      
                      {validation_errors.password && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.password}
                        </p>
                      )}
                    </div>
                    
                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        id="confirm_password"
                        value={application_form.confirm_password}
                        onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                        placeholder="Re-enter your password"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 transition-all duration-200 ${
                          validation_errors.confirm_password
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      {validation_errors.confirm_password && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.confirm_password}
                        </p>
                      )}
                    </div>
                    
                    {/* Terms Acceptance */}
                    <div className="pt-4">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="checkbox"
                          checked={terms_accepted}
                          onChange={(e) => {
                            setTermsAccepted(e.target.checked);
                            if (e.target.checked && validation_errors.terms) {
                              setValidationErrors(prev => {
                                const updated = { ...prev };
                                delete updated.terms;
                                return updated;
                              });
                            }
                          }}
                          className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-4 focus:ring-blue-100 mt-0.5"
                        />
                        <span className="ml-3 text-sm text-gray-700 leading-relaxed">
                          I agree to the BuildEasy{' '}
                          <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium underline" target="_blank">
                            Supplier Agreement
                          </Link>
                          ,{' '}
                          <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium underline" target="_blank">
                            Terms of Service
                          </Link>
                          , and{' '}
                          <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium underline" target="_blank">
                            Privacy Policy
                          </Link>
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                      </label>
                      {validation_errors.terms && (
                        <p className="mt-2 text-sm text-red-600 flex items-center ml-8">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {validation_errors.terms}
                        </p>
                      )}
                    </div>
                    
                    {/* Navigation Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <button
                        type="button"
                        onClick={handleSubmitApplication}
                        disabled={mutation.isPending}
                        className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                      >
                        {mutation.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting Application...
                          </>
                        ) : (
                          'Submit Application'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleBackToStep2}
                        disabled={mutation.isPending}
                        className="flex-1 bg-gray-100 text-gray-700 px-6 py-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Already have an account */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                  Sign in instead
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_Registration_Supplier;