import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Save, 
  X, 
  Upload, 
  Copy, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle,
  Trash2,
  Plus
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface Product {
  product_id: string;
  supplier_id: string;
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
  last_updated_timestamp: string;
  expected_restock_date: string | null;
  images: string[] | null;
  primary_image_url: string | null;
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
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
  views_count: number;
  sales_count: number;
  creation_date: string;
  searchable: boolean;
  customer_type_availability: 'all' | 'retail' | 'trade';
  created_at: string;
  updated_at: string;
}

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

interface UpdateProductPayload {
  category_id?: string;
  product_name?: string;
  description?: string | null;
  key_features?: string[] | null;
  specifications?: Record<string, any> | null;
  price_per_unit?: number;
  unit_of_measure?: string;
  bulk_pricing?: Record<string, number> | null;
  stock_quantity?: number;
  low_stock_threshold?: number;
  expected_restock_date?: string | null;
  images?: string[] | null;
  primary_image_url?: string | null;
  status?: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  is_featured?: boolean;
  tags?: string[] | null;
  weight?: number | null;
  material?: string | null;
  warranty_information?: string | null;
  minimum_order_quantity?: number;
  maximum_order_quantity?: number | null;
  handling_time_days?: number;
  searchable?: boolean;
  customer_type_availability?: 'all' | 'retail' | 'trade';
}

interface ChangeHistoryItem {
  field_name: string;
  old_value: any;
  new_value: any;
  timestamp: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchProductDetails = async (product_id: string, auth_token: string): Promise<Product> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${product_id}`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const fetchCategories = async (auth_token: string): Promise<Category[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/categories`,
    {
      params: { is_active: 'true' },
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const updateProduct = async (
  product_id: string, 
  payload: UpdateProductPayload, 
  auth_token: string
): Promise<Product> => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${product_id}`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const duplicateProduct = async (
  original_product: Product,
  auth_token: string
): Promise<Product> => {
  const payload = {
    category_id: original_product.category_id,
    sku: `${original_product.sku}_COPY`,
    product_name: `${original_product.product_name} (Copy)`,
    description: original_product.description,
    key_features: original_product.key_features,
    specifications: original_product.specifications,
    price_per_unit: original_product.price_per_unit,
    unit_of_measure: original_product.unit_of_measure,
    bulk_pricing: original_product.bulk_pricing,
    stock_quantity: 0,
    low_stock_threshold: original_product.low_stock_threshold,
    images: original_product.images,
    primary_image_url: original_product.primary_image_url,
    status: 'inactive' as const,
    brand: original_product.brand,
    minimum_order_quantity: original_product.minimum_order_quantity,
    handling_time_days: original_product.handling_time_days,
    tags: original_product.tags,
    weight: original_product.weight,
    material: original_product.material,
    warranty_information: original_product.warranty_information,
    customer_type_availability: original_product.customer_type_availability
  };

  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/products`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ProductEdit_Supplier: React.FC = () => {
  const { product_id } = useParams<{ product_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors to avoid infinite loops
  const auth_token = useAppStore(state => state.authentication_state.auth_token);
  const supplier_profile = useAppStore(state => state.authentication_state.supplier_profile);

  // Local state for edited product
  const [edited_product, setEditedProduct] = useState<Partial<Product> | null>(null);
  const [change_history, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
  const [validation_errors, setValidationErrors] = useState<Record<string, string>>({});
  const [has_unsaved_changes, setHasUnsavedChanges] = useState(false);
  const [show_success_message, setShowSuccessMessage] = useState(false);
  const [new_image_url, setNewImageUrl] = useState('');
  const [new_tag, setNewTag] = useState('');
  const [bulk_price_tier, setBulkPriceTier] = useState('');
  const [bulk_price_value, setBulkPriceValue] = useState('');

  // Fetch product details
  const { 
    data: original_product, 
    isLoading: is_loading_product,
    error: product_error 
  } = useQuery({
    queryKey: ['product', product_id],
    queryFn: () => fetchProductDetails(product_id!, auth_token!),
    enabled: !!product_id && !!auth_token,
    staleTime: 0, // Always fetch fresh data for editing
    retry: 1
  });

  // Fetch categories
  const { 
    data: available_categories = [],
    isLoading: is_loading_categories 
  } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: () => fetchCategories(auth_token!),
    enabled: !!auth_token,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Update product mutation
  const update_mutation = useMutation({
    mutationFn: (payload: UpdateProductPayload) => updateProduct(product_id!, payload, auth_token!),
    onSuccess: (_updated_product) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['product', product_id] });
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      
      // Reset state
      setHasUnsavedChanges(false);
      setChangeHistory([]);
      setValidationErrors({});
      
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
      }
    }
  });

  // Duplicate product mutation
  const duplicate_mutation = useMutation({
    mutationFn: () => duplicateProduct(original_product!, auth_token!),
    onSuccess: (duplicated_product) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      navigate(`/supplier/products/${duplicated_product.product_id}/edit`);
    }
  });

  // Initialize edited_product when original_product loads
  useEffect(() => {
    if (original_product) {
      // Verify ownership
      if (supplier_profile && original_product.supplier_id !== supplier_profile.supplier_id) {
        alert('Access denied - product does not belong to your shop');
        navigate('/supplier/products');
        return;
      }

      // Initialize edited state
      setEditedProduct({
        product_id: original_product.product_id,
        category_id: original_product.category_id,
        product_name: original_product.product_name,
        description: original_product.description,
        key_features: original_product.key_features,
        specifications: original_product.specifications,
        price_per_unit: original_product.price_per_unit,
        unit_of_measure: original_product.unit_of_measure,
        bulk_pricing: original_product.bulk_pricing,
        stock_quantity: original_product.stock_quantity,
        low_stock_threshold: original_product.low_stock_threshold,
        expected_restock_date: original_product.expected_restock_date,
        images: original_product.images,
        primary_image_url: original_product.primary_image_url,
        status: original_product.status,
        is_featured: original_product.is_featured,
        tags: original_product.tags,
        weight: original_product.weight,
        material: original_product.material,
        warranty_information: original_product.warranty_information,
        minimum_order_quantity: original_product.minimum_order_quantity,
        maximum_order_quantity: original_product.maximum_order_quantity,
        handling_time_days: original_product.handling_time_days,
        searchable: original_product.searchable,
        customer_type_availability: original_product.customer_type_availability
      });
    }
  }, [original_product, supplier_profile, navigate]);

  // Check for unsaved changes
  useEffect(() => {
    if (!original_product || !edited_product) return;

    const has_changes = JSON.stringify(edited_product) !== JSON.stringify({
      product_id: original_product.product_id,
      category_id: original_product.category_id,
      product_name: original_product.product_name,
      description: original_product.description,
      key_features: original_product.key_features,
      specifications: original_product.specifications,
      price_per_unit: original_product.price_per_unit,
      unit_of_measure: original_product.unit_of_measure,
      bulk_pricing: original_product.bulk_pricing,
      stock_quantity: original_product.stock_quantity,
      low_stock_threshold: original_product.low_stock_threshold,
      expected_restock_date: original_product.expected_restock_date,
      images: original_product.images,
      primary_image_url: original_product.primary_image_url,
      status: original_product.status,
      is_featured: original_product.is_featured,
      tags: original_product.tags,
      weight: original_product.weight,
      material: original_product.material,
      warranty_information: original_product.warranty_information,
      minimum_order_quantity: original_product.minimum_order_quantity,
      maximum_order_quantity: original_product.maximum_order_quantity,
      handling_time_days: original_product.handling_time_days,
      searchable: original_product.searchable,
      customer_type_availability: original_product.customer_type_availability
    });

    setHasUnsavedChanges(has_changes);
  }, [edited_product, original_product]);

  // Warn about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (has_unsaved_changes) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [has_unsaved_changes]);

  // Track field changes
  const trackChange = useCallback((field_name: string, old_value: any, new_value: any) => {
    if (JSON.stringify(old_value) === JSON.stringify(new_value)) return;

    setChangeHistory(prev => [...prev, {
      field_name,
      old_value,
      new_value,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  // Update field handler
  const updateField = useCallback((field_name: string, value: any) => {
    if (!edited_product || !original_product) return;

    setEditedProduct(prev => {
      if (!prev) return prev;
      const old_value = (prev as any)[field_name];
      trackChange(field_name, old_value, value);
      return { ...prev, [field_name]: value };
    });

    // Clear validation error for this field
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field_name];
      return newErrors;
    });
  }, [edited_product, original_product, trackChange]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!edited_product) return;

    // Build update payload (only changed fields)
    const payload: UpdateProductPayload = {};
    
    if (edited_product.category_id !== original_product?.category_id) 
      payload.category_id = edited_product.category_id;
    if (edited_product.product_name !== original_product?.product_name) 
      payload.product_name = edited_product.product_name;
    if (edited_product.description !== original_product?.description) 
      payload.description = edited_product.description;
    if (JSON.stringify(edited_product.key_features) !== JSON.stringify(original_product?.key_features)) 
      payload.key_features = edited_product.key_features;
    if (JSON.stringify(edited_product.specifications) !== JSON.stringify(original_product?.specifications)) 
      payload.specifications = edited_product.specifications;
    if (edited_product.price_per_unit !== original_product?.price_per_unit) 
      payload.price_per_unit = edited_product.price_per_unit;
    if (edited_product.unit_of_measure !== original_product?.unit_of_measure) 
      payload.unit_of_measure = edited_product.unit_of_measure;
    if (JSON.stringify(edited_product.bulk_pricing) !== JSON.stringify(original_product?.bulk_pricing)) 
      payload.bulk_pricing = edited_product.bulk_pricing;
    if (edited_product.stock_quantity !== original_product?.stock_quantity) 
      payload.stock_quantity = edited_product.stock_quantity;
    if (edited_product.low_stock_threshold !== original_product?.low_stock_threshold) 
      payload.low_stock_threshold = edited_product.low_stock_threshold;
    if (edited_product.expected_restock_date !== original_product?.expected_restock_date) 
      payload.expected_restock_date = edited_product.expected_restock_date;
    if (JSON.stringify(edited_product.images) !== JSON.stringify(original_product?.images)) 
      payload.images = edited_product.images;
    if (edited_product.primary_image_url !== original_product?.primary_image_url) 
      payload.primary_image_url = edited_product.primary_image_url;
    if (edited_product.status !== original_product?.status) 
      payload.status = edited_product.status;
    if (edited_product.is_featured !== original_product?.is_featured) 
      payload.is_featured = edited_product.is_featured;
    if (JSON.stringify(edited_product.tags) !== JSON.stringify(original_product?.tags)) 
      payload.tags = edited_product.tags;
    if (edited_product.weight !== original_product?.weight) 
      payload.weight = edited_product.weight;
    if (edited_product.material !== original_product?.material) 
      payload.material = edited_product.material;
    if (edited_product.warranty_information !== original_product?.warranty_information) 
      payload.warranty_information = edited_product.warranty_information;
    if (edited_product.minimum_order_quantity !== original_product?.minimum_order_quantity) 
      payload.minimum_order_quantity = edited_product.minimum_order_quantity;
    if (edited_product.maximum_order_quantity !== original_product?.maximum_order_quantity) 
      payload.maximum_order_quantity = edited_product.maximum_order_quantity;
    if (edited_product.handling_time_days !== original_product?.handling_time_days) 
      payload.handling_time_days = edited_product.handling_time_days;
    if (edited_product.searchable !== original_product?.searchable) 
      payload.searchable = edited_product.searchable;
    if (edited_product.customer_type_availability !== original_product?.customer_type_availability) 
      payload.customer_type_availability = edited_product.customer_type_availability;

    await update_mutation.mutateAsync(payload);
  };

  // Add image to array
  const handleAddImage = () => {
    if (!new_image_url.trim() || !edited_product) return;
    
    const current_images = edited_product.images || [];
    const updated_images = [...current_images, new_image_url.trim()];
    
    updateField('images', updated_images);
    
    // Set as primary if first image
    if (!edited_product.primary_image_url) {
      updateField('primary_image_url', new_image_url.trim());
    }
    
    setNewImageUrl('');
  };

  // Remove image from array
  const handleRemoveImage = (index: number) => {
    if (!edited_product) return;
    
    const current_images = edited_product.images || [];
    const updated_images = current_images.filter((_, i) => i !== index);
    const removed_url = current_images[index];
    
    updateField('images', updated_images);
    
    // If removed image was primary, set new primary
    if (edited_product.primary_image_url === removed_url) {
      updateField('primary_image_url', updated_images[0] || null);
    }
  };

  // Set primary image
  const handleSetPrimaryImage = (url: string) => {
    updateField('primary_image_url', url);
  };

  // Add tag
  const handleAddTag = () => {
    if (!new_tag.trim() || !edited_product) return;
    
    const current_tags = edited_product.tags || [];
    if (current_tags.includes(new_tag.trim())) return;
    
    updateField('tags', [...current_tags, new_tag.trim()]);
    setNewTag('');
  };

  // Remove tag
  const handleRemoveTag = (tag: string) => {
    if (!edited_product) return;
    
    const current_tags = edited_product.tags || [];
    updateField('tags', current_tags.filter(t => t !== tag));
  };

  // Add bulk pricing tier
  const handleAddBulkPrice = () => {
    if (!bulk_price_tier.trim() || !bulk_price_value.trim() || !edited_product) return;
    
    const price = parseFloat(bulk_price_value);
    if (isNaN(price) || price <= 0) return;
    
    const current_pricing = edited_product.bulk_pricing || {};
    updateField('bulk_pricing', { ...current_pricing, [bulk_price_tier]: price });
    
    setBulkPriceTier('');
    setBulkPriceValue('');
  };

  // Remove bulk pricing tier
  const handleRemoveBulkPrice = (tier: string) => {
    if (!edited_product) return;
    
    const current_pricing = { ...(edited_product.bulk_pricing || {}) };
    delete current_pricing[tier];
    updateField('bulk_pricing', Object.keys(current_pricing).length > 0 ? current_pricing : null);
  };

  // Add key feature
  const handleAddKeyFeature = () => {
    if (!edited_product) return;
    
    const current_features = edited_product.key_features || [];
    updateField('key_features', [...current_features, '']);
  };

  // Update key feature
  const handleUpdateKeyFeature = (index: number, value: string) => {
    if (!edited_product) return;
    
    const current_features = edited_product.key_features || [];
    const updated_features = [...current_features];
    updated_features[index] = value;
    updateField('key_features', updated_features);
  };

  // Remove key feature
  const handleRemoveKeyFeature = (index: number) => {
    if (!edited_product) return;
    
    const current_features = edited_product.key_features || [];
    updateField('key_features', current_features.filter((_, i) => i !== index));
  };

  // Handle duplicate
  const handleDuplicate = async () => {
    if (!original_product) return;
    
    if (window.confirm('Create a duplicate of this product? The copy will be inactive with 0 stock.')) {
      await duplicate_mutation.mutateAsync();
    }
  };

  // Loading state
  const is_loading = is_loading_product || is_loading_categories;

  if (is_loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading product...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (product_error) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600 mb-6">The product you're trying to edit could not be found.</p>
            <Link
              to="/supplier/products"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Products
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!edited_product || !original_product) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/supplier/products"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Products
            </Link>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
                <p className="text-gray-600 mt-2">SKU: {original_product.sku}</p>
              </div>
              
              <div className="flex items-center space-x-3">
                {has_unsaved_changes && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Unsaved changes
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={duplicate_mutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Duplicate
                </button>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {show_success_message && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800 font-medium">Product updated successfully!</p>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
              
              <div className="space-y-6">
                {/* Product Name */}
                <div>
                  <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="product_name"
                    value={edited_product.product_name || ''}
                    onChange={(e) => updateField('product_name', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    required
                  />
                  {validation_errors.product_name && (
                    <p className="mt-1 text-sm text-red-600">{validation_errors.product_name}</p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category_id"
                    value={edited_product.category_id || ''}
                    onChange={(e) => updateField('category_id', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    required
                  >
                    <option value="">Select category</option>
                    {available_categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU (Read-only) */}
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                    SKU (cannot be changed)
                  </label>
                  <input
                    type="text"
                    id="sku"
                    value={original_product.sku}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={edited_product.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    placeholder="Detailed product description..."
                  />
                </div>

                {/* Key Features */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Features
                  </label>
                  <div className="space-y-2">
                    {(edited_product.key_features || []).map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => handleUpdateKeyFeature(index, e.target.value)}
                          className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="Feature description"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyFeature(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddKeyFeature}
                      className="inline-flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Feature
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Pricing</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price per Unit */}
                <div>
                  <label htmlFor="price_per_unit" className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Unit <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      id="price_per_unit"
                      value={edited_product.price_per_unit || ''}
                      onChange={(e) => updateField('price_per_unit', Number(e.target.value))}
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                {/* Unit of Measure */}
                <div>
                  <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700 mb-2">
                    Unit of Measure <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="unit_of_measure"
                    value={edited_product.unit_of_measure || ''}
                    onChange={(e) => updateField('unit_of_measure', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="piece, bag, yard, etc."
                    required
                  />
                </div>
              </div>

              {/* Bulk Pricing */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bulk Pricing (optional)
                </label>
                <div className="space-y-2">
                  {edited_product.bulk_pricing && Object.entries(edited_product.bulk_pricing).map(([tier, price]) => (
                    <div key={tier} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                      <span className="text-gray-700 font-medium">{tier}+:</span>
                      <span className="text-gray-900 font-semibold">${Number(price).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBulkPrice(tier)}
                        className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={bulk_price_tier}
                      onChange={(e) => setBulkPriceTier(e.target.value)}
                      placeholder="Quantity (e.g., 10)"
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <input
                      type="number"
                      value={bulk_price_value}
                      onChange={(e) => setBulkPriceValue(e.target.value)}
                      placeholder="Price"
                      step="0.01"
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddBulkPrice}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Inventory</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stock Quantity */}
                <div>
                  <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="stock_quantity"
                    value={edited_product.stock_quantity ?? 0}
                    onChange={(e) => updateField('stock_quantity', Number(e.target.value))}
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>

                {/* Low Stock Threshold */}
                <div>
                  <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 mb-2">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    id="low_stock_threshold"
                    value={edited_product.low_stock_threshold ?? 10}
                    onChange={(e) => updateField('low_stock_threshold', Number(e.target.value))}
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* Expected Restock Date */}
                <div>
                  <label htmlFor="expected_restock_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Restock Date
                  </label>
                  <input
                    type="date"
                    id="expected_restock_date"
                    value={edited_product.expected_restock_date?.split('T')[0] || ''}
                    onChange={(e) => updateField('expected_restock_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Images</h2>
              
              {/* Current Images */}
              {edited_product.images && edited_product.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {edited_product.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      {edited_product.primary_image_url === url && (
                        <span className="absolute top-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                          Primary
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          {edited_product.primary_image_url !== url && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(url)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Image */}
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={new_image_url}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Add Image
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Note: Image upload endpoint not yet available. Please enter image URLs manually.
              </p>
            </div>

            {/* Product Details */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand */}
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    id="brand"
                    value={edited_product.brand || ''}
                    onChange={(e) => updateField('brand', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* Material */}
                <div>
                  <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    id="material"
                    value={edited_product.material || ''}
                    onChange={(e) => updateField('material', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    id="weight"
                    value={edited_product.weight ?? ''}
                    onChange={(e) => updateField('weight', e.target.value ? Number(e.target.value) : null)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(edited_product.tags || []).map(tag => (
                    <span key={tag} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-blue-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={new_tag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tag"
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Warranty */}
              <div className="mt-6">
                <label htmlFor="warranty_information" className="block text-sm font-medium text-gray-700 mb-2">
                  Warranty Information
                </label>
                <textarea
                  id="warranty_information"
                  value={edited_product.warranty_information || ''}
                  onChange={(e) => updateField('warranty_information', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  placeholder="Warranty terms and conditions..."
                />
              </div>
            </div>

            {/* Order & Delivery Settings */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order & Delivery Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Minimum Order Quantity */}
                <div>
                  <label htmlFor="minimum_order_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order
                  </label>
                  <input
                    type="number"
                    id="minimum_order_quantity"
                    value={edited_product.minimum_order_quantity ?? 1}
                    onChange={(e) => updateField('minimum_order_quantity', Number(e.target.value))}
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* Maximum Order Quantity */}
                <div>
                  <label htmlFor="maximum_order_quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Order
                  </label>
                  <input
                    type="number"
                    id="maximum_order_quantity"
                    value={edited_product.maximum_order_quantity ?? ''}
                    onChange={(e) => updateField('maximum_order_quantity', e.target.value ? Number(e.target.value) : null)}
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* Handling Time */}
                <div>
                  <label htmlFor="handling_time_days" className="block text-sm font-medium text-gray-700 mb-2">
                    Handling Time (days)
                  </label>
                  <input
                    type="number"
                    id="handling_time_days"
                    value={edited_product.handling_time_days ?? 1}
                    onChange={(e) => updateField('handling_time_days', Number(e.target.value))}
                    min="1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Product Status & Visibility */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Status & Visibility</h2>
              
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    value={edited_product.status || 'active'}
                    onChange={(e) => updateField('status', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>

                {/* Customer Type Availability */}
                <div>
                  <label htmlFor="customer_type_availability" className="block text-sm font-medium text-gray-700 mb-2">
                    Available To
                  </label>
                  <select
                    id="customer_type_availability"
                    value={edited_product.customer_type_availability || 'all'}
                    onChange={(e) => updateField('customer_type_availability', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="all">All Customers</option>
                    <option value="retail">Retail Only</option>
                    <option value="trade">Trade Only</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <span className="text-gray-700 font-medium">Featured Product</span>
                    <input
                      type="checkbox"
                      checked={edited_product.is_featured || false}
                      onChange={(e) => updateField('is_featured', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <span className="text-gray-700 font-medium">Searchable</span>
                    <input
                      type="checkbox"
                      checked={edited_product.searchable ?? true}
                      onChange={(e) => updateField('searchable', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="sticky bottom-0 bg-white border-t-4 border-blue-600 rounded-xl shadow-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {has_unsaved_changes && (
                    <span className="text-amber-700 font-medium flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      You have unsaved changes
                    </span>
                  )}
                  {change_history.length > 0 && (
                    <span className="text-gray-600 text-sm">
                      {change_history.length} change{change_history.length !== 1 ? 's' : ''} made
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <Link
                    to="/supplier/products"
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </Link>
                  
                  <button
                    type="submit"
                    disabled={update_mutation.isPending || !has_unsaved_changes}
                    className="inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {update_mutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_ProductEdit_Supplier;