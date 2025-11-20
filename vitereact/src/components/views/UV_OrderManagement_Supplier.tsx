import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Search, 
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Truck,
  MessageSquare,
  Download,
  MoreHorizontal
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Order {
  order_id: string;
  order_number: string;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled' | 'refunded';
  total_amount: number;
  customer_id: string;
  customer_name?: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  items_count: number;
}

interface OrderSummary {
  pending_acceptance: number;
  in_progress: number;
  completed_today: number;
  total_revenue_today: number;
}

interface OrderFilters {
  status_filter: string | null;
  date_range: string | null;
  customer_search: string | null;
}

interface PaginationState {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

interface BulkActionState {
  selected_order_ids: string[];
  bulk_operation: string | null;
  processing: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchSupplierOrders = async (
  filters: OrderFilters,
  pagination: PaginationState,
  authToken: string | null
): Promise<{ orders: Order[]; total: number; page: number; limit: number }> => {
  if (!authToken) {
    throw new Error('Authentication required');
  }

  const params = new URLSearchParams();
  
  if (filters.status_filter) params.append('status_filter', filters.status_filter);
  if (filters.date_range) params.append('date_range', filters.date_range);
  if (filters.customer_search) params.append('query', filters.customer_search);
  
  params.append('limit', pagination.limit.toString());
  params.append('offset', ((pagination.current_page - 1) * pagination.limit).toString());
  params.append('sort_by', 'order_date');
  params.append('sort_order', 'desc');

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  return response.data;
};

const fetchOrderSummary = async (authToken: string | null): Promise<OrderSummary> => {
  if (!authToken) {
    throw new Error('Authentication required');
  }

  // Fetch orders and calculate summary
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  const orders = response.data.orders || [];
  const today = new Date().toISOString().split('T')[0];

  const summary: OrderSummary = {
    pending_acceptance: orders.filter((o: Order) => o.status === 'pending').length,
    in_progress: orders.filter((o: Order) => ['processing', 'shipped', 'in_transit'].includes(o.status)).length,
    completed_today: orders.filter((o: Order) => 
      o.status === 'delivered' && o.order_date.split('T')[0] === today
    ).length,
    total_revenue_today: orders
      .filter((o: Order) => o.order_date.split('T')[0] === today && o.payment_status === 'paid')
      .reduce((sum: number, o: Order) => sum + o.total_amount, 0)
  };

  return summary;
};

const acceptOrder = async (orderId: string, authToken: string | null): Promise<Order> => {
  if (!authToken) {
    throw new Error('Authentication required');
  }

  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
    { status: 'processing' },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

const rejectOrder = async (
  orderId: string, 
  rejectionReason: string, 
  authToken: string | null
): Promise<Order> => {
  if (!authToken) {
    throw new Error('Authentication required');
  }

  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
    { status: 'cancelled' },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};

const updateOrderStatus = async (
  orderId: string,
  newStatus: string,
  authToken: string | null
): Promise<Order> => {
  if (!authToken) {
    throw new Error('Authentication required');
  }

  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
    { status: newStatus },
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

const UV_OrderManagement_Supplier: React.FC = () => {
  // ============================================================================
  // ZUSTAND STORE ACCESS (Individual selectors to prevent infinite loops)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);

  // ============================================================================
  // URL PARAMS & NAVIGATION
  // ============================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [orderFilters, setOrderFilters] = useState<OrderFilters>({
    status_filter: searchParams.get('status_filter') || null,
    date_range: searchParams.get('date_range') || null,
    customer_search: searchParams.get('customer_search') || null,
  });

  const [paginationState, setPaginationState] = useState<PaginationState>({
    current_page: parseInt(searchParams.get('page') || '1', 10),
    total_pages: 1,
    total_count: 0,
    limit: 50,
  });

  const [bulkActionState, setBulkActionState] = useState<BulkActionState>({
    selected_order_ids: [],
    bulk_operation: null,
    processing: false,
  });

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // ============================================================================
  // REACT QUERY - DATA FETCHING
  // ============================================================================
  
  const queryClient = useQueryClient();

  // Fetch orders
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['supplier-orders', orderFilters, paginationState.current_page],
    queryFn: () => fetchSupplierOrders(orderFilters, paginationState, authToken),
    enabled: !!authToken,
    staleTime: 60000, // 1 minute
    select: (data) => ({
      orders: data.orders.map((order: any) => ({
        ...order,
        total_amount: Number(order.total_amount || 0),
        items_count: Number(order.items_count || 0)
      })),
      total: data.total,
      page: data.page || paginationState.current_page,
      limit: data.limit || paginationState.limit
    })
  });

  // Fetch order summary
  const {
    data: orderSummary,
    isLoading: summaryLoading,
  } = useQuery({
    queryKey: ['order-summary'],
    queryFn: () => fetchOrderSummary(authToken),
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    select: (data) => ({
      ...data,
      total_revenue_today: Number(data.total_revenue_today || 0)
    })
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: string) => acceptOrder(orderId, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-summary'] });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      rejectOrder(orderId, reason, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-summary'] });
      setShowRejectModal(false);
      setRejectOrderId(null);
      setRejectionReason('');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      updateOrderStatus(orderId, status, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-summary'] });
    },
  });

  // ============================================================================
  // EFFECTS - URL SYNC
  // ============================================================================

  useEffect(() => {
    // Update pagination when data arrives
    if (ordersData) {
      setPaginationState(prev => ({
        ...prev,
        total_pages: Math.ceil(ordersData.total / prev.limit),
        total_count: ordersData.total,
      }));
    }
  }, [ordersData]);

  useEffect(() => {
    // Sync URL params with filter state
    const params = new URLSearchParams();
    
    if (orderFilters.status_filter) params.set('status_filter', orderFilters.status_filter);
    if (orderFilters.date_range) params.set('date_range', orderFilters.date_range);
    if (orderFilters.customer_search) params.set('customer_search', orderFilters.customer_search);
    if (paginationState.current_page > 1) params.set('page', paginationState.current_page.toString());
    
    setSearchParams(params);
  }, [orderFilters, paginationState.current_page, setSearchParams]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFilterChange = (filterKey: keyof OrderFilters, value: string | null) => {
    setOrderFilters(prev => ({ ...prev, [filterKey]: value }));
    setPaginationState(prev => ({ ...prev, current_page: 1 })); // Reset to page 1
  };

  const handlePageChange = (page: number) => {
    setPaginationState(prev => ({ ...prev, current_page: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOrder = (orderId: string) => {
    setBulkActionState(prev => {
      const isSelected = prev.selected_order_ids.includes(orderId);
      return {
        ...prev,
        selected_order_ids: isSelected
          ? prev.selected_order_ids.filter(id => id !== orderId)
          : [...prev.selected_order_ids, orderId],
      };
    });
  };

  const handleSelectAll = () => {
    if (!ordersData?.orders) return;
    
    const allOrderIds = ordersData.orders.map(order => order.order_id);
    const allSelected = bulkActionState.selected_order_ids.length === allOrderIds.length;
    
    setBulkActionState(prev => ({
      ...prev,
      selected_order_ids: allSelected ? [] : allOrderIds,
    }));
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await acceptOrderMutation.mutateAsync(orderId);
    } catch (error) {
      console.error('Failed to accept order:', error);
    }
  };

  const handleRejectClick = (orderId: string) => {
    setRejectOrderId(orderId);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectOrderId || !rejectionReason) return;
    
    try {
      await rejectOrderMutation.mutateAsync({
        orderId: rejectOrderId,
        reason: rejectionReason,
      });
    } catch (error) {
      console.error('Failed to reject order:', error);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ orderId, status: newStatus });
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const orders = ordersData?.orders || [];
  const summary = orderSummary || {
    pending_acceptance: 0,
    in_progress: 0,
    completed_today: 0,
    total_revenue_today: 0,
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Page Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">Order Management</h1>
                <p className="text-gray-600 mt-1">Process and track your customer orders</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => refetchOrders()}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Refresh
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl">
                  <Download className="inline-block w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Pending Acceptance */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Acceptance</p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">
                    {summaryLoading ? '...' : summary.pending_acceptance}
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {summaryLoading ? '...' : summary.in_progress}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Completed Today */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Today</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {summaryLoading ? '...' : summary.completed_today}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Revenue Today */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-2">
                    {summaryLoading ? '...' : formatCurrency(summary.total_revenue_today)}
                  </p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <DollarSign className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Order Status
                </label>
                <select
                  id="status-filter"
                  value={orderFilters.status_filter || ''}
                  onChange={(e) => handleFilterChange('status_filter', e.target.value || null)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">All Orders</option>
                  <option value="pending">Pending Acceptance</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  id="date-range"
                  value={orderFilters.date_range || ''}
                  onChange={(e) => handleFilterChange('date_range', e.target.value || null)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_3_months">Last 3 Months</option>
                </select>
              </div>

              {/* Customer Search */}
              <div>
                <label htmlFor="customer-search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Customer
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="customer-search"
                    type="text"
                    value={orderFilters.customer_search || ''}
                    onChange={(e) => handleFilterChange('customer_search', e.target.value || null)}
                    placeholder="Search by name or order #..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(orderFilters.status_filter || orderFilters.date_range || orderFilters.customer_search) && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                {orderFilters.status_filter && (
                  <button
                    onClick={() => handleFilterChange('status_filter', null)}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    Status: {orderFilters.status_filter}
                    <XCircle className="w-3 h-3 ml-2" />
                  </button>
                )}
                {orderFilters.date_range && (
                  <button
                    onClick={() => handleFilterChange('date_range', null)}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    Date: {orderFilters.date_range.replace('_', ' ')}
                    <XCircle className="w-3 h-3 ml-2" />
                  </button>
                )}
                {orderFilters.customer_search && (
                  <button
                    onClick={() => handleFilterChange('customer_search', null)}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    Search: "{orderFilters.customer_search}"
                    <XCircle className="w-3 h-3 ml-2" />
                  </button>
                )}
                <button
                  onClick={() => setOrderFilters({ status_filter: null, date_range: null, customer_search: null })}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Bulk Actions Toolbar */}
          {bulkActionState.selected_order_ids.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-blue-900 font-semibold">
                    {bulkActionState.selected_order_ids.length} order{bulkActionState.selected_order_ids.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setBulkActionState({ selected_order_ids: [], bulk_operation: null, processing: false })}
                    className="text-blue-700 hover:text-blue-900 text-sm font-medium"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                    Accept Selected
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Mark as Shipped
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                    Print Labels
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Orders ({paginationState.total_count})
                </h2>
                <div className="flex items-center space-x-2">
                  {orders.length > 0 && (
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkActionState.selected_order_ids.length === orders.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 font-medium">Select All</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="divide-y divide-gray-200">
              {ordersLoading ? (
                // Loading Skeleton
                <div className="space-y-4 p-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              ) : ordersError ? (
                // Error State
                <div className="p-12 text-center">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Orders</h3>
                  <p className="text-gray-600 mb-4">
                    {ordersError instanceof Error ? ordersError.message : 'An error occurred'}
                  </p>
                  <button
                    onClick={() => refetchOrders()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Try Again
                  </button>
                </div>
              ) : orders.length === 0 ? (
                // Empty State
                <div className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Found</h3>
                  <p className="text-gray-600">
                    {orderFilters.status_filter || orderFilters.date_range || orderFilters.customer_search
                      ? 'Try adjusting your filters to see more results.'
                      : 'You don\'t have any orders yet.'}
                  </p>
                </div>
              ) : (
                // Orders List
                orders.map((order) => (
                  <div key={order.order_id} className="hover:bg-gray-50 transition-colors">
                    <div className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={bulkActionState.selected_order_ids.includes(order.order_id)}
                          onChange={() => handleSelectOrder(order.order_id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />

                        {/* Order Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleExpandOrder(order.order_id)}
                                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center space-x-2"
                              >
                                <span>{order.order_number}</span>
                                {expandedOrderId === order.order_id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(order.status)}`}>
                                {order.status.replace('_', ' ')}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(order.payment_status)}`}>
                                {order.payment_status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(order.total_amount)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Package className="w-4 h-4 mr-1" />
                              {order.items_count} item{order.items_count > 1 ? 's' : ''}
                            </span>
                            <span>•</span>
                            <span>{formatDate(order.order_date)}</span>
                            {order.customer_name && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-gray-700">{order.customer_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAcceptOrder(order.order_id)}
                                disabled={acceptOrderMutation.isPending}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {acceptOrderMutation.isPending ? 'Accepting...' : 'Accept'}
                              </button>
                              <button
                                onClick={() => handleRejectClick(order.order_id)}
                                disabled={rejectOrderMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {order.status === 'processing' && (
                            <button
                              onClick={() => handleStatusChange(order.order_id, 'shipped')}
                              disabled={updateStatusMutation.isPending}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Truck className="inline-block w-4 h-4 mr-2" />
                              Mark as Shipped
                            </button>
                          )}

                          <Link
                            to={`/supplier/orders/${order.order_id}`}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                          >
                            <Eye className="inline-block w-4 h-4 mr-2" />
                            View Details
                          </Link>

                          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Order Details */}
                      {expandedOrderId === order.order_id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4 rounded-b-lg">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 font-medium">Customer ID:</span>
                              <span className="ml-2 text-gray-900">{order.customer_id}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-medium">Payment Status:</span>
                              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getPaymentStatusBadge(order.payment_status)}`}>
                                {order.payment_status}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 font-medium">Items:</span>
                              <span className="ml-2 text-gray-900">{order.items_count} items</span>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Contact Customer
                            </button>
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                              <Download className="w-4 h-4 mr-1" />
                              Download Invoice
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!ordersLoading && !ordersError && orders.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((paginationState.current_page - 1) * paginationState.limit) + 1} to{' '}
                    {Math.min(paginationState.current_page * paginationState.limit, paginationState.total_count)} of{' '}
                    {paginationState.total_count} orders
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(paginationState.current_page - 1)}
                      disabled={paginationState.current_page === 1}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(5, paginationState.total_pages))].map((_, idx) => {
                        const pageNum = paginationState.current_page <= 3 
                          ? idx + 1 
                          : paginationState.current_page + idx - 2;
                        
                        if (pageNum > paginationState.total_pages) return null;
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                              pageNum === paginationState.current_page
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(paginationState.current_page + 1)}
                      disabled={paginationState.current_page === paginationState.total_pages}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Order Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowRejectModal(false)}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Reject Order</h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting this order. The customer will be notified.
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Out of stock, Cannot fulfill delivery window..."
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all resize-none"
              ></textarea>

              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={!rejectionReason || rejectOrderMutation.isPending}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rejectOrderMutation.isPending ? 'Rejecting...' : 'Reject Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_OrderManagement_Supplier;