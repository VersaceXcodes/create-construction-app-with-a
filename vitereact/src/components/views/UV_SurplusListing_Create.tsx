import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Camera, X, Upload, ChevronLeft, ChevronRight, Check, AlertCircle, Package, DollarSign, MapPin, Truck } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Category {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  is_active: boolean;
}

interface ListingFormData {
  product_name: string;
  category_id: string;
  description: string;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  photos: string[];
  asking_price: number;
  original_price: number;
  price_type: 'fixed' | 'negotiable' | 'auction';
  quantity: number;
  pickup_location: string;
  pickup_instructions: string;
  shipping_available: boolean;
  shipping_rate: number;
  reason_for_selling: string;
}

interface ValidationErrors {
  [field_name: string]: string;
}

interface CreateListingPayload {
  seller_id: string;
  product_name: string;
  category_id: string;
  description: string;
  condition: string;
  photos: string[];
  asking_price: number;
  original_price: number | null;
  price_type: string;
  quantity: number;
  pickup_location: string | null;
  pickup_instructions: string | null;
  shipping_available: boolean;
  shipping_rate: number | null;
  reason_for_selling: string | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchCategories = async (authToken: string | null): Promise<Category[]> => {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/categories`, {
    params: { is_active: true },
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });
  return response.data;
};

const createSurplusListing = async (payload: CreateListingPayload, authToken: string): Promise<any> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/surplus`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SurplusListing_Create: React.FC = () => {
  const navigate = useNavigate();
  
  // CRITICAL: Individual selectors
  const customerId = useAppStore(state => state.authentication_state.customer_profile?.customer_id);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Local state
  const [currentStep, setCurrentStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  
  const [listingFormData, setListingFormData] = useState<ListingFormData>({
    product_name: '',
    category_id: '',
    description: '',
    condition: 'used',
    photos: [],
    asking_price: 0,
    original_price: 0,
    price_type: 'fixed',
    quantity: 1,
    pickup_location: '',
    pickup_instructions: '',
    shipping_available: false,
    shipping_rate: 0,
    reason_for_selling: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => fetchCategories(authToken),
    staleTime: 10 * 60 * 1000,
  });
  
  // Create listing mutation
  const createListingMutation = useMutation({
    mutationFn: (payload: CreateListingPayload) => createSurplusListing(payload, authToken || ''),
    onSuccess: (data) => {
      // Success - navigate to my listings
      navigate('/surplus/my-listings', {
        state: { 
          message: 'Listing created successfully!',
          listingId: data.listing_id 
        }
      });
    },
    onError: (error: any) => {
      // Handle error
      const errorMessage = error.response?.data?.message || 'Failed to create listing. Please try again.';
      setValidationErrors({ submit: errorMessage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });
  
  // Handle photo file selection
  const handlePhotoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count
    if (selectedFiles.length + files.length > 10) {
      setValidationErrors({ photos: 'Maximum 10 photos allowed' });
      return;
    }
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      
      if (!isValidType) {
        setValidationErrors({ photos: 'Only JPG and PNG files are allowed' });
        return false;
      }
      if (!isValidSize) {
        setValidationErrors({ photos: 'Each photo must be less than 5MB' });
        return false;
      }
      return true;
    });
    
    // Create preview URLs
    const newFiles = [...selectedFiles, ...validFiles];
    const newPreviewUrls = [...photoPreviewUrls];
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls.push(reader.result as string);
        setPhotoPreviewUrls([...newPreviewUrls]);
      };
      reader.readAsDataURL(file);
    });
    
    setSelectedFiles(newFiles);
    setValidationErrors(prev => ({ ...prev, photos: '' }));
  };
  
  // Remove photo
  const handleRemovePhoto = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviewUrls = photoPreviewUrls.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPhotoPreviewUrls(newPreviewUrls);
    
    // Update form data photos (convert files to URLs - in real app would be CDN URLs after upload)
    setListingFormData(prev => ({
      ...prev,
      photos: newPreviewUrls,
    }));
  };
  
  // Form field change handlers
  const handleFieldChange = (field: keyof ListingFormData, value: any) => {
    setListingFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  // Validate current step
  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};
    
    if (step === 1) {
      if (!listingFormData.product_name.trim()) {
        errors.product_name = 'Product name is required';
      }
      if (!listingFormData.category_id) {
        errors.category_id = 'Please select a category';
      }
      if (!listingFormData.description.trim()) {
        errors.description = 'Description is required';
      } else if (listingFormData.description.length < 100) {
        errors.description = 'Description must be at least 100 characters';
      } else if (listingFormData.description.length > 5000) {
        errors.description = 'Description must not exceed 5000 characters';
      }
    }
    
    if (step === 2) {
      if (photoPreviewUrls.length === 0) {
        errors.photos = 'Please upload at least one photo';
      }
    }
    
    if (step === 3) {
      if (!listingFormData.asking_price || listingFormData.asking_price <= 0) {
        errors.asking_price = 'Please enter a valid asking price';
      }
      if (listingFormData.original_price && listingFormData.original_price < listingFormData.asking_price) {
        errors.original_price = 'Original price should be higher than asking price';
      }
    }
    
    if (step === 4) {
      if (!listingFormData.quantity || listingFormData.quantity < 1) {
        errors.quantity = 'Quantity must be at least 1';
      }
      if (!listingFormData.pickup_location.trim() && !listingFormData.shipping_available) {
        errors.pickup_location = 'Please provide pickup location or enable shipping';
      }
      if (listingFormData.shipping_available && (!listingFormData.shipping_rate || listingFormData.shipping_rate <= 0)) {
        errors.shipping_rate = 'Please enter a valid shipping rate';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Navigate to next step
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Navigate to previous step
  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Submit listing
  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    // Validate all steps
    for (let step = 1; step <= 4; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }
    
    // Prepare payload
    const payload: CreateListingPayload = {
      seller_id: customerId || '',
      product_name: listingFormData.product_name,
      category_id: listingFormData.category_id,
      description: listingFormData.description,
      condition: listingFormData.condition,
      photos: photoPreviewUrls, // In production, these would be CDN URLs
      asking_price: listingFormData.asking_price,
      original_price: listingFormData.original_price || null,
      price_type: listingFormData.price_type,
      quantity: listingFormData.quantity,
      pickup_location: listingFormData.pickup_location || null,
      pickup_instructions: listingFormData.pickup_instructions || null,
      shipping_available: listingFormData.shipping_available,
      shipping_rate: listingFormData.shipping_available ? listingFormData.shipping_rate : null,
      reason_for_selling: listingFormData.reason_for_selling || null,
    };
    
    createListingMutation.mutate(payload);
  };
  
  // Show preview
  const handleShowPreview = () => {
    if (validateStep(currentStep)) {
      setPreviewMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const handleEditFromPreview = (step: number) => {
    setPreviewMode(false);
    setCurrentStep(step);
  };
  
  // Get step title
  const getStepTitle = (step: number): string => {
    const titles: Record<number, string> = {
      1: 'Item Information',
      2: 'Upload Photos',
      3: 'Set Pricing',
      4: 'Availability & Shipping',
    };
    return titles[step] || '';
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/surplus/my-listings"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to My Listings
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Surplus Listing</h1>
            <p className="text-gray-600 text-lg">List your unused construction materials and reach buyers in your area</p>
          </div>
          
          {/* Error Banner */}
          {validationErrors.submit && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error Creating Listing</h3>
                <p className="text-red-700 text-sm">{validationErrors.submit}</p>
              </div>
            </div>
          )}
          
          {!previewMode ? (
            <>
              {/* Progress Indicator */}
              <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  {[1, 2, 3, 4].map((step, index) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-200 ${
                          step < currentStep 
                            ? 'bg-green-600 text-white' 
                            : step === currentStep 
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {step < currentStep ? <Check className="w-5 h-5" /> : step}
                        </div>
                        <p className={`text-xs mt-2 font-medium text-center ${
                          step === currentStep ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {getStepTitle(step)}
                        </p>
                      </div>
                      {index < 3 && (
                        <div className={`h-1 flex-1 mx-2 rounded transition-all duration-200 ${
                          step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              {/* Form Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-8">
                  {/* Step 1: Item Information */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Item Information</h2>
                          <p className="text-gray-600">Tell us about the item you're selling</p>
                        </div>
                      </div>
                      
                      {/* Product Name */}
                      <div>
                        <label htmlFor="product_name" className="block text-sm font-semibold text-gray-900 mb-2">
                          Product Name <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          id="product_name"
                          value={listingFormData.product_name}
                          onChange={(e) => handleFieldChange('product_name', e.target.value)}
                          placeholder="e.g., 2x4x8 SPF Lumber (50 pieces)"
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.product_name 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all duration-200`}
                        />
                        {validationErrors.product_name && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.product_name}
                          </p>
                        )}
                      </div>
                      
                      {/* Category */}
                      <div>
                        <label htmlFor="category_id" className="block text-sm font-semibold text-gray-900 mb-2">
                          Category <span className="text-red-600">*</span>
                        </label>
                        <select
                          id="category_id"
                          value={listingFormData.category_id}
                          onChange={(e) => handleFieldChange('category_id', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.category_id 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all duration-200`}
                          disabled={categoriesLoading}
                        >
                          <option value="">Select a category</option>
                          {categories.map((category) => (
                            <option key={category.category_id} value={category.category_id}>
                              {category.category_name}
                            </option>
                          ))}
                        </select>
                        {validationErrors.category_id && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.category_id}
                          </p>
                        )}
                      </div>
                      
                      {/* Condition */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Condition <span className="text-red-600">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { value: 'new', label: 'New', desc: 'Unopened, unused' },
                            { value: 'like_new', label: 'Like New', desc: 'Opened, barely used' },
                            { value: 'used', label: 'Used', desc: 'Lightly used' },
                            { value: 'refurbished', label: 'Refurbished', desc: 'Restored to working' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFieldChange('condition', option.value)}
                              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                                listingFormData.condition === option.value
                                  ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <p className="font-semibold text-gray-900 mb-1">{option.label}</p>
                              <p className="text-xs text-gray-600">{option.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Description */}
                      <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                          Description <span className="text-red-600">*</span>
                          <span className="text-gray-500 font-normal ml-2">
                            ({listingFormData.description.length}/5000 characters, min 100)
                          </span>
                        </label>
                        <textarea
                          id="description"
                          value={listingFormData.description}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          rows={6}
                          placeholder="Describe the item in detail. Include size, brand, quantity, condition details, and any defects..."
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.description 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all duration-200 resize-none`}
                        />
                        {validationErrors.description && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Reason for Selling */}
                      <div>
                        <label htmlFor="reason_for_selling" className="block text-sm font-semibold text-gray-900 mb-2">
                          Reason for Selling (Optional)
                        </label>
                        <select
                          id="reason_for_selling"
                          value={listingFormData.reason_for_selling}
                          onChange={(e) => handleFieldChange('reason_for_selling', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                        >
                          <option value="">Select a reason</option>
                          <option value="Project completed with leftovers">Project completed with leftovers</option>
                          <option value="Wrong item ordered">Wrong item ordered</option>
                          <option value="Changed plans">Changed plans</option>
                          <option value="Upgrading to different material">Upgrading to different material</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 2: Photos */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Camera className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Upload Photos</h2>
                          <p className="text-gray-600">Add photos to showcase your item's condition</p>
                        </div>
                      </div>
                      
                      {/* Upload Area */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Photos <span className="text-red-600">*</span>
                          <span className="text-gray-500 font-normal ml-2">
                            ({photoPreviewUrls.length}/10 photos)
                          </span>
                        </label>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            id="photo-upload"
                            multiple
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handlePhotoSelection}
                            className="hidden"
                            disabled={photoPreviewUrls.length >= 10}
                          />
                          <label
                            htmlFor="photo-upload"
                            className={`cursor-pointer ${photoPreviewUrls.length >= 10 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-700 font-medium mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-sm text-gray-500">
                              JPG, PNG up to 5MB each (max 10 photos)
                            </p>
                          </label>
                        </div>
                        
                        {validationErrors.photos && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.photos}
                          </p>
                        )}
                      </div>
                      
                      {/* Photo Previews */}
                      {photoPreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {photoPreviewUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(index)}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {index === 0 && (
                                <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-semibold">
                                  Primary
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Tip:</strong> Take clear, well-lit photos from multiple angles. Show any defects or wear clearly. The first photo will be your primary listing image.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 3: Pricing */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Set Pricing</h2>
                          <p className="text-gray-600">Determine how you want to price your item</p>
                        </div>
                      </div>
                      
                      {/* Asking Price */}
                      <div>
                        <label htmlFor="asking_price" className="block text-sm font-semibold text-gray-900 mb-2">
                          Asking Price <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                          <input
                            type="number"
                            id="asking_price"
                            value={listingFormData.asking_price || ''}
                            onChange={(e) => handleFieldChange('asking_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 ${
                              validationErrors.asking_price 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                            } focus:ring-4 transition-all duration-200`}
                          />
                        </div>
                        {validationErrors.asking_price && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.asking_price}
                          </p>
                        )}
                      </div>
                      
                      {/* Original Price */}
                      <div>
                        <label htmlFor="original_price" className="block text-sm font-semibold text-gray-900 mb-2">
                          Original Price (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                          <input
                            type="number"
                            id="original_price"
                            value={listingFormData.original_price || ''}
                            onChange={(e) => handleFieldChange('original_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 ${
                              validationErrors.original_price 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                            } focus:ring-4 transition-all duration-200`}
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          Show buyers how much you originally paid (helps justify pricing)
                        </p>
                        {validationErrors.original_price && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.original_price}
                          </p>
                        )}
                        {listingFormData.original_price > 0 && listingFormData.asking_price > 0 && (
                          <p className="mt-2 text-sm text-green-700 font-medium">
                            Savings: ${(listingFormData.original_price - listingFormData.asking_price).toFixed(2)} 
                            ({Math.round((1 - listingFormData.asking_price / listingFormData.original_price) * 100)}% off)
                          </p>
                        )}
                      </div>
                      
                      {/* Price Type */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-3">
                          Price Type <span className="text-red-600">*</span>
                        </label>
                        <div className="space-y-3">
                          {[
                            { value: 'fixed', label: 'Fixed Price', desc: 'Buyers pay the asking price' },
                            { value: 'negotiable', label: 'Negotiable', desc: 'Open to offers from buyers' },
                            { value: 'auction', label: 'Auction', desc: 'Buyers bid on the item' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFieldChange('price_type', option.value)}
                              className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                                listingFormData.price_type === option.value
                                  ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-100'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-gray-900">{option.label}</p>
                                  <p className="text-sm text-gray-600 mt-1">{option.desc}</p>
                                </div>
                                {listingFormData.price_type === option.value && (
                                  <Check className="w-6 h-6 text-blue-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Step 4: Availability */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Availability & Shipping</h2>
                          <p className="text-gray-600">How buyers can get this item</p>
                        </div>
                      </div>
                      
                      {/* Quantity */}
                      <div>
                        <label htmlFor="quantity" className="block text-sm font-semibold text-gray-900 mb-2">
                          Quantity Available <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="number"
                          id="quantity"
                          value={listingFormData.quantity}
                          onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.quantity 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all duration-200`}
                        />
                        {validationErrors.quantity && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.quantity}
                          </p>
                        )}
                      </div>
                      
                      {/* Pickup Location */}
                      <div>
                        <label htmlFor="pickup_location" className="block text-sm font-semibold text-gray-900 mb-2">
                          Pickup Location <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          id="pickup_location"
                          value={listingFormData.pickup_location}
                          onChange={(e) => handleFieldChange('pickup_location', e.target.value)}
                          placeholder="e.g., Austin, TX 78701 or specific address"
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validationErrors.pickup_location 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all duration-200`}
                        />
                        {validationErrors.pickup_location && (
                          <p className="mt-2 text-sm text-red-600 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.pickup_location}
                          </p>
                        )}
                      </div>
                      
                      {/* Pickup Instructions */}
                      <div>
                        <label htmlFor="pickup_instructions" className="block text-sm font-semibold text-gray-900 mb-2">
                          Pickup Instructions (Optional)
                        </label>
                        <textarea
                          id="pickup_instructions"
                          value={listingFormData.pickup_instructions}
                          onChange={(e) => handleFieldChange('pickup_instructions', e.target.value)}
                          rows={3}
                          placeholder="e.g., Call before pickup, available weekends only, gate code: 1234"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 resize-none"
                        />
                      </div>
                      
                      {/* Shipping Available */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            id="shipping_available"
                            checked={listingFormData.shipping_available}
                            onChange={(e) => handleFieldChange('shipping_available', e.target.checked)}
                            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <label htmlFor="shipping_available" className="block text-sm font-semibold text-gray-900 mb-1 cursor-pointer">
                              <Truck className="w-5 h-5 inline mr-2 text-blue-600" />
                              I can ship this item
                            </label>
                            <p className="text-sm text-gray-600">
                              Offer shipping to reach more buyers beyond your local area
                            </p>
                          </div>
                        </div>
                        
                        {listingFormData.shipping_available && (
                          <div className="mt-4 pl-8">
                            <label htmlFor="shipping_rate" className="block text-sm font-semibold text-gray-900 mb-2">
                              Flat Shipping Rate <span className="text-red-600">*</span>
                            </label>
                            <div className="relative max-w-xs">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                              <input
                                type="number"
                                id="shipping_rate"
                                value={listingFormData.shipping_rate || ''}
                                onChange={(e) => handleFieldChange('shipping_rate', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 ${
                                  validationErrors.shipping_rate 
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                                } focus:ring-4 transition-all duration-200`}
                              />
                            </div>
                            {validationErrors.shipping_rate && (
                              <p className="mt-2 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {validationErrors.shipping_rate}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Form Navigation */}
                <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      {currentStep > 1 && (
                        <button
                          type="button"
                          onClick={handlePreviousStep}
                          className="inline-flex items-center px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                        >
                          <ChevronLeft className="w-5 h-5 mr-2" />
                          Previous
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {currentStep < 4 ? (
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          Next
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleShowPreview}
                          className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <Check className="w-5 h-5 mr-2" />
                          Preview Listing
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Preview Mode */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                    <h2 className="text-3xl font-bold text-white mb-2">Preview Your Listing</h2>
                    <p className="text-blue-100">Review your listing before publishing</p>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    {/* Item Information Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Item Information</h3>
                        <button
                          type="button"
                          onClick={() => handleEditFromPreview(1)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Product Name</p>
                          <p className="text-gray-900 font-semibold text-lg">{listingFormData.product_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Category</p>
                          <p className="text-gray-900">
                            {categories.find(c => c.category_id === listingFormData.category_id)?.category_name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Condition</p>
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                            listingFormData.condition === 'new' ? 'bg-green-100 text-green-800' :
                            listingFormData.condition === 'like_new' ? 'bg-blue-100 text-blue-800' :
                            listingFormData.condition === 'used' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {listingFormData.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Description</p>
                          <p className="text-gray-900 whitespace-pre-wrap">{listingFormData.description}</p>
                        </div>
                        {listingFormData.reason_for_selling && (
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-1">Reason for Selling</p>
                            <p className="text-gray-900">{listingFormData.reason_for_selling}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Photos Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Photos ({photoPreviewUrls.length})</h3>
                        <button
                          type="button"
                          onClick={() => handleEditFromPreview(2)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {photoPreviewUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Item photo ${index + 1}`}
                              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                            />
                            {index === 0 && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-semibold">
                                Primary
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Pricing Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Pricing</h3>
                        <button
                          type="button"
                          onClick={() => handleEditFromPreview(3)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Asking Price</p>
                          <p className="text-3xl font-bold text-gray-900">${listingFormData.asking_price.toFixed(2)}</p>
                        </div>
                        {listingFormData.original_price > 0 && (
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-1">Original Price</p>
                            <p className="text-gray-500 line-through text-lg">${listingFormData.original_price.toFixed(2)}</p>
                            <p className="text-green-700 font-semibold">
                              Save ${(listingFormData.original_price - listingFormData.asking_price).toFixed(2)} 
                              ({Math.round((1 - listingFormData.asking_price / listingFormData.original_price) * 100)}% off)
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Price Type</p>
                          <p className="text-gray-900 capitalize">{listingFormData.price_type}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Availability Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Availability</h3>
                        <button
                          type="button"
                          onClick={() => handleEditFromPreview(4)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Quantity Available</p>
                          <p className="text-gray-900 font-semibold">{listingFormData.quantity} unit(s)</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium mb-1">Pickup</p>
                          <div className="space-y-2">
                            <p className="text-gray-900">
                              <MapPin className="w-4 h-4 inline mr-1 text-gray-600" />
                              {listingFormData.pickup_location}
                            </p>
                            {listingFormData.pickup_instructions && (
                              <p className="text-gray-600 text-sm pl-5">{listingFormData.pickup_instructions}</p>
                            )}
                          </div>
                        </div>
                        {listingFormData.shipping_available && (
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-1">Shipping</p>
                            <p className="text-gray-900">
                              <Truck className="w-4 h-4 inline mr-1 text-gray-600" />
                              Available - ${listingFormData.shipping_rate.toFixed(2)} flat rate
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Publish Actions */}
                  <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPreviewMode(false)}
                        className="inline-flex items-center px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                      >
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        Back to Edit
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={createListingMutation.isPending}
                        className="inline-flex items-center px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createListingMutation.isPending ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Publish Listing
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Tips for a Great Listing</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Take clear, well-lit photos from multiple angles</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Be honest about condition and show any defects clearly</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Price competitively - check similar listings for reference</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Provide detailed measurements and specifications</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Respond quickly to buyer inquiries to sell faster</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SurplusListing_Create;