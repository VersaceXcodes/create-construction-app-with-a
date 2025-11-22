import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { DollarSign, Tag, Percent, TrendingUp, Plus, Edit2, Save, X, Calendar, Target, Package } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (matching Zod schemas)
// ============================================================================

interface Product {
  product_id: string;
  product_name: string;
  sku: string;
  price_per_unit: number;
  bulk_pricing: Record<string, number> | null;
  cost_price: number | null;
  status: string;
  stock_quantity?: number;
}

interface Promotion {
  promotion_id: string;
  promotion_name: string;
  promotion_type: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  usage_count: number;
  promo_code: string | null;
  applicable_products: string[] | null;
  minimum_purchase_amount: number | null;
}

interface PromotionFormData {
  promotion_name: string;
  promotion_type: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  applicable_products: string[];
  promo_code: string;
  minimum_purchase_amount: number | null;
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

const fetchSupplierProducts = async (token: string): Promise<Product[]> => {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/products`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      limit: 100,
      offset: 0,
      sort_by: 'product_name',
      sort_order: 'asc',
    },
  });
  return response.data.products || [];
};

const fetchActivePromotions = async (token: string, supplierId: string): Promise<Promotion[]> => {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/promotions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      supplier_id: supplierId,
      is_active: 'true',
    },
  });
  return response.data || [];
};

const createPromotion = async (token: string, supplierId: string, data: PromotionFormData): Promise<Promotion> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/promotions`,
    {
      supplier_id: supplierId,
      promotion_name: data.promotion_name,
      promotion_type: data.promotion_type,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
      start_date: data.start_date,
      end_date: data.end_date,
      applicable_products: data.applicable_products.length > 0 ? data.applicable_products : null,
      promo_code: data.promo_code || null,
      minimum_purchase_amount: data.minimum_purchase_amount ? Number(data.minimum_purchase_amount) : null,
      is_active: true,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const updateProductPrice = async (
  token: string,
  productId: string,
  pricePerUnit: number,
  bulkPricing: Record<string, number> | null
): Promise<Product> => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${productId}`,
    {
      price_per_unit: Number(pricePerUnit),
      bulk_pricing: bulkPricing,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

// ============================================================================
// COMPONENT
// ============================================================================

const UV_PricingPromotions_Supplier: React.FC = () => {
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);

  const queryClient = useQueryClient();

  // Extract supplier_id safely
  const supplierId = supplierProfile?.supplier_id || currentUser?.user_id || '';

  // Local UI State
  const [activeTab, setActiveTab] = useState<'pricing' | 'promotions' | 'analytics'>('pricing');
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editedPrice, setEditedPrice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Promotion Form State
  const [promotionForm, setPromotionForm] = useState<PromotionFormData>({
    promotion_name: '',
    promotion_type: 'seasonal',
    discount_type: 'percentage',
    discount_value: 0,
    start_date: '',
    end_date: '',
    applicable_products: [],
    promo_code: '',
    minimum_purchase_amount: null,
  });

  // ============================================================================
  // REACT QUERY: FETCH PRODUCTS
  // ============================================================================

  const {
    data: productsData = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: () => fetchSupplierProducts(authToken || ''),
    enabled: !!authToken && !!supplierId,
    staleTime: 60000, // 1 minute
    select: (data) => data.map(product => ({
      ...product,
      price_per_unit: Number(product.price_per_unit || 0),
      cost_price: product.cost_price ? Number(product.cost_price) : null,
    })),
  });

  // ============================================================================
  // REACT QUERY: FETCH PROMOTIONS
  // ============================================================================

  const {
    data: promotionsData = [],
    isLoading: promotionsLoading,
    error: promotionsError,
  } = useQuery({
    queryKey: ['supplier-promotions', supplierId],
    queryFn: () => fetchActivePromotions(authToken || '', supplierId),
    enabled: !!authToken && !!supplierId,
    staleTime: 30000, // 30 seconds
    select: (data) => data.map(promo => ({
      ...promo,
      discount_value: Number(promo.discount_value || 0),
      usage_count: Number(promo.usage_count || 0),
    })),
  });

  // ============================================================================
  // REACT QUERY: CREATE PROMOTION MUTATION
  // ============================================================================

  const createPromotionMutation = useMutation({
    mutationFn: (data: PromotionFormData) => createPromotion(authToken || '', supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-promotions'] });
      setShowPromotionModal(false);
      setPromotionForm({
        promotion_name: '',
        promotion_type: 'seasonal',
        discount_type: 'percentage',
        discount_value: 0,
        start_date: '',
        end_date: '',
        applicable_products: [],
        promo_code: '',
        minimum_purchase_amount: null,
      });
      setToastMessage({ type: 'success', text: 'Promotion created successfully!' });
      setTimeout(() => setToastMessage(null), 3000);
    },
    onError: (error: any) => {
      setToastMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create promotion' });
      setTimeout(() => setToastMessage(null), 5000);
    },
  });

  // ============================================================================
  // REACT QUERY: UPDATE PRICE MUTATION
  // ============================================================================

  const updatePriceMutation = useMutation({
    mutationFn: ({ productId, price, bulkPricing }: { productId: string; price: number; bulkPricing: Record<string, number> | null }) =>
      updateProductPrice(authToken || '', productId, price, bulkPricing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      setEditingProductId(null);
      setEditedPrice('');
      setToastMessage({ type: 'success', text: 'Price updated successfully!' });
      setTimeout(() => setToastMessage(null), 3000);
    },
    onError: (error: any) => {
      setToastMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update price' });
      setTimeout(() => setToastMessage(null), 5000);
    },
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const productsWithMargin = useMemo(() => {
    return productsData.map(product => ({
      ...product,
      margin_percentage: product.cost_price && product.price_per_unit > 0
        ? ((product.price_per_unit - product.cost_price) / product.price_per_unit * 100)
        : null,
    }));
  }, [productsData]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return productsWithMargin;
    const query = searchQuery.toLowerCase();
    return productsWithMargin.filter(p =>
      p.product_name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query)
    );
  }, [productsWithMargin, searchQuery]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleStartEdit = (product: Product) => {
    setEditingProductId(product.product_id);
    setEditedPrice(product.price_per_unit.toString());
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditedPrice('');
  };

  const handleSavePrice = (product: Product) => {
    const newPrice = parseFloat(editedPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      setToastMessage({ type: 'error', text: 'Please enter a valid price' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    updatePriceMutation.mutate({
      productId: product.product_id,
      price: newPrice,
      bulkPricing: product.bulk_pricing,
    });
  };

  const handleCreatePromotion = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!promotionForm.promotion_name.trim()) {
      setToastMessage({ type: 'error', text: 'Promotion name is required' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (promotionForm.discount_value <= 0) {
      setToastMessage({ type: 'error', text: 'Discount value must be greater than zero' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (!promotionForm.start_date || !promotionForm.end_date) {
      setToastMessage({ type: 'error', text: 'Start and end dates are required' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (new Date(promotionForm.end_date) <= new Date(promotionForm.start_date)) {
      setToastMessage({ type: 'error', text: 'End date must be after start date' });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    createPromotionMutation.mutate(promotionForm);
  };

  const handleFormChange = (field: keyof PromotionFormData, value: any) => {
    setPromotionForm(prev => ({ ...prev, [field]: value }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-blue-600" />
                  Pricing & Promotions
                </h1>
                <p className="mt-2 text-base text-gray-600">
                  Manage your product pricing, bulk discounts, and promotional campaigns
                </p>
              </div>
              {activeTab === 'promotions' && (
                <button
                  onClick={() => setShowPromotionModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  Create Promotion
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('pricing')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'pricing'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Product Pricing
                </span>
              </button>
              <button
                onClick={() => setActiveTab('promotions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'promotions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Promotions ({promotionsData.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Analytics
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Toast Notification */}
          {toastMessage && (
            <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-xl border ${
              toastMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? (
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                ) : (
                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                )}
                <p className="font-medium">{toastMessage.text}</p>
              </div>
            </div>
          )}

          {/* PRODUCT PRICING TAB */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Search products by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                  <button className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                    Search
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Product Pricing ({filteredProducts.length})
                  </h2>
                </div>

                {productsLoading ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading products...</p>
                  </div>
                ) : productsError ? (
                  <div className="p-12 text-center">
                    <p className="text-red-600">Failed to load products. Please try again.</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No products found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cost
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Margin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.map((product) => (
                          <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {product.product_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">{product.sku}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {editingProductId === product.product_id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editedPrice}
                                    onChange={(e) => setEditedPrice(e.target.value)}
                                    className="w-24 px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div className="text-sm font-semibold text-gray-900">
                                  ${Number(product.price_per_unit || 0).toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {product.cost_price ? `$${product.cost_price.toFixed(2)}` : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {product.margin_percentage !== null ? (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  product.margin_percentage >= 30 
                                    ? 'bg-green-100 text-green-800' 
                                    : product.margin_percentage >= 15
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {product.margin_percentage.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                product.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {product.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              {editingProductId === product.product_id ? (
                                <>
                                  <button
                                    onClick={() => handleSavePrice(product)}
                                    disabled={updatePriceMutation.isPending}
                                    className="inline-flex items-center gap-1 text-green-600 hover:text-green-900 transition-colors disabled:opacity-50"
                                  >
                                    <Save className="w-4 h-4" />
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={updatePriceMutation.isPending}
                                    className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                                  >
                                    <X className="w-4 h-4" />
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleStartEdit(product)}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit Price
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PROMOTIONS TAB */}
          {activeTab === 'promotions' && (
            <div className="space-y-6">
              {promotionsLoading ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading promotions...</p>
                </div>
              ) : promotionsError ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <p className="text-red-600">Failed to load promotions. Please try again.</p>
                </div>
              ) : promotionsData.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Promotions</h3>
                  <p className="text-gray-600 mb-6">Create your first promotional campaign to boost sales</p>
                  <button
                    onClick={() => setShowPromotionModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Promotion
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {promotionsData.map((promotion) => (
                    <div
                      key={promotion.promotion_id}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {promotion.promotion_name}
                            </h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {promotion.promotion_type.replace('_', ' ')}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            promotion.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {promotion.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Percent className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-gray-600">Discount</p>
                              <p className="text-lg font-semibold text-gray-900">
                                {promotion.discount_type === 'percentage' 
                                  ? `${promotion.discount_value}% off` 
                                  : `$${promotion.discount_value.toFixed(2)} off`
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-gray-600">Duration</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(promotion.start_date).toLocaleDateString()} - {new Date(promotion.end_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {promotion.promo_code && (
                            <div className="flex items-center gap-3">
                              <Target className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-sm text-gray-600">Promo Code</p>
                                <p className="text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded inline-block">
                                  {promotion.promo_code}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Usage Count</span>
                              <span className="text-sm font-semibold text-gray-900">{promotion.usage_count} times</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Pricing Analytics Coming Soon
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Advanced pricing analytics including conversion rates, margin analysis, and pricing optimization recommendations will be available soon.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE PROMOTION MODAL */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create New Promotion</h2>
              <button
                onClick={() => setShowPromotionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePromotion} className="p-6 space-y-6">
              {/* Promotion Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promotion Name *
                </label>
                <input
                  type="text"
                  required
                  value={promotionForm.promotion_name}
                  onChange={(e) => handleFormChange('promotion_name', e.target.value)}
                  placeholder="e.g., Summer Sale 2024"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              {/* Promotion Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promotion Type *
                </label>
                <select
                  required
                  value={promotionForm.promotion_type}
                  onChange={(e) => handleFormChange('promotion_type', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                >
                  <option value="seasonal">Seasonal</option>
                  <option value="volume_discount">Volume Discount</option>
                  <option value="new_customer">New Customer</option>
                  <option value="trade_exclusive">Trade Exclusive</option>
                </select>
              </div>

              {/* Discount Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    required
                    value={promotionForm.discount_type}
                    onChange={(e) => handleFormChange('discount_type', e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={promotionForm.discount_value || ''}
                    onChange={(e) => handleFormChange('discount_value', parseFloat(e.target.value) || 0)}
                    placeholder={promotionForm.discount_type === 'percentage' ? '10' : '50.00'}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    value={promotionForm.start_date}
                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    min={promotionForm.start_date || new Date().toISOString().slice(0, 16)}
                    value={promotionForm.end_date}
                    onChange={(e) => handleFormChange('end_date', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Promo Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Code (Optional)
                </label>
                <input
                  type="text"
                  value={promotionForm.promo_code}
                  onChange={(e) => handleFormChange('promo_code', e.target.value.toUpperCase())}
                  placeholder="e.g., SUMMER2024"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-mono"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty for automatic discount application
                </p>
              </div>

              {/* Minimum Purchase */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Purchase Amount (Optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={promotionForm.minimum_purchase_amount || ''}
                  onChange={(e) => handleFormChange('minimum_purchase_amount', parseFloat(e.target.value) || null)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowPromotionModal(false)}
                  disabled={createPromotionMutation.isPending}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPromotionMutation.isPending}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {createPromotionMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Promotion
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_PricingPromotions_Supplier;