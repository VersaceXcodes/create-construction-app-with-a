import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { AlertCircle, CheckCircle, Clock, DollarSign, Eye, Filter, Search, TrendingUp, X } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Order {
  order_id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled' | 'refunded';
  subtotal_amount: number;
  delivery_fee_total: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  delivery_address_id: string;
  payment_method: 'credit_card' | 'debit_card' | 'trade_credit';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_transaction_id: string | null;
  promo_code_used: string | null;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  order_item_id: string;
  order_id: string;
  product_id: string;
  supplier_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  price_per_unit: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

interface Delivery {
  delivery_id: string;
  order_id: string;
  supplier_id: string;
  delivery_window_start: string;
  delivery_window_end: string;
  delivery_method: string;
  delivery_fee: number;
  delivery_status: string;
  tracking_number: string | null;
  carrier: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  estimated_arrival_time: string | null;
  actual_delivery_time: string | null;
  delivery_proof_photo_url: string | null;
  delivery_signature: string | null;
  delivery_notes: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string;
  updated_at: string;
}

interface OrderTimeline {
  milestone: string;
  status: string;
  timestamp: string;
  description: string;
}

interface FilterConfig {
  status: string | null;
  min_total: number | null;
  max_total: number | null;
  has_issues: boolean | null;
}

interface OrderAnalytics {
  total_orders: number;
  completion_rate: number;
  avg_fulfillment_time: number;
  issue_rate: number;
}

interface PaginationState {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchOrdersForOversight = async (
  authToken: string,
  filters: FilterConfig,
  pagination: { limit: number; offset: number }
): Promise<{ orders: Order[]; total: number }> => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status_filter', filters.status);
  if (filters.has_issues !== null) params.append('issue_flag', String(filters.has_issues));
  params.append('limit', String(pagination.limit));
  params.append('offset', String(pagination.offset));
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/orders?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    orders: response.data.orders || [],
    total: response.data.total || 0
  };
};

const fetchOrderDetails = async (
  authToken: string,
  order_id: string
): Promise<{ order: Order; items: OrderItem[]; delivery: Delivery | null; timeline: OrderTimeline[] }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    order: response.data.order,
    items: response.data.items || [],
    delivery: response.data.delivery || null,
    timeline: response.data.timeline || []
  };
};

const interveneOrder = async (
  authToken: string,
  order_id: string,
  new_status: string,
  admin_notes: string
): Promise<Order> => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
    {
      status: new_status,
      admin_notes: admin_notes
    },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

const fetchOrderAnalytics = async (
  authToken: string
): Promise<OrderAnalytics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/dashboard?metric_type=orders`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // Calculate from response data
  const totalOrders = response.data.total_orders || 0;
  const activeOrders = response.data.active_orders || 0;
  const pendingDisputes = response.data.pending_disputes || 0;
  
  return {
    total_orders: totalOrders,
    completion_rate: totalOrders > 0 ? ((totalOrders - activeOrders) / totalOrders) * 100 : 0,
    avg_fulfillment_time: 48, // Mock value - would come from backend
    issue_rate: totalOrders > 0 ? (pendingDisputes / totalOrders) * 100 : 0
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminOrderOversight: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors, no object destructuring
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [interventionStatus, setInterventionStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Parse URL params to filter config
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: searchParams.get('status_filter') || null,
    min_total: null,
    max_total: null,
    has_issues: searchParams.get('issue_flag') === 'true' ? true : null
  });
  
  // Parse value_range from URL
  useEffect(() => {
    const valueRange = searchParams.get('value_range');
    if (valueRange === 'high_value') {
      setFilterConfig(prev => ({ ...prev, min_total: 1000, max_total: null }));
    } else if (valueRange === 'medium_value') {
      setFilterConfig(prev => ({ ...prev, min_total: 100, max_total: 1000 }));
    } else if (valueRange === 'low_value') {
      setFilterConfig(prev => ({ ...prev, min_total: null, max_total: 100 }));
    }
  }, [searchParams]);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 50
  });
  
  // Fetch orders list
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['admin-orders', filterConfig, pagination.current_page, pagination.limit],
    queryFn: () => fetchOrdersForOversight(
      authToken!,
      filterConfig,
      {
        limit: pagination.limit,
        offset: (pagination.current_page - 1) * pagination.limit
      }
    ),
    enabled: !!authToken && currentUser?.user_type === 'admin',
    staleTime: 60000,
    refetchOnWindowFocus: false,
    select: (data) => ({
      orders: data.orders,
      total: data.total
    })
  });
  
  // Update pagination when data changes
  useEffect(() => {
    if (ordersData?.total !== undefined) {
      setPagination(prev => ({
        ...prev,
        total_count: ordersData.total,
        total_pages: Math.ceil(ordersData.total / prev.limit)
      }));
    }
  }, [ordersData?.total]);
  
  // Fetch order details
  const { data: orderDetailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ['order-details', selectedOrderId],
    queryFn: () => fetchOrderDetails(authToken!, selectedOrderId!),
    enabled: !!authToken && !!selectedOrderId,
    staleTime: 30000
  });
  
  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ['admin-order-analytics'],
    queryFn: () => fetchOrderAnalytics(authToken!),
    enabled: !!authToken && currentUser?.user_type === 'admin',
    staleTime: 120000,
    select: (data) => ({
      total_orders: data.total_orders,
      completion_rate: Number(data.completion_rate.toFixed(1)),
      avg_fulfillment_time: Number(data.avg_fulfillment_time.toFixed(1)),
      issue_rate: Number(data.issue_rate.toFixed(1))
    })
  });
  
  // Intervention mutation
  const interventionMutation = useMutation({
    mutationFn: ({ order_id, new_status, admin_notes }: { order_id: string; new_status: string; admin_notes: string }) => 
      interveneOrder(authToken!, order_id, new_status, admin_notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-details', selectedOrderId] });
      setIsInterventionModalOpen(false);
      setAdminNotes('');
      setInterventionStatus('');
    }
  });
  
  // Handle filter changes
  const handleFilterChange = (key: keyof FilterConfig, value: any) => {
    const newFilters = { ...filterConfig, [key]: value };
    setFilterConfig(newFilters);
    setPagination(prev => ({ ...prev, current_page: 1 }));
    
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (key === 'status' && value) {
      newParams.set('status_filter', value);
    } else if (key === 'status' && !value) {
      newParams.delete('status_filter');
    }
    if (key === 'has_issues' && value !== null) {
      newParams.set('issue_flag', String(value));
    } else if (key === 'has_issues' && value === null) {
      newParams.delete('issue_flag');
    }
    setSearchParams(newParams);
  };
  
  // Handle order selection
  const handleOrderClick = (order_id: string) => {
    setSelectedOrderId(order_id);
    setIsDetailModalOpen(true);
  };
  
  // Handle intervention
  const handleInterventionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !interventionStatus) return;
    
    interventionMutation.mutate({
      order_id: selectedOrderId,
      new_status: interventionStatus,
      admin_notes: adminNotes
    });
  };
  
  // Close modals
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedOrderId(null);
  };
  
  const closeInterventionModal = () => {
    setIsInterventionModalOpen(false);
    setInterventionStatus('');
    setAdminNotes('');
  };
  
  // Status badge styles
  const getStatusBadgeStyle = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border border-blue-200',
      shipped: 'bg-purple-100 text-purple-800 border border-purple-200',
      in_transit: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      delivered: 'bg-green-100 text-green-800 border border-green-200',
      cancelled: 'bg-red-100 text-red-800 border border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border border-gray-200'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order Oversight</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Monitor and manage all platform orders with administrative controls
                </p>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-orders'] })}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Analytics Summary Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Orders */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {analyticsData?.total_orders.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            {/* Completion Rate */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {analyticsData?.completion_rate || 0}%
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            
            {/* Avg Fulfillment Time */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Fulfillment</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {analyticsData?.avg_fulfillment_time || 0}h
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            {/* Issue Rate */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Issue Rate</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {analyticsData?.issue_rate || 0}%
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters & Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by order number or customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                </div>
                <select
                  value={filterConfig.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                >
                  <option value="">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              
              {/* Issue Flag Toggle */}
              <div className="flex items-center space-x-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterConfig.has_issues === true}
                    onChange={(e) => handleFilterChange('has_issues', e.target.checked ? true : null)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Issues Only
                  </span>
                </label>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(filterConfig.status || filterConfig.has_issues) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {filterConfig.status && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Status: {filterConfig.status}
                    <button
                      onClick={() => handleFilterChange('status', null)}
                      className="ml-2 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filterConfig.has_issues && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Has Issues
                    <button
                      onClick={() => handleFilterChange('has_issues', null)}
                      className="ml-2 hover:text-red-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Orders Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Orders List
                {ordersData?.total !== undefined && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({ordersData.total.toLocaleString()} total)
                  </span>
                )}
              </h2>
            </div>
            
            {/* Loading State */}
            {ordersLoading && (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            )}
            
            {/* Error State */}
            {ordersError && (
              <div className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">Failed to load orders</p>
                <p className="text-sm text-gray-600 mt-2">Please try again later</p>
              </div>
            )}
            
            {/* Empty State */}
            {!ordersLoading && !ordersError && (!ordersData?.orders || ordersData.orders.length === 0) && (
              <div className="p-12 text-center">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No orders found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
              </div>
            )}
            
            {/* Table */}
            {!ordersLoading && !ordersError && ordersData?.orders && ordersData.orders.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ordersData.orders.map((order) => (
                      <tr
                        key={order.order_id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleOrderClick(order.order_id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{order.order_number}</span>
                            <span className="text-xs text-gray-500">{order.order_id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {new Date(order.order_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyle(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadge(order.payment_status)}`}>
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            ${order.total_amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order.order_id);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {!ordersLoading && ordersData && ordersData.orders.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.current_page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.current_page * pagination.limit, pagination.total_count)} of{' '}
                    {pagination.total_count} orders
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))}
                      disabled={pagination.current_page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    <span className="text-sm text-gray-700">
                      Page {pagination.current_page} of {pagination.total_pages}
                    </span>
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, current_page: Math.min(prev.total_pages, prev.current_page + 1) }))}
                      disabled={pagination.current_page === pagination.total_pages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Detail Modal */}
        {isDetailModalOpen && selectedOrderId && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={closeDetailModal}
              />
              
              {/* Modal */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Modal Content */}
                <div className="p-6">
                  {detailsLoading && (
                    <div className="py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                      <p className="mt-4 text-gray-600">Loading order details...</p>
                    </div>
                  )}
                  
                  {!detailsLoading && orderDetailsData && (
                    <>
                      {/* Order Summary */}
                      <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Order Number</p>
                            <p className="text-lg font-semibold text-gray-900">{orderDetailsData.order.order_number}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Order Date</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Date(orderDetailsData.order.order_date).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeStyle(orderDetailsData.order.status)}`}>
                              {orderDetailsData.order.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Payment Status</p>
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusBadge(orderDetailsData.order.payment_status)}`}>
                              {orderDetailsData.order.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Order Items */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                        <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                          {orderDetailsData.items.map((item) => (
                            <div key={item.order_item_id} className="p-4 flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                                <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">${item.line_total.toFixed(2)}</p>
                                <p className="text-sm text-gray-600">${item.price_per_unit.toFixed(2)} each</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Order Totals */}
                      <div className="bg-blue-50 rounded-lg p-6 mb-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Subtotal</span>
                            <span className="font-medium text-gray-900">${orderDetailsData.order.subtotal_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Delivery Fee</span>
                            <span className="font-medium text-gray-900">${orderDetailsData.order.delivery_fee_total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">Tax</span>
                            <span className="font-medium text-gray-900">${orderDetailsData.order.tax_amount.toFixed(2)}</span>
                          </div>
                          {orderDetailsData.order.discount_amount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Discount</span>
                              <span className="font-medium text-green-600">-${orderDetailsData.order.discount_amount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                            <span className="text-lg font-bold text-gray-900">Total</span>
                            <span className="text-lg font-bold text-gray-900">${orderDetailsData.order.total_amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delivery Information */}
                      {orderDetailsData.delivery && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Delivery Method</p>
                                <p className="font-medium text-gray-900">{orderDetailsData.delivery.delivery_method}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Delivery Status</p>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeStyle(orderDetailsData.delivery.delivery_status)}`}>
                                  {orderDetailsData.delivery.delivery_status}
                                </span>
                              </div>
                              {orderDetailsData.delivery.tracking_number && (
                                <div>
                                  <p className="text-sm text-gray-600">Tracking Number</p>
                                  <p className="font-medium text-gray-900">{orderDetailsData.delivery.tracking_number}</p>
                                </div>
                              )}
                              {orderDetailsData.delivery.carrier && (
                                <div>
                                  <p className="text-sm text-gray-600">Carrier</p>
                                  <p className="font-medium text-gray-900">{orderDetailsData.delivery.carrier}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Admin Actions */}
                      <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsInterventionModalOpen(true);
                          }}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                        >
                          Intervene Order
                        </button>
                        
                        <Link
                          to={`/orders/${orderDetailsData.order.order_id}`}
                          className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-300"
                        >
                          View Full Order
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Intervention Modal */}
        {isInterventionModalOpen && selectedOrderId && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={closeInterventionModal}
              />
              
              {/* Modal */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Modal Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                  <h3 className="text-xl font-bold text-gray-900">Order Intervention</h3>
                  <button
                    onClick={closeInterventionModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Modal Content */}
                <form onSubmit={handleInterventionSubmit} className="p-6">
                  <div className="space-y-4">
                    {/* New Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Order Status *
                      </label>
                      <select
                        value={interventionStatus}
                        onChange={(e) => setInterventionStatus(e.target.value)}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      >
                        <option value="">Select status...</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                    
                    {/* Admin Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes *
                      </label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        required
                        rows={4}
                        placeholder="Provide reason for intervention..."
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                      />
                    </div>
                    
                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-yellow-800">
                            This action will update the order status and notify relevant parties.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modal Actions */}
                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={closeInterventionModal}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={interventionMutation.isPending}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {interventionMutation.isPending ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        'Submit Intervention'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminOrderOversight;