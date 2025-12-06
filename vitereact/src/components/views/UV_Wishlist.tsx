import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Heart, ShoppingCart, Trash2, Grid3x3, List, Bell, BellOff, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// interface WishlistItem {
//   wishlist_item_id: string;
//   customer_id: string;
//   product_id: string;
//   added_date: string;
//   price_when_saved: number;
//   price_drop_alert_enabled: boolean;
//   back_in_stock_alert_enabled: boolean;
//   // Joined product data
//   product_name: string;
//   price_per_unit: number;
//   stock_quantity: number;
//   primary_image_url: string | null;
//   status: string;
//   // Joined supplier data
//   business_name: string;
//   supplier_id: string;
// }

interface WishlistApiResponse {
  wishlist_item_id: string;
  customer_id: string;
  product_id: string;
  added_date: string;
  price_when_saved: number;
  price_drop_alert_enabled: boolean;
  back_in_stock_alert_enabled: boolean;
  product_name: string;
  price_per_unit: number;
  stock_quantity: number;
  primary_image_url: string | null;
  status: string;
  business_name: string;
}

interface TransformedWishlistItem {
  wishlist_item_id: string;
  product_id: string;
  product_name: string;
  price_when_saved: number;
  current_price: number;
  price_drop_amount: number;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock';
  primary_image_url: string | null;
  supplier_name: string;
  supplier_id: string;
  added_date: string;
  price_drop_alert_enabled: boolean;
  back_in_stock_alert_enabled: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchWishlistItems = async (sortBy?: string, filterBy?: string): Promise<TransformedWishlistItem[]> => {
  const params = new URLSearchParams();
  if (sortBy) params.append('sort_by', sortBy);
  if (filterBy) params.append('filter_by', filterBy);
  
  // Use relative URL - axios baseURL already includes /api prefix
  const response = await axios.get<WishlistApiResponse[]>(
    `/wishlist?${params.toString()}`
  );
  
  // Transform response to include calculated fields
  return response.data.map((item) => ({
    wishlist_item_id: item.wishlist_item_id,
    product_id: item.product_id,
    product_name: item.product_name,
    price_when_saved: Number(item.price_when_saved || 0),
    current_price: Number(item.price_per_unit || 0),
    price_drop_amount: Math.max(0, Number(item.price_when_saved || 0) - Number(item.price_per_unit || 0)),
    stock_quantity: Number(item.stock_quantity || 0),
    stock_status: Number(item.stock_quantity || 0) > 0 ? 'in_stock' : 'out_of_stock',
    primary_image_url: item.primary_image_url,
    supplier_name: item.business_name,
    supplier_id: '', // Not in response but needed for type
    added_date: item.added_date,
    price_drop_alert_enabled: item.price_drop_alert_enabled,
    back_in_stock_alert_enabled: item.back_in_stock_alert_enabled,
  }));
};

const addToCartMutation = async (product_id: string, quantity: number = 1) => {
  // Use relative URL - axios baseURL already includes /api prefix
  const response = await axios.post(
    '/cart/items',
    {
      product_id,
      quantity,
    }
  );
  return response.data;
};

const removeFromWishlistMutation = async (wishlist_item_id: string) => {
  // Use relative URL - axios baseURL already includes /api prefix
  await axios.delete(`/wishlist/${wishlist_item_id}`);
};

const updateAlertsMutation = async (wishlist_item_id: string, price_drop_alert_enabled?: boolean, back_in_stock_alert_enabled?: boolean) => {
  // Use relative URL - axios baseURL already includes /api prefix
  const response = await axios.patch(
    `/wishlist/${wishlist_item_id}`,
    {
      price_drop_alert_enabled,
      back_in_stock_alert_enabled,
    }
  );
  return response.data;
};

// ============================================================================
// UV_WISHLIST COMPONENT
// ============================================================================

const UV_Wishlist: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // URL params
  const sortByParam = searchParams.get('sort_by') || 'date_added';
  const filterByParam = searchParams.get('filter_by') || '';
  
  // Local state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [currentSort, setCurrentSort] = useState<string>(sortByParam);
  const [activeFilter, setActiveFilter] = useState<string>(filterByParam);
  
  // Global state - CRITICAL: Individual selectors only
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const fetchCart = useAppStore(state => state.fetch_cart);
  
  // Sync URL params with local state
  useEffect(() => {
    setCurrentSort(sortByParam);
    setActiveFilter(filterByParam);
  }, [sortByParam, filterByParam]);
  
  // React Query: Fetch wishlist
  const { data: wishlistItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['wishlist', currentSort, activeFilter],
    queryFn: () => fetchWishlistItems(currentSort, activeFilter),
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // Mutations
  const addToCartMut = useMutation({
    mutationFn: ({ product_id, quantity }: { product_id: string; quantity: number }) => 
      addToCartMutation(product_id, quantity),
    onSuccess: () => {
      fetchCart(); // Update global cart state
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
    },
  });
  
  const removeMut = useMutation({
    mutationFn: removeFromWishlistMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
  
  const updateAlertsMut = useMutation({
    mutationFn: ({ wishlist_item_id, price_drop_alert_enabled, back_in_stock_alert_enabled }: { 
      wishlist_item_id: string; 
      price_drop_alert_enabled?: boolean; 
      back_in_stock_alert_enabled?: boolean;
    }) => updateAlertsMutation(wishlist_item_id, price_drop_alert_enabled, back_in_stock_alert_enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
  
  // Handlers
  const handleSortChange = (sort: string) => {
    setCurrentSort(sort);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort_by', sort);
    setSearchParams(newParams);
  };
  
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    const newParams = new URLSearchParams(searchParams);
    if (filter) {
      newParams.set('filter_by', filter);
    } else {
      newParams.delete('filter_by');
    }
    setSearchParams(newParams);
  };
  
  const handleAddToCart = (product_id: string, product_name: string, wishlist_item_id: string) => {
    console.log(`Adding ${product_name} to cart...`);
    addToCartMut.mutate(
      { product_id, quantity: 1 },
      {
        onSuccess: () => {
          console.log(`Successfully added ${product_name} to cart`);
          
          // Remove from wishlist after successful add to cart
          removeMut.mutate(wishlist_item_id, {
            onSuccess: () => {
              console.log(`Removed ${product_name} from wishlist after adding to cart`);
            },
            onError: (removeErr: any) => {
              console.warn('Failed to remove from wishlist after add to cart:', removeErr);
            }
          });
          
          // Use a non-blocking notification instead of alert
          // alert() can cause issues in automated testing
          const notification = document.createElement('div');
          notification.textContent = `${product_name} added to cart!`;
          notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:16px 24px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        },
        onError: (err: any) => {
          console.error('Failed to add item to cart:', err);
          const errorMsg = err.response?.data?.message || 'Failed to add item to cart';
          // Use a non-blocking notification instead of alert
          const notification = document.createElement('div');
          notification.textContent = errorMsg;
          notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#ef4444;color:white;padding:16px 24px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
        },
      }
    );
  };
  
  const handleRemove = (wishlist_item_id: string, product_name: string) => {
    if (window.confirm(`Remove "${product_name}" from wishlist?`)) {
      removeMut.mutate(wishlist_item_id, {
        onSuccess: () => {
          console.log(`Successfully removed ${product_name} from wishlist`);
        },
        onError: (err: any) => {
          console.error('Failed to remove item from wishlist:', err);
          alert(err.response?.data?.message || 'Failed to remove item');
        },
      });
    }
  };
  
  const handleToggleAlert = (wishlist_item_id: string, alertType: 'price' | 'stock', currentValue: boolean) => {
    const newValue = !currentValue;
    console.log(`Toggling ${alertType} alert for ${wishlist_item_id}: ${currentValue} -> ${newValue}`);
    
    if (alertType === 'price') {
      updateAlertsMut.mutate({
        wishlist_item_id,
        price_drop_alert_enabled: newValue,
      }, {
        onSuccess: () => {
          console.log(`Successfully updated price alert to ${newValue}`);
        },
        onError: (err: any) => {
          console.error('Failed to update price alert:', err);
        },
      });
    } else {
      updateAlertsMut.mutate({
        wishlist_item_id,
        back_in_stock_alert_enabled: newValue,
      }, {
        onSuccess: () => {
          console.log(`Successfully updated stock alert to ${newValue}`);
        },
        onError: (err: any) => {
          console.error('Failed to update stock alert:', err);
        },
      });
    }
  };
  
  const handleSelectItem = (wishlist_item_id: string) => {
    setSelectedItems(prev => 
      prev.includes(wishlist_item_id)
        ? prev.filter(id => id !== wishlist_item_id)
        : [...prev, wishlist_item_id]
    );
  };
  
  const handleSelectAll = () => {
    if (selectedItems.length === wishlistItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(wishlistItems.map(item => item.wishlist_item_id));
    }
  };
  
  const handleBulkAddToCart = () => {
    const selectedProducts = wishlistItems.filter(item => 
      selectedItems.includes(item.wishlist_item_id)
    );
    
    console.log(`Adding ${selectedProducts.length} items to cart...`);
    
    // Add each selected item to cart
    let successCount = 0;
    let failCount = 0;
    
    const promises = selectedProducts.map(item => 
      addToCartMutation(item.product_id, 1)
        .then(() => { successCount++; })
        .catch((err) => { 
          console.error(`Failed to add ${item.product_name}:`, err);
          failCount++; 
        })
    );
    
    Promise.all(promises).then(() => {
      fetchCart(); // Update global cart
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
      
      // Use a non-blocking notification instead of alert
      const notification = document.createElement('div');
      notification.textContent = `Added ${successCount} items to cart${failCount > 0 ? `, ${failCount} failed` : ''}`;
      notification.style.cssText = `position:fixed;top:20px;right:20px;background:${failCount > 0 ? '#f59e0b' : '#10b981'};color:white;padding:16px 24px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
      console.log(`Bulk add complete: ${successCount} succeeded, ${failCount} failed`);
    });
  };
  
  // Filter and sort items client-side
  const filteredItems = wishlistItems.filter(item => {
    if (activeFilter === 'in_stock_only') {
      return item.stock_quantity > 0;
    }
    if (activeFilter === 'price_drops') {
      return item.price_drop_amount > 0;
    }
    return true;
  });
  
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (currentSort === 'price') {
      return a.current_price - b.current_price;
    }
    // Default: date_added (newest first)
    return new Date(b.added_date).getTime() - new Date(a.added_date).getTime();
  });

  return (
    <>
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
              <p className="mt-2 text-gray-600">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={currentSort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date_added">Recently Added</option>
                <option value="price">Price: Low to High</option>
              </select>
            </div>
          </div>
          
          {/* Filters and Bulk Actions */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleFilterChange('')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  activeFilter === '' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => handleFilterChange('in_stock_only')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  activeFilter === 'in_stock_only' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                }`}
              >
                In Stock Only
              </button>
              <button
                onClick={() => handleFilterChange('price_drops')}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  activeFilter === 'price_drops' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                }`}
              >
                Price Drops
              </button>
            </div>
            
            {/* Bulk Actions */}
            {sortedItems.length > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedItems.length === sortedItems.length ? 'Deselect All' : 'Select All'}
                </button>
                
                {selectedItems.length > 0 && (
                  <button
                    onClick={handleBulkAddToCart}
                    disabled={addToCartMut.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add {selectedItems.length} to Cart</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Failed to load wishlist</p>
              <p className="text-red-700 text-sm mt-1">
                {axios.isAxiosError(error) ? error.response?.data?.message || error.message : 'An error occurred'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
          }>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {!isLoading && !error && sortedItems.length === 0 && (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-600 mb-6">
              {activeFilter ? 'No items match your filter criteria' : 'Start saving products you love!'}
            </p>
            {activeFilter ? (
              <button
                onClick={() => handleFilterChange('')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                to="/products"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                Browse Products
              </Link>
            )}
          </div>
        )}
        
        {/* Grid View */}
        {!isLoading && !error && sortedItems.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedItems.map((item) => (
              <div 
                key={item.wishlist_item_id} 
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.wishlist_item_id)}
                    onChange={() => handleSelectItem(item.wishlist_item_id)}
                    className="absolute top-3 left-3 w-5 h-5 rounded cursor-pointer z-10"
                  />
                  
                  {item.price_drop_amount > 0 && (
                    <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                      Price Drop! -{((item.price_drop_amount / item.price_when_saved) * 100).toFixed(0)}%
                    </div>
                  )}
                  
                  <Link to={`/product/${item.product_id}`} className="block w-full h-full">
                    {item.primary_image_url ? (
                      <img
                        src={item.primary_image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                  </Link>
                  
                  <button
                    onClick={() => handleRemove(item.wishlist_item_id, item.product_name)}
                    disabled={removeMut.isPending}
                    className="absolute bottom-3 right-3 bg-red-600 text-white p-2.5 rounded-lg shadow-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center space-x-1"
                    aria-label="Remove from wishlist"
                    data-testid={`remove-wishlist-${item.wishlist_item_id}`}
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Remove</span>
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <Link to={`/product/${item.product_id}`} className="block">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                      {item.product_name}
                    </h3>
                  </Link>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {item.supplier_name}
                  </p>
                  
                  {/* Pricing */}
                  <div className="mb-4">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-gray-900">
                        ${item.current_price.toFixed(2)}
                      </span>
                      {item.price_drop_amount > 0 && (
                        <span className="text-sm text-gray-500 line-through">
                          ${item.price_when_saved.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {item.price_drop_amount > 0 && (
                      <p className="text-sm text-green-600 font-medium mt-1">
                        Save ${item.price_drop_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                  
                  {/* Stock Status */}
                  <div className="mb-4">
                    {item.stock_quantity > 0 ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  
                  {/* Alerts */}
                  <div className="flex items-center space-x-3 mb-4 text-sm">
                    <button
                      onClick={() => handleToggleAlert(item.wishlist_item_id, 'price', item.price_drop_alert_enabled)}
                      disabled={updateAlertsMut.isPending}
                      className={`flex items-center space-x-1 transition-colors ${
                        item.price_drop_alert_enabled 
                          ? 'text-blue-600' 
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                      data-testid={`price-alert-toggle-${item.wishlist_item_id}`}
                      aria-label={`Toggle price drop alerts for ${item.product_name}`}
                    >
                      {item.price_drop_alert_enabled ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                      <span className="text-xs">Price alerts</span>
                    </button>
                    
                    <button
                      onClick={() => handleToggleAlert(item.wishlist_item_id, 'stock', item.back_in_stock_alert_enabled)}
                      disabled={updateAlertsMut.isPending}
                      className={`flex items-center space-x-1 transition-colors ${
                        item.back_in_stock_alert_enabled 
                          ? 'text-blue-600' 
                          : 'text-gray-400 hover:text-blue-600'
                      }`}
                      data-testid={`stock-alert-toggle-${item.wishlist_item_id}`}
                      aria-label={`Toggle back in stock alerts for ${item.product_name}`}
                    >
                      {item.back_in_stock_alert_enabled ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                      <span className="text-xs">Stock alerts</span>
                    </button>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleAddToCart(item.product_id, item.product_name, item.wishlist_item_id)}
                    disabled={item.stock_quantity === 0 || addToCartMut.isPending}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    data-testid={`add-to-cart-${item.wishlist_item_id}`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>
                      {item.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* List View */}
        {!isLoading && !error && sortedItems.length > 0 && viewMode === 'list' && (
          <div className="space-y-4">
            {sortedItems.map((item) => (
              <div 
                key={item.wishlist_item_id} 
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image Section */}
                  <div className="sm:w-48 sm:h-48 relative bg-gray-100 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.wishlist_item_id)}
                      onChange={() => handleSelectItem(item.wishlist_item_id)}
                      className="absolute top-3 left-3 w-5 h-5 rounded cursor-pointer z-10"
                    />
                    
                    {item.price_drop_amount > 0 && (
                      <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium z-10">
                        -{((item.price_drop_amount / item.price_when_saved) * 100).toFixed(0)}%
                      </div>
                    )}
                    
                    <Link to={`/product/${item.product_id}`} className="block w-full h-full">
                      {item.primary_image_url ? (
                        <img
                          src={item.primary_image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No image</span>
                        </div>
                      )}
                    </Link>
                  </div>
                  
                  {/* Content Section */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 mb-4 sm:mb-0">
                        <Link to={`/product/${item.product_id}`}>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                            {item.product_name}
                          </h3>
                        </Link>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {item.supplier_name}
                        </p>
                        
                        {/* Stock Status */}
                        <div className="mb-3">
                          {item.stock_quantity > 0 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              In Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        
                        {/* Alerts */}
                        <div className="flex items-center space-x-4 text-sm">
                          <button
                            onClick={() => handleToggleAlert(item.wishlist_item_id, 'price', item.price_drop_alert_enabled)}
                            disabled={updateAlertsMut.isPending}
                            className={`flex items-center space-x-1 transition-colors ${
                              item.price_drop_alert_enabled 
                                ? 'text-blue-600' 
                                : 'text-gray-400 hover:text-blue-600'
                            }`}
                            data-testid={`price-alert-toggle-${item.wishlist_item_id}`}
                            aria-label={`Toggle price drop alerts for ${item.product_name}`}
                          >
                            {item.price_drop_alert_enabled ? (
                              <Bell className="w-4 h-4" />
                            ) : (
                              <BellOff className="w-4 h-4" />
                            )}
                            <span>Price alerts</span>
                          </button>
                          
                          <button
                            onClick={() => handleToggleAlert(item.wishlist_item_id, 'stock', item.back_in_stock_alert_enabled)}
                            disabled={updateAlertsMut.isPending}
                            className={`flex items-center space-x-1 transition-colors ${
                              item.back_in_stock_alert_enabled 
                                ? 'text-blue-600' 
                                : 'text-gray-400 hover:text-blue-600'
                            }`}
                            data-testid={`stock-alert-toggle-${item.wishlist_item_id}`}
                            aria-label={`Toggle back in stock alerts for ${item.product_name}`}
                          >
                            {item.back_in_stock_alert_enabled ? (
                              <Bell className="w-4 h-4" />
                            ) : (
                              <BellOff className="w-4 h-4" />
                            )}
                            <span>Stock alerts</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Price and Actions */}
                      <div className="sm:ml-6 flex-shrink-0">
                        <div className="mb-4">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-bold text-gray-900">
                              ${item.current_price.toFixed(2)}
                            </span>
                          </div>
                          {item.price_drop_amount > 0 && (
                            <>
                              <p className="text-sm text-gray-500 line-through">
                                ${item.price_when_saved.toFixed(2)}
                              </p>
                              <p className="text-sm text-green-600 font-medium">
                                Save ${item.price_drop_amount.toFixed(2)}
                              </p>
                            </>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <button
                            onClick={() => handleAddToCart(item.product_id, item.product_name, item.wishlist_item_id)}
                            disabled={item.stock_quantity === 0 || addToCartMut.isPending}
                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            data-testid={`add-to-cart-${item.wishlist_item_id}`}
                          >
                            <ShoppingCart className="w-5 h-5" />
                            <span>
                              {item.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                            </span>
                          </button>
                          
                          <button
                            onClick={() => handleRemove(item.wishlist_item_id, item.product_name)}
                            disabled={removeMut.isPending}
                            className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                            data-testid={`remove-wishlist-${item.wishlist_item_id}`}
                          >
                            <Trash2 className="w-5 h-5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Added Date Info */}
        {!isLoading && !error && sortedItems.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Watching {sortedItems.length} {sortedItems.length === 1 ? 'product' : 'products'} for price changes and stock updates
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_Wishlist;