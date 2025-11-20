import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertTriangle,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  BarChart3,
  BoxIcon,
  Users,
  Settings
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SupplierProfile {
  supplier_id: string;
  business_name: string;
  logo_url: string | null;
  rating_average: number;
  total_reviews: number;
  total_sales: number;
  total_orders: number;
  fulfillment_rate: number;
  verification_status: string;
  response_time_average: number | null;
}

interface PendingOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  total_amount: number;
  items: Array<{
    order_item_id: string;
    product_id: string;
    supplier_id: string;
    product_name: string;
    quantity: number;
    price_per_unit: number;
  }>;
  status: string;
}

interface Product {
  product_id: string;
  product_name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  sales_count: number;
  status: string;
  primary_image_url: string | null;
}

interface LowStockAlert {
  product_id: string;
  product_name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  suggested_reorder_quantity: number;
}

interface DashboardMetrics {
  sales: {
    today: number;
    this_week: number;
    this_month: number;
    year_to_date: number;
  };
  orders: {
    today: number;
    this_week: number;
    this_month: number;
    pending_acceptance: number;
  };
  average_order_value: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

const fetchSupplierProfile = async (token: string): Promise<SupplierProfile> => {
  const response = await axios.get(`${API_BASE}/suppliers/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const fetchPendingOrders = async (token: string, supplierId: string): Promise<PendingOrder[]> => {
  const response = await axios.get(`${API_BASE}/orders`, {
    params: {
      status_filter: 'pending',
      limit: 10
    },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Filter orders to only those containing supplier's items
  const orders = response.data.orders || [];
  return orders.filter((order: PendingOrder) => 
    order.items?.some((item: any) => item.supplier_id === supplierId)
  );
};

const fetchLowStockProducts = async (token: string): Promise<Product[]> => {
  const response = await axios.get(`${API_BASE}/suppliers/me/products`, {
    params: {
      status_filter: 'active'
    },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const products = response.data.products || [];
  return products.filter((p: Product) => p.stock_quantity <= p.low_stock_threshold);
};

const acceptOrder = async (orderId: string, token: string): Promise<void> => {
  await axios.patch(
    `${API_BASE}/orders/${orderId}`,
    { status: 'processing' },
    { headers: { Authorization: `Bearer ${token}` } }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  const supplier_id = supplierProfile?.supplier_id || '';
  const date_range = searchParams.get('date_range') || 'month';

  // ============================================================================
  // DATA QUERIES
  // ============================================================================

  // Supplier Profile Query
  const { 
    data: profile, 
    isLoading: isLoadingProfile,
    error: profileError 
  } = useQuery({
    queryKey: ['supplier', 'profile', supplier_id],
    queryFn: () => fetchSupplierProfile(authToken!),
    enabled: !!authToken && !!supplier_id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Pending Orders Query
  const { 
    data: pending_orders = [], 
    isLoading: isLoadingOrders,
    error: ordersError 
  } = useQuery({
    queryKey: ['supplier', 'orders', 'pending', supplier_id],
    queryFn: () => fetchPendingOrders(authToken!, supplier_id),
    enabled: !!authToken && !!supplier_id,
    staleTime: 30 * 1000, // 30 seconds for pending orders
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 1
  });

  // Low Stock Alerts Query
  const { 
    data: low_stock_products = [], 
    isLoading: isLoadingStock,
    error: stockError 
  } = useQuery({
    queryKey: ['supplier', 'products', 'low-stock', supplier_id],
    queryFn: () => fetchLowStockProducts(authToken!),
    enabled: !!authToken && !!supplier_id,
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const acceptOrderMutation = useMutation({
    mutationFn: (orderId: string) => acceptOrder(orderId, authToken!),
    onSuccess: () => {
      // Invalidate pending orders query to refetch
      queryClient.invalidateQueries({ queryKey: ['supplier', 'orders', 'pending'] });
      // Show success notification (could integrate with notification system)
    },
    onError: (error) => {
      console.error('Failed to accept order:', error);
    }
  });

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const low_stock_alerts: LowStockAlert[] = useMemo(() => {
    return low_stock_products.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      sku: product.sku,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
      suggested_reorder_quantity: Math.max(
        product.low_stock_threshold * 2,
        Math.ceil(product.sales_count / 30 * 7) // 7 days worth based on monthly velocity
      )
    }));
  }, [low_stock_products]);

  const pending_orders_data = useMemo(() => {
    return pending_orders.map(order => {
      const supplierItems = order.items?.filter(item => item.supplier_id === supplier_id) || [];
      const timeElapsed = Math.floor((Date.now() - new Date(order.order_date).getTime()) / (1000 * 60 * 60));
      
      return {
        order_id: order.order_id,
        order_number: order.order_number,
        customer_name: `Customer ${order.customer_id.slice(0, 8)}`,
        order_date: order.order_date,
        total_amount: order.total_amount,
        items_count: supplierItems.length,
        time_elapsed_hours: timeElapsed
      };
    });
  }, [pending_orders, supplier_id]);

  // Calculate metrics from available data
  const dashboard_metrics: DashboardMetrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Use profile data for aggregates
    const total_sales = profile?.total_sales || 0;
    const total_orders_count = profile?.total_orders || 0;

    return {
      sales: {
        today: 0, // Would need order data filtered by today
        this_week: 0,
        this_month: 0,
        year_to_date: total_sales
      },
      orders: {
        today: 0,
        this_week: 0,
        this_month: 0,
        pending_acceptance: pending_orders_data.length
      },
      average_order_value: total_orders_count > 0 ? total_sales / total_orders_count : 0
    };
  }, [profile, pending_orders_data]);

  const isLoading = isLoadingProfile || isLoadingOrders || isLoadingStock;

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleAcceptOrder = (orderId: string) => {
    if (window.confirm('Accept this order? This will move it to processing status.')) {
      acceptOrderMutation.mutate(orderId);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  Welcome back, {profile?.business_name || 'Supplier'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              {profile?.verification_status === 'verified' && (
                <div className="flex items-center space-x-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                  <CheckCircle className="size-5 text-green-600" />
                  <span className="text-green-700 font-medium text-sm">Verified Supplier</span>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="text-gray-600 font-medium">Loading dashboard...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && (profileError || ordersError || stockError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <div className="flex items-start space-x-3">
                <XCircle className="size-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-900 font-semibold">Error loading dashboard</h3>
                  <p className="text-red-700 text-sm mt-1">
                    {(profileError as any)?.message || 
                     (ordersError as any)?.message || 
                     (stockError as any)?.message || 
                     'Please try refreshing the page'}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 underline"
                  >
                    Refresh Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Dashboard Content */}
          {!isLoading && !profileError && (
            <>
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Sales Today */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <DollarSign className="size-6 text-green-600" />
                    </div>
                    <span className="text-green-600 text-sm font-medium">+0%</span>
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">Sales Today</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    ${dashboard_metrics.sales.today.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    YTD: ${dashboard_metrics.sales.year_to_date.toLocaleString()}
                  </p>
                </div>

                {/* Orders Today */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <ShoppingCart className="size-6 text-blue-600" />
                    </div>
                    <span className="text-blue-600 text-sm font-medium">Active</span>
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">Orders Today</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {dashboard_metrics.orders.today}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Total: {profile?.total_orders || 0} orders
                  </p>
                </div>

                {/* Pending Orders */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <Clock className="size-6 text-amber-600" />
                    </div>
                    {dashboard_metrics.orders.pending_acceptance > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded-full">
                        Action Required
                      </span>
                    )}
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">Pending Orders</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {dashboard_metrics.orders.pending_acceptance}
                  </p>
                  <Link 
                    to="/supplier/orders?status_filter=pending"
                    className="text-blue-600 hover:text-blue-700 text-xs mt-2 inline-block font-medium"
                  >
                    View all pending →
                  </Link>
                </div>

                {/* Average Order Value */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <TrendingUp className="size-6 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">Avg Order Value</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    ${dashboard_metrics.average_order_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Per transaction
                  </p>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Link
                  to="/supplier/products/add"
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Package className="size-5 text-blue-600" />
                    </div>
                    <span className="text-gray-700 font-medium group-hover:text-blue-600 transition-colors">
                      Add New Product
                    </span>
                  </div>
                </Link>

                <Link
                  to="/supplier/orders"
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                      <ShoppingCart className="size-5 text-green-600" />
                    </div>
                    <span className="text-gray-700 font-medium group-hover:text-green-600 transition-colors">
                      View All Orders
                    </span>
                  </div>
                </Link>

                <Link
                  to="/supplier/inventory"
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-amber-100 p-2 rounded-lg group-hover:bg-amber-200 transition-colors">
                      <BoxIcon className="size-5 text-amber-600" />
                    </div>
                    <span className="text-gray-700 font-medium group-hover:text-amber-600 transition-colors">
                      Manage Inventory
                    </span>
                  </div>
                </Link>

                <Link
                  to="/supplier/analytics"
                  className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <BarChart3 className="size-5 text-purple-600" />
                    </div>
                    <span className="text-gray-700 font-medium group-hover:text-purple-600 transition-colors">
                      View Analytics
                    </span>
                  </div>
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Widgets */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Pending Orders Widget */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                          <Clock className="size-6" />
                          <span>Pending Orders</span>
                        </h2>
                        {dashboard_metrics.orders.pending_acceptance > 0 && (
                          <span className="bg-white text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
                            {dashboard_metrics.orders.pending_acceptance} need action
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      {isLoadingOrders && (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 text-sm mt-2">Loading orders...</p>
                        </div>
                      )}

                      {!isLoadingOrders && pending_orders_data.length === 0 && (
                        <div className="text-center py-12">
                          <CheckCircle className="size-12 text-green-500 mx-auto mb-3" />
                          <h3 className="text-gray-900 font-semibold mb-1">All caught up!</h3>
                          <p className="text-gray-600 text-sm">No pending orders at the moment</p>
                        </div>
                      )}

                      {!isLoadingOrders && pending_orders_data.length > 0 && (
                        <div className="space-y-4">
                          {pending_orders_data.map((order) => (
                            <div 
                              key={order.order_id}
                              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {order.order_number}
                                  </h3>
                                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-gray-900">
                                    ${order.total_amount.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {order.items_count} item{order.items_count !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center space-x-1">
                                    <Clock className="size-4" />
                                    <span>{order.time_elapsed_hours}h ago</span>
                                  </span>
                                  <span className="text-gray-400">•</span>
                                  <span>{new Date(order.order_date).toLocaleDateString()}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Link
                                    to={`/supplier/orders/${order.order_id}`}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                  >
                                    View Details
                                  </Link>
                                  <button
                                    onClick={() => handleAcceptOrder(order.order_id)}
                                    disabled={acceptOrderMutation.isPending}
                                    className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {acceptOrderMutation.isPending ? 'Accepting...' : 'Accept'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}

                          {pending_orders_data.length >= 5 && (
                            <Link
                              to="/supplier/orders?status_filter=pending"
                              className="block text-center text-blue-600 hover:text-blue-700 font-medium text-sm py-2"
                            >
                              View all pending orders →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Low Stock Alerts Widget */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                          <AlertTriangle className="size-6" />
                          <span>Low Stock Alerts</span>
                        </h2>
                        {low_stock_alerts.length > 0 && (
                          <span className="bg-white text-orange-700 text-sm font-semibold px-3 py-1 rounded-full">
                            {low_stock_alerts.length} alert{low_stock_alerts.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      {isLoadingStock && (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                          <p className="text-gray-500 text-sm mt-2">Checking inventory...</p>
                        </div>
                      )}

                      {!isLoadingStock && low_stock_alerts.length === 0 && (
                        <div className="text-center py-12">
                          <CheckCircle className="size-12 text-green-500 mx-auto mb-3" />
                          <h3 className="text-gray-900 font-semibold mb-1">Inventory looks good!</h3>
                          <p className="text-gray-600 text-sm">All products are adequately stocked</p>
                        </div>
                      )}

                      {!isLoadingStock && low_stock_alerts.length > 0 && (
                        <div className="space-y-3">
                          {low_stock_alerts.slice(0, 5).map((alert) => (
                            <div 
                              key={alert.product_id}
                              className="border border-amber-200 bg-amber-50 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 mb-1">
                                    {alert.product_name}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">SKU: {alert.sku}</p>
                                  
                                  <div className="flex items-center space-x-4 text-sm">
                                    <span className="text-red-600 font-semibold">
                                      {alert.stock_quantity} units left
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-gray-600">
                                      Threshold: {alert.low_stock_threshold}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="text-right ml-4">
                                  <div className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded mb-2">
                                    Reorder: {alert.suggested_reorder_quantity}
                                  </div>
                                  <Link
                                    to={`/supplier/products/${alert.product_id}/edit`}
                                    className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                                  >
                                    Update Stock
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}

                          <Link
                            to="/supplier/inventory?low_stock_only=true"
                            className="block text-center text-amber-600 hover:text-amber-700 font-medium text-sm py-2"
                          >
                            View all low stock items →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Performance & Stats */}
                <div className="space-y-8">
                  {/* Performance Indicators */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
                      <Star className="size-5 text-yellow-500" />
                      <span>Performance</span>
                    </h2>
                    
                    <div className="space-y-4">
                      {/* Rating */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Rating</span>
                          <div className="flex items-center space-x-1">
                            <Star className="size-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-bold text-gray-900">
                              {profile?.rating_average.toFixed(1) || '0.0'}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-yellow-500 h-full rounded-full"
                            style={{ width: `${((profile?.rating_average || 0) / 5) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {profile?.total_reviews || 0} reviews
                        </p>
                      </div>

                      {/* Fulfillment Rate */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Fulfillment Rate</span>
                          <span className="font-bold text-gray-900">
                            {profile?.fulfillment_rate.toFixed(1) || '0.0'}%
                          </span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-green-500 h-full rounded-full"
                            style={{ width: `${profile?.fulfillment_rate || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Response Time */}
                      {profile?.response_time_average !== null && profile?.response_time_average !== undefined && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Avg Response Time</span>
                            <span className="font-bold text-gray-900">
                              {profile.response_time_average.toFixed(1)}h
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Faster responses improve customer satisfaction
                          </p>
                        </div>
                      )}

                      {/* Total Sales */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Total Sales</span>
                          <span className="font-bold text-gray-900">
                            ${(profile?.total_sales || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Total Orders */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Total Orders</span>
                          <span className="font-bold text-gray-900">
                            {(profile?.total_orders || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/supplier/analytics"
                      className="mt-6 block w-full text-center bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium py-2 rounded-lg transition-colors text-sm"
                    >
                      View Detailed Analytics
                    </Link>
                  </div>

                  {/* Tasks Summary */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Tasks</h2>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">
                          Orders to fulfill
                        </span>
                        <span className="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {dashboard_metrics.orders.pending_acceptance}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-sm font-medium text-gray-900">
                          Items to restock
                        </span>
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {low_stock_alerts.length}
                        </span>
                      </div>

                      <Link
                        to="/supplier/reviews"
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          Reviews to respond
                        </span>
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                          0
                        </span>
                      </Link>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/supplier/messages"
                        className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <Users className="size-5 text-gray-600 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                          Messages
                        </span>
                      </Link>

                      <Link
                        to="/supplier/settings"
                        className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <Settings className="size-5 text-gray-600 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                          Settings
                        </span>
                      </Link>

                      <Link
                        to="/supplier/pricing"
                        className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <DollarSign className="size-5 text-gray-600 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                          Pricing
                        </span>
                      </Link>

                      <Link
                        to="/supplier/financials"
                        className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <TrendingUp className="size-5 text-gray-600 group-hover:text-blue-600" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                          Financials
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SupplierDashboard;