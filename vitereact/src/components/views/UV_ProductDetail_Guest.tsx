import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Star, Heart, Share2, ChevronLeft, ChevronRight, Check, X, MapPin, Clock, Shield, Package, Truck, ZoomIn } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (matching backend Zod schemas exactly)
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
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  images: string[] | null;
  primary_image_url: string | null;
  brand: string | null;
  dimensions: Record<string, any> | null;
  weight: number | null;
  warranty_information: string | null;
  minimum_order_quantity: number;
  // Joined fields from API
  business_name?: string;
  rating_average?: number;
  category_name?: string;
}

interface SupplierInfo {
  supplier_id: string;
  business_name: string;
  logo_url: string | null;
  rating_average: number;
  total_reviews: number;
  verification_status: string;
  member_since: string;
}

interface Review {
  review_id: string;
  rating_overall: number;
  review_text: string | null;
  photos: string[] | null;
  verified_purchase: boolean;
  review_date: string;
  helpful_votes: number;
  is_anonymous: boolean;
}

interface ReviewSummary {
  average_rating: number;
  total: number;
  reviews: Review[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchProductById = async (product_id: string): Promise<Product> => {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${product_id}`);
  return response.data;
};

const fetchSupplierById = async (supplier_id: string): Promise<SupplierInfo> => {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/${supplier_id}`);
  // Extract only guest-safe fields
  return {
    supplier_id: response.data.supplier_id,
    business_name: response.data.business_name,
    logo_url: response.data.logo_url,
    rating_average: response.data.rating_average,
    total_reviews: response.data.total_reviews,
    verification_status: response.data.verification_status,
    member_since: response.data.member_since
  };
};

const fetchReviews = async (product_id: string): Promise<ReviewSummary> => {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews`, {
    params: {
      product_id,
      status: 'published',
      limit: 50, // Get all to calculate distribution, but only show first 3
      sort_by: 'helpful_votes',
      sort_order: 'desc'
    }
  });
  return response.data;
};

// ============================================================================
// COMPONENT
// ============================================================================

const UV_ProductDetail_Guest: React.FC = () => {
  const { product_id } = useParams<{ product_id: string }>();
  const navigate = useNavigate();

  // Local UI State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpModalReason, setSignUpModalReason] = useState<'zoom' | 'contact' | 'reviews' | 'purchase'>('purchase');

  // Data Fetching with React Query
  const { data: product, isLoading: isLoadingProduct, error: productError } = useQuery({
    queryKey: ['product', product_id],
    queryFn: () => fetchProductById(product_id!),
    enabled: !!product_id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: supplier, isLoading: isLoadingSupplier } = useQuery({
    queryKey: ['supplier', product?.supplier_id],
    queryFn: () => fetchSupplierById(product!.supplier_id),
    enabled: !!product?.supplier_id,
    staleTime: 10 * 60 * 1000
  });

  const { data: reviewData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', product_id],
    queryFn: () => fetchReviews(product_id!),
    enabled: !!product_id,
    staleTime: 5 * 60 * 1000
  });

  // Derived Data
  const images = product?.images || (product?.primary_image_url ? [product.primary_image_url] : []);
  const activeImage = images[activeImageIndex] || '/placeholder-product.jpg';
  const featuredReviews = reviewData?.reviews?.slice(0, 3) || [];
  const hasMoreReviews = (reviewData?.total || 0) > 3;

  // Stock Status Calculation (Guest sees generic status only)
  const getStockStatus = () => {
    if (!product) return { status: '', color: 'gray', icon: null };
    
    if (product.status === 'out_of_stock' || product.stock_quantity === 0) {
      return { status: 'Out of Stock', color: 'red', icon: X };
    }
    
    if (product.stock_quantity <= product.low_stock_threshold) {
      return { status: 'Low Stock', color: 'amber', icon: Package };
    }
    
    return { status: 'In Stock', color: 'green', icon: Check };
  };

  const stockStatus = getStockStatus();

  // Rating Distribution Calculation
  const getRatingDistribution = () => {
    if (!reviewData?.reviews) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewData.reviews.forEach((review) => {
      const rating = review.rating_overall as 1 | 2 | 3 | 4 | 5;
      distribution[rating]++;
    });
    
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();

  // Modal Handlers
  const handleShowSignUpModal = (reason: 'zoom' | 'contact' | 'reviews' | 'purchase') => {
    setSignUpModalReason(reason);
    setShowSignUpModal(true);
  };

  const handleNavigateToSignUp = () => {
    navigate('/register/customer');
  };

  // Image Navigation
  const handlePreviousImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Format Price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Format Date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Render Star Rating
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Loading State
  if (isLoadingProduct) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Skeleton */}
            <div className="animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image Skeleton */}
                <div className="space-y-4">
                  <div className="bg-gray-200 rounded-xl h-96 lg:h-[600px]"></div>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-gray-200 rounded-lg h-20 w-20"></div>
                    ))}
                  </div>
                </div>
                
                {/* Info Skeleton */}
                <div className="space-y-6">
                  <div className="h-10 bg-gray-200 rounded-lg w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded-lg w-1/2"></div>
                  <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (productError || !product) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-16">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="bg-white rounded-xl shadow-lg p-12">
              <div className="text-red-600 mb-4">
                <Package className="h-16 w-16 mx-auto" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h1>
              <p className="text-gray-600 mb-8">
                The product you're looking for doesn't exist or has been removed.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Browse All Products
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Sign-Up Modal */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {signUpModalReason === 'zoom' && 'Sign Up to Zoom Images'}
                {signUpModalReason === 'contact' && 'Sign Up to Contact Supplier'}
                {signUpModalReason === 'reviews' && 'Sign Up to Read All Reviews'}
                {signUpModalReason === 'purchase' && 'Sign Up to Purchase'}
              </h3>
              
              <p className="text-gray-600 mb-6">
                Create a free account to unlock all features and start shopping.
              </p>
              
              <div className="space-y-3 mb-6 text-left">
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">See exact stock levels and availability</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Real-time delivery tracking</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Secure checkout and order history</span>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Contact suppliers directly</span>
                </div>
              </div>
              
              <button
                onClick={handleNavigateToSignUp}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 mb-3 shadow-lg hover:shadow-xl"
              >
                Create Free Account
              </button>
              
              <button
                onClick={() => setShowSignUpModal(false)}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link to="/products" className="text-gray-500 hover:text-gray-700">Products</Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900 font-medium truncate">{product.product_name}</li>
            </ol>
          </nav>

          {/* Product Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Left Column: Image Gallery */}
            <div className="p-6 lg:p-8">
              {/* Primary Image */}
              <div className="relative bg-gray-100 rounded-xl overflow-hidden mb-4 group">
                <img
                  src={activeImage}
                  alt={product.product_name}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '600px' }}
                />
                
                {/* Zoom Disabled Overlay (Guest) */}
                <div 
                  className="absolute inset-0 bg-transparent cursor-pointer group-hover:bg-black group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center"
                  onClick={() => handleShowSignUpModal('zoom')}
                  title="Sign up to zoom"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                    <ZoomIn className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">Sign up to zoom</span>
                  </div>
                </div>

                {/* Image Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-200"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-6 w-6 text-gray-700" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-200"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-6 w-6 text-gray-700" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {images.slice(0, 8).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImageIndex(index)}
                      className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        activeImageIndex === index
                          ? 'border-blue-600 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.product_name} view ${index + 1}`}
                        className="h-20 w-20 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Information */}
            <div className="p-6 lg:p-8 space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                  {product.product_name}
                </h1>
                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
              </div>

              {/* Price */}
              <div className="border-t border-b border-gray-200 py-6">
                <div className="flex items-baseline space-x-3">
                  <span className="text-4xl font-bold text-blue-600">
                    {formatPrice(product.price_per_unit)}
                  </span>
                  <span className="text-lg text-gray-600">
                    per {product.unit_of_measure}
                  </span>
                </div>

                {/* Bulk Pricing Indicator */}
                {product.bulk_pricing && Object.keys(product.bulk_pricing).length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleShowSignUpModal('purchase')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                    >
                      <span>Volume pricing available</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Stock Status (Generic for Guest) */}
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-${stockStatus.color}-50 border border-${stockStatus.color}-200`}>
                  {stockStatus.icon && <stockStatus.icon className={`h-5 w-5 text-${stockStatus.color}-600`} />}
                  <span className={`font-semibold text-${stockStatus.color}-700`}>
                    {stockStatus.status}
                  </span>
                </div>
                <button
                  onClick={() => handleShowSignUpModal('purchase')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign up to see exact quantity
                </button>
              </div>

              {/* Supplier Info Card */}
              {supplier && !isLoadingSupplier && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center space-x-4 mb-4">
                    {supplier.logo_url ? (
                      <img
                        src={supplier.logo_url}
                        alt={supplier.business_name}
                        className="h-16 w-16 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-2xl font-bold text-blue-600">
                          {supplier.business_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <Link
                        to={`/supplier/${supplier.supplier_id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {supplier.business_name}
                      </Link>
                      <div className="flex items-center space-x-2 mt-1">
                        {renderStars(supplier.rating_average, 'sm')}
                        <span className="text-sm text-gray-600">
                          {supplier.rating_average.toFixed(1)} ({supplier.total_reviews} reviews)
                        </span>
                      </div>
                    </div>

                    {supplier.verification_status === 'verified' && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <Shield className="h-5 w-5" />
                        <span className="text-xs font-medium">Verified</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleShowSignUpModal('contact')}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-gray-300"
                  >
                    Sign Up to Contact Supplier
                  </button>
                </div>
              )}

              {/* Call to Action Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                <button
                  onClick={() => handleShowSignUpModal('purchase')}
                  className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl mb-4"
                >
                  Sign Up to Purchase
                </button>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>See exact stock levels</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Real-time delivery tracking</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Secure checkout</span>
                  </div>
                </div>
              </div>

              {/* Delivery Info (Generic) */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span>Delivery Information</span>
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Estimated delivery: <span className="font-medium text-gray-900">2-5 business days</span>
                </p>
                <button
                  onClick={() => handleShowSignUpModal('purchase')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up to see exact delivery windows →
                </button>
              </div>
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="mt-12 bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {['description', 'specifications', 'reviews'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-4 px-6 text-center font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 lg:p-8">
              {/* Description Tab */}
              {activeTab === 'description' && (
                <div className="space-y-6">
                  {product.description && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Product Description</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {product.key_features && product.key_features.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h3>
                      <ul className="space-y-2">
                        {product.key_features.map((feature, index) => (
                          <li key={index} className="flex items-start space-x-3">
                            <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {product.warranty_information && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-blue-900 mb-1">Warranty</h4>
                          <p className="text-sm text-blue-800">{product.warranty_information}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Specifications Tab */}
              {activeTab === 'specifications' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Product Specifications</h3>
                  
                  {product.specifications && Object.keys(product.specifications).length > 0 ? (
                    <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                      <tbody className="divide-y divide-gray-200">
                        {Object.entries(product.specifications).map(([key, value]) => (
                          <tr key={key} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 capitalize bg-gray-50">
                              {key.replace(/_/g, ' ')}
                            </td>
                            <td className="px-6 py-4 text-gray-700">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No specifications available</p>
                  )}

                  {/* Additional Specs */}
                  {(product.brand || product.weight || product.dimensions) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      {product.brand && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Brand</p>
                          <p className="font-semibold text-gray-900">{product.brand}</p>
                        </div>
                      )}
                      {product.weight && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Weight</p>
                          <p className="font-semibold text-gray-900">{product.weight} lbs</p>
                        </div>
                      )}
                      {product.dimensions && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600 mb-1">Dimensions</p>
                          <p className="font-semibold text-gray-900 text-sm">
                            {JSON.stringify(product.dimensions)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Review Summary */}
                  {reviewData && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-start space-x-6">
                        {/* Overall Rating */}
                        <div className="text-center">
                          <div className="text-5xl font-bold text-gray-900 mb-2">
                            {reviewData.average_rating?.toFixed(1) || '0.0'}
                          </div>
                          {renderStars(reviewData.average_rating || 0, 'lg')}
                          <p className="text-sm text-gray-600 mt-2">
                            {reviewData.total || 0} reviews
                          </p>
                        </div>

                        {/* Rating Distribution */}
                        <div className="flex-1 space-y-2">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const count = ratingDistribution[rating as keyof typeof ratingDistribution] || 0;
                            const percentage = reviewData.total > 0 ? (count / reviewData.total) * 100 : 0;
                            
                            return (
                              <div key={rating} className="flex items-center space-x-3">
                                <span className="text-sm text-gray-600 w-12">{rating} star</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-yellow-400 h-full rounded-full transition-all duration-300"
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
                    </div>
                  )}

                  {/* Featured Reviews (First 3) */}
                  {isLoadingReviews ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-6 h-32"></div>
                      ))}
                    </div>
                  ) : featuredReviews.length > 0 ? (
                    <div className="space-y-4">
                      {featuredReviews.map((review) => (
                        <div
                          key={review.review_id}
                          className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              {renderStars(review.rating_overall, 'sm')}
                              {review.verified_purchase && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
                                  <Check className="h-3 w-3 mr-1" />
                                  Verified Purchase
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(review.review_date)}
                            </span>
                          </div>

                          {review.review_text && (
                            <p className="text-gray-700 leading-relaxed mb-3">
                              {review.review_text}
                            </p>
                          )}

                          {review.photos && review.photos.length > 0 && (
                            <div className="flex space-x-2 mt-4">
                              {review.photos.slice(0, 3).map((photo, index) => (
                                <img
                                  key={index}
                                  src={photo}
                                  alt={`Review photo ${index + 1}`}
                                  className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                                />
                              ))}
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {review.helpful_votes} people found this helpful
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Review Gate for Additional Reviews */}
                      {hasMoreReviews && (
                        <div className="relative">
                          {/* Blurred Placeholder Reviews */}
                          <div className="filter blur-sm pointer-events-none space-y-4 mb-4">
                            {[1, 2].map((i) => (
                              <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
                                <div className="flex items-center space-x-2 mb-3">
                                  {renderStars(4, 'sm')}
                                </div>
                                <p className="text-gray-700">
                                  This is a placeholder for additional reviews that are gated for guests...
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Sign-Up Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/95 to-transparent">
                            <div className="text-center bg-white rounded-xl shadow-2xl p-8 max-w-md border-2 border-blue-200">
                              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                {reviewData!.total - 3} More Reviews
                              </h3>
                              <p className="text-gray-600 mb-6">
                                Sign up to read all {reviewData!.total} customer reviews
                              </p>
                              <button
                                onClick={() => handleShowSignUpModal('reviews')}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl w-full"
                              >
                                Create Free Account
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No reviews yet</p>
                      <button
                        onClick={() => handleShowSignUpModal('purchase')}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Be the first to review (Sign up required)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Related Products Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Placeholder for related products - would need dedicated API or client-side filtering */}
              <div className="text-center py-12 col-span-full">
                <p className="text-gray-500">Related products will appear here</p>
                <Link
                  to="/products"
                  className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Browse All Products →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA (appears after scrolling) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
        <button
          onClick={() => handleShowSignUpModal('purchase')}
          className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-blue-700 transition-all duration-200 shadow-lg"
        >
          Sign Up to Purchase - {formatPrice(product.price_per_unit)}
        </button>
      </div>
    </>
  );
};

export default UV_ProductDetail_Guest;