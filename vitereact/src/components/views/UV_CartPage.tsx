import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { ShoppingCart, Trash2, Plus, Minus, Tag, Save, X, AlertCircle, Package, ArrowRight, Loader2 } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CartItem {
  cart_item_id: string;
  cart_id: string;
  product_id: string;
  supplier_id: string;
  quantity: number;
  price_per_unit: number;
  added_date: string;
  product_name?: string;
  sku?: string;
  primary_image_url?: string;
  stock_quantity?: number;
  product_status?: string;
  business_name?: string;
}

interface Cart {
  cart_id: string;
  customer_id: string;
  created_date: string;
  last_modified_date: string;
  status: string;
}

interface SupplierGroup {
  supplier_info: {
    supplier_id: string;
    business_name: string;
    logo_url: string | null;
  };
  items: CartItem[];
  supplier_subtotal: number;
}

interface CartSummary {
  items_subtotal: number;
  total_delivery_fees: number;
  estimated_tax: number;
  promo_discount: number;
  grand_total: number;
  total_item_count: number;
  total_supplier_count: number;
}

interface AppliedPromo {
  promotion_id: string;
  promo_code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_applied: number;
}

interface StockWarning {
  cart_item_id: string;
  warning_type: 'stock_reduced' | 'out_of_stock' | 'price_changed';
  message: string;
}

interface Product {
  product_id: string;
  product_name: string;
  price_per_unit: number;
  primary_image_url: string | null;
  stock_quantity: number;
  supplier_id: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const groupCartItemsBySupplier = (items: CartItem[]): Record<string, SupplierGroup> => {
  const grouped: Record<string, SupplierGroup> = {};
  
  items.forEach(item => {
    if (!grouped[item.supplier_id]) {
      grouped[item.supplier_id] = {
        supplier_info: {
          supplier_id: item.supplier_id,
          business_name: item.business_name || 'Unknown Supplier',
          logo_url: null
        },
        items: [],
        supplier_subtotal: 0
      };
    }
    
    grouped[item.supplier_id].items.push(item);
    grouped[item.supplier_id].supplier_subtotal += (item.quantity * item.price_per_unit);
  });
  
  return grouped;
};

const calculateCartSummary = (itemsBySupplier: Record<string, SupplierGroup>, appliedPromo: AppliedPromo | null): CartSummary => {
  const items_subtotal = Object.values(itemsBySupplier).reduce((sum, group) => sum + group.supplier_subtotal, 0);
  const total_item_count = Object.values(itemsBySupplier).reduce((sum, group) => 
    sum + group.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const total_supplier_count = Object.keys(itemsBySupplier).length;
  
  // Estimated delivery fees ($50 per supplier for MVP)
  const total_delivery_fees = total_supplier_count * 50;
  
  // Tax calculation (8% for MVP)
  const estimated_tax = items_subtotal * 0.08;
  
  // Promo discount
  const promo_discount = appliedPromo?.discount_applied || 0;
  
  // Grand total
  const grand_total = items_subtotal + total_delivery_fees + estimated_tax - promo_discount;
  
  return {
    items_subtotal,
    total_delivery_fees,
    estimated_tax,
    promo_discount,
    grand_total,
    total_item_count,
    total_supplier_count
  };
};

const detectStockWarnings = (items: CartItem[]): StockWarning[] => {
  const warnings: StockWarning[] = [];
  
  items.forEach(item => {
    // Stock reduced warning
    if (item.stock_quantity !== undefined && item.stock_quantity < item.quantity) {
      warnings.push({
        cart_item_id: item.cart_item_id,
        warning_type: item.stock_quantity === 0 ? 'out_of_stock' : 'stock_reduced',
        message: item.stock_quantity === 0 
          ? `${item.product_name} is now out of stock`
          : `Only ${item.stock_quantity} units available (you have ${item.quantity} in cart)`
      });
    }
  });
  
  return warnings;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_CartPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const customerId = useAppStore(state => state.authentication_state.current_user?.user_id);
  const fetchGlobalCart = useAppStore(state => state.fetch_cart);
  
  // Local state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [saveProjectModalOpen, setSaveProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [itemsToRemove, setItemsToRemove] = useState<Set<string>>(new Set());
  
  const API_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  // Fetch cart data
  const { data: cartData, isLoading, error, refetch } = useQuery({
    queryKey: ['cart', customerId],
    queryFn: async () => {
      if (!authToken) throw new Error('Not authenticated');
      
      const response = await axios.get(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      return response.data;
    },
    enabled: !!authToken && !!customerId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
    select: (data) => {
      // Transform API response
      const items_by_supplier = groupCartItemsBySupplier(data.items || []);
      const warnings = detectStockWarnings(data.items || []);
      
      return {
        cart: data.cart,
        items: data.items || [],
        items_by_supplier,
        subtotal: Number(data.subtotal || 0),
        total_items: Number(data.total_items || 0),
        warnings
      };
    }
  });
  
  // Derived state
  const itemsBySupplier = cartData?.items_by_supplier || {};
  const stockWarnings = cartData?.warnings || [];
  const cartSummary = calculateCartSummary(itemsBySupplier, appliedPromo);
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  // Update cart item quantity
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ cart_item_id, quantity }: { cart_item_id: string; quantity: number }) => {
      const response = await axios.patch(
        `${API_URL}/cart/items/${cart_item_id}`,
        { quantity },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onMutate: async (variables) => {
      setUpdatingItemId(variables.cart_item_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      fetchGlobalCart(); // Sync with global state
    },
    onError: (error: any) => {
      console.error('Failed to update quantity:', error);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    }
  });
  
  // Remove cart item
  const removeItemMutation = useMutation({
    mutationFn: async (cart_item_id: string) => {
      await axios.delete(`${API_URL}/cart/items/${cart_item_id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    },
    onMutate: async (cart_item_id) => {
      // Optimistic update - fade out
      setItemsToRemove(prev => new Set(prev).add(cart_item_id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      fetchGlobalCart();
    },
    onError: (error: any, cart_item_id) => {
      // Rollback
      setItemsToRemove(prev => {
        const next = new Set(prev);
        next.delete(cart_item_id);
        return next;
      });
      console.error('Failed to remove item:', error);
    }
  });
  
  // Clear entire cart
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      fetchGlobalCart();
    }
  });
  
  // Apply promo code
  const applyPromoMutation = useMutation({
    mutationFn: async (promo_code: string) => {
      const response = await axios.post(
        `${API_URL}/promotions/validate`,
        { 
          promo_code: promo_code.toUpperCase(),
          cart_total: cartSummary.items_subtotal
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.valid && data.promotion) {
        setAppliedPromo({
          promotion_id: data.promotion.promotion_id,
          promo_code: data.promotion.promo_code,
          discount_type: data.promotion.discount_type,
          discount_value: Number(data.promotion.discount_value || 0),
          discount_applied: Number(data.discount_amount || 0)
        });
        setPromoCodeInput('');
      }
    },
    onError: (error: any) => {
      console.error('Promo validation failed:', error);
    }
  });
  
  // Save cart as project
  const saveProjectMutation = useMutation({
    mutationFn: async ({ project_name, description }: { project_name: string; description: string }) => {
      const response = await axios.post(
        `${API_URL}/cart/save`,
        { project_name, description },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      setSaveProjectModalOpen(false);
      setProjectName('');
      setProjectDescription('');
    }
  });
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleQuantityChange = (cart_item_id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantityMutation.mutate({ cart_item_id, quantity: newQuantity });
  };
  
  const handleRemoveItem = (cart_item_id: string) => {
    removeItemMutation.mutate(cart_item_id);
  };
  
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCodeInput.trim()) {
      applyPromoMutation.mutate(promoCodeInput.trim());
    }
  };
  
  const handleRemovePromo = () => {
    setAppliedPromo(null);
  };
  
  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      clearCartMutation.mutate();
    }
  };
  
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      saveProjectMutation.mutate({
        project_name: projectName.trim(),
        description: projectDescription.trim()
      });
    }
  };
  
  const handleProceedToCheckout = () => {
    navigate('/checkout');
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Loading your cart...</p>
          </div>
        </div>
      </>
    );
  }
  
  // Error state
  if (error) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Cart</h2>
            <p className="text-gray-600 mb-6">We couldn't load your shopping cart. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }
  
  const isEmpty = !cartData || cartData.total_items === 0 || Object.keys(itemsBySupplier).length === 0;
  
  // Empty cart state
  if (isEmpty) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
              <p className="text-gray-600 mb-8 text-lg">Start adding products to build your order</p>
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Package className="w-5 h-5 mr-2" />
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-4xl font-bold text-gray-900">Shopping Cart</h1>
              <Link
                to="/products"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
            <p className="text-gray-600 text-lg">
              {cartSummary.total_item_count} {cartSummary.total_item_count === 1 ? 'item' : 'items'} from {cartSummary.total_supplier_count} {cartSummary.total_supplier_count === 1 ? 'supplier' : 'suppliers'}
            </p>
          </div>
          
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Main Content - Cart Items */}
            <div className="lg:col-span-8 space-y-6">
              {/* Stock Warnings */}
              {stockWarnings.length > 0 && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-amber-800 mb-2">
                        Cart Items Need Attention
                      </h3>
                      <ul className="text-sm text-amber-700 space-y-1">
                        {stockWarnings.map((warning, idx) => (
                          <li key={idx}>• {warning.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Cart Items Grouped by Supplier */}
              {Object.entries(itemsBySupplier).map(([supplier_id, group]) => (
                <div key={supplier_id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Supplier Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {group.supplier_info.business_name}
                          </h2>
                          <Link
                            to={`/supplier/${supplier_id}`}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            Visit Shop
                          </Link>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Subtotal</p>
                        <p className="text-xl font-bold text-gray-900">
                          ${group.supplier_subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items List */}
                  <div className="divide-y divide-gray-200">
                    {group.items.map((item) => {
                      const isRemoving = itemsToRemove.has(item.cart_item_id);
                      const isUpdating = updatingItemId === item.cart_item_id;
                      const hasStockWarning = stockWarnings.some(w => w.cart_item_id === item.cart_item_id);
                      
                      return (
                        <div
                          key={item.cart_item_id}
                          className={`p-6 transition-all duration-300 ${isRemoving ? 'opacity-50' : 'opacity-100'}`}
                        >
                          <div className="flex flex-col sm:flex-row gap-6">
                            {/* Product Image */}
                            <Link
                              to={`/product/${item.product_id}`}
                              className="flex-shrink-0"
                            >
                              <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all duration-200">
                                {item.primary_image_url ? (
                                  <img
                                    src={item.primary_image_url}
                                    alt={item.product_name || 'Product'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-12 h-12 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </Link>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="flex-1">
                                  <Link
                                    to={`/product/${item.product_id}`}
                                    className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                                  >
                                    {item.product_name || 'Product'}
                                  </Link>
                                  {item.sku && (
                                    <p className="text-sm text-gray-500 mt-1">SKU: {item.sku}</p>
                                  )}
                                  
                                  {/* Stock Status */}
                                  {hasStockWarning ? (
                                    <div className="mt-2">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Limited Stock
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="mt-2">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        In Stock
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Price */}
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Price per unit</p>
                                  <p className="text-xl font-bold text-gray-900">
                                    ${Number(item.price_per_unit || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Quantity Controls & Remove */}
                              <div className="flex items-center justify-between mt-4">
                                {/* Quantity Selector */}
                                <div className="flex items-center space-x-3">
                                  <span className="text-sm text-gray-600 font-medium">Quantity:</span>
                                  <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                      onClick={() => handleQuantityChange(item.cart_item_id, item.quantity - 1)}
                                      disabled={item.quantity <= 1 || isUpdating}
                                      className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      aria-label="Decrease quantity"
                                    >
                                      <Minus className="w-4 h-4 text-gray-700" />
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val > 0) {
                                          handleQuantityChange(item.cart_item_id, val);
                                        }
                                      }}
                                      disabled={isUpdating}
                                      className="w-16 h-10 text-center font-semibold text-gray-900 border-none focus:ring-0 disabled:bg-gray-50"
                                      aria-label="Product quantity"
                                    />
                                    <button
                                      onClick={() => handleQuantityChange(item.cart_item_id, item.quantity + 1)}
                                      disabled={isUpdating}
                                      className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="w-4 h-4 text-gray-700" />
                                    </button>
                                  </div>
                                  {isUpdating && (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                  )}
                                </div>
                                
                                {/* Line Total & Remove */}
                                <div className="flex items-center space-x-6">
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">Total</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                      ${(item.quantity * Number(item.price_per_unit || 0)).toFixed(2)}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveItem(item.cart_item_id)}
                                    disabled={isRemoving}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Estimated Delivery */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Estimated Delivery: <span className="font-semibold text-gray-900">2-3 business days</span>
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Cart Actions */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setSaveProjectModalOpen(true)}
                  className="flex items-center px-6 py-3 bg-white border-2 border-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save as Project
                </button>
                <button
                  onClick={handleClearCart}
                  disabled={clearCartMutation.isPending}
                  className="flex items-center px-6 py-3 bg-white border-2 border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all duration-200 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Clear Cart
                </button>
              </div>
            </div>
            
            {/* Order Summary Sidebar */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 sticky top-24">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Order Summary</h2>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Pricing Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-700">
                      <span>Items Subtotal</span>
                      <span className="font-semibold">${cartSummary.items_subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Estimated Delivery</span>
                      <span className="font-semibold">${cartSummary.total_delivery_fees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Estimated Tax</span>
                      <span className="font-semibold">${cartSummary.estimated_tax.toFixed(2)}</span>
                    </div>
                    
                    {appliedPromo && (
                      <div className="flex justify-between text-green-600">
                        <div className="flex items-center">
                          <span>Promo Discount</span>
                          <button
                            onClick={handleRemovePromo}
                            className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                            aria-label="Remove promo code"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-semibold">-${cartSummary.promo_discount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <div className="flex justify-between text-gray-900">
                        <span className="text-xl font-bold">Total</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ${cartSummary.grand_total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Promo Code Input */}
                  {!appliedPromo && (
                    <div className="pt-4 border-t border-gray-200">
                      <form onSubmit={handleApplyPromo} className="space-y-2">
                        <label htmlFor="promo_code" className="block text-sm font-medium text-gray-700">
                          Have a promo code?
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="promo_code"
                            type="text"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                            placeholder="ENTER CODE"
                            disabled={applyPromoMutation.isPending}
                            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-50"
                          />
                          <button
                            type="submit"
                            disabled={!promoCodeInput.trim() || applyPromoMutation.isPending}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {applyPromoMutation.isPending ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </button>
                        </div>
                        {applyPromoMutation.isError && (
                          <p className="text-sm text-red-600">Invalid or expired promo code</p>
                        )}
                        {applyPromoMutation.isSuccess && !appliedPromo && (
                          <p className="text-sm text-red-600">Promo code not valid for this cart</p>
                        )}
                      </form>
                    </div>
                  )}
                  
                  {appliedPromo && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Tag className="w-5 h-5 text-green-600 mr-2" />
                            <div>
                              <p className="text-sm font-semibold text-green-800">
                                {appliedPromo.promo_code}
                              </p>
                              <p className="text-xs text-green-700">
                                {appliedPromo.discount_type === 'percentage' 
                                  ? `${appliedPromo.discount_value}% off` 
                                  : `$${appliedPromo.discount_value} off`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleRemovePromo}
                            className="text-green-600 hover:text-green-700"
                            aria-label="Remove promo code"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Checkout Button */}
                  <button
                    onClick={handleProceedToCheckout}
                    className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                  
                  {/* Trust Badges */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Secure Checkout
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Money-Back Guarantee
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Project Modal */}
      {saveProjectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Save Cart as Project</h3>
              <button
                onClick={() => {
                  setSaveProjectModalOpen(false);
                  setProjectName('');
                  setProjectDescription('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label htmlFor="project_name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  id="project_name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Deck Build, Kitchen Reno"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="project_description" className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="project_description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Add project details..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSaveProjectModalOpen(false);
                    setProjectName('');
                    setProjectDescription('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projectName.trim() || saveProjectMutation.isPending}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {saveProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Project
                    </>
                  )}
                </button>
              </div>
              
              {saveProjectMutation.isSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                  Project saved successfully! <Link to="/projects" className="font-semibold underline">View Projects</Link>
                </div>
              )}
              
              {saveProjectMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  Failed to save project. Please try again.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_CartPage;