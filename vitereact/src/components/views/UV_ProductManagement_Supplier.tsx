import  { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  Plus, 
  Search, 
  
  
  Edit2, 
  Trash2, 
  Eye, 
  TrendingUp,
  Image as ImageIcon,
  AlertCircle,
  Check,
  X
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProductListItem {
  product_id: string;
  sku: string;
  product_name: string;
  category_id: string;
  category_name: string;
  price_per_unit: number;
  stock_quantity: number;
  status: string;
  is_featured: boolean;
  views_count: number;
  sales_count: number;
  last_updated_timestamp: string;
  primary_image_url: string | null;
}

interface PaginationData {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

interface FiltersState {
  status: string | null;
  category_id: string | null;
  search_query: string | null;
}

interface SortConfig {
  sort_by: string;
  sort_order: string;
}

interface FetchProductsResponse {
  products: any[];
  total: number;
  limit: number;
  offset: number;
}

interface Category {
  category_id: string;
  category_name: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchSupplierProducts = async (
  authToken: string,
  filters: FiltersState,
  sortConfig: SortConfig,
  page: number,
  limit: number
): Promise<{ products: ProductListItem[]; pagination: PaginationData }> => {
  const offset = (page - 1) * limit;
  
  const params = new URLSearchParams();
  if (filters.status) params.append('status_filter', filters.status);
  if (filters.category_id) params.append('category_filter', filters.category_id);
  if (filters.search_query) params.append('search_query', filters.search_query);
  params.append('sort_by', sortConfig.sort_by);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await axios.get<FetchProductsResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/products?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    products: response.data.products.map(product => ({
      product_id: product.product_id,
      sku: product.sku,
      product_name: product.product_name,
      category_id: product.category_id,
      category_name: product.category?.category_name || 'Unknown',
      price_per_unit: Number(product.price_per_unit || 0),
      stock_quantity: Number(product.stock_quantity || 0),
      status: product.status,
      is_featured: product.is_featured,
      views_count: Number(product.views_count || 0),
      sales_count: Number(product.sales_count || 0),
      last_updated_timestamp: product.last_updated_timestamp,
      primary_image_url: product.primary_image_url
    })),
    pagination: {
      current_page: Math.floor(response.data.offset / response.data.limit) + 1,
      total_pages: Math.ceil(response.data.total / response.data.limit),
      total_count: response.data.total,
      limit: response.data.limit
    }
  };
};

const updateProductStatus = async (
  authToken: string,
  productId: string,
  status: string
): Promise<void> => {
  await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${productId}`,
    { status },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
};

const fetchCategories = async (): Promise<Category[]> => {
  const response = await axios.get<Category[]>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/categories?is_active=true`
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UV_ProductManagement_Supplier() {
  // ============================================================================
  // GLOBAL STATE ACCESS (CRITICAL: Individual selectors only)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // ============================================================================
  // URL PARAMS MANAGEMENT
  // ============================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [activeFilters, setActiveFilters] = useState<FiltersState>({
    status: searchParams.get('status_filter'),
    category_id: searchParams.get('category_filter'),
    search_query: searchParams.get('search_query')
  });
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: 'desc'
  });
  
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(searchParams.get('page') || '1')
  );
  
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(activeFilters.search_query || '');
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  
  const limit = 24;
  
  // ============================================================================
  // REACT QUERY SETUP
  // ============================================================================
  
  const queryClient = useQueryClient();
  
  // Fetch products
  const { data, isLoading, error } = useQuery({
    queryKey: ['supplier-products', activeFilters, sortConfig, currentPage],
    queryFn: () => fetchSupplierProducts(authToken!, activeFilters, sortConfig, currentPage, limit),
    enabled: !!authToken,
    staleTime: 60000, // 1 minute
    retry: 1
  });
  
  // Fetch categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 300000, // 5 minutes
    retry: 1
  });
  
  // Update product status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ productId, status }: { productId: string; status: string }) =>
      updateProductStatus(authToken!, productId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
    }
  });
  
  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  
  const products = data?.products || [];
  const pagination = data?.pagination || {
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 24
  };
  
  const allSelected = selectedProductIds.length > 0 && selectedProductIds.length === products.length;
  const someSelected = selectedProductIds.length > 0 && selectedProductIds.length < products.length;
  
  // ============================================================================
  // URL SYNC EFFECT
  // ============================================================================
  
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (activeFilters.status) params.set('status_filter', activeFilters.status);
    if (activeFilters.category_id) params.set('category_filter', activeFilters.category_id);
    if (activeFilters.search_query) params.set('search_query', activeFilters.search_query);
    if (sortConfig.sort_by !== 'created_at') params.set('sort_by', sortConfig.sort_by);
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    setSearchParams(params, { replace: true });
  }, [activeFilters, sortConfig, currentPage, setSearchParams]);
  
  // ============================================================================
  // SEARCH DEBOUNCE
  // ============================================================================
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== activeFilters.search_query) {
        setActiveFilters(prev => ({ ...prev, search_query: searchInput || null }));
        setCurrentPage(1);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchInput, activeFilters.search_query]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleFilterChange = useCallback((key: keyof FiltersState, value: string | null) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);
  
  const handleSortChange = useCallback((newSortBy: string) => {
    setSortConfig(prev => {
      if (prev.sort_by === newSortBy) {
        return { ...prev, sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc' };
      }
      return { sort_by: newSortBy, sort_order: 'desc' };
    });
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map(p => p.product_id));
    }
  }, [allSelected, products]);
  
  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      }
      return [...prev, productId];
    });
  }, []);
  
  const handleStatusUpdate = async (productId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ productId, status: newStatus });
    } catch (err) {
      console.error('Failed to update product status:', err);
    }
  };
  
  const handleClearFilters = () => {
    setActiveFilters({ status: null, category_id: null, search_query: null });
    setSearchInput('');
    setCurrentPage(1);
  };
  
  const handleBulkStatusUpdate = async (newStatus: string) => {
    setBulkOperationLoading(true);
    try {
      // Since bulk endpoint doesn't exist, update individually
      await Promise.all(
        selectedProductIds.map(productId =>
          updateProductStatus(authToken!, productId, newStatus)
        )
      );
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      setSelectedProductIds([]);
    } catch (err) {
      console.error('Bulk update failed:', err);
    } finally {
      setBulkOperationLoading(false);
    }
  };
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      case 'discontinued': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* ========================================== */}
          {/* HEADER SECTION */}
          {/* ========================================== */}
          
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage your product listings, inventory, and performance
                </p>
              </div>
              <Link
                to="/supplier/products/add"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Product
              </Link>
            </div>
          </div>
          
          {/* ========================================== */}
          {/* FILTERS SECTION */}
          {/* ========================================== */}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Search Input */}
              <div className="md:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="search"
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name or SKU..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={activeFilters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
              
              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={activeFilters.category_id || ''}
                  onChange={(e) => handleFilterChange('category_id', e.target.value || null)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">All Categories</option>
                  {categories?.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(activeFilters.status || activeFilters.category_id || activeFilters.search_query) && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                {activeFilters.status && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    Status: {activeFilters.status}
                    <button
                      onClick={() => handleFilterChange('status', null)}
                      className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeFilters.category_id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    Category: {categories?.find(c => c.category_id === activeFilters.category_id)?.category_name}
                    <button
                      onClick={() => handleFilterChange('category_id', null)}
                      className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeFilters.search_query && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    Search: "{activeFilters.search_query}"
                    <button
                      onClick={() => {
                        handleFilterChange('search_query', null);
                        setSearchInput('');
                      }}
                      className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
          
          {/* ========================================== */}
          {/* BULK ACTIONS BAR */}
          {/* ========================================== */}
          
          {selectedProductIds.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-900">
                    {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Bulk actions:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkStatusUpdate(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    disabled={bulkOperationLoading}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
                  >
                    <option value="">Update Status...</option>
                    <option value="active">Set Active</option>
                    <option value="inactive">Set Inactive</option>
                    <option value="discontinued">Mark Discontinued</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* ========================================== */}
          {/* PRODUCTS TABLE */}
          {/* ========================================== */}
          
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            
            {/* Table Header */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Package className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    {pagination.total_count} Products
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <select
                    value={sortConfig.sort_by}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="created_at">Date Added</option>
                    <option value="product_name">Name</option>
                    <option value="sales_count">Sales</option>
                    <option value="views_count">Views</option>
                    <option value="price_per_unit">Price</option>
                    <option value="stock_quantity">Stock</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                  <p className="text-gray-600 font-medium">Loading products...</p>
                </div>
              </div>
            )}
            
            {/* Error State */}
            {error && (
              <div className="flex items-center justify-center py-20">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-900">Failed to load products</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {axios.isAxiosError(error) ? error.message : 'An unexpected error occurred'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Empty State */}
            {!isLoading && !error && products.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">
                  {activeFilters.status || activeFilters.category_id || activeFilters.search_query
                    ? 'Try adjusting your filters'
                    : 'Start by adding your first product'}
                </p>
                {!activeFilters.status && !activeFilters.category_id && !activeFilters.search_query && (
                  <Link
                    to="/supplier/products/add"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Product
                  </Link>
                )}
              </div>
            )}
            
            {/* Products Table */}
            {!isLoading && !error && products.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Product
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Stock
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Performance
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                        
                        {/* Checkbox */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(product.product_id)}
                            onChange={() => handleSelectProduct(product.product_id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        
                        {/* Product Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                              {product.primary_image_url ? (
                                <img
                                  src={product.primary_image_url}
                                  alt={product.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/supplier/products/${product.product_id}/edit`}
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                              >
                                {product.product_name}
                              </Link>
                              <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Category */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{product.category_name}</span>
                        </td>
                        
                        {/* Price */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.price_per_unit)}
                          </span>
                        </td>
                        
                        {/* Stock */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${
                              product.stock_quantity === 0 ? 'text-red-600' :
                              product.stock_quantity < 10 ? 'text-amber-600' :
                              'text-green-600'
                            }`}>
                              {product.stock_quantity}
                            </span>
                            {product.stock_quantity === 0 && (
                              <span className="text-xs text-red-600 font-medium">Out</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={product.status}
                            onChange={(e) => handleStatusUpdate(product.product_id, e.target.value)}
                            disabled={updateStatusMutation.isPending}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 focus:ring-2 focus:ring-offset-2 ${getStatusColor(product.status)}`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="out_of_stock">Out of Stock</option>
                            <option value="discontinued">Discontinued</option>
                          </select>
                        </td>
                        
                        {/* Performance */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600">{product.views_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600">{product.sales_count}</span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/supplier/products/${product.product_id}/edit`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => {
                                // Note: DELETE endpoint not implemented in backend
                                console.warn('Delete endpoint not available - feature pending backend implementation');
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                              title="Delete not available"
                              disabled
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* ========================================== */}
          {/* PAGINATION */}
          {/* ========================================== */}
          
          {!isLoading && !error && products.length > 0 && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-sm text-gray-700">
                Showing page {pagination.current_page} of {pagination.total_pages} 
                ({pagination.total_count} total products)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.total_pages - 2) {
                      pageNum = pagination.total_pages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
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
                  onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                  disabled={currentPage === pagination.total_pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {/* ========================================== */}
          {/* QUICK STATS FOOTER */}
          {/* ========================================== */}
          
          {!isLoading && !error && products.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Products</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {products.filter(p => p.status === 'active').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {products.filter(p => p.status === 'out_of_stock' || p.stock_quantity === 0).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {products.reduce((sum, p) => sum + p.views_count, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {products.reduce((sum, p) => sum + p.sales_count, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </>
  );
}
