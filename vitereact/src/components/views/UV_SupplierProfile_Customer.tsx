import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Star, 
  MapPin, 
  Clock, 
  ShoppingCart, 
  MessageCircle, 
  X,
  Heart,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Package
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Supplier {
  supplier_id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  verification_status: string;
  rating_average: number;
  total_reviews: number;
  total_sales: number;
  total_orders: number;
  fulfillment_rate: number;
  response_time_average: number | null;
  operating_hours: Record<string, any> | null;
  service_areas: string[] | null;
  return_policy: string | null;
  shipping_policy: string | null;
  minimum_order_value: number | null;
  member_since: string;
  status: string;
}

interface Product {
  product_id: string;
  supplier_id: string;
  category_id: string;
  sku: string;
  product_name: string;
  description: string | null;
  price_per_unit: number;
  unit_of_measure: string;
  stock_quantity: number;
  status: string;
  primary_image_url: string | null;
  brand: string | null;
  is_featured: boolean;
  sales_count: number;
}

interface Review {
  review_id: string;
  order_id: string;
  customer_id: string;
  supplier_id: string;
  product_id: string | null;
  rating_overall: number;
  rating_product: number | null;
  rating_service: number | null;
  rating_delivery: number | null;
  review_text: string | null;
  photos: string[] | null;
  helpful_votes: number;
  verified_purchase: boolean;
  would_buy_again: string | null;
  is_anonymous: boolean;
  review_date: string;
  status: string;
  supplier_response: string | null;
  supplier_response_date: string | null;
}

interface ProductFilters {
  category_id: string | null;
  search_query: string | null;
  price_min: number | null;
  price_max: number | null;
  in_stock_only: boolean | null;
  sort_by: string;
  sort_order: string;
  status?: string;
}

interface ReviewFilters {
  rating: number | null;
  verified_only: boolean;
  sort_by: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchSupplierProfile = async (supplier_id: string): Promise<Supplier> => {
  const { data } = await axios.get(`${API_BASE_URL}/suppliers/${supplier_id}`);
  return data;
};

const fetchSupplierProducts = async (
  supplier_id: string,
  filters: ProductFilters,
  page: number
): Promise<{ products: Product[]; total: number }> => {
  const params: Record<string, any> = {
    status: filters.status || 'active',
    limit: 12,
    offset: (page - 1) * 12,
    sort_by: filters.sort_by,
    sort_order: filters.sort_order
  };

  if (filters.category_id) params.category = filters.category_id;
  if (filters.search_query) params.search_query = filters.search_query;
  if (filters.price_min !== null) params.price_min = filters.price_min;
  if (filters.price_max !== null) params.price_max = filters.price_max;
  if (filters.in_stock_only) params.in_stock_only = true;

  const { data } = await axios.get(`${API_BASE_URL}/suppliers/${supplier_id}/products`, { params });
  return data;
};

const fetchSupplierReviews = async (
  supplier_id: string,
  filters: ReviewFilters,
  page: number,
  auth_token: string
): Promise<{ reviews: Review[]; total: number; average_rating: number }> => {
  const params: Record<string, any> = {
    supplier_id,
    status: 'published',
    limit: 10,
    offset: (page - 1) * 10,
    sort_by: filters.sort_by,
    sort_order: 'desc'
  };

  if (filters.rating !== null) params.min_rating = filters.rating;
  if (filters.verified_only) params.verified_purchase = true;

  const { data } = await axios.get(`${API_BASE_URL}/reviews`, {
    params,
    headers: { Authorization: `Bearer ${auth_token}` }
  });

  return data;
};

const updatePreferredSuppliers = async (
  preferred_suppliers: string[],
  auth_token: string
): Promise<{ preferred_suppliers: string[] }> => {
  const { data } = await axios.patch(
    `${API_BASE_URL}/customers/me`,
    { preferred_suppliers },
    { headers: { Authorization: `Bearer ${auth_token}` } }
  );
  return data;
};

const addProductToCart = async (
  product_id: string,
  quantity: number
): Promise<any> => {
  // Use relative URL - axios baseURL already includes /api prefix and auth header is set globally
  const { data } = await axios.post(
    '/cart/items',
    { product_id, quantity }
  );
  return data;
};

const createChatConversation = async (
  supplier_id: string
): Promise<{ conversation_id: string }> => {
  // Use relative URL - axios baseURL already includes /api prefix and auth header is set globally
  const { data } = await axios.post(
    '/api/chat/conversations',
    {
      conversation_type: 'customer_supplier',
      supplier_id
    }
  );
  return data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierProfile_Customer: React.FC = () => {
  const { supplier_id } = useParams<{ supplier_id: string }>();
  const queryClient = useQueryClient();

  // CRITICAL: Individual Zustand selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const customerProfile = useAppStore(state => state.authentication_state.customer_profile);
  const fetchCart = useAppStore(state => state.fetch_cart);

  // Local state
  const [activeTab, setActiveTab] = useState<'about' | 'products' | 'reviews' | 'contact'>('about');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [productFilters, setProductFilters] = useState<ProductFilters>({
    category_id: null,
    search_query: null,
    price_min: null,
    price_max: null,
    in_stock_only: null,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [reviewFilters, setReviewFilters] = useState<ReviewFilters>({
    rating: null,
    verified_only: false,
    sort_by: 'review_date'
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Check if following supplier
  const isFollowing = useMemo(() => {
    if (!customerProfile?.preferred_suppliers || !supplier_id) return false;
    return customerProfile.preferred_suppliers.includes(supplier_id);
  }, [customerProfile?.preferred_suppliers, supplier_id]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Fetch supplier profile
  const {
    data: supplierProfile,
    isLoading: profileLoading,
    error: profileError
  } = useQuery({
    queryKey: ['supplier', supplier_id],
    queryFn: () => fetchSupplierProfile(supplier_id!),
    enabled: !!supplier_id,
    staleTime: 5 * 60 * 1000
  });

  // Fetch supplier products
  const {
    data: productsData,
    isLoading: productsLoading
  } = useQuery({
    queryKey: ['supplier-products', supplier_id, productFilters, productsPage],
    queryFn: () => fetchSupplierProducts(supplier_id!, productFilters, productsPage),
    enabled: !!supplier_id && activeTab === 'products',
    staleTime: 2 * 60 * 1000,
    select: (data) => ({
      products: data.products,
      total_count: data.total,
      total_pages: Math.ceil(data.total / 12)
    })
  });

  // Fetch supplier reviews
  const {
    data: reviewsData,
    isLoading: reviewsLoading
  } = useQuery({
    queryKey: ['supplier-reviews', supplier_id, reviewFilters, reviewsPage],
    queryFn: () => fetchSupplierReviews(supplier_id!, reviewFilters, reviewsPage, authToken!),
    enabled: !!supplier_id && !!authToken && activeTab === 'reviews',
    staleTime: 2 * 60 * 1000,
    select: (data) => ({
      reviews: data.reviews,
      total_count: data.total,
      average_rating: data.average_rating,
      total_pages: Math.ceil(data.total / 10),
      rating_distribution: calculateRatingDistribution(data.reviews)
    })
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Follow/Unfollow supplier mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const currentPreferred = customerProfile?.preferred_suppliers || [];
      const newPreferred = isFollowing
        ? currentPreferred.filter(id => id !== supplier_id)
        : [...currentPreferred, supplier_id!];
      
      return updatePreferredSuppliers(newPreferred, authToken!);
    },
    onSuccess: () => {
      // Invalidate customer profile query
      queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
    }
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: ({ product_id, quantity }: { product_id: string; quantity: number }) =>
      addProductToCart(product_id, quantity, authToken!),
    onSuccess: () => {
      fetchCart();
      // Show success feedback (could add toast notification)
    }
  });

  // Contact supplier mutation
  const contactMutation = useMutation({
    mutationFn: () => createChatConversation(supplier_id!, authToken!),
    onSuccess: () => {
      // Could redirect to chat or open chat widget
      setContactModalOpen(false);
      // Assuming chat widget exists in global views
    }
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const calculateRatingDistribution = (reviews: Review[]): Record<number, number> => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      const rating = Math.floor(review.rating_overall);
      if (rating >= 1 && rating <= 5) {
        dist[rating]++;
      }
    });
    return dist;
  };

  const formatMemberSince = (date: string) => {
    const memberDate = new Date(date);
    const now = new Date();
    const years = now.getFullYear() - memberDate.getFullYear();
    if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
    const months = (now.getFullYear() - memberDate.getFullYear()) * 12 + now.getMonth() - memberDate.getMonth();
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  const handleFollowToggle = () => {
    followMutation.mutate();
  };

  const handleAddToCart = (product_id: string) => {
    addToCartMutation.mutate({ product_id, quantity: 1 });
  };

  const handleContactSupplier = () => {
    contactMutation.mutate();
  };

  const handleProductFilterChange = (key: keyof ProductFilters, value: any) => {
    setProductFilters(prev => ({ ...prev, [key]: value }));
    setProductsPage(1); // Reset to first page on filter change
  };

  const handleReviewFilterChange = (key: keyof ReviewFilters, value: any) => {
    setReviewFilters(prev => ({ ...prev, [key]: value }));
    setReviewsPage(1);
  };

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================

  if (profileLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading supplier profile...</p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // RENDER: ERROR STATE
  // ============================================================================

  if (profileError || !supplierProfile) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Supplier Not Found</h2>
              <p className="text-gray-600 mb-6">
                The supplier you're looking for doesn't exist or has been removed.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse All Products
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // RENDER: MAIN COMPONENT
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Cover Photo & Header */}
        <div className="relative">
          {/* Cover Photo */}
          <div className="h-64 md:h-80 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
            {supplierProfile.cover_photo_url ? (
              <img
                src={supplierProfile.cover_photo_url}
                alt={`${supplierProfile.business_name} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="w-32 h-32 text-white opacity-20" />
              </div>
            )}
          </div>

          {/* Logo & Primary Info Overlay */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative -mt-16 sm:-mt-20">
              <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full shadow-lg border-4 border-white overflow-hidden">
                      {supplierProfile.logo_url ? (
                        <img
                          src={supplierProfile.logo_url}
                          alt={`${supplierProfile.business_name} logo`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <span className="text-3xl font-bold text-blue-600">
                            {supplierProfile.business_name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-3xl font-bold text-gray-900 truncate">
                            {supplierProfile.business_name}
                          </h1>
                          {supplierProfile.verification_status === 'verified' && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                              <ShieldCheck className="w-4 h-4" />
                              <span className="text-sm font-medium">Verified</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          {/* Rating */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= Math.round(supplierProfile.rating_average)
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-medium text-gray-900">
                              {Number(supplierProfile.rating_average).toFixed(1)}
                            </span>
                            <span>({supplierProfile.total_reviews} reviews)</span>
                          </div>

                          {/* Member Since */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Member for {formatMemberSince(supplierProfile.member_since)}</span>
                          </div>

                          {/* Response Time */}
                          {supplierProfile.response_time_average !== null && (
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span>
                                Replies within {Number(supplierProfile.response_time_average).toFixed(1)} hours
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleFollowToggle}
                          disabled={followMutation.isPending}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                            isFollowing
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Heart className={`w-5 h-5 ${isFollowing ? 'fill-current' : ''}`} />
                          <span className="hidden sm:inline">
                            {isFollowing ? 'Following' : 'Follow'}
                          </span>
                        </button>

                        <button
                          onClick={() => setContactModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span className="hidden sm:inline">Contact</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {productsData?.total_count || 0}
                    </div>
                    <div className="text-sm text-gray-600">Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {supplierProfile.total_orders}
                    </div>
                    <div className="text-sm text-gray-600">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {Number(supplierProfile.fulfillment_rate).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Fulfillment</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {supplierProfile.total_reviews}
                    </div>
                    <div className="text-sm text-gray-600">Reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8">
              {(['about', 'products', 'reviews', 'contact'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Business Description */}
              <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {supplierProfile.business_description || 'No description provided.'}
                </p>
              </div>

              {/* Service Areas */}
              {supplierProfile.service_areas && supplierProfile.service_areas.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Service Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {supplierProfile.service_areas.map((area, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Operating Hours */}
              {supplierProfile.operating_hours && (
                <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Operating Hours
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(supplierProfile.operating_hours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="font-medium text-gray-900 capitalize">{day}</span>
                        <span className="text-gray-600">{String(hours)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policies Preview */}
              <div className="grid md:grid-cols-2 gap-6">
                {supplierProfile.return_policy && (
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Return Policy</h3>
                    <p className="text-gray-700 text-sm line-clamp-4">
                      {supplierProfile.return_policy}
                    </p>
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                    >
                      View full policy →
                    </button>
                  </div>
                )}

                {supplierProfile.shipping_policy && (
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Shipping Policy</h3>
                    <p className="text-gray-700 text-sm line-clamp-4">
                      {supplierProfile.shipping_policy}
                    </p>
                    <button
                      onClick={() => setActiveTab('contact')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                    >
                      View full policy →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Filters & Search */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productFilters.search_query || ''}
                        onChange={(e) => handleProductFilterChange('search_query', e.target.value || null)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Filter Toggle (Mobile) */}
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="sm:hidden flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    <Filter className="w-5 h-5" />
                    Filters
                  </button>

                  {/* Sort */}
                  <select
                    value={productFilters.sort_by}
                    onChange={(e) => handleProductFilterChange('sort_by', e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white"
                  >
                    <option value="created_at">Newest</option>
                    <option value="price_per_unit">Price: Low to High</option>
                    <option value="sales_count">Most Popular</option>
                    <option value="product_name">Name A-Z</option>
                  </select>
                </div>

                {/* Filter Panel */}
                {(showFilterPanel || window.innerWidth >= 640) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div className="flex flex-wrap gap-3">
                      {/* In Stock Only */}
                      <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={productFilters.in_stock_only || false}
                          onChange={(e) => handleProductFilterChange('in_stock_only', e.target.checked || null)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">In Stock Only</span>
                      </label>

                      {/* Price Range */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Min $"
                          value={productFilters.price_min || ''}
                          onChange={(e) => handleProductFilterChange('price_min', e.target.value ? Number(e.target.value) : null)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          placeholder="Max $"
                          value={productFilters.price_max || ''}
                          onChange={(e) => handleProductFilterChange('price_max', e.target.value ? Number(e.target.value) : null)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Products Grid */}
              {productsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 animate-pulse">
                      <div className="w-full h-64 bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : productsData && productsData.products.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {productsData.products.map((product) => (
                      <div
                        key={product.product_id}
                        className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow"
                      >
                        <Link to={`/product/${product.product_id}`}>
                          <div className="relative h-64 bg-gray-100">
                            {product.primary_image_url ? (
                              <img
                                src={product.primary_image_url}
                                alt={product.product_name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-16 h-16 text-gray-300" />
                              </div>
                            )}
                            {product.is_featured && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded">
                                FEATURED
                              </div>
                            )}
                            {product.stock_quantity > 0 ? (
                              <div className="absolute top-2 right-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                In Stock
                              </div>
                            ) : (
                              <div className="absolute top-2 right-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Out of Stock
                              </div>
                            )}
                          </div>
                        </Link>

                        <div className="p-4">
                          <Link to={`/product/${product.product_id}`}>
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                              {product.product_name}
                            </h3>
                          </Link>

                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-bold text-gray-900">
                              ${Number(product.price_per_unit || 0).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-600">
                              / {product.unit_of_measure}
                            </span>
                          </div>

                          <button
                            onClick={() => handleAddToCart(product.product_id)}
                            disabled={product.stock_quantity === 0 || addToCartMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart className="w-5 h-5" />
                            {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {productsData.total_pages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <button
                        onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                        disabled={productsPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <span className="px-4 py-2 text-sm font-medium text-gray-700">
                        Page {productsPage} of {productsData.total_pages}
                      </span>

                      <button
                        onClick={() => setProductsPage(p => Math.min(productsData.total_pages, p + 1))}
                        disabled={productsPage === productsData.total_pages}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
                  <p className="text-gray-600">This supplier hasn't listed any products yet.</p>
                </div>
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Review Summary */}
              {reviewsData && (
                <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Overall Rating */}
                    <div className="text-center md:text-left">
                      <div className="text-5xl font-bold text-gray-900 mb-2">
                        {Number(reviewsData.average_rating).toFixed(1)}
                      </div>
                      <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-6 h-6 ${
                              star <= Math.round(Number(reviewsData.average_rating))
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-600">Based on {reviewsData.total_count} reviews</p>
                    </div>

                    {/* Rating Distribution */}
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = reviewsData.rating_distribution[rating] || 0;
                        const percentage = reviewsData.total_count > 0
                          ? (count / reviewsData.total_count) * 100
                          : 0;

                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-12">
                              {rating} star
                            </span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Filters */}
                  <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
                    <select
                      value={reviewFilters.rating || ''}
                      onChange={(e) => handleReviewFilterChange('rating', e.target.value ? Number(e.target.value) : null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">All ratings</option>
                      <option value="5">5 stars</option>
                      <option value="4">4+ stars</option>
                      <option value="3">3+ stars</option>
                    </select>

                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={reviewFilters.verified_only}
                        onChange={(e) => handleReviewFilterChange('verified_only', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Verified only</span>
                    </label>

                    <select
                      value={reviewFilters.sort_by}
                      onChange={(e) => handleReviewFilterChange('sort_by', e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="review_date">Most Recent</option>
                      <option value="rating_overall">Highest Rating</option>
                      <option value="helpful_votes">Most Helpful</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {reviewsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : reviewsData && reviewsData.reviews.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {reviewsData.reviews.map((review) => (
                      <div
                        key={review.review_id}
                        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
                      >
                        {/* Review Header */}
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-5 h-5 ${
                                      star <= review.rating_overall
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {review.verified_purchase && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  Verified Purchase
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {review.is_anonymous ? 'Anonymous' : 'Customer'} •{' '}
                              {new Date(review.review_date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Review Text */}
                        {review.review_text && (
                          <p className="text-gray-700 mb-4 leading-relaxed">
                            {review.review_text}
                          </p>
                        )}

                        {/* Review Photos */}
                        {review.photos && review.photos.length > 0 && (
                          <div className="flex gap-2 mb-4 overflow-x-auto">
                            {review.photos.map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Review photo ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                              />
                            ))}
                          </div>
                        )}

                        {/* Supplier Response */}
                        {review.supplier_response && (
                          <div className="mt-4 pt-4 border-t border-gray-200 bg-blue-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-sm font-bold">
                                  {supplierProfile.business_name.charAt(0)}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {supplierProfile.business_name} responded
                                </div>
                                <p className="text-sm text-gray-700">
                                  {review.supplier_response}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {reviewsData.total_pages > 1 && (
                    <div className="flex justify-center items-center gap-2">
                      <button
                        onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                        disabled={reviewsPage === 1}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <span className="px-4 py-2 text-sm font-medium text-gray-700">
                        Page {reviewsPage} of {reviewsData.total_pages}
                      </span>

                      <button
                        onClick={() => setReviewsPage(p => Math.min(reviewsData.total_pages, p + 1))}
                        disabled={reviewsPage === reviewsData.total_pages}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
                  <p className="text-gray-600">Be the first to review this supplier!</p>
                </div>
              )}
            </div>
          )}

          {/* CONTACT TAB */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>

                <div className="space-y-4">
                  <button
                    onClick={() => setContactModalOpen(true)}
                    className="w-full flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Send Message</div>
                      <div className="text-sm text-gray-600">Chat with {supplierProfile.business_name}</div>
                    </div>
                  </button>

                  {supplierProfile.response_time_average !== null && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Clock className="w-6 h-6 text-gray-600" />
                      <div>
                        <div className="font-semibold text-gray-900">Response Time</div>
                        <div className="text-sm text-gray-600">
                          Usually replies within {Number(supplierProfile.response_time_average).toFixed(1)} hours
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Policies */}
              {supplierProfile.return_policy && (
                <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Return Policy</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {supplierProfile.return_policy}
                  </p>
                </div>
              )}

              {supplierProfile.shipping_policy && (
                <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Shipping Policy</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {supplierProfile.shipping_policy}
                  </p>
                </div>
              )}

              {supplierProfile.minimum_order_value !== null && (
                <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Minimum Order</h3>
                  <p className="text-gray-700">
                    Minimum order value: <span className="font-bold text-gray-900">
                      ${Number(supplierProfile.minimum_order_value || 0).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contact Modal */}
        {contactModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Contact Supplier</h3>
                <button
                  onClick={() => setContactModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleContactSupplier}
                  disabled={contactMutation.isPending}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5" />
                  {contactMutation.isPending ? 'Starting chat...' : 'Start Chat'}
                </button>

                <p className="text-sm text-gray-600 text-center">
                  Our team typically responds within{' '}
                  {supplierProfile.response_time_average !== null
                    ? `${Number(supplierProfile.response_time_average).toFixed(1)} hours`
                    : 'a few hours'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_SupplierProfile_Customer;