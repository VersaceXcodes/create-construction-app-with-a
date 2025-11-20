import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  ShoppingBag, 
  Search, 
  Heart, 
  FolderOpen, 
  Package, 
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Order {
  order_id: string;
  order_number: string;
  order_date: string;
  status: string;
  total_amount: number;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  primary_image_url?: string;
}

interface Delivery {
  delivery_status: string;
  delivery_window_end?: string;
}

interface OrderWithDetails extends Order {
  items?: OrderItem[];
  delivery?: Delivery;
}

interface Product {
  product_id: string;
  product_name: string;
  price_per_unit: number;
  primary_image_url: string | null;
  supplier_id: string;
  stock_quantity: number;
  status: string;
}

interface WishlistItem {
  wishlist_item_id: string;
  product_id: string;
}

interface Project {
  project_id: string;
  project_name: string;
}

interface DashboardOrder {
  order_id: string;
  order_number: string;
  order_date: string;
  status: string;
  total_amount: number;
  delivery_status: string;
  estimated_delivery: string | null;
  primary_product: {
    product_name: string;
    product_id: string;
    thumbnail_url: string;
  };
}

interface UpcomingDelivery {
  delivery_id: string;
  order_id: string;
  order_number: string;
  supplier_name: string;
  delivery_window_start: string;
  delivery_window_end: string;
  delivery_status: string;
}

interface AccountSummary {
  spending_this_month: number;
  orders_this_month: number;
  trade_credit_available: number | null;
  trade_credit_limit: number | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

// Fetch active orders
const fetchActiveOrders = async (token: string): Promise<DashboardOrder[]> => {
  const response = await axios.get(`${API_BASE_URL}/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      status_filter: 'pending,processing,shipped,in_transit',
      limit: 3,
      sort_by: 'order_date',
      sort_order: 'desc',
    },
  });

  const orders = response.data.orders || [];
  
  return orders.map((order: OrderWithDetails) => ({
    order_id: order.order_id,
    order_number: order.order_number,
    order_date: order.order_date,
    status: order.status,
    total_amount: Number(order.total_amount || 0),
    delivery_status: order.delivery?.delivery_status || 'unknown',
    estimated_delivery: order.delivery?.delivery_window_end || null,
    primary_product: {
      product_name: order.items?.[0]?.product_name || 'N/A',
      product_id: order.items?.[0]?.product_id || '',
      thumbnail_url: order.items?.[0]?.primary_image_url || '/placeholder-product.png',
    },
  }));
};

// Fetch recommended products
const fetchRecommendedProducts = async (token: string): Promise<Product[]> => {
  const response = await axios.get(`${API_BASE_URL}/products`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      limit: 12,
      sort_by: 'sales_count',
      sort_order: 'desc',
      in_stock_only: true,
    },
  });

  return response.data.products || [];
};

// Fetch wishlist count
const fetchWishlistCount = async (token: string): Promise<number> => {
  const response = await axios.get(`${API_BASE_URL}/wishlist`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return (response.data || []).length;
};

// Fetch projects count
const fetchProjectsCount = async (token: string): Promise<number> => {
  const response = await axios.get(`${API_BASE_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return (response.data || []).length;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const getStatusBadgeColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    in_transit: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_CustomerDashboard: React.FC = () => {
  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const customerProfile = useAppStore(state => state.authentication_state.customer_profile);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const cartTotalItems = useAppStore(state => state.cart_state.total_items);

  // React Query for data fetching
  const {
    data: activeOrders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery<DashboardOrder[], Error>({
    queryKey: ['active-orders', { limit: 3 }],
    queryFn: () => fetchActiveOrders(authToken!),
    enabled: !!authToken,
    staleTime: 60000, // 1 minute
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: recommendedProducts = [],
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useQuery<Product[], Error>({
    queryKey: ['recommended-products', { limit: 12 }],
    queryFn: () => fetchRecommendedProducts(authToken!),
    enabled: !!authToken,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: wishlistCount = 0,
    isLoading: wishlistLoading,
  } = useQuery<number, Error>({
    queryKey: ['wishlist-count'],
    queryFn: () => fetchWishlistCount(authToken!),
    enabled: !!authToken,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const {
    data: projectsCount = 0,
    isLoading: projectsLoading,
  } = useQuery<number, Error>({
    queryKey: ['projects-count'],
    queryFn: () => fetchProjectsCount(authToken!),
    enabled: !!authToken,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Derive upcoming deliveries from active orders
  const upcomingDeliveries: UpcomingDelivery[] = activeOrders
    .filter(order => ['scheduled', 'out_for_delivery', 'preparing'].includes(order.delivery_status))
    .map(order => ({
      delivery_id: `del_${order.order_id}`,
      order_id: order.order_id,
      order_number: order.order_number,
      supplier_name: 'Supplier', // Would come from joined data
      delivery_window_start: order.estimated_delivery || '',
      delivery_window_end: order.estimated_delivery || '',
      delivery_status: order.delivery_status,
    }))
    .slice(0, 1); // Next delivery only

  // Calculate account summary from orders (mock implementation)
  const accountSummary: AccountSummary = {
    spending_this_month: activeOrders.reduce((sum, order) => sum + order.total_amount, 0),
    orders_this_month: activeOrders.length,
    trade_credit_available: customerProfile?.trade_credit_balance || null,
    trade_credit_limit: customerProfile?.trade_credit_limit || null,
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Welcome Banner */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {currentUser?.profile_photo_url ? (
                  <img
                    src={currentUser.profile_photo_url}
                    alt={`${currentUser.first_name} ${currentUser.last_name}`}
                    className="h-16 w-16 rounded-full object-cover border-2 border-blue-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {currentUser?.first_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                    Welcome back, {currentUser?.first_name || 'Customer'}!
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
              </div>
              
              {/* Account Type Badge */}
              {customerProfile?.account_type === 'trade' && (
                <div className="hidden md:block">
                  <span className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Trade Account
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Quick Actions & Active Orders */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Quick Actions Panel */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Search Products */}
                  <Link
                    to="/products"
                    className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors">
                      <Search className="h-6 w-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 text-center">Search Products</span>
                  </Link>

                  {/* Reorder Last Order */}
                  <button
                    onClick={() => {
                      if (activeOrders.length > 0) {
                        // Navigate to reorder functionality (would use API endpoint)
                        alert('Reorder functionality coming soon');
                      }
                    }}
                    disabled={activeOrders.length === 0}
                    className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white"
                  >
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3 group-hover:bg-green-600 transition-colors">
                      <RefreshCw className="h-6 w-6 text-green-600 group-hover:text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 text-center">Reorder Last</span>
                  </button>

                  {/* Saved Items */}
                  <Link
                    to="/wishlist"
                    className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all duration-200 group relative"
                  >
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-3 group-hover:bg-red-600 transition-colors">
                      <Heart className="h-6 w-6 text-red-600 group-hover:text-white" />
                    </div>
                    {wishlistCount > 0 && (
                      <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-900 text-center">Saved Items</span>
                  </Link>

                  {/* My Projects */}
                  <Link
                    to="/projects"
                    className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 group relative"
                  >
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3 group-hover:bg-purple-600 transition-colors">
                      <FolderOpen className="h-6 w-6 text-purple-600 group-hover:text-white" />
                    </div>
                    {projectsCount > 0 && (
                      <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                        {projectsCount}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-900 text-center">My Projects</span>
                  </Link>
                  
                </div>
              </div>

              {/* Active Orders Widget */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Your Active Orders</h2>
                  <Link
                    to="/orders"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center transition-colors"
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>

                {/* Loading State */}
                {ordersLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                        <div className="flex space-x-4">
                          <div className="bg-gray-200 h-20 w-20 rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="bg-gray-200 h-4 w-1/3 rounded"></div>
                            <div className="bg-gray-200 h-3 w-1/2 rounded"></div>
                            <div className="bg-gray-200 h-3 w-1/4 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error State */}
                {ordersError && !ordersLoading && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-red-800 font-medium">Failed to load orders</p>
                        <button
                          onClick={() => refetchOrders()}
                          className="text-red-600 hover:text-red-700 text-sm font-medium mt-2 flex items-center"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Try again
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Orders List */}
                {!ordersLoading && !ordersError && activeOrders.length > 0 && (
                  <div className="space-y-4">
                    {activeOrders.map((order) => (
                      <Link
                        key={order.order_id}
                        to={`/orders/${order.order_id}`}
                        className="block border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start space-x-4">
                          {/* Product Thumbnail */}
                          <img
                            src={order.primary_product.thumbnail_url}
                            alt={order.primary_product.product_name}
                            className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-product.png';
                            }}
                          />

                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-gray-600">
                                Order #{order.order_number}
                              </p>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(order.status)}`}>
                                {order.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
                              {order.primary_product.product_name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {formatDate(order.order_date)}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-900">
                                {formatCurrency(order.total_amount)}
                              </span>
                              {order.estimated_delivery && (
                                <span className="text-sm text-blue-600 font-medium">
                                  Arriving {formatDate(order.estimated_delivery)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!ordersLoading && !ordersError && activeOrders.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No active orders</h3>
                    <p className="text-gray-600 mb-6">Start shopping to place your first order</p>
                    <Link
                      to="/products"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                      <Search className="h-5 w-5 mr-2" />
                      Browse Products
                    </Link>
                  </div>
                )}
              </div>

              {/* Recommended Products */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Recommended For You</h2>
                  <p className="text-sm text-gray-600">Based on your preferences</p>
                </div>

                {/* Loading State */}
                {recommendationsLoading && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 h-48 rounded-lg mb-2"></div>
                        <div className="bg-gray-200 h-4 w-3/4 rounded mb-2"></div>
                        <div className="bg-gray-200 h-3 w-1/2 rounded"></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error State */}
                {recommendationsError && !recommendationsLoading && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">Unable to load recommendations</p>
                  </div>
                )}

                {/* Products Grid */}
                {!recommendationsLoading && !recommendationsError && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {recommendedProducts.slice(0, 8).map((product) => (
                      <Link
                        key={product.product_id}
                        to={`/product/${product.product_id}`}
                        className="group"
                      >
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl hover:border-blue-500 transition-all duration-200">
                          <div className="relative aspect-square bg-gray-100">
                            <img
                              src={product.primary_image_url || '/placeholder-product.png'}
                              alt={product.product_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-product.png';
                              }}
                            />
                            {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                              <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                Low Stock
                              </span>
                            )}
                          </div>
                          <div className="p-3">
                            <h3 className="text-sm font-semibold text-gray-900 truncate mb-1 group-hover:text-blue-600">
                              {product.product_name}
                            </h3>
                            <p className="text-lg font-bold text-blue-600">
                              {formatCurrency(Number(product.price_per_unit || 0))}
                            </p>
                            {product.stock_quantity > 0 ? (
                              <span className="text-xs text-green-600 font-medium">In Stock</span>
                            ) : (
                              <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {recommendedProducts.length > 8 && (
                  <div className="mt-6 text-center">
                    <Link
                      to="/products"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      See All Recommendations
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Activity (Mock/Empty State) */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">Activity tracking coming soon</p>
                </div>
              </div>

            </div>

            {/* Right Column - Stats & Deliveries */}
            <div className="lg:col-span-1 space-y-8">
              
              {/* Account Summary Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Account Summary
                </h3>
                
                <div className="space-y-4">
                  {/* Spending This Month */}
                  <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-blue-100 text-sm mb-1">Spending This Month</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(accountSummary.spending_this_month)}
                    </p>
                  </div>

                  {/* Orders This Month */}
                  <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                    <p className="text-blue-100 text-sm mb-1">Orders This Month</p>
                    <p className="text-2xl font-bold">{accountSummary.orders_this_month}</p>
                  </div>

                  {/* Trade Credit (if available) */}
                  {accountSummary.trade_credit_limit && (
                    <div className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                      <p className="text-blue-100 text-sm mb-1">Available Credit</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(accountSummary.trade_credit_available || 0)}
                      </p>
                      <p className="text-blue-100 text-xs mt-1">
                        of {formatCurrency(accountSummary.trade_credit_limit)} limit
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Deliveries Widget */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Upcoming Deliveries
                </h3>

                {upcomingDeliveries.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingDeliveries.map((delivery) => (
                      <div key={delivery.delivery_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Order #{delivery.order_number}
                          </span>
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            {delivery.delivery_status}
                          </span>
                        </div>
                        {delivery.delivery_window_end && (
                          <div className="flex items-center text-gray-900 mb-2">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            <span className="text-sm font-medium">
                              {formatDate(delivery.delivery_window_end)}
                            </span>
                          </div>
                        )}
                        <Link
                          to={`/orders/${delivery.order_id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center mt-3"
                        >
                          Track Order
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">No scheduled deliveries</p>
                  </div>
                )}
              </div>

              {/* Shopping Cart Quick Access */}
              {cartTotalItems > 0 && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <ShoppingBag className="h-6 w-6 text-green-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Your Cart</h3>
                        <p className="text-sm text-gray-600">{cartTotalItems} items waiting</p>
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/cart"
                    className="block w-full bg-green-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
                  >
                    View Cart & Checkout
                  </Link>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CustomerDashboard;