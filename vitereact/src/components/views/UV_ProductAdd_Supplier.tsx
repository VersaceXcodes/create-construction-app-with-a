import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { 
  Package, 
  Upload, 
  DollarSign, 
  Boxes, 
  Image as ImageIcon,
  Settings,
  Eye,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Category {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  category_slug: string;
  description: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface ProductFormData {
  category_id: string;
  sku: string;
  product_name: string;
  description: string | null;
  key_features: string[] | null;
  specifications: Record<string, any> | null;
  price_per_unit: number;
  unit_of_measure: string;
  bulk_pricing: Record<string, number> | null;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  expected_restock_date: string | null;
  images: string[] | null;
  primary_image_url: string | null;
  status: string;
  is_featured: boolean;
  tags: string[] | null;
  brand: string | null;
  dimensions: Record<string, any> | null;
  weight: number | null;
  material: string | null;
  compliance_certifications: string[] | null;
  warranty_information: string | null;
  minimum_order_quantity: number;
  maximum_order_quantity: number | null;
  available_delivery_methods: string[] | null;
  handling_time_days: number;
  searchable: boolean;
  customer_type_availability: string;
}

interface CreateProductPayload {
  category_id: string;
  sku: string;
  product_name: string;
  description?: string | null;
  key_features?: string[] | null;
  specifications?: Record<string, any> | null;
  price_per_unit: number;
  unit_of_measure: string;
  bulk_pricing?: Record<string, number> | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  images?: string[] | null;
  primary_image_url?: string | null;
  brand?: string | null;
  minimum_order_quantity?: number;
  handling_time_days?: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchCategories = async (authToken: string): Promise<Category[]> => {
  const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;
  const response = await axios.get<Category[]>(`${API_BASE_URL}/categories`, {
    params: { is_active: true },
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  return response.data;
};

const createProduct = async (
  authToken: string,
  productData: CreateProductPayload
): Promise<any> => {
  const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;
  const response = await axios.post(
    `${API_BASE_URL}/suppliers/me/products`,
    productData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ProductAdd_Supplier: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors, no object destructuring
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [product_form, setProductForm] = useState<ProductFormData>({
    category_id: '',
    sku: '',
    product_name: '',
    description: null,
    key_features: null,
    specifications: null,
    price_per_unit: 0,
    unit_of_measure: '',
    bulk_pricing: null,
    cost_price: null,
    stock_quantity: 0,
    low_stock_threshold: 10,
    expected_restock_date: null,
    images: null,
    primary_image_url: null,
    status: 'active',
    is_featured: false,
    tags: null,
    brand: null,
    dimensions: null,
    weight: null,
    material: null,
    compliance_certifications: null,
    warranty_information: null,
    minimum_order_quantity: 1,
    maximum_order_quantity: null,
    available_delivery_methods: null,
    handling_time_days: 1,
    searchable: true,
    customer_type_availability: 'all'
  });
  
  const [uploaded_image_urls, setUploadedImageUrls] = useState<string[]>([]);
  const [validation_errors, setValidationErrors] = useState<Record<string, string>>({});
  const [draft_saved, setDraftSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    basic: false,
    details: false,
    pricing: false,
    inventory: false,
    images: false,
    additional: true,
    sales: true,
    visibility: true
  });
  
  // Temporary states for dynamic inputs
  const [newFeature, setNewFeature] = useState('');
  const [newTag, setNewTag] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [bulkTier, setBulkTier] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  
  // ============================================================================
  // FETCH CATEGORIES (React Query)
  // ============================================================================
  
  const { data: available_categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories', 'active'],
    queryFn: () => fetchCategories(authToken!),
    enabled: !!authToken,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });
  
  // ============================================================================
  // CREATE PRODUCT MUTATION (React Query)
  // ============================================================================
  
  const createProductMutation = useMutation({
    mutationFn: (productData: CreateProductPayload) => createProduct(authToken!, productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      localStorage.removeItem('product_draft');
      navigate('/supplier/products');
    },
    onError: (error: any) => {
      if (error.response?.data?.error === 'ValidationError') {
        setValidationErrors(error.response.data.details || {});
      }
    }
  });
  
  // ============================================================================
  // DRAFT AUTO-SAVE (localStorage)
  // ============================================================================
  
  useEffect(() => {
    // Load draft on mount
    const savedDraft = localStorage.getItem('product_draft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setProductForm(draftData.product_form);
        setUploadedImageUrls(draftData.uploaded_image_urls || []);
        setDraftSaved(true);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);
  
  useEffect(() => {
    // Auto-save draft every 30 seconds
    const autoSaveInterval = setInterval(() => {
      if (product_form.product_name || product_form.sku) {
        localStorage.setItem('product_draft', JSON.stringify({
          product_form,
          uploaded_image_urls
        }));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 30000);
    
    return () => clearInterval(autoSaveInterval);
  }, [product_form, uploaded_image_urls]);
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setProductForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (validation_errors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const handleNumberInput = (field: keyof ProductFormData, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    handleInputChange(field, isNaN(numValue) ? 0 : numValue);
  };
  
  // Image upload handler (simulated since endpoint missing)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Simulate upload - in production, would upload to CDN
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setUploadedImageUrls(prev => {
          const newUrls = [...prev, dataUrl];
          // Auto-set first image as primary
          if (!product_form.primary_image_url) {
            setProductForm(p => ({ ...p, primary_image_url: dataUrl, images: newUrls }));
          } else {
            setProductForm(p => ({ ...p, images: newUrls }));
          }
          return newUrls;
        });
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = (urlToRemove: string) => {
    setUploadedImageUrls(prev => {
      const newUrls = prev.filter(url => url !== urlToRemove);
      setProductForm(p => ({
        ...p,
        images: newUrls.length > 0 ? newUrls : null,
        primary_image_url: p.primary_image_url === urlToRemove 
          ? (newUrls.length > 0 ? newUrls[0] : null)
          : p.primary_image_url
      }));
      return newUrls;
    });
  };
  
  const setPrimaryImage = (url: string) => {
    setProductForm(prev => ({ ...prev, primary_image_url: url }));
  };
  
  // Key Features handlers
  const addKeyFeature = () => {
    if (newFeature.trim()) {
      setProductForm(prev => ({
        ...prev,
        key_features: [...(prev.key_features || []), newFeature.trim()]
      }));
      setNewFeature('');
    }
  };
  
  const removeKeyFeature = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      key_features: prev.key_features ? prev.key_features.filter((_, i) => i !== index) : null
    }));
  };
  
  // Tags handlers
  const addTag = () => {
    if (newTag.trim()) {
      setProductForm(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };
  
  const removeTag = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      tags: prev.tags ? prev.tags.filter((_, i) => i !== index) : null
    }));
  };
  
  // Specifications handlers
  const addSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setProductForm(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [specKey.trim()]: specValue.trim()
        }
      }));
      setSpecKey('');
      setSpecValue('');
    }
  };
  
  const removeSpecification = (key: string) => {
    setProductForm(prev => {
      const newSpecs = { ...prev.specifications };
      delete newSpecs[key];
      return { ...prev, specifications: Object.keys(newSpecs).length > 0 ? newSpecs : null };
    });
  };
  
  // Bulk pricing handlers
  const addBulkPricingTier = () => {
    if (bulkTier.trim() && bulkPrice) {
      setProductForm(prev => ({
        ...prev,
        bulk_pricing: {
          ...prev.bulk_pricing,
          [bulkTier.trim()]: parseFloat(bulkPrice)
        }
      }));
      setBulkTier('');
      setBulkPrice('');
    }
  };
  
  const removeBulkPricingTier = (tier: string) => {
    setProductForm(prev => {
      const newPricing = { ...prev.bulk_pricing };
      delete newPricing[tier];
      return { ...prev, bulk_pricing: Object.keys(newPricing).length > 0 ? newPricing : null };
    });
  };
  
  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!product_form.category_id) errors.category_id = 'Category is required';
    if (!product_form.sku) errors.sku = 'SKU is required';
    if (!product_form.product_name) errors.product_name = 'Product name is required';
    if (!product_form.price_per_unit || product_form.price_per_unit <= 0) {
      errors.price_per_unit = 'Valid price is required';
    }
    if (!product_form.unit_of_measure) errors.unit_of_measure = 'Unit of measure is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    const payload: CreateProductPayload = {
      category_id: product_form.category_id,
      sku: product_form.sku,
      product_name: product_form.product_name,
      description: product_form.description,
      key_features: product_form.key_features,
      specifications: product_form.specifications,
      price_per_unit: product_form.price_per_unit,
      unit_of_measure: product_form.unit_of_measure,
      bulk_pricing: product_form.bulk_pricing,
      stock_quantity: product_form.stock_quantity,
      low_stock_threshold: product_form.low_stock_threshold,
      images: uploaded_image_urls.length > 0 ? uploaded_image_urls : null,
      primary_image_url: product_form.primary_image_url,
      brand: product_form.brand,
      minimum_order_quantity: product_form.minimum_order_quantity,
      handling_time_days: product_form.handling_time_days
    };
    
    createProductMutation.mutate(payload);
  };
  
  // Section toggle
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
                  <p className="text-gray-600 mt-1">Create a comprehensive product listing for your catalog</p>
                </div>
              </div>
              <Link
                to="/supplier/products"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <X className="w-6 h-6" />
              </Link>
            </div>
            
            {/* Draft saved indicator */}
            {draft_saved && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Draft saved automatically</span>
              </div>
            )}
            
            {/* Error summary */}
            {Object.keys(validation_errors).length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">Please fix the following errors:</h3>
                    <ul className="mt-2 text-sm text-red-700 space-y-1 list-disc list-inside">
                      {Object.entries(validation_errors).map(([field, error]) => (
                        <li key={field}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ===== SECTION 1: BASIC INFORMATION ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                onClick={() => toggleSection('basic')}
              >
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Required</span>
                </div>
                {collapsedSections.basic ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.basic && (
                <div className="p-6 space-y-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Category *
                    </label>
                    {categoriesLoading ? (
                      <div className="animate-pulse bg-gray-200 h-12 rounded-lg"></div>
                    ) : (
                      <select
                        value={product_form.category_id}
                        onChange={(e) => handleInputChange('category_id', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.category_id 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 outline-none transition-all`}
                      >
                        <option value="">Select a category</option>
                        {available_categories.map(cat => (
                          <option key={cat.category_id} value={cat.category_id}>
                            {cat.category_name}
                          </option>
                        ))}
                      </select>
                    )}
                    {validation_errors.category_id && (
                      <p className="mt-1 text-sm text-red-600">{validation_errors.category_id}</p>
                    )}
                  </div>
                  
                  {/* SKU and Product Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        SKU *
                      </label>
                      <input
                        type="text"
                        value={product_form.sku}
                        onChange={(e) => handleInputChange('sku', e.target.value)}
                        placeholder="e.g., LUM-2X4-8-SPF"
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.sku 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 outline-none transition-all`}
                      />
                      {validation_errors.sku && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.sku}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={product_form.brand || ''}
                        onChange={(e) => handleInputChange('brand', e.target.value || null)}
                        placeholder="e.g., DeWalt, Milwaukee"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                  
                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={product_form.product_name}
                      onChange={(e) => handleInputChange('product_name', e.target.value)}
                      placeholder="e.g., 2x4x8 SPF Lumber"
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validation_errors.product_name 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 outline-none transition-all`}
                    />
                    {validation_errors.product_name && (
                      <p className="mt-1 text-sm text-red-600">{validation_errors.product_name}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* ===== SECTION 2: PRODUCT DETAILS ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-colors"
                onClick={() => toggleSection('details')}
              >
                <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
                {collapsedSections.details ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.details && (
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={product_form.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value || null)}
                      rows={6}
                      placeholder="Detailed product description..."
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none"
                    />
                  </div>
                  
                  {/* Key Features */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Key Features
                    </label>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyFeature())}
                        placeholder="Add a key feature..."
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={addKeyFeature}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product_form.key_features?.map((feature, index) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center space-x-2">
                          <span className="text-sm text-blue-900">{feature}</span>
                          <button
                            type="button"
                            onClick={() => removeKeyFeature(index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Specifications */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Specifications
                    </label>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={specKey}
                        onChange={(e) => setSpecKey(e.target.value)}
                        placeholder="Spec name (e.g., Material)"
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                      <input
                        type="text"
                        value={specValue}
                        onChange={(e) => setSpecValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecification())}
                        placeholder="Value (e.g., Steel)"
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={addSpecification}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {product_form.specifications && Object.keys(product_form.specifications).length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {Object.entries(product_form.specifications).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-700">{key}:</span>
                              <span className="text-sm text-gray-600 ml-2">{String(value)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSpecification(key)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add a tag..."
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product_form.tags?.map((tag, index) => (
                        <div key={index} className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-1 flex items-center space-x-2">
                          <span className="text-sm text-gray-700">#{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* ===== SECTION 3: PRICING ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors"
                onClick={() => toggleSection('pricing')}
              >
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Pricing Information</h2>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Required</span>
                </div>
                {collapsedSections.pricing ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.pricing && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Price per unit */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Price per Unit *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product_form.price_per_unit || ''}
                          onChange={(e) => handleNumberInput('price_per_unit', e.target.value)}
                          placeholder="0.00"
                          className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 ${
                            validation_errors.price_per_unit 
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 outline-none transition-all`}
                        />
                      </div>
                      {validation_errors.price_per_unit && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.price_per_unit}</p>
                      )}
                    </div>
                    
                    {/* Unit of measure */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Unit of Measure *
                      </label>
                      <input
                        type="text"
                        value={product_form.unit_of_measure}
                        onChange={(e) => handleInputChange('unit_of_measure', e.target.value)}
                        placeholder="e.g., piece, bag, box"
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.unit_of_measure 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 outline-none transition-all`}
                      />
                      {validation_errors.unit_of_measure && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.unit_of_measure}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Cost Price */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Cost Price (Your Cost)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product_form.cost_price || ''}
                          onChange={(e) => handleNumberInput('cost_price', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Optional - for profit margin tracking</p>
                    </div>
                  </div>
                  
                  {/* Bulk Pricing */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Bulk Pricing Tiers
                    </label>
                    <p className="text-sm text-gray-600 mb-3">Offer discounts for larger quantities</p>
                    <div className="flex space-x-2 mb-3">
                      <input
                        type="text"
                        value={bulkTier}
                        onChange={(e) => setBulkTier(e.target.value)}
                        placeholder="Tier (e.g., 10+, 50+)"
                        className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={bulkPrice}
                          onChange={(e) => setBulkPrice(e.target.value)}
                          placeholder="Price"
                          className="w-full pl-8 pr-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addBulkPricingTier}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {product_form.bulk_pricing && Object.keys(product_form.bulk_pricing).length > 0 && (
                      <div className="bg-green-50 rounded-lg p-4 space-y-2">
                        {Object.entries(product_form.bulk_pricing).map(([tier, price]) => (
                          <div key={tier} className="flex items-center justify-between py-2 border-b border-green-200 last:border-0">
                            <span className="text-sm font-medium text-green-900">{tier} units</span>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-green-700">${price.toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => removeBulkPricingTier(tier)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* ===== SECTION 4: INVENTORY ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-colors"
                onClick={() => toggleSection('inventory')}
              >
                <div className="flex items-center space-x-3">
                  <Boxes className="w-5 h-5 text-amber-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Inventory Management</h2>
                </div>
                {collapsedSections.inventory ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.inventory && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stock Quantity */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={product_form.stock_quantity || ''}
                        onChange={(e) => handleNumberInput('stock_quantity', e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                    
                    {/* Low Stock Threshold */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Low Stock Alert
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={product_form.low_stock_threshold || ''}
                        onChange={(e) => handleNumberInput('low_stock_threshold', e.target.value)}
                        placeholder="10"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                      <p className="mt-1 text-xs text-gray-500">Alert when stock falls below this</p>
                    </div>
                    
                    {/* Handling Time */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Handling Time (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={product_form.handling_time_days || ''}
                        onChange={(e) => handleNumberInput('handling_time_days', e.target.value)}
                        placeholder="1"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* ===== SECTION 5: IMAGES ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-colors"
                onClick={() => toggleSection('images')}
              >
                <div className="flex items-center space-x-3">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Product Images</h2>
                </div>
                {collapsedSections.images ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.images && (
                <div className="p-6 space-y-6">
                  {/* Upload Area */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload Product Images
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <label className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium">
                          Click to upload
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB each</p>
                    </div>
                  </div>
                  
                  {/* Image Gallery */}
                  {uploaded_image_urls.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Uploaded Images ({uploaded_image_urls.length})
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploaded_image_urls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img 
                              src={url} 
                              alt={`Product ${index + 1}`}
                              className={`w-full h-32 object-cover rounded-lg border-2 ${
                                product_form.primary_image_url === url 
                                  ? 'border-blue-500 ring-4 ring-blue-100' 
                                  : 'border-gray-200'
                              }`}
                            />
                            {product_form.primary_image_url === url && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                                Primary
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity rounded-lg flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100">
                              {product_form.primary_image_url !== url && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryImage(url)}
                                  className="bg-white text-gray-900 px-3 py-1 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors"
                                >
                                  Set Primary
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(url)}
                                className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* ===== SECTION 6: ADDITIONAL DETAILS ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-gray-100 hover:to-slate-100 transition-colors"
                onClick={() => toggleSection('additional')}
              >
                <h2 className="text-xl font-semibold text-gray-900">Additional Details</h2>
                {collapsedSections.additional ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.additional && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Weight (lbs)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product_form.weight || ''}
                        onChange={(e) => handleNumberInput('weight', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Material
                      </label>
                      <input
                        type="text"
                        value={product_form.material || ''}
                        onChange={(e) => handleInputChange('material', e.target.value || null)}
                        placeholder="e.g., Steel, Wood, Concrete"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                  
                  {/* Warranty Info */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Warranty Information
                    </label>
                    <textarea
                      value={product_form.warranty_information || ''}
                      onChange={(e) => handleInputChange('warranty_information', e.target.value || null)}
                      rows={3}
                      placeholder="Warranty details..."
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* ===== SECTION 7: SALES SETTINGS ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-teal-100 hover:to-cyan-100 transition-colors"
                onClick={() => toggleSection('sales')}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Sales Settings</h2>
                </div>
                {collapsedSections.sales ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.sales && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Minimum Order Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={product_form.minimum_order_quantity || ''}
                        onChange={(e) => handleNumberInput('minimum_order_quantity', e.target.value)}
                        placeholder="1"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Maximum Order Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={product_form.maximum_order_quantity || ''}
                        onChange={(e) => handleNumberInput('maximum_order_quantity', e.target.value)}
                        placeholder="No limit"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* ===== SECTION 8: VISIBILITY ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:from-rose-100 hover:to-pink-100 transition-colors"
                onClick={() => toggleSection('visibility')}
              >
                <div className="flex items-center space-x-3">
                  <Eye className="w-5 h-5 text-rose-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Visibility & Status</h2>
                </div>
                {collapsedSections.visibility ? <ChevronDown className="w-5 h-5 text-gray-600" /> : <ChevronUp className="w-5 h-5 text-gray-600" />}
              </div>
              
              {!collapsedSections.visibility && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Product Status
                      </label>
                      <select
                        value={product_form.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    
                    {/* Customer Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Available For
                      </label>
                      <select
                        value={product_form.customer_type_availability}
                        onChange={(e) => handleInputChange('customer_type_availability', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      >
                        <option value="all">All Customers</option>
                        <option value="retail">Retail Only</option>
                        <option value="trade">Trade Only</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Toggles */}
                  <div className="space-y-4 bg-gray-50 rounded-lg p-4">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                          Featured Product
                        </span>
                        <span className="text-xs text-gray-500">Show in featured sections</span>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={product_form.is_featured}
                          onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                    </label>
                    
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                          Searchable
                        </span>
                        <span className="text-xs text-gray-500">Include in search results</span>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={product_form.searchable}
                          onChange={(e) => handleInputChange('searchable', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            {/* ===== ACTIONS ===== */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/supplier/products"
                  className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 text-center"
                >
                  Cancel
                </Link>
                
                <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-5 h-5" />
                    <span>Preview</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    {createProductMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Publish Product</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
          
          {/* ===== PREVIEW MODAL ===== */}
          {showPreview && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Product Preview</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6">
                  {/* Preview Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Image Gallery */}
                    <div>
                      {product_form.primary_image_url ? (
                        <img 
                          src={product_form.primary_image_url} 
                          alt={product_form.product_name}
                          className="w-full h-96 object-cover rounded-lg border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                      {uploaded_image_urls.length > 1 && (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                          {uploaded_image_urls.slice(0, 4).map((url, idx) => (
                            <img 
                              key={idx}
                              src={url} 
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-gray-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="space-y-4">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">{product_form.product_name || 'Product Name'}</h1>
                        <p className="text-sm text-gray-500 mt-1">SKU: {product_form.sku || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <div className="text-4xl font-bold text-blue-600">
                          ${product_form.price_per_unit.toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">per {product_form.unit_of_measure || 'unit'}</p>
                      </div>
                      
                      {product_form.bulk_pricing && Object.keys(product_form.bulk_pricing).length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-green-900 mb-2">Volume Pricing</p>
                          {Object.entries(product_form.bulk_pricing).map(([tier, price]) => (
                            <div key={tier} className="text-xs text-green-700 flex justify-between">
                              <span>{tier}</span>
                              <span className="font-medium">${price.toFixed(2)}/unit</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Stock</h3>
                        <p className="text-sm text-gray-700">{product_form.stock_quantity} units available</p>
                      </div>
                      
                      {product_form.key_features && product_form.key_features.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Key Features</h3>
                          <ul className="space-y-1">
                            {product_form.key_features.map((feature, idx) => (
                              <li key={idx} className="text-sm text-gray-700 flex items-start">
                                <span className="text-blue-600 mr-2">•</span>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {product_form.description && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                          <p className="text-sm text-gray-700 leading-relaxed">{product_form.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ProductAdd_Supplier;