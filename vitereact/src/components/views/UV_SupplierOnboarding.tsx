import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Package, Building2, FileText, CreditCard, ShoppingCart, CheckCircle, Upload, X, Eye, EyeOff, ChevronRight, ChevronLeft } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SupplierProfile {
  supplier_id: string | null;
  user_id: string | null;
  business_name: string;
  business_registration_number: string;
  business_type: string;
  business_description: string;
  logo_url: string | null;
  cover_photo_url: string | null;
  verification_status: string;
  operating_hours: Record<string, any> | null;
  service_areas: string[] | null;
  return_policy: string | null;
  shipping_policy: string | null;
  minimum_order_value: number | null;
  payout_frequency: string;
  commission_rate: number;
  subscription_plan: string;
  onboarding_completed: boolean;
}

interface VerificationDocuments {
  business_registration: string | null;
  tax_id: string | null;
  proof_of_address: string | null;
  business_license: string | null;
  insurance_certificate: string | null;
}

interface BankAccountInfo {
  account_holder_name: string;
  account_number: string;
  routing_number: string;
  bank_name: string;
}

interface InitialProduct {
  category_id: string;
  sku: string;
  product_name: string;
  description: string;
  price_per_unit: number;
  unit_of_measure: string;
  stock_quantity: number;
}

// ============================================================================
// API HELPERS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const getAuthHeaders = (token: string | null) => ({
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

// Fetch current supplier profile
const fetchCurrentSupplier = async (token: string | null): Promise<SupplierProfile> => {
  const { data } = await axios.get(`${API_BASE_URL}/suppliers/me`, getAuthHeaders(token));
  return data;
};

// Update supplier profile
const updateSupplierProfile = async ({ token, updates }: { token: string | null; updates: Partial<SupplierProfile> }): Promise<SupplierProfile> => {
  const { data } = await axios.patch(`${API_BASE_URL}/suppliers/me`, updates, getAuthHeaders(token));
  return data;
};

// Create product
const createProduct = async ({ token, product }: { token: string | null; product: InitialProduct }): Promise<any> => {
  const { data } = await axios.post(`${API_BASE_URL}/suppliers/me/products`, product, getAuthHeaders(token));
  return data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual Zustand selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  
  // Local state
  const [onboarding_step, setOnboardingStep] = useState(1);
  const [completion_progress, setCompletionProgress] = useState(0);
  const [validation_errors, setValidationErrors] = useState<Record<string, string>>({});
  const [show_account_number, setShowAccountNumber] = useState(false);
  
  // Form state
  const [supplier_profile, setSupplierProfile] = useState<SupplierProfile>({
    supplier_id: null,
    user_id: null,
    business_name: '',
    business_registration_number: '',
    business_type: '',
    business_description: '',
    logo_url: null,
    cover_photo_url: null,
    verification_status: 'pending',
    operating_hours: null,
    service_areas: null,
    return_policy: null,
    shipping_policy: null,
    minimum_order_value: null,
    payout_frequency: 'monthly',
    commission_rate: 0,
    subscription_plan: 'basic',
    onboarding_completed: false,
  });
  
  const [verification_documents, setVerificationDocuments] = useState<VerificationDocuments>({
    business_registration: null,
    tax_id: null,
    proof_of_address: null,
    business_license: null,
    insurance_certificate: null,
  });
  
  const [bank_account_info, setBankAccountInfo] = useState<BankAccountInfo>({
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    bank_name: '',
  });
  
  const [initial_products, setInitialProducts] = useState<InitialProduct[]>([]);
  const [current_product_form, setCurrentProductForm] = useState<InitialProduct>({
    category_id: '',
    sku: '',
    product_name: '',
    description: '',
    price_per_unit: 0,
    unit_of_measure: '',
    stock_quantity: 0,
  });

  // Redirect if not authenticated or not supplier
  useEffect(() => {
    if (!isAuthenticated || userType !== 'supplier') {
      navigate('/login');
    }
  }, [isAuthenticated, userType, navigate]);

  // Fetch current supplier data on mount
  const { data: existingSupplier, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ['currentSupplier', authToken],
    queryFn: () => fetchCurrentSupplier(authToken),
    enabled: !!authToken && isAuthenticated && userType === 'supplier',
    retry: 1,
    staleTime: 60000,
  });

  // Pre-fill form if supplier data exists
  useEffect(() => {
    if (existingSupplier) {
      // If already completed, redirect to dashboard
      if (existingSupplier.onboarding_completed) {
        navigate('/supplier/dashboard');
        return;
      }
      
      // Pre-fill form with existing data
      setSupplierProfile(prev => ({
        ...prev,
        ...existingSupplier,
      }));
      
      // Calculate which step to start on based on completed fields
      let calculatedStep = 1;
      if (existingSupplier.business_name && existingSupplier.business_description) calculatedStep = 2;
      if (existingSupplier.logo_url) calculatedStep = 3;
      if (existingSupplier.operating_hours) calculatedStep = 4;
      // Note: We can't easily check document uploads without additional API
      
      setOnboardingStep(calculatedStep);
    }
  }, [existingSupplier, navigate]);

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: (updates: Partial<SupplierProfile>) => 
      updateSupplierProfile({ token: authToken, updates }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['currentSupplier'] });
      // Update local state with response
      setSupplierProfile(prev => ({ ...prev, ...data }));
    },
    onError: (error: any) => {
      console.error('Failed to update supplier:', error);
      setValidationErrors(prev => ({
        ...prev,
        api: error.response?.data?.message || 'Failed to update profile. Please try again.',
      }));
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (product: InitialProduct) => 
      createProduct({ token: authToken, product }),
    onSuccess: () => {
      // Clear form
      setCurrentProductForm({
        category_id: '',
        sku: '',
        product_name: '',
        description: '',
        price_per_unit: 0,
        unit_of_measure: '',
        stock_quantity: 0,
      });
    },
    onError: (error: any) => {
      console.error('Failed to create product:', error);
      setValidationErrors(prev => ({
        ...prev,
        product: error.response?.data?.message || 'Failed to create product. Please try again.',
      }));
    },
  });

  // Calculate completion progress
  useEffect(() => {
    const totalSteps = 7;
    const progress = (onboarding_step / totalSteps) * 100;
    setCompletionProgress(Math.round(progress));
  }, [onboarding_step]);

  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!supplier_profile.business_name || supplier_profile.business_name.trim().length < 1) {
      errors.business_name = 'Business name is required';
    }
    
    if (!supplier_profile.business_description || supplier_profile.business_description.trim().length < 200) {
      errors.business_description = 'Business description must be at least 200 characters';
    }
    
    if (!supplier_profile.business_type) {
      errors.business_type = 'Business type is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep5 = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!bank_account_info.account_holder_name) {
      errors.account_holder_name = 'Account holder name is required';
    }
    
    if (!bank_account_info.account_number) {
      errors.account_number = 'Account number is required';
    }
    
    if (!bank_account_info.routing_number || bank_account_info.routing_number.length !== 9) {
      errors.routing_number = 'Valid 9-digit routing number is required';
    }
    
    if (!bank_account_info.bank_name) {
      errors.bank_name = 'Bank name is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep6 = (): boolean => {
    // Step 6 is optional (no products required to proceed)
    // But we validate if they're trying to add one
    return true;
  };

  // ============================================================================
  // STEP HANDLERS
  // ============================================================================

  const handleNextStep = async () => {
    setValidationErrors({});
    
    // Validate current step
    let isValid = true;
    if (onboarding_step === 1) isValid = validateStep1();
    if (onboarding_step === 5) isValid = validateStep5();
    if (onboarding_step === 6) isValid = validateStep6();
    
    if (!isValid) return;
    
    // Save progress to backend before moving to next step
    try {
      if (onboarding_step === 1) {
        await updateSupplierMutation.mutateAsync({
          business_name: supplier_profile.business_name,
          business_description: supplier_profile.business_description,
          business_type: supplier_profile.business_type,
        });
      } else if (onboarding_step === 2) {
        await updateSupplierMutation.mutateAsync({
          logo_url: supplier_profile.logo_url,
          cover_photo_url: supplier_profile.cover_photo_url,
        });
      } else if (onboarding_step === 3) {
        await updateSupplierMutation.mutateAsync({
          operating_hours: supplier_profile.operating_hours,
          service_areas: supplier_profile.service_areas,
          return_policy: supplier_profile.return_policy,
          shipping_policy: supplier_profile.shipping_policy,
          minimum_order_value: supplier_profile.minimum_order_value,
        });
      }
      // Step 4: Document upload handled separately
      // Step 5: Bank info would be saved here (simplified for MVP)
      
      setOnboardingStep(prev => Math.min(prev + 1, 7));
    } catch (error) {
      console.error('Failed to save step:', error);
    }
  };

  const handlePreviousStep = () => {
    setOnboardingStep(prev => Math.max(prev - 1, 1));
    setValidationErrors({});
  };

  const handleCompleteOnboarding = async () => {
    try {
      await updateSupplierMutation.mutateAsync({
        onboarding_completed: true,
      });
      
      // Success! Navigate to dashboard
      navigate('/supplier/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setValidationErrors({ complete: 'Failed to complete onboarding. Please try again.' });
    }
  };

  const handleAddProduct = async () => {
    // Validate product form
    const errors: Record<string, string> = {};
    
    if (!current_product_form.category_id) errors.category_id = 'Category is required';
    if (!current_product_form.sku) errors.sku = 'SKU is required';
    if (!current_product_form.product_name) errors.product_name = 'Product name is required';
    if (current_product_form.price_per_unit <= 0) errors.price_per_unit = 'Price must be greater than 0';
    if (!current_product_form.unit_of_measure) errors.unit_of_measure = 'Unit of measure is required';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      await createProductMutation.mutateAsync(current_product_form);
      
      // Add to local list
      setInitialProducts(prev => [...prev, current_product_form]);
      
      // Clear validation
      setValidationErrors({});
    } catch (error) {
      console.error('Failed to add product:', error);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStepTitle = (step: number): string => {
    const titles: Record<number, string> = {
      1: 'Business Profile',
      2: 'Logo & Branding',
      3: 'Operating Details',
      4: 'Verification Documents',
      5: 'Bank Account Setup',
      6: 'Initial Product Catalog',
      7: 'Review & Complete',
    };
    return titles[step] || '';
  };

  const getStepIcon = (step: number) => {
    const icons: Record<number, any> = {
      1: Building2,
      2: Upload,
      3: FileText,
      4: FileText,
      5: CreditCard,
      6: Package,
      7: CheckCircle,
    };
    const Icon = icons[step] || Building2;
    return <Icon className="w-6 h-6" />;
  };

  if (isLoadingSupplier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Supplier Onboarding</h1>
                <p className="text-gray-600 mt-1">Set up your shop to start selling on BuildEasy</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{completion_progress}%</div>
                <div className="text-sm text-gray-500">Complete</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completion_progress}%` }}
              />
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center justify-between text-sm">
              {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                <div 
                  key={step}
                  className={`flex items-center ${step === onboarding_step ? 'text-blue-600 font-semibold' : step < onboarding_step ? 'text-green-600' : 'text-gray-400'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step === onboarding_step ? 'bg-blue-600 text-white' : 
                    step < onboarding_step ? 'bg-green-600 text-white' : 
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {step < onboarding_step ? '✓' : step}
                  </div>
                  {step < 7 && (
                    <div className={`w-12 h-1 mx-2 ${step < onboarding_step ? 'bg-green-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Step {onboarding_step} of 7: <span className="font-semibold">{getStepTitle(onboarding_step)}</span>
              </p>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Step 1: Business Profile */}
            {onboarding_step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  {getStepIcon(1)}
                  <h2 className="text-2xl font-bold text-gray-900">Business Profile</h2>
                </div>
                
                <div>
                  <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="business_name"
                    value={supplier_profile.business_name}
                    onChange={(e) => {
                      setSupplierProfile(prev => ({ ...prev, business_name: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, business_name: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      validation_errors.business_name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="e.g., Acme Building Supply Co."
                  />
                  {validation_errors.business_name && (
                    <p className="mt-2 text-sm text-red-600">{validation_errors.business_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="business_type"
                    value={supplier_profile.business_type}
                    onChange={(e) => {
                      setSupplierProfile(prev => ({ ...prev, business_type: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, business_type: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      validation_errors.business_type ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  >
                    <option value="">Select business type</option>
                    <option value="Corporation">Corporation</option>
                    <option value="LLC">LLC</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                  </select>
                  {validation_errors.business_type && (
                    <p className="mt-2 text-sm text-red-600">{validation_errors.business_type}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="business_description" className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description <span className="text-red-500">*</span>
                    <span className="text-gray-500 font-normal ml-2">
                      ({supplier_profile.business_description.length}/2000 characters, min 200)
                    </span>
                  </label>
                  <textarea
                    id="business_description"
                    rows={6}
                    value={supplier_profile.business_description}
                    onChange={(e) => {
                      setSupplierProfile(prev => ({ ...prev, business_description: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, business_description: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      validation_errors.business_description ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Describe your business, what you specialize in, your service area, and what makes you unique..."
                  />
                  {validation_errors.business_description && (
                    <p className="mt-2 text-sm text-red-600">{validation_errors.business_description}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Tell buyers about your business, your experience, and what sets you apart.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Logo & Branding */}
            {onboarding_step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  {getStepIcon(2)}
                  <h2 className="text-2xl font-bold text-gray-900">Logo & Branding</h2>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 text-sm">
                    <strong>Optional:</strong> Add your logo and cover photo now, or skip and add them later from your settings.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Logo (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {supplier_profile.logo_url ? (
                      <div className="space-y-4">
                        <img 
                          src={supplier_profile.logo_url} 
                          alt="Business logo" 
                          className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-white shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setSupplierProfile(prev => ({ ...prev, logo_url: null }))}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove Logo
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2">Upload your business logo</p>
                        <p className="text-gray-400 text-sm mb-4">Square format recommended, max 2MB</p>
                        <button
                          type="button"
                          onClick={() => {
                            // Placeholder: In real implementation, this would open file picker
                            // For now, set a placeholder URL
                            setSupplierProfile(prev => ({ ...prev, logo_url: 'https://via.placeholder.com/200' }));
                          }}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Choose File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Photo (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {supplier_profile.cover_photo_url ? (
                      <div className="space-y-4">
                        <img 
                          src={supplier_profile.cover_photo_url} 
                          alt="Cover photo" 
                          className="w-full h-48 object-cover rounded-lg shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setSupplierProfile(prev => ({ ...prev, cover_photo_url: null }))}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove Cover Photo
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2">Upload a cover photo for your shop</p>
                        <p className="text-gray-400 text-sm mb-4">Wide format (1200x300 recommended), max 5MB</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSupplierProfile(prev => ({ ...prev, cover_photo_url: 'https://via.placeholder.com/1200x300' }));
                          }}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Choose File
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Operating Details */}
            {onboarding_step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  {getStepIcon(3)}
                  <h2 className="text-2xl font-bold text-gray-900">Operating Details</h2>
                </div>
                
                <div>
                  <label htmlFor="return_policy" className="block text-sm font-medium text-gray-700 mb-2">
                    Return Policy (Optional)
                  </label>
                  <textarea
                    id="return_policy"
                    rows={4}
                    value={supplier_profile.return_policy || ''}
                    onChange={(e) => setSupplierProfile(prev => ({ ...prev, return_policy: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="Describe your return policy, e.g., 'Returns accepted within 30 days with receipt...'"
                  />
                </div>
                
                <div>
                  <label htmlFor="shipping_policy" className="block text-sm font-medium text-gray-700 mb-2">
                    Shipping Policy (Optional)
                  </label>
                  <textarea
                    id="shipping_policy"
                    rows={4}
                    value={supplier_profile.shipping_policy || ''}
                    onChange={(e) => setSupplierProfile(prev => ({ ...prev, shipping_policy: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                    placeholder="Describe your shipping policy, e.g., 'Free delivery on orders over $500...'"
                  />
                </div>
                
                <div>
                  <label htmlFor="minimum_order_value" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Value (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      id="minimum_order_value"
                      min="0"
                      step="0.01"
                      value={supplier_profile.minimum_order_value || ''}
                      onChange={(e) => setSupplierProfile(prev => ({ 
                        ...prev, 
                        minimum_order_value: e.target.value ? parseFloat(e.target.value) : null 
                      }))}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Set a minimum order value if required for your business
                  </p>
                </div>
                
                <div>
                  <label htmlFor="payout_frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Payout Frequency
                  </label>
                  <select
                    id="payout_frequency"
                    value={supplier_profile.payout_frequency}
                    onChange={(e) => setSupplierProfile(prev => ({ ...prev, payout_frequency: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500">
                    How often you'd like to receive payouts for completed orders
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Verification Documents */}
            {onboarding_step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  {getStepIcon(4)}
                  <h2 className="text-2xl font-bold text-gray-900">Verification Documents</h2>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800 text-sm">
                    <strong>Required for verification:</strong> Upload your business registration and tax documents. These will be reviewed by our team within 2-3 business days.
                  </p>
                </div>
                
                {/* Document Upload Placeholders */}
                {['business_registration', 'tax_id', 'proof_of_address', 'business_license', 'insurance_certificate'].map((doc_type) => {
                  const labels: Record<string, string> = {
                    business_registration: 'Business Registration Document',
                    tax_id: 'Tax ID / EIN Document',
                    proof_of_address: 'Proof of Business Address',
                    business_license: 'Business License',
                    insurance_certificate: 'Insurance Certificate',
                  };
                  
                  const required = ['business_registration', 'tax_id'].includes(doc_type);
                  
                  return (
                    <div key={doc_type} className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {labels[doc_type]} {required && <span className="text-red-500">*</span>}
                          </p>
                          {verification_documents[doc_type as keyof VerificationDocuments] ? (
                            <p className="text-sm text-green-600 mt-1">✓ Uploaded</p>
                          ) : (
                            <p className="text-sm text-gray-500 mt-1">Not uploaded</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement actual file upload when backend endpoint is ready
                            // MISSING ENDPOINT: POST /api/suppliers/me/verification-documents
                            // For now, simulate upload
                            setVerificationDocuments(prev => ({
                              ...prev,
                              [doc_type]: `https://example.com/docs/${doc_type}_${Date.now()}.pdf`,
                            }));
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          {verification_documents[doc_type as keyof VerificationDocuments] ? 'Replace' : 'Upload'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> Accepted formats: PDF, JPG, PNG. Max file size: 10MB per document.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Bank Account Setup */}
            {onboarding_step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  {getStepIcon(5)}
                  <h2 className="text-2xl font-bold text-gray-900">Bank Account Setup</h2>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 text-sm">
                    <strong>Secure:</strong> Your bank information is encrypted and stored securely. This is required to receive payouts for your sales.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="account_holder_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="account_holder_name"
                    value={bank_account_info.account_holder_name}
                    onChange={(e) => {
                      setBankAccountInfo(prev => ({ ...prev, account_holder_name: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, account_holder_name: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      validation_errors.account_holder_name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="Full name on bank account"
                  />
                  {validation_errors.account_holder_name && (
                    <p className="mt-2 text-sm text-red-600">{validation_errors.account_holder_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="bank_name"
                    value={bank_account_info.bank_name}
                    onChange={(e) => {
                      setBankAccountInfo(prev => ({ ...prev, bank_name: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, bank_name: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      validation_errors.bank_name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="e.g., Chase Bank, Bank of America"
                  />
                  {validation_errors.bank_name && (
                    <p className="mt-2 text-sm text-red-600">{validation_errors.bank_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="routing_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Routing Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="routing_number"
                    maxLength={9}
                    value={bank_account_info.routing_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setBankAccountInfo(prev => ({ ...prev, routing_number: value }));
                      setValidationErrors(prev => ({ ...prev, routing_number: '' }));
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                      validation_errors.routing_number ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                    placeholder="9-digit routing number"
                  />
                  {validation_errors.routing_number && (
                    <p className="mt-2 text-sm text-red-600">{validation_errors.routing_number}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={show_account_number ? 'text' : 'password'}
                      id="account_number"
                      value={bank_account_info.account_number}
                      onChange={(e) => {
                        setBankAccountInfo(prev => ({ ...prev, account_number: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, account_number: '' }));
                      }}
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                        validation_errors.account_number ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                      placeholder="Bank account number"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountNumber(!show_account_number)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {show_account_number ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {validation_errors.account_number && (
                    <p className="mt-2 text-sm text-red-600">{validation_errors.account_number}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Initial Product Catalog */}
            {onboarding_step === 6 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  {getStepIcon(6)}
                  <h2 className="text-2xl font-bold text-gray-900">Initial Product Catalog</h2>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 text-sm">
                    <strong>Get started:</strong> Add a few products to get your catalog started. You can add more products later from your dashboard.
                  </p>
                </div>
                
                {/* Product Form */}
                <div className="border-2 border-gray-200 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg">Add a Product</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="product_name"
                        value={current_product_form.product_name}
                        onChange={(e) => {
                          setCurrentProductForm(prev => ({ ...prev, product_name: e.target.value }));
                          setValidationErrors(prev => ({ ...prev, product_name: '' }));
                        }}
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                          validation_errors.product_name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                        }`}
                        placeholder="e.g., 2x4x8 SPF Lumber"
                      />
                      {validation_errors.product_name && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.product_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                        SKU <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="sku"
                        value={current_product_form.sku}
                        onChange={(e) => {
                          setCurrentProductForm(prev => ({ ...prev, sku: e.target.value.toUpperCase() }));
                          setValidationErrors(prev => ({ ...prev, sku: '' }));
                        }}
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                          validation_errors.sku ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                        }`}
                        placeholder="e.g., LUM-2X4-8-SPF"
                      />
                      {validation_errors.sku && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.sku}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category_id"
                      value={current_product_form.category_id}
                      onChange={(e) => {
                        setCurrentProductForm(prev => ({ ...prev, category_id: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, category_id: '' }));
                      }}
                      className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                        validation_errors.category_id ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Select category</option>
                      <option value="cat_001">Concrete & Cement</option>
                      <option value="cat_002">Lumber & Wood</option>
                      <option value="cat_003">Steel & Metal</option>
                      <option value="cat_004">Bricks & Blocks</option>
                      <option value="cat_005">Roofing Materials</option>
                    </select>
                    {validation_errors.category_id && (
                      <p className="mt-1 text-sm text-red-600">{validation_errors.category_id}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={current_product_form.description}
                      onChange={(e) => setCurrentProductForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="Product description..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="price_per_unit" className="block text-sm font-medium text-gray-700 mb-2">
                        Price <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          id="price_per_unit"
                          min="0"
                          step="0.01"
                          value={current_product_form.price_per_unit || ''}
                          onChange={(e) => {
                            setCurrentProductForm(prev => ({ 
                              ...prev, 
                              price_per_unit: parseFloat(e.target.value) || 0 
                            }));
                            setValidationErrors(prev => ({ ...prev, price_per_unit: '' }));
                          }}
                          className={`w-full pl-8 pr-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                            validation_errors.price_per_unit ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      {validation_errors.price_per_unit && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.price_per_unit}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700 mb-2">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="unit_of_measure"
                        value={current_product_form.unit_of_measure}
                        onChange={(e) => {
                          setCurrentProductForm(prev => ({ ...prev, unit_of_measure: e.target.value }));
                          setValidationErrors(prev => ({ ...prev, unit_of_measure: '' }));
                        }}
                        className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                          validation_errors.unit_of_measure ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'
                        }`}
                        placeholder="e.g., piece, bag, yard"
                      />
                      {validation_errors.unit_of_measure && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.unit_of_measure}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        id="stock_quantity"
                        min="0"
                        value={current_product_form.stock_quantity}
                        onChange={(e) => setCurrentProductForm(prev => ({ 
                          ...prev, 
                          stock_quantity: parseInt(e.target.value) || 0 
                        }))}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={createProductMutation.isPending}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createProductMutation.isPending ? 'Adding Product...' : '+ Add Product'}
                  </button>
                  
                  {validation_errors.product && (
                    <p className="text-sm text-red-600">{validation_errors.product}</p>
                  )}
                </div>
                
                {/* Added Products List */}
                {initial_products.length > 0 && (
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Products Added ({initial_products.length})
                    </h4>
                    <div className="space-y-3">
                      {initial_products.map((product, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{product.product_name}</p>
                            <p className="text-sm text-gray-600">
                              SKU: {product.sku} • ${product.price_per_unit.toFixed(2)}/{product.unit_of_measure} • Stock: {product.stock_quantity}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInitialProducts(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    You can add more products later from your dashboard. Having at least one product helps you get started!
                  </p>
                </div>
              </div>
            )}

            {/* Step 7: Review & Complete */}
            {onboarding_step === 7 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  {getStepIcon(7)}
                  <h2 className="text-2xl font-bold text-gray-900">Review & Complete</h2>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-green-900 font-semibold">Almost there!</p>
                      <p className="text-green-800 text-sm mt-1">
                        Review your information below and complete your onboarding to start selling.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Summary Sections */}
                <div className="space-y-4">
                  {/* Business Profile Summary */}
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Business Profile</h3>
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(1)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Business Name:</span> <span className="font-medium">{supplier_profile.business_name}</span></p>
                      <p><span className="text-gray-600">Business Type:</span> <span className="font-medium">{supplier_profile.business_type}</span></p>
                      <p><span className="text-gray-600">Description:</span> <span className="font-medium">{supplier_profile.business_description.substring(0, 100)}...</span></p>
                    </div>
                  </div>
                  
                  {/* Branding Summary */}
                  {(supplier_profile.logo_url || supplier_profile.cover_photo_url) && (
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Logo & Branding</h3>
                        <button
                          type="button"
                          onClick={() => setOnboardingStep(2)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="flex items-center space-x-4">
                        {supplier_profile.logo_url && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Logo</p>
                            <img src={supplier_profile.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200" />
                          </div>
                        )}
                        {supplier_profile.cover_photo_url && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Cover Photo</p>
                            <img src={supplier_profile.cover_photo_url} alt="Cover" className="w-32 h-16 rounded-lg object-cover border-2 border-gray-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Bank Account Summary */}
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Bank Account</h3>
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(5)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Account Holder:</span> <span className="font-medium">{bank_account_info.account_holder_name || 'Not set'}</span></p>
                      <p><span className="text-gray-600">Bank:</span> <span className="font-medium">{bank_account_info.bank_name || 'Not set'}</span></p>
                      <p><span className="text-gray-600">Payout Frequency:</span> <span className="font-medium capitalize">{supplier_profile.payout_frequency}</span></p>
                    </div>
                  </div>
                  
                  {/* Products Summary */}
                  {initial_products.length > 0 && (
                    <div className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Initial Catalog</h3>
                        <button
                          type="button"
                          onClick={() => setOnboardingStep(6)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">{initial_products.length} product{initial_products.length !== 1 ? 's' : ''} added</p>
                    </div>
                  )}
                </div>
                
                {/* Terms Acceptance */}
                <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="terms_acceptance"
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      required
                    />
                    <label htmlFor="terms_acceptance" className="text-sm text-gray-700">
                      I agree to the <a href="/terms" target="_blank" className="text-blue-600 hover:underline">Supplier Agreement</a>, <a href="/terms" target="_blank" className="text-blue-600 hover:underline">Terms of Service</a>, and <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">Privacy Policy</a>
                    </label>
                  </div>
                </div>
                
                {/* Complete Button */}
                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  disabled={updateSupplierMutation.isPending}
                  className="w-full bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {updateSupplierMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Completing Setup...
                    </span>
                  ) : (
                    '🎉 Complete Onboarding & Start Selling'
                  )}
                </button>
                
                {validation_errors.complete && (
                  <p className="text-sm text-red-600 text-center">{validation_errors.complete}</p>
                )}
              </div>
            )}

            {/* API Error Display */}
            {validation_errors.api && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{validation_errors.api}</p>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          {onboarding_step < 7 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  disabled={onboarding_step === 1}
                  className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Previous</span>
                </button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      // Save progress without validation
                      console.log('Progress saved');
                    }}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Save & Continue Later
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={updateSupplierMutation.isPending}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{updateSupplierMutation.isPending ? 'Saving...' : 'Save & Continue'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SupplierOnboarding;