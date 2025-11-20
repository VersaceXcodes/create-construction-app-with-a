import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Package, Calendar, DollarSign, MapPin, Truck, Search, Filter, X, ChevronLeft, ChevronRight, RotateCcw, Eye, RefreshCw, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrderSummary {
  order_id: string;
  order_number: string;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  delivery_status?: string;
  items_count?: number;
  supplier_count?: number;
  primary_product_thumbnail?: string;
  delivery_address_id?: string;
}

interface OrdersResponse {
  orders: OrderSummary[];
  total: number;
}

interface SupplierOption {
  supplier_id: string;
  business_name: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'processing', label: 'Processing', color: 'orange' },
  { value: 'shipped', label: 'Shipped', color: 'blue' },
  { value: 'in_transit', label: 'In Transit', color: 'blue' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'all_time', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_year', label: 'Last Year' },
];

const SORT_OPTIONS = [
  { value: 'order_date_desc', label: 'Newest First', sort_by: 'order_date', sort_order: 'desc' },
  { value: 'order_date_asc', label: 'Oldest First', sort_by: 'order_date', sort_order: 'asc' },
  { value: 'total_amount_desc', label: 'Highest Value', sort_by: 'total_amount', sort_order: 'desc' },
  { value: 'total_amount_asc', label: 'Lowest Value', sort_by: 'total_amount', sort_order: 'asc' },
];

const ORDERS_PER_PAGE = 20;

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchOrders = async (
  auth_token: string,
  status_filter: string | null,
  date_range: string | null,
  supplier_id: string | null,
  sort_by: string,
  sort_order: string,
  page: number,
  search_query: string
): Promise<OrdersResponse> => {
  const limit = ORDERS_PER_PAGE;
  const offset = (page - 1) * limit;

  const params: Record<string, any> = {
    limit,
    offset,
    sort_by,
    sort_order,
  };

  if (status_filter) params.status_filter = status_filter;
  if (date_range && date_range !== 'all_time') params.date_range = date_range;
  if (supplier_id) params.supplier_id = supplier_id;

  const response = await axios.get<OrdersResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
      },
      params,
    }
  );

  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrderDashboard: React.FC = () => {
  // ============================================================================
  // GLOBAL STATE (Individual selectors - CRITICAL)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const customerId = useAppStore(state => state.authentication_state.customer_profile?.customer_id);

  // ============================================================================
  // URL PARAMETERS
  // ============================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate();

  // Parse URL parameters
  const urlStatusFilter = searchParams.get('status_filter');
  const urlDateRange = searchParams.get('date_range') || 'all_time';
  const urlSupplierId = searchParams.get('supplier_id');
  const urlSortBy = searchParams.get('sort_by') || 'order_date_desc';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Parse sort configuration
  const sortConfig = useMemo(() => {
    const option = SORT_OPTIONS.find(opt => opt.value === urlSortBy) || SORT_OPTIONS[0];
    return {
      sort_by: option.sort_by,
      sort_order: option.sort_order,
    };
  }, [urlSortBy]);

  // ============================================================================
  // DEBOUNCED SEARCH
  // ============================================================================
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ============================================================================
  // DATA FETCHING (React Query)
  // ============================================================================
  
  const {
    data: ordersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'orders',
      customerId,
      urlStatusFilter,
      urlDateRange,
      urlSupplierId,
      sortConfig.sort_by,
      sortConfig.sort_order,
      urlPage,
      debouncedSearchQuery,
    ],
    queryFn: () =>
      fetchOrders(
        authToken!,
        urlStatusFilter,
        urlDateRange,
        urlSupplierId,
        sortConfig.sort_by,
        sortConfig.sort_order,
        urlPage,
        debouncedSearchQuery
      ),
    enabled: !!authToken && !!customerId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const orders = ordersData?.orders || [];
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);

  // ============================================================================
  // FILTER/SORT HANDLERS
  // ============================================================================
  
  const handleStatusFilterChange = (status: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (status) {
      newParams.set('status_filter', status);
    } else {
      newParams.delete('status_filter');
    }
    newParams.set('page', '1'); // Reset to page 1
    setSearchParams(newParams);
  };

  const handleDateRangeChange = (range: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('date_range', range);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleSortChange = (sortValue: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort_by', sortValue);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearFilters = () => {
    setSearchParams({});
    setSearchQuery('');
  };

  const hasActiveFilters = urlStatusFilter || urlDateRange !== 'all_time' || urlSupplierId || searchQuery;

  // ============================================================================
  // STATUS BADGE UTILITY
  // ============================================================================
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'shipped':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
      case 'refunded':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
      case 'in_transit':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <MapPin className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                <p className="mt-2 text-base text-gray-600">
                  Track and manage all your construction material orders
                </p>
              </div>
              
              {/* Search Bar */}
              <div className="relative w-full md:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders by number or product..."
                  className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filter Sidebar - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-24">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Filter className="w-5 h-5 mr-2" />
                      Filters
                    </h2>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Order Status Filter */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Status</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleStatusFilterChange(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          !urlStatusFilter
                            ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        All Orders
                      </button>
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusFilterChange(option.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            urlStatusFilter === option.value
                              ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                              : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Date Range</h3>
                    <div className="space-y-2">
                      {DATE_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleDateRangeChange(option.value)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            urlDateRange === option.value
                              ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                              : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              {/* Active Filters Pills - Mobile */}
              {hasActiveFilters && (
                <div className="mb-6 lg:hidden">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                    {urlStatusFilter && (
                      <button
                        onClick={() => handleStatusFilterChange(null)}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                      >
                        Status: {STATUS_OPTIONS.find(s => s.value === urlStatusFilter)?.label}
                        <X className="ml-2 w-3 h-3" />
                      </button>
                    )}
                    {urlDateRange !== 'all_time' && (
                      <button
                        onClick={() => handleDateRangeChange('all_time')}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                      >
                        {DATE_RANGE_OPTIONS.find(d => d.value === urlDateRange)?.label}
                        <X className="ml-2 w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={handleClearFilters}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}

              {/* Results Header */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{totalOrders}</span>
                  <span className="ml-1">
                    {totalOrders === 1 ? 'order' : 'orders'} found
                  </span>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                    Sort by:
                  </label>
                  <select
                    id="sort"
                    value={urlSortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="block w-48 pl-3 pr-10 py-2 text-sm border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-lg transition-all duration-200"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {isError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Orders</h3>
                  <p className="text-red-700 mb-4">
                    {axios.isAxiosError(error) ? error.message : 'An unexpected error occurred'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !isError && orders.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {hasActiveFilters ? 'No Orders Found' : 'No Orders Yet'}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {hasActiveFilters
                      ? 'No orders match your current filters. Try adjusting your search or filters.'
                      : "You haven't placed any orders yet. Start browsing construction materials to get started."}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      onClick={handleClearFilters}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </button>
                  ) : (
                    <Link
                      to="/products"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Browse Products
                    </Link>
                  )}
                </div>
              )}

              {/* Orders List */}
              {!isLoading && !isError && orders.length > 0 && (
                <>
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.order_id}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-200 group"
                      >
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            {/* Left: Order Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start space-x-4">
                                {/* Product Thumbnail */}
                                {order.primary_product_thumbnail && (
                                  <div className="flex-shrink-0">
                                    <img
                                      src={order.primary_product_thumbnail}
                                      alt="Order product"
                                      className="w-20 h-20 object-cover rounded-lg border-2 border-gray-100"
                                    />
                                  </div>
                                )}

                                {/* Order Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {order.order_number}
                                    </h3>
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                        order.status
                                      )}`}
                                    >
                                      {getStatusIcon(order.status)}
                                      <span className="ml-1.5 capitalize">
                                        {order.status.replace('_', ' ')}
                                      </span>
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-sm text-gray-600">
                                    <div className="flex items-center">
                                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                      <span>
                                        Placed on{' '}
                                        {new Date(order.order_date).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                        })}
                                      </span>
                                    </div>

                                    <div className="flex items-center">
                                      <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                                      <span className="font-semibold text-gray-900">
                                        ${order.total_amount.toFixed(2)}
                                      </span>
                                    </div>

                                    {order.items_count && (
                                      <div className="flex items-center">
                                        <Package className="w-4 h-4 mr-2 text-gray-400" />
                                        <span>
                                          {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex lg:flex-col items-center lg:items-end space-x-2 lg:space-x-0 lg:space-y-2">
                              <Link
                                to={`/orders/${order.order_id}`}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all duration-200 hover:shadow-lg"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>

                              {order.status === 'delivered' && (
                                <Link
                                  to={`/orders/${order.order_id}/reorder`}
                                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-200 border border-gray-300"
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Reorder
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center">
                      <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                        {/* Previous Button */}
                        <button
                          onClick={() => handlePageChange(urlPage - 1)}
                          disabled={urlPage === 1}
                          className="relative inline-flex items-center px-4 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if (urlPage <= 4) {
                            pageNum = i + 1;
                          } else if (urlPage >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = urlPage - 3 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                                urlPage === pageNum
                                  ? 'z-10 bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        {/* Next Button */}
                        <button
                          onClick={() => handlePageChange(urlPage + 1)}
                          disabled={urlPage === totalPages}
                          className="relative inline-flex items-center px-4 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </nav>
                    </div>
                  )}

                  {/* Pagination Info */}
                  {totalPages > 1 && (
                    <div className="mt-4 text-center text-sm text-gray-600">
                      Showing page {urlPage} of {totalPages} ({totalOrders} total orders)
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_OrderDashboard;