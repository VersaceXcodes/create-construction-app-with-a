import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { CheckCircle, MapPin, Grid3x3, Bell, ArrowRight, ArrowLeft, ChevronRight, X } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Category {
  category_id: string;
  category_name: string;
  category_slug: string;
  icon_url: string | null;
  display_order: number;
}

interface DeliveryAddressForm {
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
}

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  order_updates: boolean;
  promotions: boolean;
}

interface CreateAddressPayload {
  label?: string;
  full_name: string;
  phone_number: string;
  street_address: string;
  apt_suite?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type?: string;
  is_default: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

interface UpdateCustomerPayload {
  preferred_categories?: string[];
  notification_preferences?: NotificationPreferences;
  onboarding_completed?: boolean;
  default_delivery_address_id?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_CustomerOnboarding: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors only
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const customerProfile = useAppStore(state => state.authentication_state.customer_profile);
  
  // Check if onboarding already completed
  useEffect(() => {
    if (customerProfile?.onboarding_completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [customerProfile, navigate]);
  
  // Local state
  const [showWelcome, setShowWelcome] = useState(true);
  const [current_step, setCurrentStep] = useState(1);
  const total_steps = 3;
  
  const [delivery_address, setDeliveryAddress] = useState<DeliveryAddressForm>({
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    latitude: null,
    longitude: null
  });
  
  const [preferred_categories, setPreferredCategories] = useState<string[]>([]);
  
  const [notification_preferences, setNotificationPreferences] = useState<NotificationPreferences>({
    email: true,
    sms: true,
    push: true,
    order_updates: true,
    promotions: true
  });
  
  const [address_id, setAddressId] = useState<string | null>(null);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [validation_errors, setValidationErrors] = useState<Record<string, string>>({});
  
  // ============================================================================
  // API CALLS - Fetch Categories
  // ============================================================================
  
  const { data: categories_response, isLoading: categories_loading } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/categories`,
        {
          params: {
            is_active: true,
            limit: 100
          }
        }
      );
      return response.data;
    },
    enabled: current_step === 2 || current_step === 3,
    staleTime: 300000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  const available_categories: Category[] = categories_response || [];
  
  // ============================================================================
  // MUTATIONS - Create Address
  // ============================================================================
  
  const createAddressMutation = useMutation({
    mutationFn: async (address_data: CreateAddressPayload) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/addresses`,
        address_data,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setAddressId(data.address_id);
      setErrorMessage(null);
      setValidationErrors({});
      setCurrentStep(2);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Failed to save delivery address. Please try again.';
      setErrorMessage(errorMsg);
    }
  });
  
  // ============================================================================
  // MUTATIONS - Update Customer Profile
  // ============================================================================
  
  const updateCustomerMutation = useMutation({
    mutationFn: async (customer_data: UpdateCustomerPayload) => {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/customers/me`,
        customer_data,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Brief success state before redirect
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.message || 'Failed to save preferences. Please try again.';
      setErrorMessage(errorMsg);
    }
  });
  
  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================
  
  const validateAddressStep = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!delivery_address.street_address.trim()) {
      errors.street_address = 'Street address is required';
    }
    
    if (!delivery_address.city.trim()) {
      errors.city = 'City is required';
    }
    
    if (!delivery_address.state.trim()) {
      errors.state = 'State is required';
    }
    
    if (!delivery_address.postal_code.trim()) {
      errors.postal_code = 'Postal code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(delivery_address.postal_code)) {
      errors.postal_code = 'Invalid postal code format';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ============================================================================
  // STEP NAVIGATION HANDLERS
  // ============================================================================
  
  const handleGetStarted = () => {
    setShowWelcome(false);
    setCurrentStep(1);
  };
  
  const handleNextStep = () => {
    setErrorMessage(null);
    setValidationErrors({});
    
    if (current_step === 1) {
      // Validate and create address
      if (!validateAddressStep()) {
        return;
      }
      
      const address_payload: CreateAddressPayload = {
        label: 'Home',
        full_name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Customer',
        phone_number: currentUser?.phone_number || '',
        street_address: delivery_address.street_address,
        city: delivery_address.city,
        state: delivery_address.state,
        postal_code: delivery_address.postal_code,
        country: 'USA',
        is_default: true,
        address_type: 'residential',
        latitude: null,
        longitude: null
      };
      
      createAddressMutation.mutate(address_payload);
    } else if (current_step === 2) {
      // Move to notifications step
      setCurrentStep(3);
    }
  };
  
  const handlePreviousStep = () => {
    setErrorMessage(null);
    setValidationErrors({});
    
    if (current_step > 1) {
      setCurrentStep(current_step - 1);
    }
  };
  
  const handleCompleteOnboarding = () => {
    setErrorMessage(null);
    
    const update_payload: UpdateCustomerPayload = {
      preferred_categories: preferred_categories.length > 0 ? preferred_categories : undefined,
      notification_preferences,
      onboarding_completed: true,
      default_delivery_address_id: address_id || undefined
    };
    
    updateCustomerMutation.mutate(update_payload);
  };
  
  const handleSkipOnboarding = () => {
    // Skip all steps, just mark as completed
    const update_payload: UpdateCustomerPayload = {
      onboarding_completed: true
    };
    
    updateCustomerMutation.mutate(update_payload);
  };
  
  // ============================================================================
  // CATEGORY TOGGLE HANDLER
  // ============================================================================
  
  const toggleCategory = (category_id: string) => {
    setPreferredCategories(prev => {
      if (prev.includes(category_id)) {
        return prev.filter(id => id !== category_id);
      } else {
        return [...prev, category_id];
      }
    });
  };
  
  // ============================================================================
  // NOTIFICATION TOGGLE HANDLER
  // ============================================================================
  
  const toggleNotification = (key: keyof NotificationPreferences) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // ============================================================================
  // LOADING STATES
  // ============================================================================
  
  const is_loading = createAddressMutation.isPending || updateCustomerMutation.isPending;
  const is_success = updateCustomerMutation.isSuccess;
  
  // ============================================================================
  // RENDER - WELCOME SCREEN
  // ============================================================================
  
  if (showWelcome) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
          <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-12 sm:px-12 sm:py-16">
              {/* Welcome Header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                  <CheckCircle className="w-12 h-12 text-blue-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Welcome to BuildEasy, {currentUser?.first_name || 'there'}!
                </h1>
                <p className="text-xl text-gray-600">
                  Let's set up your account to give you the best experience
                </p>
              </div>
              
              {/* Value Propositions */}
              <div className="grid gap-6 mb-12">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Real-time inventory from 100+ suppliers
                    </h3>
                    <p className="text-gray-600">
                      See exact stock levels and availability instantly
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Transparent pricing, compare instantly
                    </h3>
                    <p className="text-gray-600">
                      Find the best deals across multiple suppliers
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Reliable delivery tracking
                    </h3>
                    <p className="text-gray-600">
                      Track your orders in real-time from warehouse to job site
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Secure payments, multiple options
                    </h3>
                    <p className="text-gray-600">
                      Pay with credit cards, trade credit, or digital wallets
                    </p>
                  </div>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleSkipOnboarding}
                  disabled={is_loading}
                  className="w-full sm:w-auto px-8 py-4 bg-gray-100 text-gray-700 rounded-lg font-medium text-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // RENDER - SUCCESS SCREEN
  // ============================================================================
  
  if (is_success) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center px-8 py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              You're all set! 🎉
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              Your account is ready. Let's start building!
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Tips:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-gray-700">Start searching for construction materials</p>
                </div>
                <div className="flex items-center gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-gray-700">Compare prices across suppliers instantly</p>
                </div>
                <div className="flex items-center gap-3">
                  <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-gray-700">Track every delivery in real-time</p>
                </div>
              </div>
            </div>
            
            <div className="animate-pulse text-sm text-gray-500">
              Redirecting to dashboard...
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // RENDER - ONBOARDING STEPS
  // ============================================================================
  
  const progress_percentage = (current_step / total_steps) * 100;
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Header */}
          <div className="bg-white rounded-xl shadow-lg px-6 py-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Account Setup</h2>
                <p className="text-sm text-gray-600 mt-1">Step {current_step} of {total_steps}</p>
              </div>
              
              <button
                onClick={handleSkipOnboarding}
                disabled={is_loading}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip for now
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress_percentage}%` }}
              />
            </div>
          </div>
          
          {/* Error Message Banner */}
          {error_message && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg px-6 py-4 mb-6 flex items-start gap-3">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">{error_message}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          
          {/* Step Content Card */}
          <div className="bg-white rounded-xl shadow-lg px-8 py-10">
            {/* STEP 1: Delivery Location */}
            {current_step === 1 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <MapPin className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Where should we deliver?
                  </h3>
                  <p className="text-gray-600">
                    Set your default delivery address to see accurate availability and delivery times
                  </p>
                </div>
                
                <div className="space-y-6">
                  {/* Street Address */}
                  <div>
                    <label htmlFor="street_address" className="block text-sm font-semibold text-gray-700 mb-2">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="street_address"
                      type="text"
                      value={delivery_address.street_address}
                      onChange={(e) => {
                        setDeliveryAddress(prev => ({ ...prev, street_address: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, street_address: '' }));
                      }}
                      placeholder="123 Construction Blvd"
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validation_errors.street_address 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 outline-none transition-all duration-200`}
                    />
                    {validation_errors.street_address && (
                      <p className="mt-1 text-sm text-red-600">{validation_errors.street_address}</p>
                    )}
                  </div>
                  
                  {/* City and State Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={delivery_address.city}
                        onChange={(e) => {
                          setDeliveryAddress(prev => ({ ...prev, city: e.target.value }));
                          setValidationErrors(prev => ({ ...prev, city: '' }));
                        }}
                        placeholder="Austin"
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.city 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 outline-none transition-all duration-200`}
                      />
                      {validation_errors.city && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.city}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="state"
                        value={delivery_address.state}
                        onChange={(e) => {
                          setDeliveryAddress(prev => ({ ...prev, state: e.target.value }));
                          setValidationErrors(prev => ({ ...prev, state: '' }));
                        }}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.state 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 outline-none transition-all duration-200 bg-white`}
                      >
                        <option value="">Select State</option>
                        <option value="TX">Texas</option>
                        <option value="CA">California</option>
                        <option value="NY">New York</option>
                        <option value="FL">Florida</option>
                        <option value="IL">Illinois</option>
                        <option value="PA">Pennsylvania</option>
                        <option value="OH">Ohio</option>
                        <option value="GA">Georgia</option>
                      </select>
                      {validation_errors.state && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.state}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Postal Code */}
                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-semibold text-gray-700 mb-2">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="postal_code"
                      type="text"
                      value={delivery_address.postal_code}
                      onChange={(e) => {
                        setDeliveryAddress(prev => ({ ...prev, postal_code: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, postal_code: '' }));
                      }}
                      placeholder="78701"
                      maxLength={10}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validation_errors.postal_code 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 outline-none transition-all duration-200`}
                    />
                    {validation_errors.postal_code && (
                      <p className="mt-1 text-sm text-red-600">{validation_errors.postal_code}</p>
                    )}
                  </div>
                  
                  {/* Save as Default Checkbox */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center">
                      <input
                        id="save_default"
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="save_default" className="ml-3 text-sm text-gray-700">
                        Save as my default delivery address
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* STEP 2: Category Preferences */}
            {current_step === 2 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Grid3x3 className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    What do you typically need?
                  </h3>
                  <p className="text-gray-600">
                    Select categories to personalize your experience (select all that apply)
                  </p>
                </div>
                
                {categories_loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                  </div>
                ) : available_categories.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {available_categories.slice(0, 12).map((category) => {
                      const is_selected = preferred_categories.includes(category.category_id);
                      
                      return (
                        <button
                          key={category.category_id}
                          type="button"
                          onClick={() => toggleCategory(category.category_id)}
                          className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                            is_selected
                              ? 'border-blue-600 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                          }`}
                        >
                          {is_selected && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                          
                          <div className="flex flex-col items-center text-center space-y-3">
                            {category.icon_url ? (
                              <img 
                                src={category.icon_url} 
                                alt={category.category_name}
                                className="w-12 h-12 object-contain"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Grid3x3 className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            
                            <p className={`text-sm font-medium ${
                              is_selected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {category.category_name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No categories available. You can skip this step.</p>
                  </div>
                )}
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-600 text-center">
                    <strong>{preferred_categories.length}</strong> {preferred_categories.length === 1 ? 'category' : 'categories'} selected
                  </p>
                </div>
              </div>
            )}
            
            {/* STEP 3: Notification Preferences */}
            {current_step === 3 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Bell className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Stay updated on your orders
                  </h3>
                  <p className="text-gray-600">
                    Choose how you'd like to receive notifications
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Order Updates */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">
                        Order Updates
                      </h4>
                      <p className="text-sm text-gray-600">
                        Get notified about order status changes and delivery updates
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span className="text-sm text-gray-600">Email + SMS</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notification_preferences.order_updates}
                        onClick={() => toggleNotification('order_updates')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          notification_preferences.order_updates ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notification_preferences.order_updates ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  {/* Delivery Notifications */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">
                        Delivery Notifications
                      </h4>
                      <p className="text-sm text-gray-600">
                        SMS alerts when your delivery is approaching
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span className="text-sm text-gray-600">SMS</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notification_preferences.sms}
                        onClick={() => toggleNotification('sms')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          notification_preferences.sms ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notification_preferences.sms ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  {/* Price Drop Alerts */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">
                        Price Drop Alerts
                      </h4>
                      <p className="text-sm text-gray-600">
                        Email notifications when items in your wishlist go on sale
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span className="text-sm text-gray-600">Email</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notification_preferences.email}
                        onClick={() => toggleNotification('email')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          notification_preferences.email ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notification_preferences.email ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  {/* Weekly Deals */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">
                        Weekly Deals
                      </h4>
                      <p className="text-sm text-gray-600">
                        Get exclusive deals and offers delivered to your inbox
                      </p>
                    </div>
                    <div className="ml-4 flex items-center gap-3">
                      <span className="text-sm text-gray-600">Email</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notification_preferences.promotions}
                        onClick={() => toggleNotification('promotions')}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          notification_preferences.promotions ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notification_preferences.promotions ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handlePreviousStep}
                disabled={current_step === 1 || is_loading}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              
              {current_step < total_steps ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={is_loading}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {is_loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  disabled={is_loading}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {is_loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CustomerOnboarding;