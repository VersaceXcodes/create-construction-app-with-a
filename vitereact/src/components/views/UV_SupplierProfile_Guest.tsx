import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  
  Star, 
  ShieldCheck, 
  
  
  Calendar,
  Package,
  TrendingUp,
  MessageSquare,
  X,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (matching Zod schemas)
// ============================================================================

interface Supplier {
  supplier_id: string;
  business_name: string;
  business_description: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  rating_average: number;
  total_reviews: number;
  verification_status: string;
  member_since: string;
  return_policy: string | null;
  shipping_policy: string | null;
  minimum_order_value: number | null;
  total_sales: number;
  total_orders: number;
}

interface Product {
  product_id: string;
  product_name: string;
  price_per_unit: number;
  stock_quantity: number;
  primary_image_url: string | null;
  status: string;
  category_id: string;
  unit_of_measure: string;
  brand: string | null;
}

interface Review {
  review_id: string;
  rating_overall: number;
  review_text: string | null;
  verified_purchase: boolean;
  review_date: string;
  helpful_votes: number;
  is_anonymous: boolean;
}

// interface ReviewSummary {
//   average_rating: number;
//   total_count: number;
//   rating_distribution: {
//     5: number;
//     4: number;
//     3: number;
//     2: number;
//     1: number;
//   };
// }

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchSupplierProfile = async (supplier_id: string): Promise<Supplier> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/${supplier_id}`
  );
  return response.data;
};

const fetchSupplierProducts = async (
  supplier_id: string,
  category?: string,
  search?: string,
  page: number = 1
): Promise<{ products: Product[]; total: number }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/${supplier_id}/products`,
    {
      params: {
        status: 'active',
        category,
        search_query: search,
        limit: 24,
        offset: (page - 1) * 24
      }
    }
  );
  return response.data;
};

const fetchSupplierReviews = async (
  supplier_id: string
): Promise<{ reviews: Review[]; average_rating: number; total: number }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews`,
    {
      params: {
        supplier_id,
        status: 'published',
        limit: 3,
        sort_by: 'review_date',
        sort_order: 'desc'
      }
    }
  );
  return response.data;
};

// ============================================================================
// SIGN-UP GATE MODAL COMPONENT
// ============================================================================

interface SignUpGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'contact' | 'reviews';
}

// eslint-disable-next-line react-refresh/only-export-components
const SignUpGateModal: React.FC<SignUpGateModalProps> = ({ isOpen, onClose, feature }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const featureText = feature === 'contact' 
    ? {
        title: 'Contact This Supplier',
        description: 'Create a free account to message suppliers directly and get real-time responses.',
        benefits: [
          'Direct messaging with suppliers',
          'Real-time order tracking',
          'Save favorite suppliers',
          'Exclusive trade pricing'
        ]
      }
    : {
        title: 'Read All Reviews',
        description: 'Create a free account to access all verified customer reviews and make informed decisions.',
        benefits: [
          'Read all verified reviews',
          'See detailed ratings breakdown',
          'Compare supplier performance',
          'Leave your own reviews'
        ]
      };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative animate-fadeIn">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {feature === 'contact' ? (
                <MessageSquare className="w-8 h-8 text-blue-600" />
              ) : (
                <Star className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {featureText.title}
            </h3>
            <p className="text-gray-600">
              {featureText.description}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="font-semibold text-blue-900 mb-3">With a free account, you can:</p>
            <ul className="space-y-2">
              {featureText.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start text-blue-800 text-sm">
                  <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/register/customer')}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gray-100 text-gray-900 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
            >
              Sign In
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            Free forever. No credit card required.
          </p>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierProfile_Guest: React.FC = () => {
  const { supplier_id } = useParams<{ supplier_id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate();

  // URL params
  const activeTabParam = searchParams.get('tab') || 'about';
  const productCategory = searchParams.get('product_category') || '';
  const productSearch = searchParams.get('product_search') || '';
  const productPageParam = searchParams.get('product_page') || '1';

  // Local state
  const [activeTab, setActiveTab] = useState<string>(activeTabParam);
  const [categoryFilter, setCategoryFilter] = useState<string>(productCategory);
  const [searchFilter, setSearchFilter] = useState<string>(productSearch);
  const [currentPage, setCurrentPage] = useState<number>(parseInt(productPageParam));
  const [contactGateOpen, setContactGateOpen] = useState(false);
  const [reviewsGateOpen, setReviewsGateOpen] = useState(false);

  // Sync URL params with local state
  useEffect(() => {
    setActiveTab(activeTabParam);
  }, [activeTabParam]);

  useEffect(() => {
    setCategoryFilter(productCategory);
  }, [productCategory]);

  useEffect(() => {
    setSearchFilter(productSearch);
  }, [productSearch]);

  useEffect(() => {
    setCurrentPage(parseInt(productPageParam));
  }, [productPageParam]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Fetch supplier profile
  const {
    data: supplier,
    isLoading: isSupplierLoading,
    error: supplierError
  } = useQuery({
    queryKey: ['supplier', supplier_id],
    queryFn: () => fetchSupplierProfile(supplier_id!),
    enabled: !!supplier_id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Fetch supplier products (only when products tab is active)
  const {
    data: productsData,
    isLoading: isProductsLoading
  } = useQuery({
    queryKey: ['supplier-products', supplier_id, categoryFilter, searchFilter, currentPage],
    queryFn: () => fetchSupplierProducts(supplier_id!, categoryFilter, searchFilter, currentPage),
    enabled: !!supplier_id && activeTab === 'products',
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  // Fetch supplier reviews (only when reviews tab is active)
  const {
    data: reviewsData,
    isLoading: isReviewsLoading
  } = useQuery({
    queryKey: ['supplier-reviews', supplier_id],
    queryFn: () => fetchSupplierReviews(supplier_id!),
    enabled: !!supplier_id && activeTab === 'reviews',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Helper functions
  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.getFullYear().toString();
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const calculateTotalPages = () => {
    if (!productsData) return 0;
    return Math.ceil(productsData.total / 24);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    const params: Record<string, string> = { tab: 'products' };
    if (categoryFilter) params.product_category = categoryFilter;
    if (searchFilter) params.product_search = searchFilter;
    params.product_page = '1';
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const params: Record<string, string> = { tab: 'products' };
    if (categoryFilter) params.product_category = categoryFilter;
    if (searchFilter) params.product_search = searchFilter;
    params.product_page = newPage.toString();
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Error state
  if (supplierError) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Supplier Not Found</h2>
            <p className="text-gray-600 mb-6">The supplier you're looking for doesn't exist or has been removed.</p>
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Loading state
  if (isSupplierLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          {/* Header skeleton */}
          <div className="w-full h-64 bg-gray-200 animate-pulse" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
            <div className="flex items-end space-x-4 mb-8">
              <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl bg-gray-200 animate-pulse" />
              <div className="flex-1 pb-4">
                <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!supplier) return null;

  // Calculate rating distribution for visual display
  const ratingDistribution = reviewsData?.reviews.reduce((acc, review) => {
    acc[review.rating_overall] = (acc[review.rating_overall] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  const totalReviewsCount = reviewsData?.total || 0;

  return (
    <>
      {/* Sign-up Gate Modals */}
      <SignUpGateModal 
        isOpen={contactGateOpen} 
        onClose={() => setContactGateOpen(false)} 
        feature="contact"
      />
      <SignUpGateModal 
        isOpen={reviewsGateOpen} 
        onClose={() => setReviewsGateOpen(false)} 
        feature="reviews"
      />

      {/* Cover Photo */}
      <div className="w-full h-64 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        {supplier.cover_photo_url ? (
          <img 
            src={supplier.cover_photo_url} 
            alt={`${supplier.business_name} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700" />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-20" />
      </div>

      {/* Supplier Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 mb-8">
          {/* Logo */}
          <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl overflow-hidden flex-shrink-0">
            {supplier.logo_url ? (
              <img 
                src={supplier.logo_url} 
                alt={`${supplier.business_name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {supplier.business_name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Supplier Info */}
          <div className="flex-1 pb-0 md:pb-4">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                {supplier.business_name}
              </h1>
              {supplier.verification_status === 'verified' && (
                <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
              <div className="flex items-center space-x-1">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-semibold text-gray-900">
                  {Number(supplier.rating_average).toFixed(1)}
                </span>
                <span className="text-sm">
                  ({supplier.total_reviews} reviews)
                </span>
              </div>
              
              <div className="flex items-center space-x-1 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Member since {formatMemberSince(supplier.member_since)}</span>
              </div>
              
              <div className="flex items-center space-x-1 text-sm">
                <Package className="w-4 h-4" />
                <span>{supplier.total_orders}+ orders fulfilled</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setContactGateOpen(true)}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Contact Supplier</span>
            </button>
            <button
              onClick={() => handleTabChange('products')}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-300"
            >
              <Package className="w-5 h-5" />
              <span>View Products</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'about', label: 'About', icon: TrendingUp },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'reviews', label: 'Reviews', icon: Star }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="pb-16">
          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* About Section */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                  <p className="text-gray-700 leading-relaxed">
                    {supplier.business_description || 'No description available.'}
                  </p>
                </div>

                {/* Policies Section */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Policies</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Return Policy</h3>
                      <p className="text-gray-600 text-sm">
                        {truncateText(supplier.return_policy, 200)}
                      </p>
                      <button
                        onClick={() => setContactGateOpen(true)}
                        className="text-blue-600 text-sm font-medium hover:text-blue-700 mt-2"
                      >
                        View full policy →
                      </button>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Shipping Policy</h3>
                      <p className="text-gray-600 text-sm">
                        {truncateText(supplier.shipping_policy, 200)}
                      </p>
                      <button
                        onClick={() => setContactGateOpen(true)}
                        className="text-blue-600 text-sm font-medium hover:text-blue-700 mt-2"
                      >
                        View full policy →
                      </button>
                    </div>

                    {supplier.minimum_order_value && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Minimum Order</h3>
                        <p className="text-gray-600 text-sm">
                          ${supplier.minimum_order_value.toFixed(2)} minimum order value
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Stats Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Supplier Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Orders Fulfilled</span>
                      <span className="font-semibold text-gray-900">{supplier.total_orders.toLocaleString()}+</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Average Rating</span>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-semibold text-gray-900">{Number(supplier.rating_average).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Member Since</span>
                      <span className="font-semibold text-gray-900">{formatMemberSince(supplier.member_since)}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Card (Gated) */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Need Help?</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Create an account to contact this supplier directly and get real-time responses.
                  </p>
                  <button
                    onClick={() => setContactGateOpen(true)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Contact Supplier
                  </button>
                </div>

                {/* Sign Up CTA */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg border border-green-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Ready to Buy?</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Create a free account to purchase from this supplier and hundreds more.
                  </p>
                  <Link
                    to="/register/customer"
                    className="block w-full bg-green-600 text-white text-center py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Sign Up Free
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div>
              {/* Search and Filter Bar */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Products Grid */}
              {isProductsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
                      <div className="w-full h-64 bg-gray-200" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : productsData && productsData.products.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {productsData.products.map((product) => (
                      <Link
                        key={product.product_id}
                        to={`/product/${product.product_id}`}
                        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 group"
                      >
                        <div className="relative overflow-hidden bg-gray-100 h-64">
                          {product.primary_image_url ? (
                            <img
                              src={product.primary_image_url}
                              alt={product.product_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-16 h-16" />
                            </div>
                          )}
                          {product.stock_quantity > 0 ? (
                            <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                              In Stock
                            </div>
                          ) : (
                            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                              Out of Stock
                            </div>
                          )}
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {product.product_name}
                          </h3>
                          <div className="flex items-baseline space-x-2 mb-2">
                            <span className="text-2xl font-bold text-blue-600">
                              ${Number(product.price_per_unit || 0).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              per {product.unit_of_measure}
                            </span>
                          </div>
                          {product.brand && (
                            <p className="text-xs text-gray-500">
                              Brand: {product.brand}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {calculateTotalPages() > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-8">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="flex space-x-2">
                        {[...Array(calculateTotalPages())].map((_, idx) => {
                          const pageNum = idx + 1;
                          if (
                            pageNum === 1 ||
                            pageNum === calculateTotalPages() ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`
                                  px-4 py-2 rounded-lg font-medium transition-all
                                  ${pageNum === currentPage
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                  }
                                `}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (
                            pageNum === currentPage - 2 ||
                            pageNum === currentPage + 2
                          ) {
                            return <span key={pageNum} className="px-2 py-2">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === calculateTotalPages()}
                        className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchFilter || categoryFilter 
                      ? 'Try different search terms or filters.'
                      : 'This supplier hasn\'t added any products yet.'}
                  </p>
                  {(searchFilter || categoryFilter) && (
                    <button
                      onClick={() => {
                        setSearchFilter('');
                        setCategoryFilter('');
                        setSearchParams({ tab: 'products' });
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Review Summary */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Overall Rating */}
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                      <span className="text-5xl font-bold text-gray-900">
                        {Number(supplier.rating_average).toFixed(1)}
                      </span>
                      <Star className="w-12 h-12 text-yellow-500 fill-current" />
                    </div>
                    <p className="text-gray-600 mb-1">
                      Based on {totalReviewsCount} reviews
                    </p>
                    <div className="flex items-center justify-center md:justify-start space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= Math.round(Number(supplier.rating_average))
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = ratingDistribution[rating] || 0;
                      const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
                      
                      return (
                        <div key={rating} className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 w-8">{rating}★</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-yellow-500 h-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Review List (Limited to 3 for guests) */}
              {isReviewsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : reviewsData && reviewsData.reviews.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {reviewsData.reviews.map((review) => (
                      <div key={review.review_id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= review.rating_overall
                                      ? 'text-yellow-500 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            {review.verified_purchase && (
                              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.review_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {review.review_text && (
                          <p className="text-gray-700 leading-relaxed mb-3">
                            {review.review_text}
                          </p>
                        )}
                        
                        {review.helpful_votes > 0 && (
                          <p className="text-sm text-gray-500">
                            {review.helpful_votes} people found this helpful
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* View All Reviews Gate */}
                  {totalReviewsCount > 3 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg border border-blue-200 p-8 text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Want to read all {totalReviewsCount} reviews?
                      </h3>
                      <p className="text-gray-700 mb-6">
                        Create a free account to see all verified customer reviews and ratings.
                      </p>
                      <button
                        onClick={() => setReviewsGateOpen(true)}
                        className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                      >
                        Sign Up to Read All Reviews
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
                  <p className="text-gray-600">
                    This supplier hasn't received any reviews yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Order from {supplier.business_name}?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Create your free account to access real-time inventory, compare prices, and track deliveries.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/register/customer"
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-xl"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SupplierProfile_Guest;