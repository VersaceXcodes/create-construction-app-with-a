import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Star, Edit2, Trash2, X, Upload, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (matching reviewSchema from Zod)
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
  would_buy_again: 'yes' | 'no' | 'maybe' | null;
  is_anonymous: boolean;
  review_date: string;
  status: 'pending' | 'published' | 'rejected' | 'flagged';
  supplier_response: string | null;
  supplier_response_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewsListState { // eslint-disable-line @typescript-eslint/no-unused-vars
  reviews: Review[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
  };
  loading: boolean;
  error: string | null;
}

interface FilterOptions {
  sort_by: 'review_date' | 'rating_overall';
  sort_order: 'asc' | 'desc';
  status_filter: 'all' | 'published' | 'pending';
}

interface EditReviewForm {
  review_id: string | null;
  review_text: string;
  photos: string[];
  is_editing: boolean;
  validation_errors: Record<string, string>;
}

interface DeleteConfirmation {
  is_open: boolean;
  review_id: string | null;
}

// ============================================================================
// API BASE URL
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Check if review can be edited (within 30 days)
const canEditReview = (reviewDate: string): boolean => {
  const reviewTime = new Date(reviewDate).getTime();
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  return (now - reviewTime) <= thirtyDaysMs;
};

// Format date to readable string
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_MyReviews: React.FC = () => {
  // CRITICAL: Individual Zustand selectors (no object destructuring!)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Extract customer_id from customer relationship
  const customerId = currentUser?.user_type === 'customer' ? currentUser.user_id : null;
  
  // Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // Local state
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sort_by: 'review_date',
    sort_order: 'desc',
    status_filter: 'all'
  });
  
  const [editReviewForm, setEditReviewForm] = useState<EditReviewForm>({
    review_id: null,
    review_text: '',
    photos: [],
    is_editing: false,
    validation_errors: {}
  });
  
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    is_open: false,
    review_id: null
  });
  
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  
  // ============================================================================
  // DATA FETCHING (React Query)
  // ============================================================================
  
  const { data: reviewsData, isLoading, error, refetch } = useQuery({
    queryKey: ['my-reviews', customerId, filterOptions],
    queryFn: async () => {
      if (!customerId || !authToken) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get(`${API_BASE_URL}/reviews`, {
        params: {
          user_id: customerId,
          limit: 50,
          offset: 0,
          sort_by: filterOptions.sort_by,
          sort_order: filterOptions.sort_order,
          ...(filterOptions.status_filter !== 'all' && { status: filterOptions.status_filter })
        },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      // Transform response to match expected structure
      return {
        reviews: response.data.reviews || [],
        pagination: {
          current_page: 1,
          total_pages: Math.ceil((response.data.total || 0) / 50),
          total_count: response.data.total || 0
        }
      };
    },
    enabled: !!customerId && !!authToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    retry: 1
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  // Edit Review Mutation
  const editMutation = useMutation({
    mutationFn: async ({ review_id, review_text, photos }: { review_id: string; review_text: string; photos: string[] }) => {
      if (!authToken) throw new Error('Authentication required');
      
      const response = await axios.patch(
        `${API_BASE_URL}/reviews/${review_id}`,
        { review_text, photos },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch reviews
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      
      // Reset edit form
      setEditReviewForm({
        review_id: null,
        review_text: '',
        photos: [],
        is_editing: false,
        validation_errors: {}
      });
    },
    onError: (error: any) => {
      setEditReviewForm(prev => ({
        ...prev,
        validation_errors: {
          submit: error.response?.data?.message || 'Failed to update review. Please try again.'
        }
      }));
    }
  });
  
  // Delete Review Mutation
  const deleteMutation = useMutation({
    mutationFn: async (review_id: string) => {
      if (!authToken) throw new Error('Authentication required');
      
      await axios.delete(
        `${API_BASE_URL}/reviews/${review_id}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch reviews
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      
      // Close confirmation dialog
      setDeleteConfirmation({ is_open: false, review_id: null });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete review. Please try again.');
    }
  });
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSortChange = useCallback((sort_by: FilterOptions['sort_by']) => {
    setFilterOptions(prev => ({
      ...prev,
      sort_by,
      // Toggle order if clicking same sort
      sort_order: prev.sort_by === sort_by && prev.sort_order === 'desc' ? 'asc' : 'desc'
    }));
  }, []);
  
  const handleStatusFilterChange = useCallback((status_filter: FilterOptions['status_filter']) => {
    setFilterOptions(prev => ({ ...prev, status_filter }));
  }, []);
  
  const handleEditClick = useCallback((review: Review) => {
    // Check if review can be edited (30-day window)
    if (!canEditReview(review.review_date)) {
      alert('Reviews can only be edited within 30 days of posting.');
      return;
    }
    
    setEditReviewForm({
      review_id: review.review_id,
      review_text: review.review_text || '',
      photos: review.photos || [],
      is_editing: true,
      validation_errors: {}
    });
  }, []);
  
  const handleCancelEdit = useCallback(() => {
    setEditReviewForm({
      review_id: null,
      review_text: '',
      photos: [],
      is_editing: false,
      validation_errors: {}
    });
  }, []);
  
  const handleSaveEdit = useCallback(() => {
    // Validation
    const errors: Record<string, string> = {};
    
    if (editReviewForm.review_text.trim().length < 10) {
      errors.review_text = 'Review must be at least 10 characters long.';
    }
    
    if (editReviewForm.review_text.length > 2000) {
      errors.review_text = 'Review must not exceed 2000 characters.';
    }
    
    if (Object.keys(errors).length > 0) {
      setEditReviewForm(prev => ({ ...prev, validation_errors: errors }));
      return;
    }
    
    // Submit mutation
    if (editReviewForm.review_id) {
      editMutation.mutate({
        review_id: editReviewForm.review_id,
        review_text: editReviewForm.review_text,
        photos: editReviewForm.photos
      });
    }
  }, [editReviewForm, editMutation]);
  
  const handleDeleteClick = useCallback((review_id: string) => {
    setDeleteConfirmation({
      is_open: true,
      review_id
    });
  }, []);
  
  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmation.review_id) {
      deleteMutation.mutate(deleteConfirmation.review_id);
    }
  }, [deleteConfirmation.review_id, deleteMutation]);
  
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmation({ is_open: false, review_id: null });
  }, []);
  
  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingPhotos(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Step 1: Request presigned URL
        const presignedResponse = await axios.post(
          `${API_BASE_URL}/uploads/request-url`,
          {
            file_type: file.type,
            file_size: file.size,
            upload_context: 'review',
            entity_id: editReviewForm.review_id
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        const { upload_url, cdn_url } = presignedResponse.data;
        
        // Step 2: Upload to S3
        await axios.put(upload_url, file, {
          headers: { 'Content-Type': file.type }
        });
        
        return cdn_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      
      // Add uploaded URLs to photos array
      setEditReviewForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
    } catch (error: any) {
      setEditReviewForm(prev => ({
        ...prev,
        validation_errors: {
          photos: error.response?.data?.message || 'Failed to upload photos. Please try again.'
        }
      }));
    } finally {
      setUploadingPhotos(false);
    }
  }, [editReviewForm.review_id, authToken]);
  
  const handleRemovePhoto = useCallback((photoUrl: string) => {
    setEditReviewForm(prev => ({
      ...prev,
      photos: prev.photos.filter(url => url !== photoUrl)
    }));
  }, []);
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };
  
  const renderRatingBreakdown = (review: Review) => {
    return (
      <div className="grid grid-cols-3 gap-4 text-sm">
        {review.rating_product !== null && (
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Product Quality</span>
            <div className="flex items-center space-x-2">
              {renderStars(review.rating_product)}
              <span className="text-gray-700 font-medium">{review.rating_product}/5</span>
            </div>
          </div>
        )}
        {review.rating_service !== null && (
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Service</span>
            <div className="flex items-center space-x-2">
              {renderStars(review.rating_service)}
              <span className="text-gray-700 font-medium">{review.rating_service}/5</span>
            </div>
          </div>
        )}
        {review.rating_delivery !== null && (
          <div className="flex flex-col">
            <span className="text-gray-500 mb-1">Delivery</span>
            <div className="flex items-center space-x-2">
              {renderStars(review.rating_delivery)}
              <span className="text-gray-700 font-medium">{review.rating_delivery}/5</span>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              My Reviews
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Manage your product and supplier reviews. You can edit reviews within 30 days of posting.
            </p>
          </div>
          
          {/* Filters and Sort Controls */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              {/* Sort Options */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSortChange('review_date')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      filterOptions.sort_by === 'review_date'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Date {filterOptions.sort_by === 'review_date' && (filterOptions.sort_order === 'desc' ? '↓' : '↑')}
                  </button>
                  <button
                    onClick={() => handleSortChange('rating_overall')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      filterOptions.sort_by === 'rating_overall'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Rating {filterOptions.sort_by === 'rating_overall' && (filterOptions.sort_order === 'desc' ? '↓' : '↑')}
                  </button>
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={filterOptions.status_filter}
                  onChange={(e) => handleStatusFilterChange(e.target.value as FilterOptions['status_filter'])}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-sm font-medium text-gray-700 transition-all"
                >
                  <option value="all">All Reviews</option>
                  <option value="published">Published</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              {/* Results Count */}
              {reviewsData && (
                <div className="text-sm text-gray-600">
                  {reviewsData.pagination.total_count} {reviewsData.pagination.total_count === 1 ? 'review' : 'reviews'}
                </div>
              )}
            </div>
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              <p className="text-gray-600 font-medium">Loading your reviews...</p>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Reviews</h3>
                  <p className="text-red-700 mb-4">
                    {error instanceof Error ? error.message : 'An unexpected error occurred.'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && !error && reviewsData && reviewsData.reviews.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Star className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No Reviews Yet
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  You haven't written any reviews yet. After receiving your orders, you can share your experience to help other buyers make informed decisions.
                </p>
                <Link
                  to="/orders"
                  className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  View My Orders
                </Link>
              </div>
            </div>
          )}
          
          {/* Reviews List */}
          {!isLoading && !error && reviewsData && reviewsData.reviews.length > 0 && (
            <div className="space-y-6">
              {reviewsData.reviews.map((review) => (
                <article
                  key={review.review_id}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200"
                >
                  <div className="p-6 lg:p-8">
                    {/* Review Header */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 pb-6 border-b border-gray-200">
                      <div className="flex-1">
                        {/* Product Info */}
                        <div className="flex items-start space-x-4 mb-4">
                          {review.product_id && (
                            <Link
                              to={`/product/${review.product_id}`}
                              className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={`https://via.placeholder.com/80?text=Product`}
                                alt="Product"
                                className="w-full h-full object-cover"
                              />
                            </Link>
                          )}
                          <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                              Review for Order #{review.order_id.slice(0, 8)}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {formatDate(review.review_date)}
                              </span>
                              {review.verified_purchase && (
                                <span className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded-md">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Verified Purchase
                                </span>
                              )}
                              <span
                                className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  review.status === 'published'
                                    ? 'bg-green-50 text-green-700'
                                    : review.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Overall Rating */}
                        <div className="mb-4">
                          <div className="flex items-center space-x-3 mb-3">
                            {renderStars(review.rating_overall)}
                            <span className="text-2xl font-bold text-gray-900">
                              {review.rating_overall}/5
                            </span>
                          </div>
                          
                          {/* Detailed Ratings */}
                          {(review.rating_product !== null || review.rating_service !== null || review.rating_delivery !== null) && (
                            <div className="mt-4">
                              {renderRatingBreakdown(review)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 mt-4 md:mt-0">
                        {canEditReview(review.review_date) && (
                          <button
                            onClick={() => handleEditClick(review)}
                            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(review.review_id)}
                          className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all duration-200 font-medium text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Review Text */}
                    {review.review_text && (
                      <div className="mb-6">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {review.review_text}
                        </p>
                      </div>
                    )}
                    
                    {/* Review Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {review.photos.map((photo, index) => (
                            <div
                              key={index}
                              className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              <img
                                src={photo}
                                alt={`Review photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Supplier Response */}
                    {review.supplier_response && (
                      <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">S</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900">Supplier Response</h4>
                              {review.supplier_response_date && (
                                <span className="text-xs text-gray-500">
                                  {formatDate(review.supplier_response_date)}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 leading-relaxed">
                              {review.supplier_response}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Review Meta Info */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                        {review.helpful_votes} {review.helpful_votes === 1 ? 'person' : 'people'} found this helpful
                      </span>
                      {review.would_buy_again && (
                        <span className="flex items-center">
                          Would buy again:{' '}
                          <span className={`ml-1 font-medium ${
                            review.would_buy_again === 'yes' ? 'text-green-600' : 
                            review.would_buy_again === 'no' ? 'text-red-600' : 
                            'text-amber-600'
                          }`}>
                            {review.would_buy_again === 'yes' ? 'Yes' : 
                             review.would_buy_again === 'no' ? 'No' : 
                             'Maybe'}
                          </span>
                        </span>
                      )}
                      {!canEditReview(review.review_date) && (
                        <span className="text-gray-400 italic">
                          Edit window expired (30 days)
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          
          {/* Edit Review Modal */}
          {editReviewForm.is_editing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Edit Review</h3>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* Review Text */}
                  <div>
                    <label htmlFor="review_text" className="block text-sm font-medium text-gray-700 mb-2">
                      Your Review
                    </label>
                    <textarea
                      id="review_text"
                      value={editReviewForm.review_text}
                      onChange={(e) => {
                        setEditReviewForm(prev => ({
                          ...prev,
                          review_text: e.target.value,
                          validation_errors: { ...prev.validation_errors, review_text: '' }
                        }));
                      }}
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 resize-none transition-all"
                      placeholder="Share your experience with this product..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">
                        {editReviewForm.review_text.length} / 2000 characters
                      </span>
                      {editReviewForm.validation_errors.review_text && (
                        <span className="text-sm text-red-600">
                          {editReviewForm.validation_errors.review_text}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Photos Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Photos (Optional)
                    </label>
                    
                    {/* Photo Grid */}
                    {editReviewForm.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {editReviewForm.photos.map((photo, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={photo}
                              alt={`Review photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleRemovePhoto(photo)}
                              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                              aria-label="Remove photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    {editReviewForm.photos.length < 5 && (
                      <div>
                        <label
                          htmlFor="photo_upload"
                          className={`flex items-center justify-center space-x-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 cursor-pointer ${
                            uploadingPhotos ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {uploadingPhotos ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-blue-600 font-medium">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-gray-500" />
                              <span className="text-gray-700 font-medium">
                                Add Photos ({editReviewForm.photos.length}/5)
                              </span>
                            </>
                          )}
                        </label>
                        <input
                          id="photo_upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhotos}
                          className="hidden"
                        />
                      </div>
                    )}
                    
                    {editReviewForm.validation_errors.photos && (
                      <p className="text-sm text-red-600 mt-2">
                        {editReviewForm.validation_errors.photos}
                      </p>
                    )}
                  </div>
                  
                  {/* General Error */}
                  {editReviewForm.validation_errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700">
                        {editReviewForm.validation_errors.submit}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Modal Footer */}
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    disabled={editMutation.isPending}
                    className="px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editMutation.isPending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editMutation.isPending ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Delete Confirmation Dialog */}
          {deleteConfirmation.is_open && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Dialog Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">Delete Review</h3>
                </div>
                
                {/* Dialog Body */}
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 leading-relaxed mb-4">
                        Are you sure you want to delete this review? This action cannot be undone.
                      </p>
                      <p className="text-sm text-gray-500">
                        Your review helps other buyers make informed decisions. Consider editing instead of deleting.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Dialog Footer */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 rounded-b-xl">
                  <button
                    onClick={handleCancelDelete}
                    disabled={deleteMutation.isPending}
                    className="px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleteMutation.isPending}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteMutation.isPending ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </span>
                    ) : (
                      'Delete Review'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_MyReviews;