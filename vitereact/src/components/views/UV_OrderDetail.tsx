import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Package, 
  MapPin, 
  Clock, 
  CreditCard, 
  Download, 
  XCircle, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Truck,
  Phone,
  MessageCircle,
  RotateCcw,
  ChevronRight,
  User
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrderData {
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
  payment_method: string;
  payment_status: string;
  payment_transaction_id: string | null;
  promo_code_used: string | null;
  customer_notes: string | null;
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
}

interface DeliveryData {
  delivery_id: string;
  order_id: string;
  supplier_id: string;
  delivery_window_start: string;
  delivery_window_end: string;
  delivery_method: string;
  delivery_fee: number;
  delivery_status: 'scheduled' | 'preparing' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';
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
}

// interface DeliveryAddress {
//   address_id: string;
//   full_name: string;
//   phone_number: string;
//   street_address: string;
//   apt_suite: string | null;
//   city: string;
//   state: string;
//   postal_code: string;
//   delivery_instructions: string | null;
// }

interface TimelineEvent {
  milestone: string;
  status: string;
  timestamp: string;
  description: string | null;
}

interface OrderDetailResponse {
  order: OrderData;
  items: OrderItem[];
  delivery: DeliveryData | null;
  timeline: TimelineEvent[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchOrderDetails = async (order_id: string, auth_token: string): Promise<OrderDetailResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const cancelOrder = async (order_id: string, cancellation_reason: string, auth_token: string) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/cancel`,
    { cancellation_reason },
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const rescheduleDelivery = async (
  delivery_id: string, 
  delivery_window_start: string, 
  delivery_window_end: string, 
  auth_token: string
) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/deliveries/${delivery_id}/reschedule`,
    { delivery_window_start, delivery_window_end },
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const reorderItems = async (order_id: string, auth_token: string) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/reorder`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const downloadInvoice = async (order_id: string, auth_token: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}/invoice`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`
      },
      responseType: 'blob'
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrderDetail: React.FC = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  // const customerId = useAppStore(state => state.authentication_state.customer_profile?.customer_id);
  const fetchCart = useAppStore(state => state.fetch_cart);
  const websocketConnection = useAppStore(state => state.websocket_connection);
  
  // Local UI State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [newDeliveryStart, setNewDeliveryStart] = useState('');
  const [newDeliveryEnd, setNewDeliveryEnd] = useState('');
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const { 
    data: orderDetails, 
    isLoading, 
    error
  } = useQuery({
    queryKey: ['order', order_id],
    queryFn: () => fetchOrderDetails(order_id || '', authToken || ''),
    enabled: !!order_id && !!authToken,
    staleTime: 30000, // 30 seconds
    retry: 1
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelOrder(order_id || '', reason, authToken || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order_id] });
      setShowCancelModal(false);
      setCancellationReason('');
    }
  });
  
  const rescheduleMutation = useMutation({
    mutationFn: ({ delivery_id, start, end }: { delivery_id: string; start: string; end: string }) => 
      rescheduleDelivery(delivery_id, start, end, authToken || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', order_id] });
      setShowRescheduleModal(false);
      setNewDeliveryStart('');
      setNewDeliveryEnd('');
    }
  });
  
  const reorderMutation = useMutation({
    mutationFn: () => reorderItems(order_id || '', authToken || ''),
    onSuccess: () => {
      fetchCart(); // Update cart state
      navigate('/cart');
    }
  });
  
  // ============================================================================
  // WEBSOCKET REAL-TIME UPDATES
  // ============================================================================
  
  useEffect(() => {
    if (!websocketConnection || !order_id || !orderDetails) return;
    
    // Subscribe to order updates
    websocketConnection.emit('subscribe_order', { order_id });
    
    // Subscribe to delivery tracking if out for delivery
    const delivery = orderDetails.delivery;
    if (delivery && delivery.delivery_status === 'out_for_delivery') {
      websocketConnection.emit('subscribe_delivery', { delivery_id: delivery.delivery_id });
    }
    
    // Handle order status changes
    const handleOrderStatusChange = (data: any) => {
      if (data.order_id === order_id) {
        queryClient.invalidateQueries({ queryKey: ['order', order_id] });
      }
    };
    
    // Handle GPS location updates
    const handleLocationUpdate = (data: any) => {
      if (data.current_latitude && data.current_longitude) {
        setGpsLocation({
          latitude: data.current_latitude,
          longitude: data.current_longitude
        });
        if (data.estimated_arrival_time) {
          // Calculate ETA in minutes
          const eta = new Date(data.estimated_arrival_time).getTime() - Date.now();
          setEtaMinutes(Math.max(0, Math.floor(eta / 60000)));
        }
      }
    };
    
    websocketConnection.on('order_status_changed', handleOrderStatusChange);
    websocketConnection.on('delivery_location_updated', handleLocationUpdate);
    
    return () => {
      websocketConnection.off('order_status_changed', handleOrderStatusChange);
      websocketConnection.off('delivery_location_updated', handleLocationUpdate);
      websocketConnection.emit('unsubscribe_order', { order_id });
      if (delivery) {
        websocketConnection.emit('unsubscribe_delivery', { delivery_id: delivery.delivery_id });
      }
    };
  }, [websocketConnection, order_id, orderDetails, queryClient]);
  
  // ============================================================================
  // DERIVED STATE & HELPERS
  // ============================================================================
  
  // Redirect if no order_id
  if (!order_id) {
    navigate('/orders');
    return null;
  }
  
  // Redirect if not authenticated
  if (!authToken) {
    navigate('/login');
    return null;
  }
  
  if (!orderDetails) {
    return null; // Loading or error state will handle
  }
  
  const order = orderDetails.order;
  const items = orderDetails.items || [];
  const delivery = orderDetails.delivery;
  const timeline = orderDetails.timeline || [];
  
  // Group items by supplier
  const itemsBySupplier = items.reduce((acc, item) => {
    if (!acc[item.supplier_id]) {
      acc[item.supplier_id] = [];
    }
    acc[item.supplier_id].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);
  
  // Calculate action availability based on order status
  const canCancel = ['pending', 'processing'].includes(order.status);
  const canReschedule = delivery && ['scheduled', 'preparing'].includes(delivery.delivery_status);
  const canTrackGPS = delivery && delivery.delivery_status === 'out_for_delivery';
  const canReportIssue = !['cancelled', 'refunded'].includes(order.status);
  const canReorder = order.status === 'delivered';
  const canReview = order.status === 'delivered';
  
  // Status badge color mapping
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    shipped: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    in_transit: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    delivered: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    refunded: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
  };
  
  const currentStatusColor = statusColors[order.status] || statusColors.pending;
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Handle invoice download
  const handleDownloadInvoice = async () => {
    try {
      const blob = await downloadInvoice(order_id, authToken);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${order.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Invoice download failed:', error);
    }
  };
  
  // Handle cancel order
  const handleCancelOrder = () => {
    if (!cancellationReason.trim()) {
      return;
    }
    cancelMutation.mutate(cancellationReason);
  };
  
  // Handle reschedule
  const handleRescheduleDelivery = () => {
    if (!delivery || !newDeliveryStart || !newDeliveryEnd) {
      return;
    }
    rescheduleMutation.mutate({
      delivery_id: delivery.delivery_id,
      start: newDeliveryStart,
      end: newDeliveryEnd
    });
  };
  
  // Handle reorder
  const handleReorder = () => {
    reorderMutation.mutate();
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      {/* Loading State */}
      {isLoading && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading order details...</p>
          </div>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white border-2 border-red-200 rounded-xl p-8 shadow-lg text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
              <p className="text-gray-600 mb-6">
                We couldn't find this order. It may have been removed or you may not have access to it.
              </p>
              <Link 
                to="/orders"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                View All Orders
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      {!isLoading && !error && orderDetails && (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Back Navigation */}
            <div className="mb-6">
              <Link 
                to="/orders"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
                Back to Orders
              </Link>
            </div>
            
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                      Order #{order.order_number}
                    </h1>
                    <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${currentStatusColor.bg} ${currentStatusColor.text} ${currentStatusColor.border}`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Placed on {formatDate(order.order_date)}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {canCancel && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Order
                    </button>
                  )}
                  
                  {canReorder && (
                    <button
                      onClick={handleReorder}
                      disabled={reorderMutation.isPending}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {reorderMutation.isPending ? 'Adding to cart...' : 'Reorder'}
                    </button>
                  )}
                  
                  <button
                    onClick={handleDownloadInvoice}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Invoice
                  </button>
                </div>
              </div>
            </div>
            
            {/* Timeline Progress */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Timeline</h2>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute top-4 left-4 h-full w-0.5 bg-gray-200"></div>
                
                {/* Timeline events */}
                <div className="space-y-6">
                  {timeline.map((event, index) => {
                    const isCompleted = event.status === 'completed';
                    const isCurrent = index === timeline.length - 1 && !['delivered', 'cancelled', 'refunded'].includes(order.status);
                    
                    return (
                      <div key={index} className="relative flex items-start gap-4">
                        {/* Milestone dot */}
                        <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-4 ${
                          isCompleted 
                            ? 'bg-green-500 border-green-200' 
                            : isCurrent
                            ? 'bg-blue-500 border-blue-200 animate-pulse'
                            : 'bg-gray-300 border-gray-100'
                        }`}>
                          {isCompleted && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        
                        {/* Event details */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className={`text-base font-semibold ${
                                isCompleted ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {event.milestone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h3>
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                              {new Date(event.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* GPS Tracking Map (if delivery is out for delivery) */}
            {canTrackGPS && delivery && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Live Delivery Tracking</h2>
                  {etaMinutes !== null && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">ETA: {etaMinutes} min</span>
                    </div>
                  )}
                </div>
                
                {/* Map placeholder (would be Google Maps in production) */}
                <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center border-2 border-gray-300 mb-4">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-700 font-medium">Live GPS Tracking</p>
                    {gpsLocation && (
                      <p className="text-sm text-gray-600 mt-2">
                        Location: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Driver: {delivery.driver_name || 'En route'}
                    </p>
                  </div>
                </div>
                
                {/* Driver info */}
                {delivery.driver_name && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{delivery.driver_name}</p>
                        <p className="text-sm text-gray-600">{delivery.carrier || 'Delivery Driver'}</p>
                      </div>
                    </div>
                    {delivery.driver_phone && (
                      <a
                        href={`tel:${delivery.driver_phone}`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call Driver
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Order Items & Delivery */}
              <div className="lg:col-span-2 space-y-6">
                {/* Order Items */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
                  
                  {Object.entries(itemsBySupplier).map(([supplierId, supplierItems]) => (
                    <div key={supplierId} className="mb-6 last:mb-0">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                        <Package className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">
                          Supplier: {supplierItems[0]?.supplier_id}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {supplierItems.map((item) => (
                          <div key={item.order_item_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <Link
                                to={`/product/${item.product_id}`}
                                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate block"
                              >
                                {item.product_name}
                              </Link>
                              <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                              <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            </div>
                            
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm text-gray-600">
                                {formatCurrency(item.price_per_unit)} each
                              </p>
                              <p className="font-bold text-gray-900">
                                {formatCurrency(item.line_total)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Delivery Information */}
                {delivery && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">Delivery Information</h2>
                      {canReschedule && (
                        <button
                          onClick={() => setShowRescheduleModal(true)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Reschedule
                        </button>
                      )}
                    </div>
                    
                    {/* Delivery Status */}
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">
                          {delivery.delivery_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <p className="text-sm text-blue-800">
                        Delivery Window: {formatDate(delivery.delivery_window_start)} - {new Date(delivery.delivery_window_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {delivery.tracking_number && (
                        <p className="text-sm text-blue-800 mt-1">
                          Tracking: {delivery.tracking_number}
                        </p>
                      )}
                    </div>
                    
                    {/* Delivery Address - moved here from separate section */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Delivery Address</h3>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{order.delivery_address_id}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          (Address details loaded from address_id: {order.delivery_address_id})
                        </p>
                      </div>
                    </div>
                    
                    {/* Delivery Proof (if delivered) */}
                    {delivery.delivery_status === 'delivered' && (
                      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-green-900">Delivered Successfully</span>
                        </div>
                        <p className="text-sm text-green-800">
                          Delivered on {delivery.actual_delivery_time ? formatDate(delivery.actual_delivery_time) : 'N/A'}
                        </p>
                        {delivery.delivery_proof_photo_url && (
                          <div className="mt-3">
                            <p className="text-sm text-green-800 mb-2">Delivery Proof:</p>
                            <img 
                              src={delivery.delivery_proof_photo_url} 
                              alt="Delivery proof"
                              className="rounded-lg border border-green-300 max-w-xs"
                            />
                          </div>
                        )}
                        {delivery.delivery_notes && (
                          <p className="text-sm text-green-800 mt-2">
                            Note: {delivery.delivery_notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Right Column - Payment Summary & Actions */}
              <div className="lg:col-span-1 space-y-6">
                {/* Payment Summary */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(order.subtotal_amount)}</span>
                    </div>
                    
                    <div className="flex justify-between text-gray-700">
                      <span>Delivery Fee:</span>
                      <span>{formatCurrency(order.delivery_fee_total)}</span>
                    </div>
                    
                    <div className="flex justify-between text-gray-700">
                      <span>Tax:</span>
                      <span>{formatCurrency(order.tax_amount)}</span>
                    </div>
                    
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(order.discount_amount)}</span>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t-2 border-gray-300">
                      <div className="flex justify-between">
                        <span className="text-lg font-bold text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Method */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment Method</h3>
                    <div className="flex items-center gap-2 text-gray-900">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <span className="capitalize">{order.payment_method.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Status: <span className="font-medium capitalize">{order.payment_status}</span>
                    </p>
                    {order.promo_code_used && (
                      <p className="text-sm text-green-600 mt-1">
                        Promo code applied: {order.promo_code_used}
                      </p>
                    )}
                  </div>
                  
                  {/* Customer Notes */}
                  {order.customer_notes && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Order Notes</h3>
                      <p className="text-sm text-gray-600 italic">
                        "{order.customer_notes}"
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
                  
                  <div className="space-y-3">
                    {canReportIssue && (
                      <Link
                        to={`/report-issue?order_id=${order_id}`}
                        className="w-full inline-flex items-center justify-center px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Report Issue
                      </Link>
                    )}
                    
                    <button
                      onClick={() => navigate('/support')}
                      className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Support
                    </button>
                    
                    {canReview && (
                      <Link
                        to={`/account/reviews?order_id=${order_id}`}
                        className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Leave Review
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Order</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            
            <div className="mb-6">
              <label htmlFor="cancellation_reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation
              </label>
              <textarea
                id="cancellation_reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                placeholder="Please tell us why you're cancelling..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </div>
            
            {cancelMutation.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  {axios.isAxiosError(cancelMutation.error) 
                    ? cancelMutation.error.response?.data?.message || 'Failed to cancel order'
                    : 'An error occurred'}
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                }}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelMutation.isPending || !cancellationReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reschedule Delivery Modal */}
      {showRescheduleModal && delivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reschedule Delivery</h3>
            <p className="text-gray-600 mb-4">
              Choose a new delivery window for your order.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="new_start" className="block text-sm font-medium text-gray-700 mb-2">
                  New Delivery Start
                </label>
                <input
                  type="datetime-local"
                  id="new_start"
                  value={newDeliveryStart}
                  onChange={(e) => setNewDeliveryStart(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="new_end" className="block text-sm font-medium text-gray-700 mb-2">
                  New Delivery End
                </label>
                <input
                  type="datetime-local"
                  id="new_end"
                  value={newDeliveryEnd}
                  onChange={(e) => setNewDeliveryEnd(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
            
            {rescheduleMutation.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  {axios.isAxiosError(rescheduleMutation.error)
                    ? rescheduleMutation.error.response?.data?.message || 'Failed to reschedule delivery'
                    : 'An error occurred'}
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setNewDeliveryStart('');
                  setNewDeliveryEnd('');
                }}
                disabled={rescheduleMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleDelivery}
                disabled={rescheduleMutation.isPending || !newDeliveryStart || !newDeliveryEnd}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_OrderDetail;