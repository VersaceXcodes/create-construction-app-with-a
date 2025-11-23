import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Package, 
  TrendingDown,
  X
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SurplusListing {
  listing_id: string;
  seller_id: string;
  product_name: string;
  category_id: string;
  description: string;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  photos: string[];
  asking_price: number;
  original_price: number | null;
  price_type: 'fixed' | 'negotiable' | 'auction';
  quantity: number;
  pickup_location: string;
  shipping_available: boolean;
  shipping_rate: number | null;
  status: string;
  views_count: number;
  created_date: string;
}

interface Category {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
}

interface FilterState {
  search_query: string | null;
  category_id: string | null;
  condition: string | null;
  price_min: number | null;
  price_max: number | null;
  location_distance: number | null;
  shipping_available: boolean | null;
}

interface SortConfig {
  sort_by: 'created_date' | 'asking_price' | 'views_count';
  sort_order: 'asc' | 'desc';
}

interface UserLocation {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateSavings = (asking_price: number, original_price: number | null) => {
  if (!original_price || original_price <= asking_price) return null;
  
  const amount = original_price - asking_price;
  const percent = ((amount / original_price) * 100).toFixed(0);
  
  return { amount, percent };
};

const getConditionBadgeStyle = (condition: string) => {
  const styles = {
    new: 'bg-green-100 text-green-800 border-green-200',
    like_new: 'bg-blue-100 text-blue-800 border-blue-200',
    used: 'bg-gray-100 text-gray-800 border-gray-200',
    refurbished: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  return styles[condition as keyof typeof styles] || styles.used;
};

const getConditionLabel = (condition: string) => {
  const labels = {
    new: 'New',
    like_new: 'Like New',
    used: 'Used',
    refurbished: 'Refurbished'
  };
  return labels[condition as keyof typeof labels] || condition;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SurplusMarketplace_Browse: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const customerId = useAppStore(state => state.authentication_state.customer_profile?.customer_id);
  
  // Local state
  const [filterState, setFilterState] = useState<FilterState>({
    search_query: null,
    category_id: null,
    condition: null,
    price_min: null,
    price_max: null,
    location_distance: null,
    shipping_available: null
  });
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    sort_by: 'created_date',
    sort_order: 'desc'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    latitude: null,
    longitude: null,
    address: null
  });
  
  const limit = 24;
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  // ============================================================================
  // URL SYNC - Initialize from URL params on mount
  // ============================================================================
  
  useEffect(() => {
    const query = searchParams.get('search_query');
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const priceMin = searchParams.get('price_min');
    const priceMax = searchParams.get('price_max');
    const distance = searchParams.get('location_distance');
    const shipping = searchParams.get('shipping_available');
    const sortBy = searchParams.get('sort_by');
    const page = searchParams.get('page');
    
    setFilterState({
      search_query: query || null,
      category_id: category || null,
      condition: condition || null,
      price_min: priceMin ? parseFloat(priceMin) : null,
      price_max: priceMax ? parseFloat(priceMax) : null,
      location_distance: distance ? parseFloat(distance) : null,
      shipping_available: shipping === 'true' ? true : shipping === 'false' ? false : null
    });
    
    if (query) setSearchInput(query);
    
    if (sortBy === 'asking_price' || sortBy === 'views_count' || sortBy === 'created_date') {
      setSortConfig(prev => ({ ...prev, sort_by: sortBy }));
    }
    
    if (page) {
      const pageNum = parseInt(page);
      if (pageNum > 0) setCurrentPage(pageNum);
    }
  }, [searchParams]);
  
  // ============================================================================
  // FETCH CATEGORIES FOR FILTER
  // ============================================================================
  
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'surplus'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/categories`, {
        params: { is_active: true },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: any[]) => data.map((cat: any) => ({
      category_id: cat.category_id,
      category_name: cat.category_name,
      parent_category_id: cat.parent_category_id
    }))
  });
  
  // ============================================================================
  // FETCH USER LOCATION (for distance filtering)
  // ============================================================================
  
  const { data: customerData } = useQuery({
    queryKey: ['customer-profile', customerId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/customers/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    },
    enabled: !!authToken && !!customerId && filterState.location_distance !== null,
    staleTime: 10 * 60 * 1000,
    select: (data: any) => {
      // Extract default address
      const defaultAddress = data.addresses?.find((addr: any) => addr.is_default);
      if (defaultAddress) {
        return {
          latitude: defaultAddress.latitude,
          longitude: defaultAddress.longitude,
          address: `${defaultAddress.city}, ${defaultAddress.state}`
        };
      }
      return null;
    }
  });
  
  useEffect(() => {
    if (customerData) {
      setUserLocation(customerData);
    }
  }, [customerData]);
  
  // ============================================================================
  // FETCH SURPLUS LISTINGS
  // ============================================================================
  
  const { data: listingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['surplus-listings', filterState, sortConfig, currentPage],
    queryFn: async () => {
      const params: Record<string, any> = {
        status: 'active',
        limit,
        offset: (currentPage - 1) * limit,
        sort_by: sortConfig.sort_by,
        sort_order: sortConfig.sort_order
      };
      
      if (filterState.search_query) params.query = filterState.search_query;
      if (filterState.category_id) params.category_id = filterState.category_id;
      if (filterState.condition) params.condition = filterState.condition;
      if (filterState.price_min !== null) params.price_min = filterState.price_min;
      if (filterState.price_max !== null) params.price_max = filterState.price_max;
      if (filterState.location_distance !== null) params.location_distance = filterState.location_distance;
      if (filterState.shipping_available !== null) params.shipping_available = filterState.shipping_available;
      
      const response = await axios.get(`${API_BASE_URL}/api/surplus`, {
        params,
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      return response.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
    select: (data: any) => ({
      listings: data.listings.map((listing: any) => ({
        ...listing,
        asking_price: Number(listing.asking_price || 0),
        original_price: listing.original_price ? Number(listing.original_price) : null,
        shipping_rate: listing.shipping_rate ? Number(listing.shipping_rate) : null,
        photos: listing.photos || []
      })),
      total: data.total || 0
    })
  });
  
  const listings = listingsData?.listings || [];
  const totalCount = listingsData?.total || 0;
  const totalPages = Math.ceil(totalCount / limit);
  
  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================
  
  const updateURLParams = (newFilters: Partial<FilterState>, newPage: number = 1) => {
    const params = new URLSearchParams();
    
    const merged = { ...filterState, ...newFilters };
    
    if (merged.search_query) params.set('search_query', merged.search_query);
    if (merged.category_id) params.set('category', merged.category_id);
    if (merged.condition) params.set('condition', merged.condition);
    if (merged.price_min !== null) params.set('price_min', merged.price_min.toString());
    if (merged.price_max !== null) params.set('price_max', merged.price_max.toString());
    if (merged.location_distance !== null) params.set('location_distance', merged.location_distance.toString());
    if (merged.shipping_available !== null) params.set('shipping_available', merged.shipping_available.toString());
    if (sortConfig.sort_by !== 'created_date') params.set('sort_by', sortConfig.sort_by);
    if (newPage > 1) params.set('page', newPage.toString());
    
    navigate(`?${params.toString()}`, { replace: true });
  };
  
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filterState, [key]: value };
    setFilterState(newFilters);
    setCurrentPage(1);
    updateURLParams(newFilters, 1);
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('search_query', searchInput || null);
  };
  
  const handleClearFilters = () => {
    setFilterState({
      search_query: null,
      category_id: null,
      condition: null,
      price_min: null,
      price_max: null,
      location_distance: null,
      shipping_available: null
    });
    setSearchInput('');
    setCurrentPage(1);
    navigate('/surplus', { replace: true });
  };
  
  const handleSortChange = (newSortBy: SortConfig['sort_by']) => {
    const newConfig: SortConfig = {
      sort_by: newSortBy,
      sort_order: sortConfig.sort_by === newSortBy && sortConfig.sort_order === 'asc' ? 'desc' : 'asc'
    };
    setSortConfig(newConfig);
    setCurrentPage(1);
    updateURLParams(filterState, 1);
  };
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateURLParams(filterState, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterState.search_query) count++;
    if (filterState.category_id) count++;
    if (filterState.condition) count++;
    if (filterState.price_min !== null || filterState.price_max !== null) count++;
    if (filterState.location_distance !== null) count++;
    if (filterState.shipping_available !== null) count++;
    return count;
  }, [filterState]);
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const renderConditionBadge = (condition: string) => (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getConditionBadgeStyle(condition)}`}>
      {getConditionLabel(condition)}
    </span>
  );
  
  const renderPriceDisplay = (listing: SurplusListing) => {
    const savings = calculateSavings(listing.asking_price, listing.original_price);
    
    return (
      <div className="space-y-1">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatPrice(listing.asking_price)}
          </span>
          {listing.price_type === 'negotiable' && (
            <span className="text-xs text-blue-600 font-medium">Negotiable</span>
          )}
        </div>
        
        {savings && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(listing.original_price!)}
            </span>
            <span className="inline-flex items-center text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
              <TrendingDown className="w-3 h-3 mr-1" />
              Save {formatPrice(savings.amount)} ({savings.percent}%)
            </span>
          </div>
        )}
      </div>
    );
  };
  
  const renderListingCard = (listing: SurplusListing) => {
    const primaryImage = listing.photos && listing.photos.length > 0 
      ? listing.photos[0] 
      : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400';
    
    return (
      <Link 
        key={listing.listing_id} 
        to={`/surplus/${listing.listing_id}`}
        className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-100"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img 
            src={primaryImage}
            alt={listing.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Condition Badge - Top Right */}
          <div className="absolute top-3 right-3">
            {renderConditionBadge(listing.condition)}
          </div>
          
          {/* Image Count Badge - Bottom Right */}
          {listing.photos && listing.photos.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
              {listing.photos.length} photos
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Product Name */}
          <h3 className="font-semibold text-gray-900 text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
            {listing.product_name}
          </h3>
          
          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {listing.description}
          </p>
          
          {/* Price */}
          {renderPriceDisplay(listing)}
          
          {/* Metadata */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            {/* Location */}
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2 text-gray-400" />
              <span className="truncate">{listing.pickup_location || 'Location not specified'}</span>
            </div>
            
            {/* Shipping/Quantity */}
            <div className="flex items-center justify-between text-sm">
              {listing.shipping_available ? (
                <span className="flex items-center text-green-700 font-medium">
                  <Package className="w-4 h-4 mr-1" />
                  Shipping available
                  {listing.shipping_rate && listing.shipping_rate > 0 && (
                    <span className="ml-1 text-gray-600">
                      ({formatPrice(listing.shipping_rate)})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-gray-600">Pickup only</span>
              )}
              
              <span className="text-gray-500">
                Qty: {listing.quantity}
              </span>
            </div>
            
            {/* Posted Date */}
            <div className="text-xs text-gray-500">
              Posted {formatDate(listing.created_date)}
            </div>
          </div>
        </div>
      </Link>
    );
  };
  
  // ============================================================================
  // FILTER SIDEBAR/DRAWER
  // ============================================================================
  
  const renderFilters = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Category
        </label>
        <select
          value={filterState.category_id || ''}
          onChange={(e) => handleFilterChange('category_id', e.target.value || null)}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
        >
          <option value="">All Categories</option>
          {categoriesData?.map((cat: Category) => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.category_name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Condition Filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Condition
        </label>
        <div className="space-y-2">
          {['new', 'like_new', 'used', 'refurbished'].map((cond) => (
            <label key={cond} className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="condition"
                value={cond}
                checked={filterState.condition === cond}
                onChange={(e) => handleFilterChange('condition', e.target.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                {getConditionLabel(cond)}
              </span>
            </label>
          ))}
          {filterState.condition && (
            <button
              onClick={() => handleFilterChange('condition', null)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear condition
            </button>
          )}
        </div>
      </div>
      
      {/* Price Range */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Price Range
        </label>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={filterState.price_min || ''}
              onChange={(e) => handleFilterChange('price_min', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              min="0"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filterState.price_max || ''}
              onChange={(e) => handleFilterChange('price_max', e.target.value ? parseFloat(e.target.value) : null)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              min="0"
            />
          </div>
        </div>
      </div>
      
      {/* Distance Filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Distance from you
        </label>
        {userLocation.address ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-600 flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {userLocation.address}
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={filterState.location_distance || 50}
              onChange={(e) => handleFilterChange('location_distance', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>5 mi</span>
              <span className="font-semibold text-blue-600">
                {filterState.location_distance || 50} miles
              </span>
              <span>100 mi</span>
            </div>
            {filterState.location_distance !== null && (
              <button
                onClick={() => handleFilterChange('location_distance', null)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Remove distance filter
              </button>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            <p>Add a delivery address to filter by distance</p>
            <Link to="/account#addresses" className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
              Add address →
            </Link>
          </div>
        )}
      </div>
      
      {/* Shipping Filter */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Delivery Options
        </label>
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={filterState.shipping_available === true}
            onChange={(e) => handleFilterChange('shipping_available', e.target.checked ? true : null)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
            Shipping available only
          </span>
        </label>
      </div>
      
      {/* Clear All Filters */}
      {activeFiltersCount > 0 && (
        <button
          onClick={handleClearFilters}
          className="w-full py-2 px-4 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Clear all filters ({activeFiltersCount})
        </button>
      )}
    </div>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      {/* Page Container */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
              <Link to="/" className="hover:text-blue-600 transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Surplus Marketplace</span>
            </nav>
            
            {/* Page Title */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  Surplus Materials Marketplace
                </h1>
                <p className="mt-2 text-gray-600">
                  Buy and sell unused construction materials from fellow contractors
                </p>
              </div>
              
              <Link
                to="/surplus/create"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                + List Your Materials
              </Link>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="mb-6">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="flex items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search surplus materials..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="ml-3 px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
                
                {/* Mobile Filter Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="ml-3 lg:hidden px-4 py-4 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors relative"
                >
                  <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Active Filters Pills */}
          {activeFiltersCount > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              
              {filterState.search_query && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                  Search: "{filterState.search_query}"
                  <button
                    onClick={() => {
                      setSearchInput('');
                      handleFilterChange('search_query', null);
                    }}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {filterState.category_id && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                  Category: {categoriesData?.find(c => c.category_id === filterState.category_id)?.category_name}
                  <button
                    onClick={() => handleFilterChange('category_id', null)}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {filterState.condition && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                  Condition: {getConditionLabel(filterState.condition)}
                  <button
                    onClick={() => handleFilterChange('condition', null)}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {(filterState.price_min !== null || filterState.price_max !== null) && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                  Price: ${filterState.price_min || 0} - ${filterState.price_max || '∞'}
                  <button
                    onClick={() => {
                      handleFilterChange('price_min', null);
                      handleFilterChange('price_max', null);
                    }}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              {filterState.shipping_available && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                  Shipping available
                  <button
                    onClick={() => handleFilterChange('shipping_available', null)}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
              >
                Clear all
              </button>
            </div>
          )}
          
          {/* Grid Layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filter Sidebar - Desktop */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                  {activeFiltersCount > 0 && (
                    <span className="text-sm text-blue-600 font-semibold">
                      {activeFiltersCount} active
                    </span>
                  )}
                </div>
                {renderFilters()}
              </div>
            </aside>
            
            {/* Listings Section */}
            <div className="flex-1 min-w-0">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
                {/* Results Count */}
                <div>
                  {isLoading ? (
                    <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    <p className="text-gray-700">
                      <span className="font-semibold text-gray-900">{totalCount}</span> {totalCount === 1 ? 'listing' : 'listings'} found
                    </p>
                  )}
                </div>
                
                {/* Sort Dropdown */}
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortConfig.sort_by}
                    onChange={(e) => handleSortChange(e.target.value as SortConfig['sort_by'])}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white text-sm font-medium"
                  >
                    <option value="created_date">Newest First</option>
                    <option value="asking_price">Price: Low to High</option>
                    <option value="views_count">Most Viewed</option>
                  </select>
                </div>
              </div>
              
              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                      <div className="aspect-square bg-gray-200 animate-pulse" />
                      <div className="p-5 space-y-3">
                        <div className="h-6 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Error State */}
              {error && !isLoading && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
                  <div className="text-red-600 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Failed to load listings
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {(error as any)?.message || 'Something went wrong. Please try again.'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
              
              {/* Empty State */}
              {!isLoading && !error && listings.length === 0 && (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <Package className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No listings found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {activeFiltersCount > 0 
                      ? "Try adjusting your filters to see more results"
                      : "Be the first to list surplus materials!"}
                  </p>
                  {activeFiltersCount > 0 ? (
                    <button
                      onClick={handleClearFilters}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Clear all filters
                    </button>
                  ) : (
                    <Link
                      to="/surplus/create"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      + Create Listing
                    </Link>
                  )}
                </div>
              )}
              
              {/* Listings Grid */}
              {!isLoading && !error && listings.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {listings.map((listing) => renderListingCard(listing))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => {
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
                              className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
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
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Filter Drawer */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            
            {/* Drawer */}
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                
                {renderFilters()}
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Show Results ({totalCount})
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

export default UV_SurplusMarketplace_Browse;