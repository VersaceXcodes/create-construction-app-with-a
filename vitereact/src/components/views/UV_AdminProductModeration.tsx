import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { Search, Filter, Eye, CheckCircle, XCircle, Flag, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

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
  price_per_unit: number;
  unit_of_measure: string;
  stock_quantity: number;
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  is_featured: boolean;
  images: string[] | null;
  primary_image_url: string | null;
  brand: string | null;
  created_at: string;
  updated_at: string;
  business_name?: string;
  category_name?: string;
}

interface Category {
  category_id: string;
  category_name: string;
  category_slug: string;
  parent_category_id: string | null;
  is_active: boolean;
}

interface FlaggedProduct {
  product_id: string;
  product_name: string;
  supplier_id: string;
  flag_reason: string;
  flag_count: number;
  flagged_date: string;
}

interface ModerationQueue {
  pending_count: number;
  flagged_count: number;
  reviewed_count: number;
}

interface FilterConfig {
  supplier_id: string | null;
  category_id: string | null;
  status: string | null;
  flagged_only: boolean;
}

interface PaginationState {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminProductModeration: React.FC = () => {
  // Global state access (individual selectors)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [moderationReason, setModerationReason] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'flagged'>('all');
  
  // Filter config from URL params
  const filterConfig: FilterConfig = useMemo(() => ({
    supplier_id: searchParams.get('supplier_filter') || null,
    category_id: searchParams.get('category_filter') || null,
    status: searchParams.get('status') || null,
    flagged_only: searchParams.get('flagged_only') === 'true'
  }), [searchParams]);
  
  // Pagination from URL
  const pagination: PaginationState = useMemo(() => ({
    current_page: Number(searchParams.get('page')) || 1,
    total_pages: 1,
    total_count: 0,
    limit: 50
  }), [searchParams]);
  
  // ============================================================================
  // API CALLS
  // ============================================================================
  
  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/categories`, {
        params: { is_active: true },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      return response.data as Category[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!authToken
  });
  
  const categoriesList = categoriesData || [];
  
  // Fetch products for moderation
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['admin', 'products', filterConfig, pagination.current_page, searchQuery],
    queryFn: async () => {
      const params: Record<string, any> = {
        limit: pagination.limit,
        offset: (pagination.current_page - 1) * pagination.limit,
        sort_by: 'created_at',
        sort_order: 'desc'
      };
      
      if (filterConfig.supplier_id) params.supplier_id = filterConfig.supplier_id;
      if (filterConfig.category_id) params.category = filterConfig.category_id;
      if (filterConfig.status) params.status = filterConfig.status;
      if (searchQuery) params.search_query = searchQuery;
      
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products`, {
        params,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      
      return {
        products: response.data.products as Product[],
        total: response.data.total as number
      };
    },
    staleTime: 60 * 1000,
    enabled: !!authToken && activeTab === 'all'
  });
  
  const productsList = productsData?.products || [];
  const totalCount = productsData?.total || 0;
  const totalPages = Math.ceil(totalCount / pagination.limit);
  
  // Fetch flagged products
  const { data: flaggedData, isLoading: flaggedLoading } = useQuery({
    queryKey: ['admin', 'products', 'flagged'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/reviews/flagged`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      return response.data as FlaggedProduct[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!authToken && activeTab === 'flagged'
  });
  
  const flaggedProducts = flaggedData || [];
  
  // Moderation queue stats (derived)
  const moderationQueue: ModerationQueue = useMemo(() => ({
    pending_count: productsList.filter(p => p.status === 'active').length,
    flagged_count: flaggedProducts.length,
    reviewed_count: totalCount - flaggedProducts.length
  }), [productsList, flaggedProducts, totalCount]);
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  // Moderate product action
  const moderateProductMutation = useMutation({
    mutationFn: async ({ product_id, action, reason }: { product_id: string; action: 'approve' | 'reject' | 'flag'; reason: string }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/reviews/${product_id}/moderate`,
        { action, reason },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', 'flagged'] });
      setShowDetailPanel(false);
      setSelectedProduct(null);
      setModerationReason('');
    }
  });
  
  // Update product status
  const updateProductStatusMutation = useMutation({
    mutationFn: async ({ product_id, status }: { product_id: string; status: string }) => {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${product_id}`,
        { status },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    }
  });
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleFilterChange = (key: keyof FilterConfig, value: any) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value === null || value === '') {
      newParams.delete(key === 'supplier_id' ? 'supplier_filter' : key === 'category_id' ? 'category_filter' : key);
    } else {
      if (key === 'supplier_id') {
        newParams.set('supplier_filter', value);
      } else if (key === 'category_id') {
        newParams.set('category_filter', value);
      } else if (key === 'flagged_only') {
        newParams.set('flagged_only', value.toString());
      } else {
        newParams.set(key, value);
      }
    }
    
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };
  
  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };
  
  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailPanel(true);
  };
  
  const handleModerateProduct = (action: 'approve' | 'reject' | 'flag') => {
    if (!selectedProduct) return;
    
    moderateProductMutation.mutate({
      product_id: selectedProduct.product_id,
      action,
      reason: moderationReason || `${action} by admin`
    });
  };
  
  const handleStatusChange = (product_id: string, status: string) => {
    updateProductStatusMutation.mutate({ product_id, status });
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set('search', searchQuery);
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setSearchParams({});
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const isLoading = productsLoading || flaggedLoading;
  const isModerating = moderateProductMutation.isPending || updateProductStatusMutation.isPending;
  
  return (
    <>
      <div className="min-h-screen bg-gray-100">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Product Moderation</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Review and moderate product listings to maintain platform quality standards
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Link
                  to="/admin"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{moderationQueue.pending_count}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Eye className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Flagged Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{moderationQueue.flagged_count}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Flag className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{totalCount}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  All Products
                </button>
                <button
                  onClick={() => setActiveTab('flagged')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'flagged'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Flagged ({moderationQueue.flagged_count})
                </button>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="p-6 border-b border-gray-200 space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex space-x-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by name, SKU, or description..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Search
                </button>
              </form>
              
              {/* Filter Row */}
              <div className="flex flex-wrap gap-3">
                {/* Category Filter */}
                <select
                  value={filterConfig.category_id || ''}
                  onChange={(e) => handleFilterChange('category_id', e.target.value || null)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
                
                {/* Status Filter */}
                <select
                  value={filterConfig.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="discontinued">Discontinued</option>
                </select>
                
                {/* Flagged Only Toggle */}
                <label className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={filterConfig.flagged_only}
                    onChange={(e) => handleFilterChange('flagged_only', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Flagged Only</span>
                </label>
                
                {/* Clear Filters */}
                {(filterConfig.category_id || filterConfig.status || filterConfig.flagged_only || searchQuery) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </div>
            
            {/* Products Table */}
            {activeTab === 'all' ? (
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading products...</p>
                  </div>
                ) : productsList.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-600">No products found matching your filters.</p>
                    <button
                      onClick={clearFilters}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productsList.map((product) => (
                        <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                {product.primary_image_url ? (
                                  <img
                                    src={product.primary_image_url}
                                    alt={product.product_name}
                                    className="h-12 w-12 object-cover"
                                  />
                                ) : (
                                  <div className="h-12 w-12 flex items-center justify-center text-gray-400">
                                    <Eye className="h-6 w-6" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {product.product_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  SKU: {product.sku}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.category_name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.business_name || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ${Number(product.price_per_unit || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">per {product.unit_of_measure}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{product.stock_quantity}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={product.status}
                              onChange={(e) => handleStatusChange(product.product_id, e.target.value)}
                              className={`px-3 py-1 text-xs font-medium rounded-full border-2 ${
                                product.status === 'active'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : product.status === 'inactive'
                                  ? 'bg-gray-100 text-gray-800 border-gray-200'
                                  : product.status === 'out_of_stock'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}
                              disabled={isModerating}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="out_of_stock">Out of Stock</option>
                              <option value="discontinued">Discontinued</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewProduct(product)}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              /* Flagged Products Table */
              <div className="overflow-x-auto">
                {flaggedLoading ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading flagged products...</p>
                  </div>
                ) : flaggedProducts.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">No flagged products</p>
                    <p className="text-gray-500 text-sm mt-2">All products are in good standing</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Flag Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Flag Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Flagged Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {flaggedProducts.map((flagged) => (
                        <tr key={flagged.product_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {flagged.product_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{flagged.supplier_id}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">{flagged.flag_reason}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                              {flagged.flag_count} flags
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(flagged.flagged_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                const product = productsList.find(p => p.product_id === flagged.product_id);
                                if (product) handleViewProduct(product);
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            
            {/* Pagination */}
            {activeTab === 'all' && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.current_page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.current_page * pagination.limit, totalCount)}
                    </span>{' '}
                    of <span className="font-medium">{totalCount}</span> products
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                        const pageNum = idx + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              pagination.current_page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page >= totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Product Detail Panel (Slide-over) */}
      {showDetailPanel && selectedProduct && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowDetailPanel(false)}
            ></div>
            
            {/* Panel */}
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-2xl">
                <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                  {/* Header */}
                  <div className="px-6 py-6 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Product Moderation Review
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          Review product details and take moderation actions
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDetailPanel(false)}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                      >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 px-6 py-6 space-y-6">
                    {/* Product Image */}
                    {selectedProduct.primary_image_url && (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={selectedProduct.primary_image_url}
                          alt={selectedProduct.product_name}
                          className="w-full h-64 object-cover"
                        />
                      </div>
                    )}
                    
                    {/* Product Info */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{selectedProduct.product_name}</h3>
                        <p className="text-sm text-gray-500 mt-1">SKU: {selectedProduct.sku}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Price</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ${Number(selectedProduct.price_per_unit || 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Stock</p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            {selectedProduct.stock_quantity} {selectedProduct.unit_of_measure}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Description</p>
                        <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                          {selectedProduct.description || 'No description provided'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Current Status</p>
                        <span className={`inline-flex mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                          selectedProduct.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : selectedProduct.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : selectedProduct.status === 'out_of_stock'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedProduct.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* Moderation Reason Input */}
                    <div>
                      <label htmlFor="moderation_reason" className="block text-sm font-medium text-gray-700 mb-2">
                        Moderation Reason/Notes
                      </label>
                      <textarea
                        id="moderation_reason"
                        value={moderationReason}
                        onChange={(e) => setModerationReason(e.target.value)}
                        rows={4}
                        placeholder="Enter reason for moderation action..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>
                  
                  {/* Actions Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => handleModerateProduct('flag')}
                        disabled={isModerating}
                        className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <Flag className="h-4 w-4" />
                        <span>Flag for Review</span>
                      </button>
                      
                      <button
                        onClick={() => handleModerateProduct('reject')}
                        disabled={isModerating}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                      
                      <button
                        onClick={() => handleModerateProduct('approve')}
                        disabled={isModerating}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminProductModeration;