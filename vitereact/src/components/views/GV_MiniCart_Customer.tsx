import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { X, Trash2, ShoppingCart, Minus, Plus, Tag } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CartItemDetail {
  cart_item_id: string;
  product_id: string;
  product_name: string;
  supplier_id: string;
  quantity: number;
  price_per_unit: number;
  primary_image_url: string | null;
  stock_quantity: number;
}

interface GroupedCartItems {
  supplier_id: string;
  supplier_name: string;
  supplier_logo: string | null;
  items: CartItemDetail[];
  supplier_subtotal: number;
}

interface CartData {
  cart: {
    cart_id: string;
    customer_id: string;
    status: string;
  };
  items: Array<{
    cart_item_id: string;
    product_id: string;
    product_name: string;
    supplier_id: string;
    quantity: number;
    price_per_unit: number;
    primary_image_url: string | null;
    stock_quantity: number;
    business_name?: string;
  }>;
  subtotal: number;
  total_items: number;
}

interface PromoValidationRequest {
  promo_code: string;
  cart_total: number;
}

interface PromoValidationResponse {
  valid: boolean;
  promotion?: {
    promotion_id: string;
    promo_code: string;
    discount_type: string;
    discount_value: number;
  } | null;
  discount_amount: number;
  message: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_MiniCart_Customer: React.FC = () => {
  // ============================================================================
  // ZUSTAND STATE (CRITICAL: Individual selectors only)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const userType = useAppStore(state => state.authentication_state.authentication_status.user_type);
  const fetchCartGlobal = useAppStore(state => state.fetch_cart);
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [isOpen, setIsOpen] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    promotion_id: string;
    promo_code: string;
    discount_amount: number;
  } | null>(null);
  const [showPromoSection, setShowPromoSection] = useState(false);

  const queryClient = useQueryClient();

  // ============================================================================
  // FETCH CART DATA (React Query)
  // ============================================================================
  
  const { data: cartData, isLoading: isLoadingCart } = useQuery<CartData>({
    queryKey: ['cart'],
    queryFn: async () => {
      if (!authToken) throw new Error('Not authenticated');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      return response.data;
    },
    enabled: !!authToken && isAuthenticated && userType === 'customer',
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: 1,
    select: (data) => ({
      ...data,
      subtotal: Number(data.subtotal || 0),
      total_items: Number(data.total_items || 0)
    })
  });

  // ============================================================================
  // GROUP ITEMS BY SUPPLIER
  // ============================================================================
  
  const groupedItems: GroupedCartItems[] = React.useMemo(() => {
    if (!cartData?.items) return [];

    const groups: Record<string, GroupedCartItems> = {};

    cartData.items.forEach(item => {
      const supplierId = item.supplier_id;
      
      if (!groups[supplierId]) {
        groups[supplierId] = {
          supplier_id: supplierId,
          supplier_name: item.business_name || 'Unknown Supplier',
          supplier_logo: null,
          items: [],
          supplier_subtotal: 0
        };
      }

      groups[supplierId].items.push({
        cart_item_id: item.cart_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        supplier_id: item.supplier_id,
        quantity: item.quantity,
        price_per_unit: Number(item.price_per_unit || 0),
        primary_image_url: item.primary_image_url,
        stock_quantity: Number(item.stock_quantity || 0)
      });

      groups[supplierId].supplier_subtotal += item.quantity * Number(item.price_per_unit || 0);
    });

    return Object.values(groups);
  }, [cartData?.items]);

  // ============================================================================
  // CALCULATE CART TOTALS
  // ============================================================================
  
  const cartTotals = React.useMemo(() => {
    const subtotal = Number(cartData?.subtotal || 0);
    const deliveryFee = 0; // Calculated at checkout
    const tax = 0; // Calculated at checkout
    const discount = Number(appliedPromo?.discount_amount || 0);
    const total = subtotal + deliveryFee + tax - discount;

    return {
      subtotal_amount: subtotal,
      delivery_fee_total: deliveryFee,
      tax_amount: tax,
      discount_amount: discount,
      total_amount: total,
      total_items: Number(cartData?.total_items || 0)
    };
  }, [cartData, appliedPromo]);

  // ============================================================================
  // UPDATE CART ITEM QUANTITY MUTATION
  // ============================================================================
  
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ cart_item_id, quantity }: { cart_item_id: string; quantity: number }) => {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart/items/${cart_item_id}`,
        { quantity },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onMutate: async ({ cart_item_id }) => {
      setUpdatingItemId(cart_item_id);
      setErrorMessage(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (fetchCartGlobal) {
        fetchCartGlobal();
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to update quantity');
    },
    onSettled: () => {
      setUpdatingItemId(null);
    }
  });

  // ============================================================================
  // REMOVE CART ITEM MUTATION
  // ============================================================================
  
  const removeItemMutation = useMutation({
    mutationFn: async (cart_item_id: string) => {
      await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/cart/items/${cart_item_id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    },
    onMutate: async (cart_item_id) => {
      setUpdatingItemId(cart_item_id);
      setErrorMessage(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (fetchCartGlobal) {
        fetchCartGlobal();
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to remove item');
    },
    onSettled: () => {
      setUpdatingItemId(null);
    }
  });

  // ============================================================================
  // APPLY PROMO CODE MUTATION
  // ============================================================================
  
  const applyPromoMutation = useMutation({
    mutationFn: async (data: PromoValidationRequest) => {
      const response = await axios.post<PromoValidationResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/promotions/validate`,
        data,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid && data.promotion) {
        setAppliedPromo({
          promotion_id: data.promotion.promotion_id,
          promo_code: data.promotion.promo_code,
          discount_amount: Number(data.discount_amount || 0)
        });
        setPromoCodeInput('');
        setPromoError(null);
      } else {
        setPromoError(data.message || 'Invalid promo code');
      }
    },
    onError: (error: any) => {
      setPromoError(error.response?.data?.message || 'Failed to apply promo code');
    }
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleUpdateQuantity = (cart_item_id: string, newQuantity: number, maxStock: number) => {
    if (newQuantity < 1 || newQuantity > maxStock) return;
    
    updateQuantityMutation.mutate({ cart_item_id, quantity: newQuantity });
  };

  const handleRemoveItem = (cart_item_id: string) => {
    removeItemMutation.mutate(cart_item_id);
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    
    if (!promoCodeInput.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }

    applyPromoMutation.mutate({
      promo_code: promoCodeInput.toUpperCase(),
      cart_total: cartTotals.subtotal_amount
    });
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrorMessage(null);
    setPromoError(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ============================================================================
  // LISTEN TO GLOBAL CART STATE (for opening cart)
  // ============================================================================
  
  useEffect(() => {
    // This component can be opened via global state or events
    // For now, we'll use a custom event pattern
    const handleOpenCart = () => setIsOpen(true);
    
    window.addEventListener('openMiniCart', handleOpenCart);
    
    return () => {
      window.removeEventListener('openMiniCart', handleOpenCart);
    };
  }, []);

  // Don't render if not authenticated or not customer
  if (!isAuthenticated || userType !== 'customer') {
    return null;
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      {/* Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
          onClick={handleBackdropClick}
          aria-label="Close cart"
        >
          {/* Sidebar Panel */}
          <div 
            className="fixed top-0 right-0 h-full w-full lg:w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ====================================== */}
            {/* HEADER */}
            {/* ====================================== */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
                {cartTotals.total_items > 0 && (
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {cartTotals.total_items} {cartTotals.total_items === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close cart"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* ====================================== */}
            {/* ERROR MESSAGE */}
            {/* ====================================== */}
            {errorMessage && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* ====================================== */}
            {/* CART ITEMS (Scrollable) */}
            {/* ====================================== */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoadingCart ? (
                // Loading State
                <div className="space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                      <div className="flex space-x-4">
                        <div className="h-16 w-16 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !cartData || groupedItems.length === 0 ? (
                // Empty Cart State
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-sm text-gray-600 mb-6">Start adding products to get started!</p>
                  <Link
                    to="/products"
                    onClick={handleClose}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                // Cart Items Grouped by Supplier
                <div className="space-y-6">
                  {groupedItems.map((group) => (
                    <div key={group.supplier_id} className="space-y-3">
                      {/* Supplier Header */}
                      <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                        {group.supplier_logo && (
                          <img 
                            src={group.supplier_logo} 
                            alt={group.supplier_name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <h3 className="text-sm font-semibold text-gray-900">{group.supplier_name}</h3>
                        <Link
                          to={`/supplier/${group.supplier_id}`}
                          onClick={handleClose}
                          className="text-xs text-blue-600 hover:text-blue-700 ml-auto"
                        >
                          View Shop
                        </Link>
                      </div>

                      {/* Items from this Supplier */}
                      <div className="space-y-3">
                        {group.items.map((item) => {
                          const isUpdating = updatingItemId === item.cart_item_id;
                          const stockWarning = item.stock_quantity < item.quantity;
                          
                          return (
                            <div 
                              key={item.cart_item_id}
                              className="flex space-x-3 p-3 bg-gray-50 rounded-lg relative"
                            >
                              {/* Product Image */}
                              <Link
                                to={`/product/${item.product_id}`}
                                onClick={handleClose}
                                className="flex-shrink-0"
                              >
                                {item.primary_image_url ? (
                                  <img
                                    src={item.primary_image_url}
                                    alt={item.product_name}
                                    className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <ShoppingCart className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </Link>

                              {/* Item Details */}
                              <div className="flex-1 min-w-0">
                                <Link
                                  to={`/product/${item.product_id}`}
                                  onClick={handleClose}
                                  className="block"
                                >
                                  <h4 className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                                    {item.product_name}
                                  </h4>
                                </Link>
                                
                                <div className="mt-1 flex items-center space-x-2">
                                  <span className="text-sm font-semibold text-gray-900">
                                    ${Number(item.price_per_unit || 0).toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500">per unit</span>
                                </div>

                                {/* Stock Warning */}
                                {stockWarning && (
                                  <div className="mt-1 text-xs text-amber-600 font-medium">
                                    Only {item.stock_quantity} left in stock
                                  </div>
                                )}

                                {/* Quantity Controls */}
                                <div className="mt-2 flex items-center space-x-2">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity - 1, item.stock_quantity)}
                                    disabled={item.quantity <= 1 || isUpdating}
                                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="h-4 w-4 text-gray-600" />
                                  </button>
                                  
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val)) {
                                        handleUpdateQuantity(item.cart_item_id, val, item.stock_quantity);
                                      }
                                    }}
                                    min="1"
                                    max={item.stock_quantity}
                                    disabled={isUpdating}
                                    className="w-12 text-center py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="Quantity"
                                  />
                                  
                                  <button
                                    onClick={() => handleUpdateQuantity(item.cart_item_id, item.quantity + 1, item.stock_quantity)}
                                    disabled={item.quantity >= item.stock_quantity || isUpdating}
                                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-4 w-4 text-gray-600" />
                                  </button>

                                  <div className="flex-1"></div>

                                  {/* Line Total */}
                                  <span className="text-sm font-semibold text-gray-900">
                                    ${(item.quantity * Number(item.price_per_unit || 0)).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Remove Button */}
                              <button
                                onClick={() => handleRemoveItem(item.cart_item_id)}
                                disabled={isUpdating}
                                className="absolute top-3 right-3 p-1 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                                aria-label="Remove item"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>

                              {/* Loading Overlay */}
                              {isUpdating && (
                                <div className="absolute inset-0 bg-white/60 rounded-lg flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ====================================== */}
            {/* FOOTER (Sticky) */}
            {/* ====================================== */}
            {cartData && groupedItems.length > 0 && (
              <div className="border-t border-gray-200 bg-white px-6 py-4 space-y-4">
                {/* Promo Code Section */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPromoSection(!showPromoSection)}
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Tag className="h-4 w-4" />
                    <span>Have a promo code?</span>
                  </button>

                  {showPromoSection && (
                    <div className="space-y-2">
                      <form onSubmit={handleApplyPromo} className="flex space-x-2">
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => {
                            setPromoCodeInput(e.target.value.toUpperCase());
                            setPromoError(null);
                          }}
                          placeholder="Enter code"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={!promoCodeInput.trim() || applyPromoMutation.isPending}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Apply
                        </button>
                      </form>

                      {promoError && (
                        <p className="text-xs text-red-600">{promoError}</p>
                      )}

                      {appliedPromo && (
                        <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              {appliedPromo.promo_code}
                            </span>
                          </div>
                          <button
                            onClick={handleRemovePromo}
                            className="text-xs text-green-600 hover:text-green-700 underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cart Totals */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">
                      ${cartTotals.subtotal_amount.toFixed(2)}
                    </span>
                  </div>

                  {appliedPromo && appliedPromo.discount_amount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600">Discount</span>
                      <span className="font-semibold text-green-600">
                        -${appliedPromo.discount_amount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 italic">
                    Taxes and delivery calculated at checkout
                  </p>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-blue-600">
                        ${cartTotals.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Link
                    to="/checkout"
                    onClick={handleClose}
                    className="block w-full py-3 px-6 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                  >
                    Proceed to Checkout
                  </Link>

                  <Link
                    to="/cart"
                    onClick={handleClose}
                    className="block w-full py-3 px-6 bg-gray-100 text-gray-900 text-center font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    View Full Cart
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center space-x-4 pt-2">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>100% Satisfaction</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GV_MiniCart_Customer;