import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Heart, ShoppingCart, Star, ChevronLeft, ChevronRight, X, ZoomIn, Clock, ShieldCheck, Truck, AlertCircle, CheckCircle } from 'lucide-react';
import { io} from 'socket.io-client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Product {
  product_id: string;
  supplier_id: string;
  category_id: string;
  sku: string;
  product_name: string;
  description: string | null;
  key_features: string[] | null;
  specifications: Record<string, any> | null;
  price_per_unit: number;
  unit_of_measure: string;
  bulk_pricing: Record<string, number> | null;
  stock_quantity: number;
  low_stock_threshold: number;
  last_updated_timestamp: string;
  expected_restock_date: string | null;
  images: string[] | null;
  primary_image_url: string | null;
  status: string;
  brand: string | null;
  minimum_order_quantity: number;
  maximum_order_quantity: number | null;
  warranty_information: string | null;
  dimensions: Record<string, any> | null;
  weight: number | null;
  material: string | null;
  compliance_certifications: string[] | null;
}

interface Supplier {
  supplier_id: string;
  business_name: string;
  business_description: string | null;
  logo_url: string | null;
  rating_average: number;
  total_reviews: number;
  verification_status: string;
  response_time_average: number | null;
  fulfillment_rate: number;
  return_policy: string | null;
  shipping_policy: string | null;
}

interface Review {
  review_id: string;
  customer_id: string;
  rating_overall: number;
  rating_product: number | null;
  rating_service: number | null;
  rating_delivery: number | null;
  review_text: string | null;
  photos: string[] | null;
  helpful_votes: number;
  verified_purchase: boolean;
  review_date: string;
  is_anonymous: boolean;
  supplier_response: string | null;
  supplier_response_date: string | null;
}

interface WishlistItem {
  wishlist_item_id: string;
  customer_id: string;
  product_id: string;
  added_date: string;
  price_when_saved: number;
}

interface CanReviewResponse {
  can_review: boolean;
  message?: string;
  order_id?: string;
  order_number?: string;
  supplier_id?: string;
  existing_review_id?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

const fetchProduct = async (product_id: string, token: string | null): Promise<Product> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await axios.get(`${API_BASE_URL}/products/${product_id}`, { headers });
  return response.data;
};

const fetchSupplier = async (supplier_id: string, token: string | null): Promise<Supplier> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await axios.get(`${API_BASE_URL}/suppliers/${supplier_id}`, { headers });
  return response.data;
};

const fetchReviews = async (
  product_id: string,
  page: number,
  min_rating: number | null,
  verified_only: boolean,
  sort_by: string
): Promise<{ reviews: Review[]; total: number; average_rating: number }> => {
  const params: Record<string, any> = {
    product_id,
    status: 'published',
    limit: 10,
    offset: (page - 1) * 10,
    sort_by,
    sort_order: 'desc',
  };
  
  if (min_rating) {
    params.min_rating = min_rating;
  }
  if (verified_only) {
    params.verified_purchase = true;
  }
  
  const response = await axios.get(`${API_BASE_URL}/reviews`, { params });
  return response.data;
};

const checkWishlistStatus = async (product_id: string, token: string): Promise<boolean> => {
  const response = await axios.get(`${API_BASE_URL}/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const items: WishlistItem[] = response.data;
  return items.some((item: WishlistItem) => item.product_id === product_id);
};

const addToCartAPI = async (product_id: string, quantity: number, token: string) => {
  const response = await axios.post(
    `${API_BASE_URL}/cart/items`,
    { product_id, quantity },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

const addToWishlistAPI = async (product_id: string, price_when_saved: number, token: string) => {
  const response = await axios.post(
    `${API_BASE_URL}/wishlist`,
    {
      product_id,
      price_when_saved,
      price_drop_alert_enabled: true,
      back_in_stock_alert_enabled: true,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

const removeFromWishlistAPI = async (wishlist_item_id: string, token: string) => {
  const response = await axios.delete(
    `${API_BASE_URL}/wishlist/${wishlist_item_id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

const checkCanReview = async (product_id: string, token: string): Promise<CanReviewResponse> => {
  const response = await axios.get(`${API_BASE_URL}/reviews/can-review/${product_id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const createChatConversation = async (
  supplier_id: string,
  product_id: string,
  token: string
): Promise<{ conversation_id: string }> => {
  const response = await axios.post(
    `${API_BASE_URL}/chat/conversations`,
    {
      conversation_type: 'customer_supplier',
      supplier_id,
      related_entity_type: 'product',
      related_entity_id: product_id
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ProductDetail_Customer: React.FC = () => {
  const { product_id } = useParams<{ product_id: string }>();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const fetchCart = useAppStore(state => state.fetch_cart);
  const cartItems = useAppStore(state => state.cart_state.items);
  
  // Local state
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewFilters, setReviewFilters] = useState<{ rating: number | null; verified_only: boolean }>({
    rating: null,
    verified_only: false,
  });
  const [reviewSortBy, setReviewSortBy] = useState('review_date');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({
    rating_overall: 5,
    rating_product: 5,
    rating_service: 5,
    rating_delivery: 5,
    review_text: '',
    would_buy_again: 'yes' as 'yes' | 'no' | 'maybe',
    is_anonymous: false
  });
  const [realTimeStock, setRealTimeStock] = useState<{
    stock_quantity: number | null;
    last_updated: string | null;
    websocket_connected: boolean;
  }>({
    stock_quantity: null,
    last_updated: null,
    websocket_connected: false,
  });


  // Fetch product data
  const { data: product, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ['product', product_id],
    queryFn: () => fetchProduct(product_id!, authToken),
    enabled: !!product_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch supplier data
  const { data: supplier } = useQuery({
    queryKey: ['supplier', product?.supplier_id],
    queryFn: () => fetchSupplier(product!.supplier_id, authToken),
    enabled: !!product?.supplier_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check wishlist status
  const { data: isInWishlist = false, refetch: refetchWishlistStatus } = useQuery({
    queryKey: ['wishlist-status', product_id],
    queryFn: () => checkWishlistStatus(product_id!, authToken!),
    enabled: !!product_id && !!authToken,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Fetch reviews (only when reviews tab active)
  const { data: reviewData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', product_id, reviewPage, reviewFilters.rating, reviewFilters.verified_only, reviewSortBy],
    queryFn: () => fetchReviews(product_id!, reviewPage, reviewFilters.rating, reviewFilters.verified_only, reviewSortBy),
    enabled: !!product_id && activeTab === 'reviews',
    staleTime: 2 * 60 * 1000,
  });

  // Check if customer can review this product
  const { data: canReviewData } = useQuery({
    queryKey: ['can-review', product_id],
    queryFn: () => checkCanReview(product_id!, authToken!),
    enabled: !!product_id && !!authToken && activeTab === 'reviews',
    staleTime: 1 * 60 * 1000,
  });

  // Check if product in cart
  const isInCart = cartItems.some(item => item.product_id === product_id);
  const currentCartQuantity = cartItems.find(item => item.product_id === product_id)?.quantity || 0;

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (quantity: number) => addToCartAPI(product_id!, quantity, authToken!),
    onSuccess: () => {
      fetchCart();
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-summary'] });
      alert('Added to cart successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to add to cart');
    },
  });

  // Contact supplier mutation
  const contactSupplierMutation = useMutation({
    mutationFn: () => createChatConversation(product!.supplier_id, product_id!, authToken!),
    onSuccess: () => {
      // Dispatch custom event to open chat widget
      window.dispatchEvent(new CustomEvent('openChatWithSupplier', {
        detail: { supplier_id: product!.supplier_id, product_id: product_id }
      }));
      alert('Chat started! Check the chat widget.');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to start conversation');
    },
  });

  // Wishlist mutations
  const addToWishlistMutation = useMutation({
    mutationFn: () => addToWishlistAPI(product_id!, product!.price_per_unit, authToken!),
    onSuccess: () => {
      refetchWishlistStatus();
      alert('Added to wishlist!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to add to wishlist');
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async () => {
      // First get wishlist to find item id
      const response = await axios.get(`${API_BASE_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const item = response.data.find((w: WishlistItem) => w.product_id === product_id);
      if (item) {
        return removeFromWishlistAPI(item.wishlist_item_id, authToken!);
      }
    },
    onSuccess: () => {
      refetchWishlistStatus();
      alert('Removed from wishlist');
    },
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE_URL}/reviews`,
        {
          order_id: canReviewData?.order_id,
          supplier_id: canReviewData?.supplier_id,
          product_id: product_id,
          ...reviewFormData
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', product_id] });
      queryClient.invalidateQueries({ queryKey: ['can-review', product_id] });
      setShowReviewModal(false);
      setReviewFormData({
        rating_overall: 5,
        rating_product: 5,
        rating_service: 5,
        rating_delivery: 5,
        review_text: '',
        would_buy_again: 'yes',
        is_anonymous: false
      });
      alert('Review submitted successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to submit review');
    },
  });

  // WebSocket for real-time stock updates
  useEffect(() => {
    if (!product_id || !authToken) return;

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const socket = io(WS_URL, {
      auth: { token: authToken },
    });

    socket.on('connect', () => {
      setRealTimeStock(prev => ({ ...prev, websocket_connected: true }));
      socket.emit('subscribe_product', { product_id });
    });

    socket.on('inventory_update', (data: any) => {
      if (data.product_id === product_id) {
        setRealTimeStock({
          stock_quantity: data.stock_quantity,
          last_updated: data.last_updated_timestamp,
          websocket_connected: true,
        });
      }
    });

    socket.on('disconnect', () => {
      setRealTimeStock(prev => ({ ...prev, websocket_connected: false }));
    });

    // Store socket reference for cleanup
    // setWsSocket(socket); // Removed - not needed for cleanup

    return () => {
      socket.emit('unsubscribe_product', { product_id });
      socket.disconnect();
    };
  }, [product_id, authToken]);

  // Handlers
  const handleAddToCart = () => {
    if (!product) return;
    if (selectedQuantity < product.minimum_order_quantity) {
      alert(`Minimum order quantity is ${product.minimum_order_quantity}`);
      return;
    }
    const currentStock = realTimeStock.stock_quantity ?? product.stock_quantity;
    if (selectedQuantity > currentStock) {
      alert(`Only ${currentStock} units available`);
      return;
    }
    addToCartMutation.mutate(selectedQuantity);
  };

  const handleToggleWishlist = () => {
    if (isInWishlist) {
      removeFromWishlistMutation.mutate();
    } else {
      addToWishlistMutation.mutate();
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = selectedQuantity + delta;
    if (newQty >= 1) {
      const maxQty = product?.maximum_order_quantity || (realTimeStock.stock_quantity ?? product?.stock_quantity) || 999;
      setSelectedQuantity(Math.min(newQty, maxQty));
    }
  };

  const handleImageClick = (index: number) => {
    setActiveImageIndex(index);
  };

  const handleOpenLightbox = () => {
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
  };

  const handlePrevImage = () => {
    if (!product?.images) return;
    setActiveImageIndex((prev) => (prev === 0 ? product.images!.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!product?.images) return;
    setActiveImageIndex((prev) => (prev === product.images!.length - 1 ? 0 : prev + 1));
  };

  // Calculate current stock (real-time or fallback)
  const currentStock = Number(realTimeStock.stock_quantity ?? product?.stock_quantity ?? 0);
  const stockStatus = currentStock === 0 ? 'out_of_stock' : currentStock <= Number(product?.low_stock_threshold || 10) ? 'low_stock' : 'in_stock';

  // Bulk pricing display
  const getBulkPriceInfo = () => {
    if (!product?.bulk_pricing) return null;
    const entries = Object.entries(product.bulk_pricing).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    return entries;
  };

  const getCurrentPrice = (): number => {
    if (!product) return 0;
    const bulkPrices = getBulkPriceInfo();
    if (!bulkPrices) {
      const price = Number(product.price_per_unit);
      return isNaN(price) ? 0 : price;
    }
    
    for (let i = bulkPrices.length - 1; i >= 0; i--) {
      const [minQty, price] = bulkPrices[i];
      if (selectedQuantity >= parseInt(minQty)) {
        const numPrice = Number(price);
        return isNaN(numPrice) ? 0 : numPrice;
      }
    }
    const price = Number(product.price_per_unit);
    return isNaN(price) ? 0 : price;
  };

  // Loading state
  if (productLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading product details...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (productError || !product) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </>
    );
  }

  const activeImage = product.images?.[activeImageIndex] || product.primary_image_url;

  return (
    <>
      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <button
            onClick={handleCloseLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="h-8 w-8" />
          </button>
          
          <button
            onClick={handlePrevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-12 w-12" />
          </button>
          
          <img
            src={activeImage || ''}
            alt={product.product_name}
            className="max-w-full max-h-[90vh] object-contain"
          />
          
          <button
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-12 w-12" />
          </button>
          
          {/* Thumbnail strip */}
          {product.images && product.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 bg-black bg-opacity-50 p-2 rounded-lg">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`h-16 w-16 rounded overflow-hidden border-2 transition-all ${
                    idx === activeImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/products" className="hover:text-blue-600 transition-colors">Products</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">{product.product_name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left Column - Image Gallery */}
            <div className="space-y-4">
              {/* Primary Image */}
              <div 
                className="bg-white rounded-xl shadow-lg overflow-hidden cursor-zoom-in group relative"
                onClick={handleOpenLightbox}
              >
                <div className="aspect-square relative">
                  <img
                    src={activeImage || ''}
                    alt={product.product_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-16 w-16 text-white" />
                  </div>
                </div>
              </div>

              {/* Thumbnail Strip */}
              {product.images && product.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleImageClick(idx)}
                      className={`flex-shrink-0 h-20 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === activeImageIndex
                          ? 'border-blue-600 scale-105 shadow-lg'
                          : 'border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      <img src={img} alt={`View ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Product Info */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 leading-tight">{product.product_name}</h1>
                  <button
                    onClick={handleToggleWishlist}
                    disabled={addToWishlistMutation.isPending || removeFromWishlistMutation.isPending}
                    className="flex-shrink-0 ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart
                      className={`h-6 w-6 transition-colors ${
                        isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>SKU: {product.sku}</span>
                  {product.brand && (
                    <>
                      <span>•</span>
                      <span>Brand: {product.brand}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Price Section */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-baseline space-x-3 mb-2">
                  <span className="text-4xl font-bold text-blue-600">
                    ${getCurrentPrice().toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-600">/ {product.unit_of_measure}</span>
                </div>
                
                {/* Bulk Pricing Info */}
                {getBulkPriceInfo() && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Volume Pricing:</p>
                    <div className="space-y-1">
                      {getBulkPriceInfo()!.map(([qty, price]) => (
                        <div key={qty} className="flex justify-between text-sm">
                          <span className="text-gray-600">{qty}+ units:</span>
                          <span className="font-medium text-gray-900">${Number(price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  {stockStatus === 'in_stock' && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">In Stock</p>
                        <p className="text-sm text-gray-600">{currentStock} units available</p>
                      </div>
                    </>
                  )}
                  {stockStatus === 'low_stock' && (
                    <>
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-900">Low Stock</p>
                        <p className="text-sm text-amber-700">Only {currentStock} left!</p>
                      </div>
                    </>
                  )}
                  {stockStatus === 'out_of_stock' && (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-900">Out of Stock</p>
                        {product.expected_restock_date && (
                          <p className="text-sm text-red-700">Expected: {new Date(product.expected_restock_date).toLocaleDateString()}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                
                {realTimeStock.last_updated && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <div className={`h-2 w-2 rounded-full ${realTimeStock.websocket_connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span>Updated {new Date(realTimeStock.last_updated).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              {stockStatus !== 'out_of_stock' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={selectedQuantity <= 1}
                        className="px-4 py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={selectedQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1) {
                            setSelectedQuantity(Math.min(val, currentStock));
                          }
                        }}
                        className="w-20 text-center py-3 border-x border-gray-300 focus:outline-none"
                      />
                      <button
                        onClick={() => handleQuantityChange(1)}
                        disabled={selectedQuantity >= currentStock}
                        className="px-4 py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    {product.minimum_order_quantity > 1 && (
                      <p className="text-sm text-gray-600">Min order: {product.minimum_order_quantity}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={stockStatus === 'out_of_stock' || addToCartMutation.isPending}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>{isInCart ? 'Update Cart' : 'Add to Cart'}</span>
                </button>
                
                {isInCart && (
                  <p className="text-sm text-gray-600 text-center">
                    {currentCartQuantity} already in cart
                  </p>
                )}
              </div>

              {/* Supplier Info Card */}
              {supplier && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-start space-x-4">
                    {supplier.logo_url && (
                      <img
                        src={supplier.logo_url}
                        alt={supplier.business_name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{supplier.business_name}</h3>
                        {supplier.verification_status === 'verified' && (
                          <ShieldCheck className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(supplier.rating_average)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">
                          {Number(supplier.rating_average).toFixed(1)} ({supplier.total_reviews} reviews)
                        </span>
                      </div>
                      
                      {supplier.response_time_average && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600 mb-3">
                          <Clock className="h-4 w-4" />
                          <span>Replies within {Number(supplier.response_time_average).toFixed(1)} hours</span>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <Link
                          to={`/supplier/${supplier.supplier_id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                          View Shop
                        </Link>
                        <span className="text-gray-300">|</span>
                        <button 
                          onClick={() => contactSupplierMutation.mutate()}
                          disabled={contactSupplierMutation.isPending}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                          {contactSupplierMutation.isPending ? 'Starting Chat...' : 'Contact Supplier'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Info */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Delivery Information</span>
                </div>
                <p className="text-sm text-gray-600">Standard delivery: 2-5 business days</p>
                <p className="text-sm text-gray-600">Select delivery window at checkout</p>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'description'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('specifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'specifications'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Specifications
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'reviews'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Reviews {reviewData && `(${reviewData.total})`}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Description Tab */}
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  {product.description && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Product Description</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                    </div>
                  )}
                  
                  {product.key_features && product.key_features.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Key Features</h3>
                      <ul className="space-y-2">
                        {product.key_features.map((feature, idx) => (
                          <li key={idx} className="flex items-start space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {product.warranty_information && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="font-medium text-gray-900 mb-2">Warranty</h4>
                      <p className="text-sm text-gray-700">{product.warranty_information}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Specifications Tab */}
              {activeTab === 'specifications' && (
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Technical Specifications</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200">
                        {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                          <tr key={key} className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 capitalize">
                              {key.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          </tr>
                        ))}
                        
                        {product.dimensions && (
                          <tr className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">Dimensions</td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {JSON.stringify(product.dimensions)}
                            </td>
                          </tr>
                        )}
                        
                        {product.weight && (
                          <tr className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">Weight</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{product.weight} lbs</td>
                          </tr>
                        )}
                        
                        {product.material && (
                          <tr className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">Material</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{product.material}</td>
                          </tr>
                        )}
                        
                        {product.compliance_certifications && product.compliance_certifications.length > 0 && (
                          <tr className="hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">Certifications</td>
                            <td className="py-3 px-4 text-sm text-gray-700">
                              {product.compliance_certifications.join(', ')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div>
                  {reviewsLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    </div>
                  ) : reviewData ? (
                    <>
                      {/* Review Summary */}
                      <div className="mb-8 pb-6 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="flex items-center space-x-4 mb-2">
                              <span className="text-5xl font-bold text-gray-900">{Number(reviewData.average_rating).toFixed(1)}</span>
                              <div>
                                <div className="flex items-center space-x-1 mb-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-6 w-6 ${
                                        i < Math.floor(Number(reviewData.average_rating))
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="text-sm text-gray-600">{reviewData.total} reviews</p>
                              </div>
                            </div>
                          </div>
                          {canReviewData?.can_review && (
                            <button
                              onClick={() => setShowReviewModal(true)}
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              Write a Review
                            </button>
                          )}
                        </div>
                        
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 mt-4">
                          <select
                            value={reviewFilters.rating || ''}
                            onChange={(e) => {
                              setReviewFilters(prev => ({ ...prev, rating: e.target.value ? parseInt(e.target.value) : null }));
                              setReviewPage(1);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">All ratings</option>
                            <option value="5">5 stars</option>
                            <option value="4">4+ stars</option>
                            <option value="3">3+ stars</option>
                          </select>
                          
                          <label className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={reviewFilters.verified_only}
                              onChange={(e) => {
                                setReviewFilters(prev => ({ ...prev, verified_only: e.target.checked }));
                                setReviewPage(1);
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Verified purchases only</span>
                          </label>
                          
                          <select
                            value={reviewSortBy}
                            onChange={(e) => {
                              setReviewSortBy(e.target.value);
                              setReviewPage(1);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="review_date">Most Recent</option>
                            <option value="rating_overall">Highest Rated</option>
                            <option value="helpful_votes">Most Helpful</option>
                          </select>
                        </div>
                      </div>

                      {/* Review List */}
                      <div className="space-y-6">
                        {reviewData.reviews.map((review) => (
                          <div key={review.review_id} className="border-b border-gray-200 pb-6 last:border-0">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className="flex items-center space-x-1">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-4 w-4 ${
                                          i < review.rating_overall
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {review.verified_purchase && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                      Verified Purchase
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {review.is_anonymous ? 'Anonymous' : 'Customer'} • {new Date(review.review_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            {review.review_text && (
                              <p className="text-gray-700 mb-3 leading-relaxed">{review.review_text}</p>
                            )}
                            
                            {review.photos && review.photos.length > 0 && (
                              <div className="flex space-x-2 mb-3">
                                {review.photos.map((photo, idx) => (
                                  <img
                                    key={idx}
                                    src={photo}
                                    alt={`Review photo ${idx + 1}`}
                                    className="h-20 w-20 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                  />
                                ))}
                              </div>
                            )}
                            
                            {review.supplier_response && (
                              <div className="mt-4 bg-gray-50 rounded-lg p-4 border-l-4 border-blue-600">
                                <p className="text-sm font-medium text-gray-900 mb-1">Supplier Response</p>
                                <p className="text-sm text-gray-700">{review.supplier_response}</p>
                                {review.supplier_response_date && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Responded {new Date(review.supplier_response_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                              <span>{review.helpful_votes} found this helpful</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {reviewData.total > 10 && (
                        <div className="flex justify-center mt-8 space-x-2">
                          <button
                            onClick={() => setReviewPage(prev => Math.max(1, prev - 1))}
                            disabled={reviewPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <span className="px-4 py-2 text-gray-700">
                            Page {reviewPage} of {Math.ceil(reviewData.total / 10)}
                          </span>
                          <button
                            onClick={() => setReviewPage(prev => Math.min(Math.ceil(reviewData.total / 10), prev + 1))}
                            disabled={reviewPage >= Math.ceil(reviewData.total / 10)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                     </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600">No reviews yet for this product.</p>
                      {canReviewData?.can_review && (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Be the first to write a review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Related Products Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Placeholder for related products - would fetch separately */}
              <div className="text-center text-gray-500 col-span-full py-8">
                Related products would be displayed here
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Write a Review</h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Overall Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Rating *
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewFormData(prev => ({ ...prev, rating_overall: rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            rating <= reviewFormData.rating_overall
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          } cursor-pointer hover:scale-110 transition-transform`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Quality
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewFormData(prev => ({ ...prev, rating_product: rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating <= reviewFormData.rating_product
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          } cursor-pointer hover:scale-110 transition-transform`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Service Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Service
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewFormData(prev => ({ ...prev, rating_service: rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating <= reviewFormData.rating_service
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          } cursor-pointer hover:scale-110 transition-transform`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Experience
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewFormData(prev => ({ ...prev, rating_delivery: rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating <= reviewFormData.rating_delivery
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          } cursor-pointer hover:scale-110 transition-transform`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review
                  </label>
                  <textarea
                    value={reviewFormData.review_text}
                    onChange={(e) => setReviewFormData(prev => ({ ...prev, review_text: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Share your experience with this product..."
                  />
                </div>

                {/* Would Buy Again */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Would you buy this again?
                  </label>
                  <select
                    value={reviewFormData.would_buy_again}
                    onChange={(e) => setReviewFormData(prev => ({ ...prev, would_buy_again: e.target.value as 'yes' | 'no' | 'maybe' }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="yes">Yes</option>
                    <option value="maybe">Maybe</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Anonymous Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={reviewFormData.is_anonymous}
                    onChange={(e) => setReviewFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
                    Post as anonymous
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitReviewMutation.mutate()}
                    disabled={submitReviewMutation.isPending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_ProductDetail_Customer;