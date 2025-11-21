import  { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Package, 
  User, 
  Phone, 
  Mail, 
  
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  MessageSquare,
  ArrowLeft,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { useAppStore } from '@/store/main';

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

interface CustomerInfo {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  account_type: string;
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
  estimated_arrival_time: string | null;
  actual_delivery_time: string | null;
}

interface Timeline {
  milestone: string;
  status: string;
  timestamp: string;
  description: string;
}

interface OrderResponse {
  order: Order;
  items: OrderItem[];
  delivery: Delivery;
  timeline: Timeline[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UV_OrderDetail_Supplier() {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierId = currentUser?.user_type === 'supplier' 
    ? useAppStore(state => state.authentication_state.current_user?.user_id) 
    : null;

  // Local state for forms
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [estimatedShipDate, setEstimatedShipDate] = useState('');
  const [supplierNotes, setSupplierNotes] = useState('');
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchOrderDetails = async (orderId: string): Promise<OrderResponse> => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    return response.data;
  };

  const {
    data: orderData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['supplier_order', order_id],
    queryFn: () => fetchOrderDetails(order_id!),
    enabled: !!order_id && !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    select: (data) => {
      // Filter items to only show supplier's items
      const filtered_items = data.items.filter(item => item.supplier_id === supplierId);
      
      // Calculate supplier subtotal
      const supplier_subtotal = filtered_items.reduce((sum, item) => sum + item.line_total, 0);
      
      return {
        ...data,
        items: filtered_items,
        supplier_subtotal
      };
    }
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Update Order Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_order', order_id] });
    }
  });

  // Update Delivery Mutation
  const updateDeliveryMutation = useMutation({
    mutationFn: async (deliveryData: { tracking_number: string; carrier: string; delivery_status?: string }) => {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/deliveries/${orderData?.delivery?.delivery_id}`,
        deliveryData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_order', order_id] });
      setShowTrackingForm(false);
      setTrackingNumber('');
      setCarrier('');
    }
  });

  // Contact Customer Mutation
  const contactCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/chat/conversations`,
        {
          conversation_type: 'customer_supplier',
          customer_id: customerId,
          related_entity_type: 'order',
          related_entity_id: order_id
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      navigate('/supplier/messages');
    }
  });

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const order_details = orderData?.order;
  const order_items = orderData?.items || [];
  const delivery_details = orderData?.delivery;
  const order_timeline = orderData?.timeline || [];
  const supplier_subtotal = orderData?.supplier_subtotal || 0;

  // Extract customer info from joined data (simulated from backend response)
  const customer_info: CustomerInfo | null = order_details ? {
    customer_id: order_details.customer_id,
    first_name: 'Customer', // Would come from backend join
    last_name: 'Name',
    phone_number: '+1 (555) 000-0000',
    email: 'customer@example.com',
    account_type: 'trade'
  } : null;

  // Calculate available actions
  const available_actions = order_details ? {
    can_accept: order_details.status === 'pending',
    can_reject: order_details.status === 'pending',
    can_ship: order_details.status === 'processing',
    can_update_tracking: ['shipped', 'in_transit'].includes(order_details.status),
    can_contact_customer: true
  } : {
    can_accept: false,
    can_reject: false,
    can_ship: false,
    can_update_tracking: false,
    can_contact_customer: false
  };

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleAcceptOrder = () => {
    if (window.confirm('Accept this order and start processing?')) {
      updateStatusMutation.mutate('processing');
    }
  };

  const handleRejectOrder = () => {
    if (window.confirm('Are you sure you want to reject this order? This cannot be undone.')) {
      updateStatusMutation.mutate('cancelled');
    }
  };

  const handleMarkAsShipped = () => {
    if (!trackingNumber || !carrier) {
      alert('Please enter tracking number and carrier before marking as shipped');
      return;
    }
    
    updateDeliveryMutation.mutate({
      tracking_number: trackingNumber,
      carrier: carrier,
      delivery_status: 'out_for_delivery'
    });
    
    updateStatusMutation.mutate('shipped');
  };

  const handleUpdateTracking = () => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!trackingNumber) {
      alert('Please enter a tracking number');
      return;
    }
    
    updateDeliveryMutation.mutate({
      tracking_number: trackingNumber,
      carrier: carrier || 'Standard Carrier'
    });
  };

  const handleContactCustomer = () => {
    if (customer_info) {
      contactCustomerMutation.mutate(customer_info.customer_id);
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800 border-orange-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      in_transit: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Error Loading Order</h2>
              <p className="text-red-700 mb-6">
                {axios.isAxiosError(error) && error.response?.status === 404
                  ? 'Order not found. It may have been deleted or you do not have access to it.'
                  : 'Failed to load order details. Please try again.'}
              </p>
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => refetch()}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
                <Link
                  to="/supplier/orders"
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Back to Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!order_details) {
    return null;
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="mb-8">
            <Link
              to="/supplier/orders"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Order {order_details.order_number}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatDate(order_details.order_date)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order_details.status)}`}
                  >
                    {order_details.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                {available_actions.can_accept && !showAcceptForm && (
                  <button
                    onClick={() => setShowAcceptForm(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl flex items-center"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Accept Order
                  </button>
                )}
                
                {available_actions.can_reject && (
                  <button
                    onClick={handleRejectOrder}
                    disabled={updateStatusMutation.isPending}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Reject Order
                  </button>
                )}
                
                {available_actions.can_ship && (
                  <button
                    onClick={() => setShowTrackingForm(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl flex items-center"
                  >
                    <Truck className="w-5 h-5 mr-2" />
                    Mark as Shipped
                  </button>
                )}
                
                {available_actions.can_contact_customer && (
                  <button
                    onClick={handleContactCustomer}
                    disabled={contactCustomerMutation.isPending}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Contact Customer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Accept Order Form */}
          {showAcceptForm && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Accept Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Fulfillment Date
                  </label>
                  <input
                    type="date"
                    value={estimatedShipDate}
                    onChange={(e) => setEstimatedShipDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={supplierNotes}
                    onChange={(e) => setSupplierNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes for the customer..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleAcceptOrder}
                    disabled={updateStatusMutation.isPending}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateStatusMutation.isPending ? 'Accepting...' : 'Confirm Accept'}
                  </button>
                  <button
                    onClick={() => setShowAcceptForm(false)}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tracking Form */}
          {showTrackingForm && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Add Shipping Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking Number *
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carrier *
                  </label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="e.g., FedEx, UPS, USPS"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleMarkAsShipped}
                    disabled={updateDeliveryMutation.isPending || !trackingNumber || !carrier}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateDeliveryMutation.isPending ? 'Updating...' : 'Mark as Shipped'}
                  </button>
                  <button
                    onClick={() => setShowTrackingForm(false)}
                    className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mutation Error Display */}
          {(updateStatusMutation.isError || updateDeliveryMutation.isError || contactCustomerMutation.isError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm font-medium">
                Action failed. Please try again.
              </p>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Order Items Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Package className="w-6 h-6 mr-2 text-blue-600" />
                    Order Items ({order_items.length})
                  </h2>
                </div>
                
                <div className="p-6">
                  {order_items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No items from your inventory in this order</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {order_items.map((item) => (
                        <div
                          key={item.order_item_id}
                          className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-gray-900 mb-1">
                              {item.product_name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">SKU: {item.sku}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-700">
                              <span>Qty: {item.quantity}</span>
                              <span>×</span>
                              <span>{formatCurrency(item.price_per_unit)}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(item.line_total)}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Subtotal */}
                      <div className="border-t-2 border-gray-200 pt-4 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">
                            Supplier Subtotal
                          </span>
                          <span className="text-2xl font-bold text-blue-600">
                            {formatCurrency(supplier_subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Information Section */}
              {delivery_details && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Truck className="w-6 h-6 mr-2 text-blue-600" />
                      Delivery Details
                    </h2>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Delivery Window
                        </label>
                        <p className="text-base text-gray-900">
                          {formatDate(delivery_details.delivery_window_start)}
                        </p>
                        <p className="text-sm text-gray-600">
                          to {formatDate(delivery_details.delivery_window_end)}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Delivery Method
                        </label>
                        <p className="text-base text-gray-900 capitalize">
                          {delivery_details.delivery_method.replace('_', ' ')}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Delivery Fee
                        </label>
                        <p className="text-base text-gray-900">
                          {formatCurrency(delivery_details.delivery_fee)}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Delivery Status
                        </label>
                        <p className={`text-base font-medium capitalize ${
                          delivery_details.delivery_status === 'delivered' ? 'text-green-600' :
                          delivery_details.delivery_status === 'out_for_delivery' ? 'text-blue-600' :
                          'text-gray-900'
                        }`}>
                          {delivery_details.delivery_status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Tracking Information */}
                    {delivery_details.tracking_number ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-blue-900 mb-2">
                          Tracking Information
                        </label>
                        <div className="space-y-2">
                          <p className="text-base text-blue-900">
                            <span className="font-medium">Tracking #:</span> {delivery_details.tracking_number}
                          </p>
                          {delivery_details.carrier && (
                            <p className="text-base text-blue-900">
                              <span className="font-medium">Carrier:</span> {delivery_details.carrier}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : available_actions.can_update_tracking && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800 mb-3">
                          No tracking information added yet
                        </p>
                        <button
                          onClick={() => setShowTrackingForm(true)}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                        >
                          Add Tracking Info
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Timeline Section */}
              {order_timeline.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Order Timeline
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-4">
                      {order_timeline.map((event, index) => (
                        <div key={index} className="flex items-start">
                          <div className="flex-shrink-0 mr-4">
                            {event.status === 'completed' ? (
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <Clock className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <p className="text-base font-medium text-gray-900 capitalize">
                              {event.milestone.replace('_', ' ')}
                            </p>
                            {event.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {event.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(event.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Customer Information Card */}
              {customer_info && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <User className="w-6 h-6 mr-2 text-blue-600" />
                      Customer Information
                    </h2>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Name
                      </label>
                      <p className="text-base font-semibold text-gray-900">
                        {customer_info.first_name} {customer_info.last_name}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        Phone
                      </label>
                      <p className="text-base text-gray-900">
                        {customer_info.phone_number}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </label>
                      <p className="text-base text-gray-900 break-words">
                        {customer_info.email}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Account Type
                      </label>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        customer_info.account_type === 'trade' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {customer_info.account_type.toUpperCase()}
                      </span>
                    </div>
                    
                    <button
                      onClick={handleContactCustomer}
                      disabled={contactCustomerMutation.isPending}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      {contactCustomerMutation.isPending ? 'Opening Chat...' : 'Contact Customer'}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Information Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <DollarSign className="w-6 h-6 mr-2 text-blue-600" />
                    Payment Details
                  </h2>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="text-base font-semibold text-gray-900">
                      {formatCurrency(order_details.subtotal_amount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Delivery Fee</span>
                    <span className="text-base font-semibold text-gray-900">
                      {formatCurrency(order_details.delivery_fee_total)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Tax</span>
                    <span className="text-base font-semibold text-gray-900">
                      {formatCurrency(order_details.tax_amount)}
                    </span>
                  </div>
                  
                  {order_details.discount_amount > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Discount</span>
                      <span className="text-base font-semibold text-green-600">
                        -{formatCurrency(order_details.discount_amount)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t-2 border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        Total Amount
                      </span>
                      <span className="text-2xl font-bold text-blue-600">
                        {formatCurrency(order_details.total_amount)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Payment Method
                      </span>
                      <span className="text-sm text-gray-900 capitalize">
                        {order_details.payment_method.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Payment Status
                      </span>
                      <span className={`text-sm font-medium capitalize ${
                        order_details.payment_status === 'paid' ? 'text-green-600' :
                        order_details.payment_status === 'pending' ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {order_details.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Notes */}
              {order_details.customer_notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <h3 className="text-base font-semibold text-amber-900 mb-2 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Customer Notes
                  </h3>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {order_details.customer_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
