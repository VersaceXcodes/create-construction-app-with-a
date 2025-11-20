import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { Star, MessageSquare, Flag, TrendingUp, BarChart3, Filter, Search, CheckCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Review {
  review_id: string;
  order_id: string;
  customer_id: string;
  product_id: string | null;
  rating_overall: number;
  rating_product: number | null;
  rating_service: number | null;
  rating_delivery: number | null;
  review_text: string | null;
  photos: string[] | null;
  helpful_votes: number;
  verified_purchase: boolean;
  review_date: string;
  status: string;
  supplier_response: string | null;
  supplier_response_date: string | null;
  customer_name?: string;
  product_name?: string | null;
}

interface ReviewAnalytics {
  total_reviews: number;
  average_rating: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  response_rate: number;
  avg_response_time_hours: number;
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  average_rating: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchSupplierReviews = async (
  supplier_id: string,
  auth_token: string,
  filters: {
    min_rating?: number;
    response_needed?: boolean;
    limit: number;
    offset: number;
  }
): Promise<ReviewsResponse> => {
  const params: Record<string, string> = {
    supplier_id,
    status: 'published',
    limit: filters.limit.toString(),
    offset: filters.offset.toString(),
    sort_by: 'review_date',
    sort_order: 'desc'
  };

  if (filters.min_rating) {
    params.min_rating = filters.min_rating.toString();
  }

  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews`, {
    params,
    headers: {
      'Authorization': `Bearer ${auth_token}`
    }
  });

  // Filter for response_needed client-side if needed
  let reviews = response.data.reviews || [];
  if (filters.response_needed) {
    reviews = reviews.filter((r: Review) => !r.supplier_response);
  }

  return {
    reviews,
    total: response.data.total || 0,
    average_rating: response.data.average_rating || 0
  };
};

const submitSupplierResponse = async (
  review_id: string,
  response_text: string,
  auth_token: string
): Promise<Review> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews/${review_id}/response`,
    { supplier_response: response_text },
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ReviewsManagement_Supplier: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // CRITICAL: Individual Zustand selectors
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [activeResponseReviewId, setActiveResponseReviewId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // URL params state
  const ratingFilter = searchParams.get('rating_filter') ? parseInt(searchParams.get('rating_filter')!) : undefined;
  const responseNeeded = searchParams.get('response_needed') === 'true';
  const currentPage = parseInt(searchParams.get('page') || '1');
  const limit = 15;

  // Fetch reviews
  const { data: reviewsData, isLoading: reviewsLoading, error: reviewsError } = useQuery({
    queryKey: ['supplier-reviews', supplierProfile?.supplier_id, ratingFilter, responseNeeded, currentPage],
    queryFn: () => fetchSupplierReviews(
      supplierProfile?.supplier_id || '',
      authToken || '',
      {
        min_rating: ratingFilter,
        response_needed: responseNeeded,
        limit,
        offset: (currentPage - 1) * limit
      }
    ),
    enabled: !!supplierProfile?.supplier_id && !!authToken,
    staleTime: 30000,
    retry: 1
  });

  // Calculate analytics from reviews data
  const analytics = useMemo<ReviewAnalytics>(() => {
    if (!reviewsData?.reviews) {
      return {
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        response_rate: 0,
        avg_response_time_hours: 0
      };
    }

    const reviews = reviewsData.reviews;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalResponseTime = 0;
    let respondedCount = 0;

    reviews.forEach(review => {
      distribution[review.rating_overall as keyof typeof distribution]++;
      
      if (review.supplier_response && review.supplier_response_date) {
        respondedCount++;
        const reviewDate = new Date(review.review_date).getTime();
        const responseDate = new Date(review.supplier_response_date).getTime();
        totalResponseTime += (responseDate - reviewDate) / (1000 * 60 * 60); // hours
      }
    });

    return {
      total_reviews: reviewsData.total,
      average_rating: reviewsData.average_rating,
      rating_distribution: distribution,
      response_rate: reviews.length > 0 ? (respondedCount / reviews.length) * 100 : 0,
      avg_response_time_hours: respondedCount > 0 ? totalResponseTime / respondedCount : 0
    };
  }, [reviewsData]);

  // Submit response mutation
  const responseMutation = useMutation({
    mutationFn: (data: { review_id: string; response_text: string }) =>
      submitSupplierResponse(data.review_id, data.response_text, authToken || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-reviews'] });
      setActiveResponseReviewId(null);
      setResponseText('');
    },
    onError: (error: any) => {
      console.error('Failed to submit response:', error);
    }
  });

  // Handlers
  const handleFilterChange = (filterName: string, value: string | boolean) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (filterName === 'rating_filter' && value) {
      newParams.set('rating_filter', value.toString());
    } else if (filterName === 'response_needed') {
      if (value) {
        newParams.set('response_needed', 'true');
      } else {
        newParams.delete('response_needed');
      }
    }
    
    newParams.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };

  const handleSubmitResponse = (review_id: string) => {
    if (!responseText.trim()) return;
    
    responseMutation.mutate({
      review_id,
      response_text: responseText.trim()
    });
  };

  const filteredReviews = useMemo(() => {
    if (!reviewsData?.reviews) return [];
    
    let filtered = [...reviewsData.reviews];
    
    if (searchQuery) {
      filtered = filtered.filter(review => 
        review.review_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [reviewsData, searchQuery]);

  const totalPages = Math.ceil((reviewsData?.total || 0) / limit);

  // Render star rating
  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reviews & Reputation</h1>
            <p className="mt-2 text-gray-600">Manage customer reviews and track your reputation performance</p>
          </div>

          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Reviews */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Reviews</span>
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.total_reviews}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>

            {/* Average Rating */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Average Rating</span>
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold text-gray-900">{analytics.average_rating.toFixed(1)}</p>
                <div className="flex">
                  {renderStars(Math.round(analytics.average_rating), 'sm')}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Out of 5.0</p>
            </div>

            {/* Response Rate */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Response Rate</span>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{analytics.response_rate.toFixed(0)}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.response_rate >= 80 ? 'Excellent' : analytics.response_rate >= 50 ? 'Good' : 'Needs improvement'}
              </p>
            </div>

            {/* Avg Response Time */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Avg Response Time</span>
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.avg_response_time_hours > 0 
                  ? analytics.avg_response_time_hours.toFixed(1) 
                  : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Hours</p>
            </div>
          </div>

          {/* Rating Distribution Chart */}
          {analytics.total_reviews > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = analytics.rating_distribution[rating as keyof typeof analytics.rating_distribution];
                  const percentage = analytics.total_reviews > 0 ? (count / analytics.total_reviews) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 w-20">
                        <span className="text-sm font-medium text-gray-700">{rating}</span>
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-16 text-right">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search reviews..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center space-x-3">
                {/* Rating Filter */}
                <select
                  value={ratingFilter || ''}
                  onChange={(e) => handleFilterChange('rating_filter', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Ratings</option>
                  <option value="5">5 Stars Only</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>

                {/* Response Needed */}
                <button
                  onClick={() => handleFilterChange('response_needed', !responseNeeded)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    responseNeeded
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Needs Response</span>
                </button>
              </div>
            </div>

            {/* Active Filters */}
            {(ratingFilter || responseNeeded || searchQuery) && (
              <div className="mt-4 flex items-center flex-wrap gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {ratingFilter && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {ratingFilter}+ Stars
                    <button
                      onClick={() => handleFilterChange('rating_filter', '')}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {responseNeeded && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Needs Response
                    <button
                      onClick={() => handleFilterChange('response_needed', false)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery('')}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading reviews...</p>
            </div>
          ) : reviewsError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="text-red-800 font-semibold">Failed to load reviews</h3>
                  <p className="text-red-600 text-sm mt-1">Please try again later</p>
                </div>
              </div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-600">
                {ratingFilter || responseNeeded || searchQuery
                  ? 'Try adjusting your filters'
                  : 'Reviews from customers will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map(review => (
                <div key={review.review_id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            {review.customer_name || 'Anonymous Customer'}
                          </span>
                          {review.verified_purchase && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified Purchase
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {renderStars(review.rating_overall)}
                        <span className="text-gray-400">•</span>
                        <span>{new Date(review.review_date).toLocaleDateString()}</span>
                        {review.product_name && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-700">{review.product_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Response Status Badge */}
                    {review.supplier_response ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Responded
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        Needs Response
                      </span>
                    )}
                  </div>

                  {/* Rating Breakdown */}
                  {(review.rating_product || review.rating_service || review.rating_delivery) && (
                    <div className="flex items-center space-x-6 mb-4 pb-4 border-b border-gray-100">
                      {review.rating_product && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Product:</span>
                          {renderStars(review.rating_product, 'sm')}
                        </div>
                      )}
                      {review.rating_service && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Service:</span>
                          {renderStars(review.rating_service, 'sm')}
                        </div>
                      )}
                      {review.rating_delivery && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Delivery:</span>
                          {renderStars(review.rating_delivery, 'sm')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Text */}
                  {review.review_text && (
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
                    </div>
                  )}

                  {/* Review Photos */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="flex space-x-2 mb-4">
                      {review.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Review photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  )}

                  {/* Helpful Votes */}
                  {review.helpful_votes > 0 && (
                    <div className="mb-4">
                      <span className="text-sm text-gray-600">
                        {review.helpful_votes} {review.helpful_votes === 1 ? 'customer' : 'customers'} found this helpful
                      </span>
                    </div>
                  )}

                  {/* Supplier Response */}
                  {review.supplier_response ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {supplierProfile?.business_name?.charAt(0) || 'S'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">
                              {supplierProfile?.business_name || 'Your Business'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {review.supplier_response_date 
                                ? new Date(review.supplier_response_date).toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{review.supplier_response}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Response Form */
                    activeResponseReviewId === review.review_id ? (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Response
                        </label>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Write a professional response to this review..."
                          rows={4}
                          maxLength={1000}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-500">
                            {responseText.length}/1000 characters
                          </span>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                setActiveResponseReviewId(null);
                                setResponseText('');
                              }}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSubmitResponse(review.review_id)}
                              disabled={!responseText.trim() || responseMutation.isPending}
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {responseMutation.isPending ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Submitting...
                                </span>
                              ) : (
                                'Submit Response'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Response Button */
                      <div className="mt-4 flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setActiveResponseReviewId(review.review_id);
                            setResponseText('');
                          }}
                          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Respond to Review</span>
                        </button>
                        
                        {/* Future feature: Flag for moderation */}
                        <button
                          disabled
                          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
                          title="Flag for moderation (coming soon)"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Flag</span>
                        </button>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4 shadow-sm">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, reviewsData?.total || 0)} of {reviewsData?.total || 0} reviews
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
              Tips for Managing Reviews
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Respond to all reviews within 24 hours to show customers you care</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Thank customers for positive reviews and address concerns in negative ones</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Keep responses professional, concise, and solution-focused</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Use reviews as feedback to improve your products and services</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ReviewsManagement_Supplier;