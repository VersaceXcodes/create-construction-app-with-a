import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  RefreshCw, 
  Search, 
  Filter,
  Edit2,
  Check,
  X,
  ChevronDown,
  Clock,
  DollarSign,
  Boxes
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
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
  low_stock_threshold: number;
  last_updated_timestamp: string;
  expected_restock_date: string | null;
  primary_image_url: string | null;
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  cost_price: number | null;
  created_at: string;
  updated_at: string;
}

interface InventorySummary {
  total_products: number;
  total_stock_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface StockMovement {
  log_id: string;
  product_id: string;
  change_type: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: string;
  timestamp: string;
}

interface FilterState {
  low_stock_only: boolean;
  out_of_stock_only: boolean;
  search_query: string;
  category_filter: string | null;
}

interface SyncStatus {
  enabled: boolean;
  last_sync_timestamp: string | null;
  sync_in_progress: boolean;
  sync_errors: string[];
}

interface BulkUpdateState {
  selected_product_ids: string[];
  bulk_action: string | null;
  bulk_value: number | null;
  processing: boolean;
}

interface Category {
  category_id: string;
  category_name: string;
  category_slug: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchInventoryData = async (
  authToken: string,
  filters: FilterState
): Promise<{ products: Product[]; total: number }> => {
  const params = new URLSearchParams();
  
  if (filters.search_query) {
    params.append('search_query', filters.search_query);
  }
  
  if (filters.category_filter) {
    params.append('category_filter', filters.category_filter);
  }
  
  if (filters.low_stock_only) {
    params.append('status_filter', 'low_stock');
  } else if (filters.out_of_stock_only) {
    params.append('status_filter', 'out_of_stock');
  }
  
  params.append('sort_by', 'stock_quantity');
  params.append('sort_order', 'asc');
  params.append('limit', '1000'); // Get all for inventory view
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/products?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  
  return response.data;
};

const updateProductStock = async (
  authToken: string,
  product_id: string,
  stock_quantity: number
): Promise<Product> => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${product_id}`,
    {
      stock_quantity,
      last_updated_timestamp: new Date().toISOString(),
    },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  
  return response.data;
};

const fetchCategories = async (): Promise<Category[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/categories?is_active=true`
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_InventoryManagement_Supplier: React.FC = () => {
  // ============================================================================
  // GLOBAL STATE ACCESS (Individual selectors - CRITICAL)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);
  
  // ============================================================================
  // URL PARAMETERS & LOCAL STATE
  // ============================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Initialize filter state from URL params
  const [filterState, setFilterState] = useState<FilterState>({
    low_stock_only: searchParams.get('low_stock_only') === 'true',
    out_of_stock_only: searchParams.get('out_of_stock_only') === 'true',
    search_query: searchParams.get('search_query') || '',
    category_filter: searchParams.get('category_filter') || null,
  });
  
  // const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    enabled: false,
    last_sync_timestamp: null,
    sync_in_progress: false,
    sync_errors: [],
  });
  
  const [bulkUpdateState, setBulkUpdateState] = useState<BulkUpdateState>({
    selected_product_ids: [],
    bulk_action: null,
    bulk_value: null,
    processing: false,
  });
  
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  // const [showMovementLog, setShowMovementLog] = useState(false);
  
  // ============================================================================
  // SYNC URL WITH FILTER STATE
  // ============================================================================
  
  useEffect(() => {
    const newParams = new URLSearchParams();
    
    if (filterState.low_stock_only) {
      newParams.set('low_stock_only', 'true');
    }
    
    if (filterState.out_of_stock_only) {
      newParams.set('out_of_stock_only', 'true');
    }
    
    if (filterState.search_query) {
      newParams.set('search_query', filterState.search_query);
    }
    
    if (filterState.category_filter) {
      newParams.set('category_filter', filterState.category_filter);
    }
    
    setSearchParams(newParams, { replace: true });
  }, [filterState, setSearchParams]);
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  // Fetch inventory data
  const {
    data: inventoryData,
    isLoading: isLoadingInventory,
    error: inventoryError,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ['supplier-inventory', filterState],
    queryFn: () => fetchInventoryData(authToken!, filterState),
    enabled: !!authToken && !!supplierProfile,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
  
  // Fetch categories for filter dropdown
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 300000, // 5 minutes
  });
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const inventoryItems = useMemo(() => {
    if (!inventoryData?.products) return [];
    
    let items = inventoryData.products;
    
    // Apply client-side filters for immediate feedback
    if (filterState.low_stock_only) {
      items = items.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0);
    }
    
    if (filterState.out_of_stock_only) {
      items = items.filter(p => p.stock_quantity === 0);
    }
    
    return items;
  }, [inventoryData, filterState]);
  
  const inventorySummary = useMemo<InventorySummary>(() => {
    if (!inventoryData?.products) {
      return {
        total_products: 0,
        total_stock_value: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
      };
    }
    
    const products = inventoryData.products;
    
    return {
      total_products: products.length,
      total_stock_value: products.reduce(
        (sum, p) => sum + ((p.stock_quantity || 0) * (p.cost_price || p.price_per_unit || 0)),
        0
      ),
      low_stock_count: products.filter(
        p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0
      ).length,
      out_of_stock_count: products.filter(p => p.stock_quantity === 0).length,
    };
  }, [inventoryData]);
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const updateStockMutation = useMutation({
    mutationFn: ({ product_id, stock_quantity }: { product_id: string; stock_quantity: number }) =>
      updateProductStock(authToken!, product_id, stock_quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-inventory'] });
      setEditingProductId(null);
    },
  });
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };
  
  const handleSearchChange = (value: string) => {
    handleFilterChange({ search_query: value });
  };
  
  const handleCategoryChange = (category_id: string | null) => {
    handleFilterChange({ category_filter: category_id });
  };
  
  const clearFilters = () => {
    setFilterState({
      low_stock_only: false,
      out_of_stock_only: false,
      search_query: '',
      category_filter: null,
    });
  };
  
  const startEditStock = (product: Product) => {
    setEditingProductId(product.product_id);
    setEditStockValue(product.stock_quantity);
  };
  
  const cancelEditStock = () => {
    setEditingProductId(null);
    setEditStockValue(0);
  };
  
  const saveStockUpdate = async (product_id: string) => {
    if (editStockValue < 0) {
      alert('Stock quantity cannot be negative');
      return;
    }
    
    try {
      await updateStockMutation.mutateAsync({
        product_id,
        stock_quantity: editStockValue,
      });
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock. Please try again.');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent, product_id: string) => {
    if (e.key === 'Enter') {
      saveStockUpdate(product_id);
    } else if (e.key === 'Escape') {
      cancelEditStock();
    }
  };
  
  const toggleProductSelection = (product_id: string) => {
    setBulkUpdateState(prev => ({
      ...prev,
      selected_product_ids: prev.selected_product_ids.includes(product_id)
        ? prev.selected_product_ids.filter(id => id !== product_id)
        : [...prev.selected_product_ids, product_id],
    }));
  };
  
  const selectAllProducts = () => {
    if (bulkUpdateState.selected_product_ids.length === inventoryItems.length) {
      // Deselect all
      setBulkUpdateState(prev => ({ ...prev, selected_product_ids: [] }));
    } else {
      // Select all
      setBulkUpdateState(prev => ({
        ...prev,
        selected_product_ids: inventoryItems.map(p => p.product_id),
      }));
    }
  };
  
  const getStockStatusBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Out of Stock
        </span>
      );
    }
    
    if (product.stock_quantity <= product.low_stock_threshold) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Low Stock
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        In Stock
      </span>
    );
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (!authToken || !supplierProfile) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600">Please log in to access inventory management.</p>
            <Link to="/login" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              Go to Login
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Track and manage your product stock levels
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {bulkUpdateState.selected_product_ids.length > 0 && (
                  <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <span className="text-sm font-medium text-blue-800">
                      {bulkUpdateState.selected_product_ids.length} selected
                    </span>
                    <button
                      onClick={() => setBulkUpdateState(prev => ({ ...prev, selected_product_ids: [] }))}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => refetchInventory()}
                  disabled={isLoadingInventory}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingInventory ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {inventorySummary.total_products}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            {/* Total Stock Value */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Stock Value</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatCurrency(inventorySummary.total_stock_value)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            {/* Low Stock Count */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-600">
                    {inventorySummary.low_stock_count}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              {inventorySummary.low_stock_count > 0 && (
                <button
                  onClick={() => handleFilterChange({ low_stock_only: true, out_of_stock_only: false })}
                  className="mt-3 text-xs text-yellow-700 hover:text-yellow-800 font-medium"
                >
                  View low stock items →
                </button>
              )}
            </div>
            
            {/* Out of Stock Count */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">
                    {inventorySummary.out_of_stock_count}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
              {inventorySummary.out_of_stock_count > 0 && (
                <button
                  onClick={() => handleFilterChange({ out_of_stock_only: true, low_stock_only: false })}
                  className="mt-3 text-xs text-red-700 hover:text-red-800 font-medium"
                >
                  View out of stock →
                </button>
              )}
            </div>
          </div>
          
          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or SKU..."
                    value={filterState.search_query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                {/* Category Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <select
                    value={filterState.category_filter || ''}
                    onChange={(e) => handleCategoryChange(e.target.value || null)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none bg-white"
                  >
                    <option value="">All Categories</option>
                    {categories?.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
                
                {/* Stock Status Toggles */}
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterState.low_stock_only}
                      onChange={(e) => handleFilterChange({ 
                        low_stock_only: e.target.checked,
                        out_of_stock_only: false 
                      })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Low Stock</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterState.out_of_stock_only}
                      onChange={(e) => handleFilterChange({ 
                        out_of_stock_only: e.target.checked,
                        low_stock_only: false 
                      })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Out of Stock</span>
                  </label>
                </div>
              </div>
              
              {(filterState.search_query || filterState.category_filter || 
                filterState.low_stock_only || filterState.out_of_stock_only) && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          {/* Error State */}
          {inventoryError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Failed to load inventory</h3>
                  <p className="mt-1 text-sm text-red-700">
                    {inventoryError instanceof Error ? inventoryError.message : 'An error occurred'}
                  </p>
                  <button
                    onClick={() => refetchInventory()}
                    className="mt-2 text-sm font-medium text-red-800 hover:text-red-900"
                  >
                    Try again →
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {isLoadingInventory && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading inventory...</p>
              </div>
            </div>
          )}
          
          {/* Inventory Table */}
          {!isLoadingInventory && inventoryItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={bulkUpdateState.selected_product_ids.length === inventoryItems.length && inventoryItems.length > 0}
                          onChange={selectAllProducts}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Threshold
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Value
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryItems.map((product) => (
                      <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={bulkUpdateState.selected_product_ids.includes(product.product_id)}
                            onChange={() => toggleProductSelection(product.product_id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.primary_image_url ? (
                              <img
                                src={product.primary_image_url}
                                alt={product.product_name}
                                className="w-10 h-10 rounded-lg object-cover mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div className="max-w-xs">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {product.product_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(product.price_per_unit)}/{product.unit_of_measure}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900 font-mono">{product.sku}</p>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingProductId === product.product_id ? (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                value={editStockValue}
                                onChange={(e) => setEditStockValue(Number(e.target.value))}
                                onKeyPress={(e) => handleKeyPress(e, product.product_id)}
                                onBlur={() => saveStockUpdate(product.product_id)}
                                autoFocus
                                className="w-24 px-2 py-1 border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                              <button
                                onClick={() => saveStockUpdate(product.product_id)}
                                disabled={updateStockMutation.isPending}
                                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEditStock}
                                className="p-1 text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditStock(product)}
                              className="group flex items-center space-x-2 hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                            >
                              <span className={`text-sm font-semibold ${
                                product.stock_quantity === 0 
                                  ? 'text-red-600' 
                                  : product.stock_quantity <= product.low_stock_threshold
                                  ? 'text-yellow-600'
                                  : 'text-gray-900'
                              }`}>
                                {product.stock_quantity}
                              </span>
                              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-600">{product.low_stock_threshold}</p>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStockStatusBadge(product)}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                            {formatDate(product.last_updated_timestamp)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency((product.stock_quantity || 0) * (product.cost_price || product.price_per_unit || 0))}
                          </p>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/supplier/products/${product.product_id}/edit`}
                            className="text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoadingInventory && inventoryItems.length === 0 && !inventoryError && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-gray-100 rounded-full mb-4">
                  <Boxes className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filterState.search_query || filterState.category_filter || filterState.low_stock_only || filterState.out_of_stock_only
                    ? 'No products match your filters'
                    : 'No products in inventory yet'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  {filterState.search_query || filterState.category_filter || filterState.low_stock_only || filterState.out_of_stock_only
                    ? 'Try adjusting your filters to see more results.'
                    : 'Start by adding products to your catalog.'}
                </p>
                {(filterState.search_query || filterState.category_filter || filterState.low_stock_only || filterState.out_of_stock_only) ? (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Clear all filters
                  </button>
                ) : (
                  <Link
                    to="/supplier/products/add"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Add Your First Product
                  </Link>
                )}
              </div>
            </div>
          )}
          
          {/* Quick Stats Footer */}
          {!isLoadingInventory && inventoryItems.length > 0 && (
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-6">
                <span>Showing {inventoryItems.length} of {inventorySummary.total_products} products</span>
                {bulkUpdateState.selected_product_ids.length > 0 && (
                  <span className="text-blue-600 font-medium">
                    {bulkUpdateState.selected_product_ids.length} selected
                  </span>
                )}
              </div>
              
              <Link
                to="/supplier/products"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Manage All Products →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_InventoryManagement_Supplier;