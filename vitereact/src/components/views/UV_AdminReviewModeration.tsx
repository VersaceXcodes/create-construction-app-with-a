import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Star, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Flag, 
  
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Image as ImageIcon,
  ThumbsUp,
  Shield
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (matching Zod schemas)
// ============================================================================

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
  status: 'pending' | 'published' | 'rejected' | 'flagged';
  supplier_response: string | null;
  supplier_response_date: string | null;
  created_at: string;
  updated_at: string;
}

interface FlaggedReview extends Review {
  flag_reason?: string;
  flagged_date?: string;
}

interface FilterConfig {
  status: string | null;
  flagged_only: boolean;
  min_rating: number | null;
  verification_status: boolean | null;
}

interface PaginationState {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchReviews = async (
  authToken: string,
  filters: FilterConfig,
  pagination: PaginationState
): Promise<{ reviews: Review[]; total: number }> => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.min_rating !== null) params.append('min_rating', filters.min_rating.toString());
  if (filters.verification_status !== null) params.append('verified_purchase', filters.verification_status.toString());
  params.append('limit', pagination.limit.toString());
  params.append('offset', ((pagination.current_page - 1) * pagination.limit).toString());
  params.append('sort_by', 'review_date');
  params.append('sort_order', 'desc');

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  return {
    reviews: response.data.reviews || [],
    total: response.data.total || 0
  };
};

const fetchFlaggedReviews = async (authToken: string): Promise<FlaggedReview[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/reviews/flagged`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  return response.data || [];
};

const moderateReview = async (
  authToken: string,
  reviewId: string,
  action: 'approve' | 'reject' | 'flag',
  reason: string
): Promise<{ message: string }> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/reviews/${reviewId}/moderate`,
    { action, reason },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  return response.data;
};

const fetchModerationStats = async (authToken: string): Promise<any> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/dashboard?metric_type=content_moderation`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminReviewModeration: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // CRITICAL: Individual selectors from Zustand store
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [activeTab, setActiveTab] = useState<'all' | 'flagged'>(
    searchParams.get('flagged_only') === 'true' ? 'flagged' : 'all'
  );
  
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    status: searchParams.get('review_type') || null,
    flagged_only: searchParams.get('flagged_only') === 'true',
    min_rating: null,
    verification_status: null
  });
  
  const [pagination, setPagination] = useState<PaginationState>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 50
  });
  
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'flag' | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // ============================================================================
  // REACT QUERY - FETCH REVIEWS
  // ============================================================================
  
  const { data: reviewsData, isLoading: reviewsLoading, error: reviewsError } = useQuery({
    queryKey: ['admin-reviews', filterConfig, pagination.current_page, activeTab],
    queryFn: async () => {
      if (!authToken) throw new Error('No auth token');
      
      if (activeTab === 'flagged') {
        const flaggedReviews = await fetchFlaggedReviews(authToken);
        return { reviews: flaggedReviews, total: flaggedReviews.length };
      }
      
      return fetchReviews(authToken, filterConfig, pagination);
    },
    staleTime: 60000,
    enabled: !!authToken
  });
  
  // ============================================================================
  // REACT QUERY - FETCH STATS
  // ============================================================================
  
  const { data: statsData } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: async () => {
      if (!authToken) throw new Error('No auth token');
      return fetchModerationStats(authToken);
    },
    staleTime: 30000,
    enabled: !!authToken,
    select: (data) => ({
      total_flagged: data?.total_flagged || 0,
      pending_moderation: data?.pending_moderation || 0,
      moderated_today: data?.moderated_today || 0
    })
  });
  
  // ============================================================================
  // REACT QUERY - MODERATION MUTATION
  // ============================================================================
  
  const moderationMutation = useMutation({
    mutationFn: async (params: { reviewId: string; action: 'approve' | 'reject' | 'flag'; reason: string }) => {
      if (!authToken) throw new Error('No auth token');
      return moderateReview(authToken, params.reviewId, params.action, params.reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-stats'] });
      setModerationModalOpen(false);
      setSelectedReview(null);
      setModerationReason('');
      setModerationAction(null);
    }
  });
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Update pagination when data changes
  useEffect(() => {
    if (reviewsData) {
      setPagination(prev => ({
        ...prev,
        total_count: reviewsData.total,
        total_pages: Math.ceil(reviewsData.total / prev.limit)
      }));
    }
  }, [reviewsData]);
  
  // Sync URL params with filter config
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterConfig.flagged_only) params.set('flagged_only', 'true');
    if (filterConfig.status) params.set('review_type', filterConfig.status);
    setSearchParams(params, { replace: true });
  }, [filterConfig, setSearchParams]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleTabChange = (tab: 'all' | 'flagged') => {
    setActiveTab(tab);
    setFilterConfig(prev => ({
      ...prev,
      flagged_only: tab === 'flagged'
    }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
    setSelectedReviewIds([]);
  };
  
  const handleFilterChange = (key: keyof FilterConfig, value: any) => {
    setFilterConfig(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleOpenModerationModal = (review: Review, action: 'approve' | 'reject' | 'flag') => {
    setSelectedReview(review);
    setModerationAction(action);
    setModerationModalOpen(true);
  };
  
  const handleCloseModerationModal = () => {
    setModerationModalOpen(false);
    setSelectedReview(null);
    setModerationAction(null);
    setModerationReason('');
  };
  
  const handleSubmitModeration = async () => {
    if (!selectedReview || !moderationAction) return;
    
    await moderationMutation.mutateAsync({
      reviewId: selectedReview.review_id,
      action: moderationAction,
      reason: moderationReason
    });
  };
  
  const toggleReviewSelection = (reviewId: string) => {
    setSelectedReviewIds(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };
  
  const selectAllVisibleReviews = () => {
    if (!reviewsData?.reviews) return;
    const allIds = reviewsData.reviews.map(r => r.review_id);
    setSelectedReviewIds(prev => 
      prev.length === allIds.length ? [] : allIds
    );
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const reviews = reviewsData?.reviews || [];
  const stats = statsData || { total_flagged: 0, pending_moderation: 0, moderated_today: 0 };
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Review Moderation</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage and moderate customer reviews and ratings
                </p>
              </div>
              
              {/* Stats Summary */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.total_flagged}</div>
                  <div className="text-xs text-gray-600">Flagged</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.pending_moderation}</div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.moderated_today}</div>
                  <div className="text-xs text-gray-600">Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar (Desktop) / Collapsible (Mobile) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Filter className="w-5 h-5 mr-2 text-gray-600" />
                    Filters
                  </h3>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden text-gray-600 hover:text-gray-900"
                  >
                    <ChevronRight className={`w-5 h-5 transform transition-transform ${showFilters ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                
                <div className={`space-y-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Status
                    </label>
                    <select
                      value={filterConfig.status || ''}
                      onChange={(e) => handleFilterChange('status', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="published">Published</option>
                      <option value="pending">Pending</option>
                      <option value="flagged">Flagged</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  
                  {/* Rating Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Rating
                    </label>
                    <select
                      value={filterConfig.min_rating?.toString() || ''}
                      onChange={(e) => handleFilterChange('min_rating', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">Any Rating</option>
                      <option value="1">1+ Stars</option>
                      <option value="2">2+ Stars</option>
                      <option value="3">3+ Stars</option>
                      <option value="4">4+ Stars</option>
                      <option value="5">5 Stars Only</option>
                    </select>
                  </div>
                  
                  {/* Verification Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Status
                    </label>
                    <select
                      value={filterConfig.verification_status === null ? '' : filterConfig.verification_status.toString()}
                      onChange={(e) => handleFilterChange('verification_status', e.target.value === '' ? null : e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Reviews</option>
                      <option value="true">Verified Only</option>
                      <option value="false">Unverified Only</option>
                    </select>
                  </div>
                  
                  {/* Clear Filters */}
                  <button
                    onClick={() => {
                      setFilterConfig({
                        status: null,
                        flagged_only: activeTab === 'flagged',
                        min_rating: null,
                        verification_status: null
                      });
                    }}
                    className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
            
            {/* Reviews List */}
            <div className="lg:col-span-3">
              {/* Tabs */}
              <div className="bg-white rounded-t-xl shadow-sm border-x border-t border-gray-200">
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => handleTabChange('all')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'all'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    All Reviews ({pagination.total_count})
                  </button>
                  <button
                    onClick={() => handleTabChange('flagged')}
                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                      activeTab === 'flagged'
                        ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Flagged Reviews
                    {stats.total_flagged > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-amber-600 rounded-full">
                        {stats.total_flagged}
                      </span>
                    )}
                  </button>
                </div>
                
                {/* Bulk Actions Bar */}
                {selectedReviewIds.length > 0 && (
                  <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-blue-900">
                      <strong>{selectedReviewIds.length}</strong> review{selectedReviewIds.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedReviewIds([])}
                        className="px-3 py-1.5 text-sm text-blue-700 hover:text-blue-900 font-medium"
                      >
                        Clear Selection
                      </button>
                      <button
                        className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Approve Selected
                      </button>
                      <button
                        className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Reject Selected
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Select All */}
                {reviews.length > 0 && (
                  <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedReviewIds.length === reviews.length}
                        onChange={selectAllVisibleReviews}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Select all on this page</span>
                    </label>
                    
                    <div className="text-sm text-gray-600">
                      Showing {reviews.length} of {pagination.total_count} reviews
                    </div>
                  </div>
                )}
              </div>
              
              {/* Reviews Content */}
              <div className="bg-white rounded-b-xl shadow-sm border-x border-b border-gray-200">
                {/* Loading State */}
                {reviewsLoading && (
                  <div className="py-12 text-center">
                    <div className="inline-flex items-center space-x-2 text-gray-600">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm font-medium">Loading reviews...</span>
                    </div>
                  </div>
                )}
                
                {/* Error State */}
                {reviewsError && (
                  <div className="py-12 px-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                        <p className="text-sm text-red-700">
                          Failed to load reviews. Please try again.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Empty State */}
                {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                  <div className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
                    <p className="text-sm text-gray-600">
                      {activeTab === 'flagged' 
                        ? 'No flagged reviews require moderation'
                        : 'Try adjusting your filters'
                      }
                    </p>
                  </div>
                )}
                
                {/* Reviews List */}
                {!reviewsLoading && reviews.length > 0 && (
                  <div className="divide-y divide-gray-200">
                    {reviews.map((review) => (
                      <div key={review.review_id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start space-x-4">
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedReviewIds.includes(review.review_id)}
                            onChange={() => toggleReviewSelection(review.review_id)}
                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          
                          {/* Review Content */}
                          <div className="flex-1 min-w-0">
                            {/* Review Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  {/* Rating Stars */}
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-4 h-4 ${
                                          star <= review.rating_overall
                                            ? 'text-yellow-400 fill-current'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                    <span className="ml-2 text-sm font-medium text-gray-900">
                                      {review.rating_overall}.0
                                    </span>
                                  </div>
                                  
                                  {/* Verified Badge */}
                                  {review.verified_purchase && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      <Shield className="w-3 h-3 mr-1" />
                                      Verified Purchase
                                    </span>
                                  )}
                                  
                                  {/* Status Badge */}
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    review.status === 'published' ? 'bg-green-100 text-green-800' :
                                    review.status === 'flagged' ? 'bg-amber-100 text-amber-800' :
                                    review.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {review.status}
                                  </span>
                                </div>
                                
                                {/* Customer Info */}
                                <div className="text-sm text-gray-600">
                                  {review.is_anonymous ? (
                                    <span className="font-medium">Anonymous</span>
                                  ) : (
                                    <span className="font-medium">Customer ID: {review.customer_id.substring(0, 8)}...</span>
                                  )}
                                  <span className="mx-2">•</span>
                                  <time dateTime={review.review_date}>
                                    {new Date(review.review_date).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </time>
                                  <span className="mx-2">•</span>
                                  <span>Order: {review.order_id.substring(0, 8)}...</span>
                                </div>
                              </div>
                              
                              {/* Helpful Votes */}
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <ThumbsUp className="w-4 h-4" />
                                <span>{review.helpful_votes}</span>
                              </div>
                            </div>
                            
                            {/* Review Text */}
                            {review.review_text && (
                              <div className="mb-3">
                                <p className="text-gray-900 leading-relaxed">{review.review_text}</p>
                              </div>
                            )}
                            
                            {/* Additional Ratings */}
                            {(review.rating_product || review.rating_service || review.rating_delivery) && (
                              <div className="mb-3 flex flex-wrap gap-3 text-sm">
                                {review.rating_product && (
                                  <div className="flex items-center">
                                    <span className="text-gray-600 mr-2">Product:</span>
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3 h-3 ${s <= review.rating_product! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {review.rating_service && (
                                  <div className="flex items-center">
                                    <span className="text-gray-600 mr-2">Service:</span>
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3 h-3 ${s <= review.rating_service! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {review.rating_delivery && (
                                  <div className="flex items-center">
                                    <span className="text-gray-600 mr-2">Delivery:</span>
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3 h-3 ${s <= review.rating_delivery! ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Photos */}
                            {review.photos && review.photos.length > 0 && (
                              <div className="mb-3 flex items-center space-x-2">
                                <ImageIcon className="w-4 h-4 text-gray-600" />
                                <span className="text-sm text-gray-600">{review.photos.length} photo{review.photos.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                            
                            {/* Supplier Response */}
                            {review.supplier_response && (
                              <div className="mt-3 bg-blue-50 border-l-4 border-blue-600 p-3 rounded-r">
                                <div className="flex items-center mb-1">
                                  <MessageSquare className="w-4 h-4 text-blue-600 mr-2" />
                                  <span className="text-sm font-medium text-blue-900">Supplier Response</span>
                                  {review.supplier_response_date && (
                                    <span className="ml-2 text-xs text-blue-700">
                                      {new Date(review.supplier_response_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-blue-900">{review.supplier_response}</p>
                              </div>
                            )}
                            
                            {/* Flagged Info (if applicable) */}
                            {activeTab === 'flagged' && 'flag_reason' in review && (
                              <div className="mt-3 bg-amber-50 border-l-4 border-amber-600 p-3 rounded-r">
                                <div className="flex items-center mb-1">
                                  <Flag className="w-4 h-4 text-amber-600 mr-2" />
                                  <span className="text-sm font-medium text-amber-900">Flagged Reason</span>
                                </div>
                                <p className="text-sm text-amber-900">{(review as FlaggedReview).flag_reason}</p>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="mt-4 flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenModerationModal(review, 'approve')}
                                disabled={review.status === 'published'}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                Approve
                              </button>
                              
                              <button
                                onClick={() => handleOpenModerationModal(review, 'reject')}
                                disabled={review.status === 'rejected'}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Reject
                              </button>
                              
                              <button
                                onClick={() => handleOpenModerationModal(review, 'flag')}
                                disabled={review.status === 'flagged'}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Flag className="w-4 h-4 mr-1.5" />
                                Flag
                              </button>
                              
                              <Link
                                to={`/admin/orders?order_id=${review.order_id}`}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4 mr-1.5" />
                                View Order
                              </Link>
                              
                              {review.product_id && (
                                <Link
                                  to={`/product/${review.product_id}`}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  View Product
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination */}
                {!reviewsLoading && reviews.length > 0 && pagination.total_pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {pagination.current_page} of {pagination.total_pages}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                          let pageNum: number;
                          if (pagination.total_pages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.current_page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.current_page >= pagination.total_pages - 2) {
                            pageNum = pagination.total_pages - 4 + i;
                          } else {
                            pageNum = pagination.current_page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                pageNum === pagination.current_page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.total_pages}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Moderation Modal */}
        {moderationModalOpen && selectedReview && moderationAction && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
                onClick={handleCloseModerationModal}
              ></div>
              
              {/* Modal Content */}
              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-6 pt-6 pb-4">
                  <div className="flex items-center mb-4">
                    <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${
                      moderationAction === 'approve' ? 'bg-green-100' :
                      moderationAction === 'reject' ? 'bg-red-100' :
                      'bg-amber-100'
                    }`}>
                      {moderationAction === 'approve' && <CheckCircle className="w-6 h-6 text-green-600" />}
                      {moderationAction === 'reject' && <XCircle className="w-6 h-6 text-red-600" />}
                      {moderationAction === 'flag' && <Flag className="w-6 h-6 text-amber-600" />}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {moderationAction === 'approve' ? 'Approve Review' :
                         moderationAction === 'reject' ? 'Reject Review' :
                         'Flag Review'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Review ID: {selectedReview.review_id.substring(0, 12)}...
                      </p>
                    </div>
                  </div>
                  
                  {/* Review Preview */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= selectedReview.rating_overall
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {selectedReview.review_text && (
                      <p className="text-sm text-gray-900 line-clamp-3">{selectedReview.review_text}</p>
                    )}
                  </div>
                  
                  {/* Moderation Reason */}
                  <div className="mb-4">
                    <label htmlFor="moderation-reason" className="block text-sm font-medium text-gray-700 mb-2">
                      {moderationAction === 'approve' ? 'Approval Notes (Optional)' : 'Reason for Action (Required)'}
                    </label>
                    <textarea
                      id="moderation-reason"
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      rows={3}
                      required={moderationAction !== 'approve'}
                      placeholder={
                        moderationAction === 'approve' ? 'Add any notes about this approval...' :
                        moderationAction === 'reject' ? 'Explain why this review is being rejected...' :
                        'Describe the policy violation...'
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                
                {/* Modal Actions */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
                  <button
                    onClick={handleCloseModerationModal}
                    disabled={moderationMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleSubmitModeration}
                    disabled={moderationMutation.isPending || (moderationAction !== 'approve' && !moderationReason.trim())}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      moderationAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                      moderationAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                      'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {moderationMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <>
                        {moderationAction === 'approve' && 'Approve Review'}
                        {moderationAction === 'reject' && 'Reject Review'}
                        {moderationAction === 'flag' && 'Flag Review'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminReviewModeration;