import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPE DEFINITIONS (matching backend schemas)
// ============================================================================

interface SurplusListing {
  listing_id: string;
  seller_id: string;
  product_name: string;
  category_id: string;
  category_name?: string; // Joined from categories table
  description: string;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  photos: string[] | null;
  asking_price: number;
  original_price: number | null;
  price_type: 'fixed' | 'negotiable' | 'auction';
  quantity: number;
  pickup_location: string | null;
  pickup_instructions: string | null;
  shipping_available: boolean;
  shipping_rate: number | null;
  status: 'active' | 'sold' | 'expired' | 'removed';
  reason_for_selling: string | null;
  views_count: number;
  created_date: string;
  created_at: string;
  updated_at: string;
}

interface PendingOffer {
  offer_id: string;
  listing_id: string;
  buyer_id: string;
  buyer_name: string;
  offer_amount: number;
  original_asking_price: number;
  message: string | null;
  offer_date: string;
  expires_at: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

interface SaleHistory {
  sale_id: string;
  listing_id: string;
  product_name: string;
  sale_price: number;
  buyer_name: string;
  sale_date: string;
  buyer_rating: number | null;
  seller_rating: number | null;
}

interface ListingFilters {
  status: 'all' | 'active' | 'sold' | 'expired' | 'removed';
  date_range: 'all_time' | 'last_7_days' | 'last_30_days' | 'last_90_days';
  sort_by: 'created_date_desc' | 'created_date_asc' | 'price_high' | 'price_low' | 'views_high';
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Fetch customer's surplus listings
const fetchMyListings = async (
  authToken: string,
  filters: ListingFilters,
  page: number,
  limit: number
): Promise<{ listings: SurplusListing[]; total: number }> => {
  const params = new URLSearchParams();
  
  if (filters.status !== 'all') {
    params.append('status', filters.status);
  }
  
  params.append('limit', limit.toString());
  params.append('offset', ((page - 1) * limit).toString());
  
  // Map sort_by to backend field
  let sortBy = 'created_date';
  let sortOrder = 'desc';
  
  if (filters.sort_by === 'created_date_asc') {
    sortBy = 'created_date';
    sortOrder = 'asc';
  } else if (filters.sort_by === 'price_high') {
    sortBy = 'asking_price';
    sortOrder = 'desc';
  } else if (filters.sort_by === 'price_low') {
    sortBy = 'asking_price';
    sortOrder = 'asc';
  } else if (filters.sort_by === 'views_high') {
    sortBy = 'views_count';
    sortOrder = 'desc';
  }
  
  params.append('sort_by', sortBy);
  params.append('sort_order', sortOrder);
  
  const response = await axios.get(
    `${API_BASE_URL}/surplus/my-listings?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  // Backend returns array directly (from main.js code)
  return {
    listings: response.data || [],
    total: response.data?.length || 0
  };
};

// Update listing status
const updateListingStatus = async (
  authToken: string,
  listingId: string,
  status: string
): Promise<SurplusListing> => {
  const response = await axios.patch(
    `${API_BASE_URL}/surplus/${listingId}`,
    { status },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

// Delete listing
const deleteListing = async (
  authToken: string,
  listingId: string
): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/surplus/${listingId}`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
};

// Accept offer (inferred endpoint from spec)
const acceptOffer = async (
  authToken: string,
  offerId: string
): Promise<void> => {
  await axios.post(
    `${API_BASE_URL}/surplus/offers/${offerId}/accept`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
};

// Decline offer (inferred endpoint from spec)
const declineOffer = async (
  authToken: string,
  offerId: string,
  reason: string
): Promise<void> => {
  await axios.post(
    `${API_BASE_URL}/surplus/offers/${offerId}/decline`,
    { decline_reason: reason },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_MySurplusListings: React.FC = () => {
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual Zustand selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [activeTab, setActiveTab] = useState<'listings' | 'offers' | 'sales'>('listings');
  const [filters, setFilters] = useState<ListingFilters>({
    status: 'all',
    date_range: 'all_time',
    sort_by: 'created_date_desc'
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 20
  });
  const [searchQuery, setSearchQuery] = useState('');
  // const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  
  // Modal states
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; listingId: string | null }>({
    open: false,
    listingId: null
  });
  const [declineOfferModal, setDeclineOfferModal] = useState<{ 
    open: boolean; 
    offerId: string | null; 
    reason: string;
  }>({
    open: false,
    offerId: null,
    reason: ''
  });
  const [acceptOfferModal, setAcceptOfferModal] = useState<{ open: boolean; offerId: string | null }>({
    open: false,
    offerId: null
  });
  
  // Toast notification state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch listings query
  const listingsQuery = useQuery({
    queryKey: ['surplus-listings', 'my-listings', filters, pagination.current_page],
    queryFn: () => fetchMyListings(authToken!, filters, pagination.current_page, pagination.limit),
    enabled: !!authToken && activeTab === 'listings',
    staleTime: 30000, // 30 seconds
    select: (data) => ({
      listings: data.listings.filter(listing => 
        searchQuery === '' || listing.product_name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
      total: data.total
    })
  });

  // Update pagination when data changes
  React.useEffect(() => {
    if (listingsQuery.data) {
      setPagination(prev => ({
        ...prev,
        total_count: listingsQuery.data.total,
        total_pages: Math.ceil(listingsQuery.data.total / prev.limit)
      }));
    }
  }, [listingsQuery.data]);

  // Pending offers query (lazy load on tab switch)
  const offersQuery = useQuery({
    queryKey: ['surplus-offers', 'pending'],
    queryFn: async () => {
      // NOTE: This endpoint doesn't exist in current backend
      // Implementing as per spec requirements
      const response = await axios.get(
        `${API_BASE_URL}/surplus/my-offers?status=pending`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      return response.data as PendingOffer[];
    },
    enabled: !!authToken && activeTab === 'offers',
    staleTime: 30000
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Accept offer mutation
  const acceptOfferMutation = useMutation({
    mutationFn: (offerId: string) => acceptOffer(authToken!, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surplus-listings'] });
      queryClient.invalidateQueries({ queryKey: ['surplus-offers'] });
      setAcceptOfferModal({ open: false, offerId: null });
      showToast('Offer accepted successfully! Sale initiated.', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to accept offer', 'error');
    }
  });

  // Decline offer mutation
  const declineOfferMutation = useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason: string }) => 
      declineOffer(authToken!, offerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surplus-offers'] });
      setDeclineOfferModal({ open: false, offerId: null, reason: '' });
      showToast('Offer declined', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to decline offer', 'error');
    }
  });

  // Update listing status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ listingId, status }: { listingId: string; status: string }) => 
      updateListingStatus(authToken!, listingId, status),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['surplus-listings', 'my-listings', filters, pagination.current_page],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            listings: old.listings.map((listing: SurplusListing) =>
              listing.listing_id === data.listing_id ? data : listing
            )
          };
        }
      );
      showToast('Listing updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to update listing', 'error');
    }
  });

  // Delete listing mutation
  const deleteListingMutation = useMutation({
    mutationFn: (listingId: string) => deleteListing(authToken!, listingId),
    onSuccess: (_, listingId) => {
      queryClient.setQueryData(
        ['surplus-listings', 'my-listings', filters, pagination.current_page],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            listings: old.listings.filter((listing: SurplusListing) => listing.listing_id !== listingId),
            total: old.total - 1
          };
        }
      );
      setDeleteConfirmModal({ open: false, listingId: null });
      showToast('Listing deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete listing', 'error');
    }
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleFilterChange = (key: keyof ListingFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to page 1
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkAsSold = (listingId: string) => {
    updateStatusMutation.mutate({ listingId, status: 'sold' });
  };

  const handleDeleteListing = (listingId: string) => {
    setDeleteConfirmModal({ open: true, listingId });
  };

  const confirmDelete = () => {
    if (deleteConfirmModal.listingId) {
      deleteListingMutation.mutate(deleteConfirmModal.listingId);
    }
  };

  const handleAcceptOffer = (offerId: string) => {
    setAcceptOfferModal({ open: true, offerId });
  };

  const confirmAcceptOffer = () => {
    if (acceptOfferModal.offerId) {
      acceptOfferMutation.mutate(acceptOfferModal.offerId);
    }
  };

  const handleDeclineOffer = (offerId: string) => {
    setDeclineOfferModal({ open: true, offerId, reason: '' });
  };

  const confirmDeclineOffer = () => {
    if (declineOfferModal.offerId && declineOfferModal.reason.trim()) {
      declineOfferMutation.mutate({ 
        offerId: declineOfferModal.offerId, 
        reason: declineOfferModal.reason 
      });
    }
  };

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-800 border-green-200';
      case 'like_new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'used': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'refurbished': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'sold': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'expired': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'removed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate pending offers count
  const pendingOffersCount = offersQuery.data?.length || 0;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`rounded-lg px-6 py-4 shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-3">
              {toast.type === 'success' ? (
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {toast.message}
              </p>
              <button
                onClick={() => setToast({ show: false, message: '', type: 'success' })}
                className={`ml-4 ${
                  toast.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
                }`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Listing?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmModal({ open: false, listingId: null })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteListingMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteListingMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Offer Confirmation Modal */}
      {acceptOfferModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Accept Offer?</h3>
            <p className="text-gray-600 mb-6">
              By accepting this offer, you commit to completing the sale. The buyer will be notified and next steps will be provided.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setAcceptOfferModal({ open: false, offerId: null })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAcceptOffer}
                disabled={acceptOfferMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {acceptOfferMutation.isPending ? 'Accepting...' : 'Accept Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Offer Modal */}
      {declineOfferModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Decline Offer</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for declining this offer (optional but recommended):
            </p>
            <textarea
              value={declineOfferModal.reason}
              onChange={(e) => setDeclineOfferModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="E.g., Price too low, already accepted another offer..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setDeclineOfferModal({ open: false, offerId: null, reason: '' })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeclineOffer}
                disabled={declineOfferMutation.isPending || !declineOfferModal.reason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {declineOfferMutation.isPending ? 'Declining...' : 'Decline Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                  My Surplus Listings
                </h1>
                <p className="mt-2 text-gray-600">
                  Manage your surplus materials, respond to offers, and track your sales
                </p>
              </div>
              <Link
                to="/surplus/create"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Listing
              </Link>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('listings')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'listings'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Active Listings
                  {listingsQuery.data && (
                    <span className="ml-2 bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {listingsQuery.data.listings.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('offers')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'offers'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Pending Offers
                  {pendingOffersCount > 0 && (
                    <span className="ml-2 bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {pendingOffersCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'sales'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  Sales History
                </button>
              </nav>
            </div>
          </div>

          {/* Active Listings Tab */}
          {activeTab === 'listings' && (
            <>
              {/* Filters Bar */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search Input */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Listings
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by product name..."
                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="sold">Sold</option>
                      <option value="expired">Expired</option>
                      <option value="removed">Removed</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sort_by}
                      onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    >
                      <option value="created_date_desc">Newest First</option>
                      <option value="created_date_asc">Oldest First</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="views_high">Most Views</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Listings Grid */}
              {listingsQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
                      <div className="h-48 bg-gray-200"></div>
                      <div className="p-6 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : listingsQuery.isError ? (
                <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Listings</h3>
                  <p className="text-gray-600 mb-4">There was an error loading your surplus listings.</p>
                  <button
                    onClick={() => listingsQuery.refetch()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : !listingsQuery.data || listingsQuery.data.listings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Listings Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first surplus listing to start selling unused construction materials.
                  </p>
                  <Link
                    to="/surplus/create"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Listing
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {listingsQuery.data.listings.map((listing) => (
                      <div key={listing.listing_id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-200">
                        {/* Listing Image */}
                        <div className="relative h-48 bg-gray-200">
                          {listing.photos && listing.photos.length > 0 ? (
                            <img
                              src={listing.photos[0]}
                              alt={listing.product_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-300">
                              <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {/* Status Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(listing.status)}`}>
                              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                            </span>
                          </div>
                        </div>

                        {/* Listing Details */}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight flex-1">
                              {listing.product_name}
                            </h3>
                          </div>

                          <div className="flex items-center space-x-2 mb-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getConditionBadgeColor(listing.condition)}`}>
                              {listing.condition.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                            <span className="text-xs text-gray-500">
                              Qty: {listing.quantity}
                            </span>
                          </div>

                          <div className="mb-4">
                            <div className="flex items-baseline space-x-2">
                              <span className="text-2xl font-bold text-gray-900">
                                {formatCurrency(listing.asking_price)}
                              </span>
                              {listing.price_type === 'negotiable' && (
                                <span className="text-xs text-gray-500 font-medium">
                                  (negotiable)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                            <div className="flex items-center space-x-1">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>{listing.views_count} views</span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <span>Listed {formatDate(listing.created_date)}</span>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-2">
                            {listing.status === 'active' && (
                              <>
                                <Link
                                  to={`/surplus/${listing.listing_id}`}
                                  className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center text-sm"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleMarkAsSold(listing.listing_id)}
                                  disabled={updateStatusMutation.isPending}
                                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                                >
                                  Mark Sold
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteListing(listing.listing_id)}
                              disabled={deleteListingMutation.isPending}
                              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.total_pages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-8">
                      <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                          let pageNum;
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
                              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                pagination.current_page === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Pending Offers Tab */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              {offersQuery.isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : offersQuery.isError ? (
                <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Offers</h3>
                  <button
                    onClick={() => offersQuery.refetch()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : !offersQuery.data || offersQuery.data.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Offers</h3>
                  <p className="text-gray-600">
                    You'll see offers from buyers here when they're interested in your listings.
                  </p>
                </div>
              ) : (
                <>
                  {offersQuery.data.map((offer) => (
                    <div key={offer.offer_id} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                        {/* Offer Details */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              Offer from {offer.buyer_name}
                            </h3>
                            {offer.expires_at && (
                              <span className="text-xs text-amber-600 font-medium">
                                Expires {formatDate(offer.expires_at)}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            Listing: {offer.listing_id} {/* Would join to get product_name */}
                          </p>

                          <div className="flex items-baseline space-x-3 mb-3">
                            <div>
                              <span className="text-xs text-gray-500 block">Offer Amount</span>
                              <span className="text-2xl font-bold text-green-600">
                                {formatCurrency(offer.offer_amount)}
                              </span>
                            </div>
                            <span className="text-gray-400">vs</span>
                            <div>
                              <span className="text-xs text-gray-500 block">Your Price</span>
                              <span className="text-lg font-semibold text-gray-700">
                                {formatCurrency(offer.original_asking_price)}
                              </span>
                            </div>
                            <div className="flex-1 text-right">
                              <span className={`text-sm font-semibold ${
                                offer.offer_amount >= offer.original_asking_price * 0.9 
                                  ? 'text-green-600' 
                                  : offer.offer_amount >= offer.original_asking_price * 0.75
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}>
                                {((offer.offer_amount / offer.original_asking_price) * 100).toFixed(0)}% of asking
                              </span>
                            </div>
                          </div>

                          {offer.message && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                              <p className="text-xs text-gray-500 mb-1">Buyer's Message:</p>
                              <p className="text-sm text-gray-700 italic">"{offer.message}"</p>
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            Received {formatDate(offer.offer_date)}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 md:ml-6">
                          <button
                            onClick={() => handleAcceptOffer(offer.offer_id)}
                            disabled={acceptOfferMutation.isPending}
                            className="flex-1 md:w-32 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineOffer(offer.offer_id)}
                            disabled={declineOfferMutation.isPending}
                            className="flex-1 md:w-32 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Sales History Tab */}
          {activeTab === 'sales' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sales History</h3>
              <p className="text-gray-600">
                This feature is coming soon. You'll be able to view your completed surplus sales and buyer ratings here.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_MySurplusListings;