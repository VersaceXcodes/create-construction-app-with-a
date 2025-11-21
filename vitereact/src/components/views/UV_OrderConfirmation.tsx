import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { 
  CheckCircle, 
  Copy, 
  Package, 
  Truck, 
  FileText, 
  ShoppingBag,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Order {
  order_id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  status: string;
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

interface Delivery {
  delivery_id: string;
  order_id: string;
  supplier_id: string;
  delivery_window_start: string;
  delivery_window_end: string;
  delivery_method: string;
  delivery_fee: number;
  delivery_status: string;
}

interface OrderConfirmationResponse {
  order: Order;
  items: OrderItem[];
  delivery: Delivery | Delivery[];
  timeline?: any[];
}

interface OrderItemsBySupplier {
  [supplier_id: string]: {
    supplier_name: string;
    supplier_logo: string | null;
    items: Array<{
      order_item_id: string;
      product_id: string;
      product_name: string;
      sku: string;
      quantity: number;
      price_per_unit: number;
      line_total: number;
    }>;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchOrderConfirmation = async (order_id: string, auth_token: string): Promise<OrderConfirmationResponse> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get(
    `${API_BASE_URL}/api/orders/${order_id}`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

const downloadInvoice = async (order_id: string, auth_token: string): Promise<void> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get(
    `${API_BASE_URL}/api/orders/${order_id}/invoice`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
      },
      responseType: 'blob'
    }
  );
  
  // Create download link for PDF
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `invoice-${order_id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const groupOrderItemsBySupplier = (items: OrderItem[]): OrderItemsBySupplier => {
  const grouped: OrderItemsBySupplier = {};
  
  items.forEach(item => {
    if (!grouped[item.supplier_id]) {
      grouped[item.supplier_id] = {
        supplier_name: `Supplier ${item.supplier_id.slice(0, 8)}`, // Will be enriched from backend
        supplier_logo: null,
        items: []
      };
    }
    
    grouped[item.supplier_id].items.push({
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      price_per_unit: item.price_per_unit,
      line_total: item.line_total
    });
  });
  
  return grouped;
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDeliveryWindow = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
  
  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return `${dateStr} | ${startTime} - ${endTime}`;
};

const copyToClipboard = (text: string): void => {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy:', err);
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_OrderConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Get order_id from URL params
  const order_id = searchParams.get('order_id');
  
  // Local state for UI
  const [copied, setCopied] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  
  // Fetch order confirmation data
  const { 
    data: orderData, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['order-confirmation', order_id],
    queryFn: () => fetchOrderConfirmation(order_id!, authToken!),
    enabled: !!order_id && !!authToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
  
  // Redirect if no order_id
  useEffect(() => {
    if (!order_id) {
      navigate('/orders', { replace: true });
    }
  }, [order_id, navigate]);
  
  // Transform data
  const orderDetails = orderData?.order;
  const orderItemsBySupplier = orderData ? groupOrderItemsBySupplier(orderData.items) : {};
  const deliveryDetails = orderData?.delivery ? (Array.isArray(orderData.delivery) ? orderData.delivery : [orderData.delivery]) : [];
  
  // Handle copy order number
  const handleCopyOrderNumber = () => {
    if (orderDetails?.order_number) {
      copyToClipboard(orderDetails.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Handle download invoice
  const handleDownloadInvoice = async () => {
    if (orderDetails && authToken) {
      try {
        await downloadInvoice(orderDetails.order_id, authToken);
      } catch (err) {
        console.error('Failed to download invoice:', err);
      }
    }
  };
  
  // Handle track order
  const handleTrackOrder = () => {
    if (orderDetails) {
      navigate(`/orders/${orderDetails.order_id}`);
    }
  };
  
  // Handle continue shopping
  const handleContinueShopping = () => {
    navigate('/products');
  };
  
  // Handle print
  const handlePrint = () => {
    window.print();
  };
  
  // Toggle supplier group expansion
  const toggleSupplierExpansion = (supplier_id: string) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplier_id]: !prev[supplier_id]
    }));
  };
  
  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 animate-pulse">
              <div className="flex flex-col items-center space-y-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="h-8 bg-gray-200 rounded w-64"></div>
                <div className="h-6 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="mt-12 space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <div className="h-64 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // Error state
  if (error || !orderDetails) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Order Not Found
              </h2>
              <p className="text-gray-600 mb-6">
                We couldn't find the order confirmation you're looking for.
              </p>
              <button
                onClick={() => navigate('/orders')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                View My Orders
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <CheckCircle className="w-24 h-24 text-white animate-bounce" strokeWidth={2} />
                  <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20"></div>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Order Confirmed! 🎉
              </h1>
              <p className="text-xl text-green-50">
                Thank you for your order, {currentUser?.first_name || 'valued customer'}!
              </p>
            </div>
            
            {/* Order Number */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Number</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {orderDetails.order_number}
                  </p>
                </div>
                <button
                  onClick={handleCopyOrderNumber}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  aria-label="Copy order number"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Placed on {formatDateTime(orderDetails.order_date)}
              </p>
            </div>
          </div>
          
          {/* Estimated Delivery Section */}
          {deliveryDetails.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Estimated Delivery
                </h2>
              </div>
              
              <div className="space-y-4">
                {deliveryDetails.map((delivery) => {
                  const supplierGroup = orderItemsBySupplier[delivery.supplier_id];
                  
                  return (
                    <div key={delivery.delivery_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">
                            {supplierGroup?.supplier_name || 'Supplier'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDeliveryWindow(delivery.delivery_window_start, delivery.delivery_window_end)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Delivery Method: {delivery.delivery_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        <button
                          onClick={handleTrackOrder}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Track
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Order Summary
              </h2>
            </div>
            
            {/* Items Grouped by Supplier */}
            <div className="space-y-4">
              {Object.entries(orderItemsBySupplier).map(([supplier_id, group]) => {
                const isExpanded = expandedSuppliers[supplier_id] ?? true; // Default expanded
                
                return (
                  <div key={supplier_id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSupplierExpansion(supplier_id)}
                      className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{group.supplier_name}</p>
                          <p className="text-sm text-gray-600">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {group.items.map((item) => (
                          <div key={item.order_item_id} className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 mb-1">
                                {item.product_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                SKU: {item.sku}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span>Qty: {item.quantity}</span>
                                <span>×</span>
                                <span>${Number(item.price_per_unit || 0).toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                ${item.line_total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Pricing Breakdown */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${orderDetails.subtotal_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>${orderDetails.delivery_fee_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Taxes</span>
                  <span>${orderDetails.tax_amount.toFixed(2)}</span>
                </div>
                {orderDetails.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${orderDetails.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                  <span>Total Paid</span>
                  <span>${orderDetails.total_amount.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Payment Method:</span>{' '}
                  {orderDetails.payment_method === 'credit_card' && 'Credit Card'}
                  {orderDetails.payment_method === 'debit_card' && 'Debit Card'}
                  {orderDetails.payment_method === 'trade_credit' && 'Trade Credit'}
                </p>
              </div>
            </div>
          </div>
          
          {/* What Happens Next */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              What Happens Next
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Order Confirmed</p>
                  <p className="text-sm text-gray-600">Your order has been received and is being processed</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Supplier Preparing</p>
                  <p className="text-sm text-gray-600">Your supplier(s) will prepare your order within 24 hours</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Out for Delivery</p>
                  <p className="text-sm text-gray-600">You'll receive live GPS tracking when your order is on the way</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Delivered</p>
                  <p className="text-sm text-gray-600">Your order will arrive during the scheduled delivery window</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ✉️ You'll receive updates via email and SMS at every step
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleTrackOrder}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
              >
                <Truck className="w-5 h-5" />
                <span>Track Order</span>
              </button>
              
              <button
                onClick={handleDownloadInvoice}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span>Download Invoice</span>
              </button>
              
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
              
              <button
                onClick={handleContinueShopping}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
          
          {/* Customer Notes (if provided) */}
          {orderDetails.customer_notes && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Order Notes
              </h3>
              <p className="text-gray-700">
                {orderDetails.customer_notes}
              </p>
            </div>
          )}
          
          {/* Support Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mt-8">
            <div className="text-center">
              <p className="text-gray-700 mb-4">
                Need help with your order?
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/support')}
                  className="px-6 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  Contact Support
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Visit Help Center
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_OrderConfirmation;