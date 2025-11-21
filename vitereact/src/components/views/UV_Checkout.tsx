import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  CreditCard, 
  MapPin, 
  Truck, 
  Package, 
  Plus,
  Check,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Address {
  address_id: string;
  user_id: string;
  label: string | null;
  full_name: string;
  phone_number: string;
  street_address: string;
  apt_suite: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
}

interface PaymentMethod {
  payment_method_id: string;
  user_id: string;
  payment_type: string;
  card_brand: string | null;
  card_last_four: string | null;
  card_expiry_month: string | null;
  card_expiry_year: string | null;
  cardholder_name: string | null;
  billing_address_id: string | null;
  is_default: boolean;
}

interface CartItem {
  cart_item_id: string;
  product_id: string;
  supplier_id: string;
  quantity: number;
  price_per_unit: number;
  product_name?: string;
  primary_image_url?: string;
  supplier_name?: string;
  business_name?: string;
}

interface SupplierGroup {
  supplier_id: string;
  supplier_name: string;
  logo_url: string | null;
  items: CartItem[];
  supplier_subtotal: number;
}

interface NewAddressForm {
  full_name: string;
  phone_number: string;
  street_address: string;
  apt_suite: string;
  city: string;
  state: string;
  postal_code: string;
  delivery_instructions: string;
  address_type: string;
}

interface NewCardForm {
  card_number: string;
  card_expiry_month: string;
  card_expiry_year: string;
  cvv: string;
  cardholder_name: string;
  save_for_future: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const fetchCart = async (token: string) => {
  const { data } = await axios.get(`${API_BASE_URL}/cart`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const fetchAddresses = async (token: string) => {
  const { data } = await axios.get(`${API_BASE_URL}/addresses`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const fetchPaymentMethods = async (token: string) => {
  const { data } = await axios.get(`${API_BASE_URL}/payment-methods`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const createAddress = async (token: string, addressData: any) => {
  const { data } = await axios.post(`${API_BASE_URL}/addresses`, addressData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const createPaymentMethod = async (token: string, paymentData: any) => {
  const { data } = await axios.post(`${API_BASE_URL}/payment-methods`, paymentData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const createOrder = async (token: string, orderData: any) => {
  const { data } = await axios.post(`${API_BASE_URL}/orders`, orderData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Checkout: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const customerProfile = useAppStore(state => state.authentication_state.customer_profile);

  // Local state
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState<NewAddressForm>({
    full_name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
    phone_number: currentUser?.phone_number || '',
    street_address: '',
    apt_suite: '',
    city: '',
    state: '',
    postal_code: '',
    delivery_instructions: '',
    address_type: 'residential'
  });

  const [deliveryWindowsBySupplier, setDeliveryWindowsBySupplier] = useState<Record<string, string>>({});
  
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [usingTradeCredit, setUsingTradeCredit] = useState(false);
  const [newCardForm, setNewCardForm] = useState<NewCardForm>({
    card_number: '',
    card_expiry_month: '',
    card_expiry_year: '',
    cvv: '',
    cardholder_name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
    save_for_future: true
  });

  const [customerNotes, setCustomerNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showOrderReview, setShowOrderReview] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: cartData, isLoading: cartLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => fetchCart(authToken!),
    enabled: !!authToken,
    staleTime: 0 // Always fetch fresh cart data
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => fetchAddresses(authToken!),
    enabled: !!authToken
  });

  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => fetchPaymentMethods(authToken!),
    enabled: !!authToken
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const addAddressMutation = useMutation({
    mutationFn: (addressData: any) => createAddress(authToken!, addressData),
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddressId(newAddress.address_id);
      setShowNewAddressForm(false);
      setNewAddressForm({
        full_name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
        phone_number: currentUser?.phone_number || '',
        street_address: '',
        apt_suite: '',
        city: '',
        state: '',
        postal_code: '',
        delivery_instructions: '',
        address_type: 'residential'
      });
    },
    onError: (error: any) => {
      setValidationErrors(prev => ({ ...prev, address: error.response?.data?.message || 'Failed to add address' }));
    }
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: (paymentData: any) => createPaymentMethod(authToken!, paymentData),
    onSuccess: (newPaymentMethod) => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      setSelectedPaymentMethodId(newPaymentMethod.payment_method_id);
      setShowNewCardForm(false);
      setNewCardForm({
        card_number: '',
        card_expiry_month: '',
        card_expiry_year: '',
        cvv: '',
        cardholder_name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
        save_for_future: true
      });
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => createOrder(authToken!, orderData),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/order-confirmation?order_id=${order.order_id}`);
    },
    onError: (error: any) => {
      setValidationErrors(prev => ({ 
        ...prev, 
        submit: error.response?.data?.message || 'Failed to place order. Please try again.' 
      }));
    }
  });

  // ============================================================================
  // DERIVED STATE & CALCULATIONS
  // ============================================================================

  // Group cart items by supplier
  const supplierGroups: SupplierGroup[] = useMemo(() => {
    if (!cartData?.items) return [];
    
    const grouped: Record<string, SupplierGroup> = {};
    
    cartData.items.forEach((item: CartItem) => {
      if (!grouped[item.supplier_id]) {
        grouped[item.supplier_id] = {
          supplier_id: item.supplier_id,
          supplier_name: item.business_name || item.supplier_name || 'Unknown Supplier',
          logo_url: null,
          items: [],
          supplier_subtotal: 0
        };
      }
      
      grouped[item.supplier_id].items.push(item);
      grouped[item.supplier_id].supplier_subtotal += item.quantity * item.price_per_unit;
    });
    
    return Object.values(grouped);
  }, [cartData]);

  // Calculate order totals
  const orderTotals = useMemo(() => {
    const subtotal = supplierGroups.reduce((sum, group) => sum + group.supplier_subtotal, 0);
    
    // Delivery fee: $50 per supplier (simplified)
    const deliveryFeeTotal = supplierGroups.length * 50;
    
    // Tax: 8% (simplified)
    const taxAmount = (subtotal + deliveryFeeTotal) * 0.08;
    
    // Discount from promo (if any in cart)
    const discountAmount = 0;
    
    const totalAmount = subtotal + deliveryFeeTotal + taxAmount - discountAmount;
    
    return {
      subtotal_amount: subtotal,
      delivery_fee_total: deliveryFeeTotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount
    };
  }, [supplierGroups]);

  // Auto-select default address on load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a: Address) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.address_id);
    }
  }, [addresses, selectedAddressId]);

  // Auto-select default payment method
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethodId && !usingTradeCredit) {
      const defaultPm = paymentMethods.find((pm: PaymentMethod) => pm.is_default) || paymentMethods[0];
      setSelectedPaymentMethodId(defaultPm.payment_method_id);
    }
  }, [paymentMethods, selectedPaymentMethodId, usingTradeCredit]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleAddNewAddress = async () => {
    // Clear previous errors
    setValidationErrors(prev => {
      const { address: _address, ...rest } = prev;
      return rest;
    });

    // Validate
    if (!newAddressForm.full_name || !newAddressForm.phone_number || !newAddressForm.street_address || 
        !newAddressForm.city || !newAddressForm.state || !newAddressForm.postal_code) {
      setValidationErrors(prev => ({ ...prev, address: 'All required fields must be filled' }));
      return;
    }

    await addAddressMutation.mutateAsync({
      user_id: currentUser?.user_id,
      ...newAddressForm
    });
  };

  const handleSubmitOrder = async () => {
    // Clear previous errors
    setValidationErrors({});

    // Validate
    const errors: Record<string, string> = {};
    
    if (!selectedAddressId) {
      errors.address = 'Please select a delivery address';
    }
    
    // Check delivery windows selected for all suppliers
    const missingWindows = supplierGroups.filter(g => !deliveryWindowsBySupplier[g.supplier_id]);
    if (missingWindows.length > 0) {
      errors.delivery = `Please select delivery windows for all suppliers`;
    }
    
    if (!usingTradeCredit && !selectedPaymentMethodId && !showNewCardForm) {
      errors.payment = 'Please select a payment method';
    }
    
    if (showNewCardForm) {
      if (!newCardForm.card_number || newCardForm.card_number.length < 15) {
        errors.card_number = 'Valid card number required';
      }
      if (!newCardForm.card_expiry_month || !newCardForm.card_expiry_year) {
        errors.card_expiry = 'Valid expiry date required';
      }
      if (!newCardForm.cvv || newCardForm.cvv.length < 3) {
        errors.cvv = 'Valid CVV required';
      }
      if (!newCardForm.cardholder_name) {
        errors.cardholder_name = 'Cardholder name required';
      }
    }
    
    if (!termsAccepted) {
      errors.terms = 'You must accept the Terms of Service';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // If new card, create payment method first
      if (showNewCardForm && !usingTradeCredit) {
        await addPaymentMethodMutation.mutateAsync({
          user_id: currentUser?.user_id,
          payment_type: 'credit_card',
          card_brand: detectCardBrand(newCardForm.card_number),
          card_last_four: newCardForm.card_number.slice(-4),
          card_expiry_month: newCardForm.card_expiry_month,
          card_expiry_year: newCardForm.card_expiry_year,
          cardholder_name: newCardForm.cardholder_name,
          payment_token: `tok_${Date.now()}`, // Temporary token
          is_default: newCardForm.save_for_future
        });
      }

      // Build delivery windows array
      const deliveryWindows = Object.entries(deliveryWindowsBySupplier).map(([supplier_id]) => {
        // TODO: Get delivery window data from API
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const windowStart = new Date(tomorrow);
        windowStart.setHours(9, 0, 0);
        const windowEnd = new Date(tomorrow);
        windowEnd.setHours(12, 0, 0);
        
        return {
          supplier_id,
          delivery_window_start: windowStart.toISOString(),
          delivery_window_end: windowEnd.toISOString(),
          delivery_method: 'standard_delivery'
        };
      });

      // Submit order
      await createOrderMutation.mutateAsync({
        delivery_address_id: selectedAddressId,
        payment_method: usingTradeCredit ? 'trade_credit' : 'credit_card',
        customer_notes: customerNotes || null,
        promo_code_used: null,
        delivery_windows: deliveryWindows
      });
    } catch (error) {
      console.error('Order submission error:', error);
    }
  };

  const detectCardBrand = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    return 'Unknown';
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substring(0, 19);
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  const isLoading = cartLoading || addressesLoading || paymentMethodsLoading;
  const isSubmitting = createOrderMutation.isPending || addAddressMutation.isPending || addPaymentMethodMutation.isPending;

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 sticky top-24">
                    <div className="h-6 bg-gray-200 rounded w-32"></div>
                    <div className="h-48 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Redirect if cart is empty
  if (!cartData?.items || cartData.items.length === 0) {
    navigate('/cart');
    return null;
  }

  const selectedAddress = addresses.find((a: Address) => a.address_id === selectedAddressId);
  // const selectedPaymentMethod = paymentMethods.find((pm: PaymentMethod) => pm.payment_method_id === selectedPaymentMethodId);
  const tradeCreditAvailable = customerProfile?.trade_credit_balance || 0;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="mt-2 text-sm text-gray-600">Complete your order securely</p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Cart</span>
              </div>
              <div className="w-16 h-0.5 bg-blue-600"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">Checkout</span>
              </div>
              <div className="w-16 h-0.5 bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <span className="ml-2 text-sm font-medium text-gray-500">Confirmation</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Form Sections */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section 1: Delivery Address */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <MapPin className="w-6 h-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Delivery Address</h2>
                </div>

                {validationErrors.address && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{validationErrors.address}</p>
                  </div>
                )}

                {addresses.length > 0 && !showNewAddressForm && (
                  <div className="space-y-3">
                    {addresses.map((address: Address) => (
                      <label
                        key={address.address_id}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedAddressId === address.address_id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={address.address_id}
                          checked={selectedAddressId === address.address_id}
                          onChange={() => setSelectedAddressId(address.address_id)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{address.full_name}</span>
                            {address.is_default && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {address.street_address}
                            {address.apt_suite && `, ${address.apt_suite}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {address.city}, {address.state} {address.postal_code}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{address.phone_number}</p>
                          {address.delivery_instructions && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              Note: {address.delivery_instructions}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {showNewAddressForm && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={newAddressForm.full_name}
                          onChange={(e) => setNewAddressForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={newAddressForm.phone_number}
                          onChange={(e) => setNewAddressForm(prev => ({ ...prev, phone_number: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={newAddressForm.street_address}
                        onChange={(e) => setNewAddressForm(prev => ({ ...prev, street_address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Apt/Suite
                        </label>
                        <input
                          type="text"
                          value={newAddressForm.apt_suite}
                          onChange={(e) => setNewAddressForm(prev => ({ ...prev, apt_suite: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          value={newAddressForm.city}
                          onChange={(e) => setNewAddressForm(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          value={newAddressForm.state}
                          onChange={(e) => setNewAddressForm(prev => ({ ...prev, state: e.target.value }))}
                          maxLength={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          value={newAddressForm.postal_code}
                          onChange={(e) => setNewAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Instructions
                      </label>
                      <textarea
                        value={newAddressForm.delivery_instructions}
                        onChange={(e) => setNewAddressForm(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Leave at back door, call on arrival"
                      />
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={handleAddNewAddress}
                        disabled={addAddressMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {addAddressMutation.isPending ? 'Saving...' : 'Save Address'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!showNewAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(true)}
                    className="mt-4 flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add New Address
                  </button>
                )}
              </div>

              {/* Section 2: Delivery Scheduling */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <Truck className="w-6 h-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Delivery Scheduling</h2>
                </div>

                {validationErrors.delivery && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{validationErrors.delivery}</p>
                  </div>
                )}

                {selectedAddress && (
                  <div className="mb-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="font-medium text-blue-900">Delivering to:</p>
                    <p className="text-blue-700">
                      {selectedAddress.street_address}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  {supplierGroups.map((group) => (
                    <div key={group.supplier_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">{group.supplier_name}</h3>
                        <span className="text-sm text-gray-500">
                          {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        {/* Delivery windows */}
                        {['morning', 'afternoon'].map((period) => {
                          const windowId = `${group.supplier_id}_${period}`;
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const dateStr = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          const timeStr = period === 'morning' ? '9AM - 12PM' : '1PM - 5PM';
                          
                          return (
                            <label
                              key={windowId}
                              className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                deliveryWindowsBySupplier[group.supplier_id] === windowId
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`delivery_${group.supplier_id}`}
                                value={windowId}
                                checked={deliveryWindowsBySupplier[group.supplier_id] === windowId}
                                onChange={() => setDeliveryWindowsBySupplier(prev => ({
                                  ...prev,
                                  [group.supplier_id]: windowId
                                }))}
                                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3 flex-1">
                                <div className="font-medium text-gray-900">{dateStr}</div>
                                <div className="text-sm text-gray-600">{timeStr}</div>
                                <div className="text-sm text-gray-500 mt-1">$50.00 delivery</div>
                              </div>
                              {deliveryWindowsBySupplier[group.supplier_id] === windowId && (
                                <Check className="w-5 h-5 text-blue-600 ml-2" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Review Order */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <button
                  type="button"
                  onClick={() => setShowOrderReview(!showOrderReview)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <div className="flex items-center">
                    <Package className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-xl font-semibold text-gray-900">Review Your Order</h2>
                  </div>
                  {showOrderReview ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {showOrderReview && (
                  <div className="space-y-4 pt-2">
                    {supplierGroups.map((group) => (
                      <div key={group.supplier_id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">{group.supplier_name}</h3>
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <div key={item.cart_item_id} className="flex items-center space-x-3">
                              {item.primary_image_url && (
                                <img
                                  src={item.primary_image_url}
                                  alt={item.product_name}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.product_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Qty: {item.quantity} × ${item.price_per_unit.toFixed(2)}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-gray-900">
                                ${(item.quantity * item.price_per_unit).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
                          <span className="text-sm font-medium text-gray-700">Supplier Subtotal</span>
                          <span className="text-sm font-semibold text-gray-900">
                            ${group.supplier_subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Payment Method */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <div className="flex items-center mb-6">
                  <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                </div>

                {validationErrors.payment && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{validationErrors.payment}</p>
                  </div>
                )}

                {/* Trade Credit Option */}
                {tradeCreditAvailable > 0 && customerProfile?.account_type === 'trade' && (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="flex items-start cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usingTradeCredit}
                        onChange={(e) => {
                          setUsingTradeCredit(e.target.checked);
                          if (e.target.checked) {
                            setSelectedPaymentMethodId(null);
                            setShowNewCardForm(false);
                          }
                        }}
                        className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-semibold text-green-900">Use Trade Credit</div>
                        <div className="text-sm text-green-700 mt-1">
                          Available: ${tradeCreditAvailable.toFixed(2)} | Terms: Net 30 Days
                        </div>
                        {orderTotals.total_amount > tradeCreditAvailable && (
                          <div className="text-xs text-green-600 mt-2">
                            ${orderTotals.total_amount.toFixed(2)} exceeds available credit. Additional payment required.
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                {!usingTradeCredit && (
                  <>
                    {/* Saved Payment Methods */}
                    {paymentMethods.length > 0 && !showNewCardForm && (
                      <div className="space-y-3 mb-4">
                        {paymentMethods.map((pm: PaymentMethod) => (
                          <label
                            key={pm.payment_method_id}
                            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedPaymentMethodId === pm.payment_method_id
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="payment"
                              value={pm.payment_method_id}
                              checked={selectedPaymentMethodId === pm.payment_method_id}
                              onChange={() => setSelectedPaymentMethodId(pm.payment_method_id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="ml-3 flex-1 flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {pm.card_brand} •••• {pm.card_last_four}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Expires {pm.card_expiry_month}/{pm.card_expiry_year}
                                </div>
                              </div>
                              {pm.is_default && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Default</span>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* New Card Form */}
                    {showNewCardForm && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Card Number *
                          </label>
                          <input
                            type="text"
                            value={newCardForm.card_number}
                            onChange={(e) => {
                              const formatted = formatCardNumber(e.target.value);
                              setNewCardForm(prev => ({ ...prev, card_number: formatted }));
                              setValidationErrors(prev => {
                                const { card_number: _card_number, ...rest } = prev;
                                return rest;
                              });
                            }}
                            maxLength={19}
                            placeholder="1234 5678 9012 3456"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              validationErrors.card_number ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                          {validationErrors.card_number && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.card_number}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Month *
                            </label>
                            <input
                              type="text"
                              value={newCardForm.card_expiry_month}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').substring(0, 2);
                                setNewCardForm(prev => ({ ...prev, card_expiry_month: value }));
                              }}
                              placeholder="MM"
                              maxLength={2}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.card_expiry ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Year *
                            </label>
                            <input
                              type="text"
                              value={newCardForm.card_expiry_year}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                                setNewCardForm(prev => ({ ...prev, card_expiry_year: value }));
                              }}
                              placeholder="YYYY"
                              maxLength={4}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.card_expiry ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              CVV *
                            </label>
                            <input
                              type="text"
                              value={newCardForm.cvv}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                                setNewCardForm(prev => ({ ...prev, cvv: value }));
                              }}
                              placeholder="123"
                              maxLength={4}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                validationErrors.cvv ? 'border-red-300' : 'border-gray-300'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cardholder Name *
                          </label>
                          <input
                            type="text"
                            value={newCardForm.cardholder_name}
                            onChange={(e) => setNewCardForm(prev => ({ ...prev, cardholder_name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newCardForm.save_for_future}
                            onChange={(e) => setNewCardForm(prev => ({ ...prev, save_for_future: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Save this card for future purchases</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCardForm(false);
                            setNewCardForm({
                              card_number: '',
                              card_expiry_month: '',
                              card_expiry_year: '',
                              cvv: '',
                              cardholder_name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(),
                              save_for_future: true
                            });
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {!showNewCardForm && !usingTradeCredit && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCardForm(true);
                          setSelectedPaymentMethodId(null);
                        }}
                        className="flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add New Card
                      </button>
                    )}
                  </>
                )}

                {/* Security Badges */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-center space-x-6 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Lock className="w-4 h-4 mr-1" />
                    SSL Secure
                  </div>
                  <div>PCI Compliant</div>
                </div>
              </div>

              {/* Section 5: Order Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Notes (Optional)</h2>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Any special instructions? (e.g., gate code, preferred contact time)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">{customerNotes.length}/1000 characters</p>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 lg:p-8 sticky top-24">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cartData?.total_items || 0} items)</span>
                    <span className="font-medium text-gray-900">${orderTotals.subtotal_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fees</span>
                    <span className="font-medium text-gray-900">${orderTotals.delivery_fee_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Estimated Tax</span>
                    <span className="font-medium text-gray-900">${orderTotals.tax_amount.toFixed(2)}</span>
                  </div>
                  {orderTotals.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="font-medium text-green-600">-${orderTotals.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${orderTotals.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Terms Acceptance */}
                <div className="mb-6">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        setValidationErrors(prev => {
                          const { terms: _terms, ...rest } = prev;
                          return rest;
                        });
                      }}
                      className={`mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                        validationErrors.terms ? 'border-red-300' : ''
                      }`}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-700 underline">
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700 underline">
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                  {validationErrors.terms && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.terms}</p>
                  )}
                </div>

                {/* Submit Error */}
                {validationErrors.submit && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{validationErrors.submit}</p>
                  </div>
                )}

                {/* Place Order Button */}
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Place Order • ${orderTotals.total_amount.toFixed(2)}
                    </>
                  )}
                </button>

                {/* Trust Indicators */}
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2 text-xs text-gray-500">
                  <div className="flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 mr-2" />
                    <span>Secure 256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 mr-2" />
                    <span>PCI DSS compliant payments</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 mr-2" />
                    <span>100% purchase protection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Checkout;