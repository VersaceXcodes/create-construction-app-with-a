import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Search, SlidersHorizontal, Grid3x3, List, X, ChevronLeft, ChevronRight, Heart, ShoppingCart, Star } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Product {
  product_id: string;
  product_name: string;
  price_per_unit: number;
  unit_of_measure: string;
  stock_quantity: number;
  status: string;
  primary_image_url: string | null;
  supplier_id: string;
  business_name?: string;
  rating_average?: number;
  category_id: string;
  brand: string | null;
  is_featured: boolean;
}

interface Category {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

type CategoriesResponse = Category[];

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchProducts = async (params: Record<string, any>): Promise<ProductsResponse> => {
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      queryParams.append(key, String(params[key]));
    }
  });
  
  // Use relative URL - axios baseURL already includes /api
  const response = await axios.get<ProductsResponse>(`/products?${queryParams.toString()}`);
  return response.data;
};

const fetchCategories = async (): Promise<CategoriesResponse> => {
  // Use relative URL - axios baseURL already includes /api
  const response = await axios.get<CategoriesResponse>(`/categories?is_active=true&limit=100`);
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Catalog: React.FC = () => {
  // ============================================================================
  // ZUSTAND STORE ACCESS (Individual selectors - CRITICAL)
  // ============================================================================
  
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const comparisonProducts = useAppStore(state => state.search_state.comparison_products);
  const addToComparison = useAppStore(state => state.add_to_comparison);
  const removeFromComparison = useAppStore(state => state.remove_from_comparison);
  const clearComparison = useAppStore(state => state.clear_comparison);
  
  // ============================================================================
  // URL PARAMETER MANAGEMENT
  // ============================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  
  // Parse URL parameters into filter state
  const activeFilters = useMemo(() => ({
    search_query: searchParams.get('search_query') || null,
    category: searchParams.get('category') || null,
    price_min: searchParams.get('price_min') ? Number(searchParams.get('price_min')) : null,
    price_max: searchParams.get('price_max') ? Number(searchParams.get('price_max')) : null,
    in_stock_only: searchParams.get('in_stock_only') === 'true' ? true : null,
    supplier_rating_min: searchParams.get('supplier_rating_min') ? Number(searchParams.get('supplier_rating_min')) : null,
    brands: searchParams.get('brands') ? searchParams.get('brands')!.split(',') : null,
    deals_only: searchParams.get('deals_only') === 'true' ? true : null,
  }), [searchParams]);
  
  const sortConfig = useMemo(() => ({
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: searchParams.get('sort_order') || 'desc',
  }), [searchParams]);
  
  const currentPage = useMemo(() => {
    const page = searchParams.get('page');
    return page ? Number(page) : 1;
  }, [searchParams]);
  
  const viewMode = useMemo(() => {
    return searchParams.get('view_mode') || 'grid';
  }, [searchParams]);
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  // Fetch products based on URL parameters
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['products', activeFilters, sortConfig, currentPage],
    queryFn: () => fetchProducts({
      search_query: activeFilters.search_query,
      category: activeFilters.category,
      price_min: activeFilters.price_min,
      price_max: activeFilters.price_max,
      in_stock_only: activeFilters.in_stock_only === true ? 'true' : undefined,
      supplier_rating_min: activeFilters.supplier_rating_min,
      brands: activeFilters.brands?.join(','),
      deals_only: activeFilters.deals_only === true ? 'true' : undefined,
      status: 'active',
      limit: 24,
      offset: (currentPage - 1) * 24,
      sort_by: sortConfig.sort_by,
      sort_order: sortConfig.sort_order,
    }),
    staleTime: 30000, // 30 seconds
    placeholderData: (previousData) => previousData,
  });
  
  // Fetch categories for filter sidebar
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 300000, // 5 minutes
  });
  
  // Extract unique brands from products (for filter options)
  const availableBrands = useMemo(() => {
    if (!productsData?.products) return [];
    const brandSet = new Set<string>();
    productsData.products.forEach(p => {
      if (p.brand) brandSet.add(p.brand);
    });
    return Array.from(brandSet).sort();
  }, [productsData]);
  
  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!productsData) return 0;
    return Math.ceil(productsData.total / 24);
  }, [productsData]);
  
  // ============================================================================
  // FILTER UPDATE HANDLERS
  // ============================================================================
  
  const updateFilters = (newFilters: Record<string, any>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key] === null || newFilters[key] === undefined || newFilters[key] === '') {
        params.delete(key);
      } else if (Array.isArray(newFilters[key])) {
        params.set(key, newFilters[key].join(','));
      } else {
        params.set(key, String(newFilters[key]));
      }
    });
    
    // Reset to page 1 when filters change
    params.set('page', '1');
    
    setSearchParams(params);
  };
  
  const handleSearchChange = (query: string) => {
    updateFilters({ search_query: query });
  };
  
  const handleCategoryChange = (categoryId: string | null) => {
    updateFilters({ category: categoryId });
  };
  
  const handlePriceRangeChange = (min: number | null, max: number | null) => {
    updateFilters({ price_min: min, price_max: max });
  };
  
  const handleInStockToggle = (checked: boolean) => {
    updateFilters({ in_stock_only: checked ? 'true' : null });
  };
  
  const handleBrandToggle = (brand: string, checked: boolean) => {
    const currentBrands = activeFilters.brands || [];
    const newBrands = checked 
      ? [...currentBrands, brand]
      : currentBrands.filter(b => b !== brand);
    updateFilters({ brands: newBrands.length > 0 ? newBrands : null });
  };
  
  const handleRatingChange = (rating: number | null) => {
    updateFilters({ supplier_rating_min: rating });
  };
  
  const handleDealsToggle = (checked: boolean) => {
    updateFilters({ deals_only: checked ? 'true' : null });
  };
  
  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort_by', sortBy);
    // Infer sort order based on sort_by
    const defaultOrder = sortBy === 'price_per_unit' ? 'asc' : 'desc';
    params.set('sort_order', defaultOrder);
    setSearchParams(params);
  };
  
  const handleViewModeChange = (mode: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('view_mode', mode);
    setSearchParams(params);
  };
  
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };
  
  const removeFilter = (filterKey: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete(filterKey);
    params.set('page', '1');
    setSearchParams(params);
  };
  
  // ============================================================================
  // COMPARISON HANDLERS
  // ============================================================================
  
  const handleComparisonToggle = (productId: string, checked: boolean) => {
    if (checked) {
      if (comparisonProducts.length >= 5) {
        alert('You can compare up to 5 products');
        return;
      }
      addToComparison(productId);
    } else {
      removeFromComparison(productId);
    }
  };
  
  // ============================================================================
  // ACTIVE FILTERS COUNT
  // ============================================================================
  
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.search_query) count++;
    if (activeFilters.category) count++;
    if (activeFilters.price_min || activeFilters.price_max) count++;
    if (activeFilters.in_stock_only) count++;
    if (activeFilters.supplier_rating_min) count++;
    if (activeFilters.brands && activeFilters.brands.length > 0) count += activeFilters.brands.length;
    if (activeFilters.deals_only) count++;
    return count;
  }, [activeFilters]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        {/* Search Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search construction materials..."
                    value={activeFilters.search_query || ''}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                  {activeFilters.search_query && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="size-5" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* View Toggle & Sort (Desktop) */}
              <div className="hidden lg:flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => handleViewModeChange('grid')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid3x3 className="size-5" />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('list')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'list'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="size-5" />
                  </button>
                </div>
                
                {/* Sort Dropdown */}
                <select
                  value={sortConfig.sort_by}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="created_at">Newest First</option>
                  <option value="price_per_unit">Price: Low to High</option>
                  <option value="sales_count">Most Popular</option>
                  <option value="product_name">Name: A to Z</option>
                </select>
              </div>
              
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowFilterDrawer(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <SlidersHorizontal className="size-5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filter Sidebar (Desktop) */}
            <aside className="hidden lg:block w-80 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden sticky top-24">
                {/* Filter Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Filters</h2>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-white/90 hover:text-white text-sm font-medium underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Active Filters Chips */}
                {activeFilterCount > 0 && (
                  <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                    <div className="flex flex-wrap gap-2">
                      {activeFilters.search_query && (
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          <span>"{activeFilters.search_query}"</span>
                          <button onClick={() => removeFilter('search_query')}>
                            <X className="size-4" />
                          </button>
                        </div>
                      )}
                      {activeFilters.category && (
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          <span>Category</span>
                          <button onClick={() => removeFilter('category')}>
                            <X className="size-4" />
                          </button>
                        </div>
                      )}
                      {(activeFilters.price_min || activeFilters.price_max) && (
                        <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          <span>
                            ${activeFilters.price_min || 0} - ${activeFilters.price_max || '∞'}
                          </span>
                          <button onClick={() => handlePriceRangeChange(null, null)}>
                            <X className="size-4" />
                          </button>
                        </div>
                      )}
                      {activeFilters.in_stock_only && (
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                          <span>In Stock</span>
                          <button onClick={() => handleInStockToggle(false)}>
                            <X className="size-4" />
                          </button>
                        </div>
                      )}
                      {activeFilters.brands?.map(brand => (
                        <div key={brand} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          <span>{brand}</span>
                          <button onClick={() => handleBrandToggle(brand, false)}>
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Filter Sections */}
                <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                  {/* Category Filter */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {isLoadingCategories ? (
                        <div className="text-sm text-gray-500">Loading categories...</div>
                      ) : (
                        categories.map(cat => (
                          <label key={cat.category_id} className="flex items-center cursor-pointer group">
                            <input
                              type="radio"
                              name="category"
                              checked={activeFilters.category === cat.category_id}
                              onChange={(e) => handleCategoryChange(e.target.checked ? cat.category_id : null)}
                              className="size-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                              {cat.category_name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {activeFilters.category && (
                      <button
                        onClick={() => handleCategoryChange(null)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear category
                      </button>
                    )}
                  </div>
                  
                  {/* Price Range Filter */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={activeFilters.price_min || ''}
                          onChange={(e) => handlePriceRangeChange(
                            e.target.value ? Number(e.target.value) : null,
                            activeFilters.price_max
                          )}
                          className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={activeFilters.price_max || ''}
                          onChange={(e) => handlePriceRangeChange(
                            activeFilters.price_min,
                            e.target.value ? Number(e.target.value) : null
                          )}
                          className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Stock Filter */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={activeFilters.in_stock_only === true}
                        onChange={(e) => handleInStockToggle(e.target.checked)}
                        className="size-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        In Stock Only
                      </span>
                    </label>
                  </div>
                  
                  {/* Supplier Rating Filter */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Supplier Rating</h3>
                    <div className="space-y-2">
                      {[4, 3, 2, 1].map(rating => (
                        <label key={rating} className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            name="rating"
                            checked={activeFilters.supplier_rating_min === rating}
                            onChange={(e) => handleRatingChange(e.target.checked ? rating : null)}
                            className="size-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 flex items-center gap-1">
                            {rating}+ <Star className="size-4 fill-amber-400 text-amber-400" />
                          </span>
                        </label>
                      ))}
                    </div>
                    {activeFilters.supplier_rating_min && (
                      <button
                        onClick={() => handleRatingChange(null)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Clear rating
                      </button>
                    )}
                  </div>
                  
                  {/* Brands Filter */}
                  {availableBrands.length > 0 && (
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Brands</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableBrands.map(brand => (
                          <label key={brand} className="flex items-center cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={activeFilters.brands?.includes(brand) || false}
                              onChange={(e) => handleBrandToggle(brand, e.target.checked)}
                              className="size-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">
                              {brand}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Deals Only Toggle */}
                  <div className="px-6 py-4">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={activeFilters.deals_only === true}
                        onChange={(e) => handleDealsToggle(e.target.checked)}
                        className="size-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        On Sale Only
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>
            
            {/* Filter Drawer (Mobile) */}
            {showFilterDrawer && (
              <div className="fixed inset-0 z-50 lg:hidden">
                {/* Overlay */}
                <div
                  className="fixed inset-0 bg-black/50"
                  onClick={() => setShowFilterDrawer(false)}
                />
                
                {/* Drawer */}
                <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl">
                  <div className="h-full flex flex-col">
                    {/* Drawer Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white">Filters</h2>
                      <button
                        onClick={() => setShowFilterDrawer(false)}
                        className="text-white hover:text-white/80"
                      >
                        <X className="size-6" />
                      </button>
                    </div>
                    
                    {/* Drawer Content - Same as desktop sidebar */}
                    <div className="flex-1 overflow-y-auto">
                      {/* Copy desktop filter sections here */}
                      <div className="px-6 py-4">
                        <button
                          onClick={() => {
                            clearAllFilters();
                            setShowFilterDrawer(false);
                          }}
                          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </div>
                    
                    {/* Drawer Footer */}
                    <div className="border-t border-gray-200 px-6 py-4">
                      <button
                        onClick={() => setShowFilterDrawer(false)}
                        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        View {productsData?.total ?? 0} Results
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Products Section */}
            <main className="flex-1">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {activeFilters.search_query ? (
                      <>Results for "{activeFilters.search_query}"</>
                    ) : activeFilters.category ? (
                      <>Products</>
                    ) : (
                      <>All Products</>
                    )}
                  </h1>
                   <p className="text-sm text-gray-600 mt-1">
                     {productsData ? `${productsData.total || 0} products found` : 'Loading...'}
                   </p>
                </div>
                
                {/* Mobile View/Sort Controls */}
                <div className="flex lg:hidden items-center gap-2">
                  <select
                    value={sortConfig.sort_by}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="created_at">Newest</option>
                    <option value="price_per_unit">Price</option>
                    <option value="sales_count">Popular</option>
                  </select>
                </div>
              </div>
              
              {/* Loading State */}
              {isLoadingProducts && (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
                }>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-pulse">
                      <div className="aspect-square bg-gray-200" />
                      <div className="p-6 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-8 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Products Grid */}
              {!isLoadingProducts && productsData && productsData.products.length > 0 && (
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
                }>
                  {productsData.products.map(product => (
                    <div
                      key={product.product_id}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-200 group"
                    >
                      {/* Comparison Checkbox */}
                      <div className="absolute top-3 right-3 z-10">
                        <label className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md cursor-pointer">
                          <input
                            type="checkbox"
                            checked={comparisonProducts.includes(product.product_id)}
                            onChange={(e) => handleComparisonToggle(product.product_id, e.target.checked)}
                            className="size-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-xs font-medium text-gray-700">Compare</span>
                        </label>
                      </div>
                      
                      {/* Product Image */}
                      <Link to={`/product/${product.product_id}`} className="block relative">
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          {product.primary_image_url ? (
                            <img
                              src={product.primary_image_url}
                              alt={product.product_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-sm">No image</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Stock Badge */}
                        <div className="absolute top-3 left-3">
                          {product.stock_quantity > 0 ? (
                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              In Stock
                            </span>
                          ) : (
                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </Link>
                      
                      {/* Product Info */}
                      <div className="p-6 space-y-3">
                        <Link to={`/product/${product.product_id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
                            {product.product_name}
                          </h3>
                        </Link>
                        
                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-blue-600">
                            ${product.price_per_unit.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            per {product.unit_of_measure}
                          </span>
                        </div>
                        
                        {/* Supplier Info */}
                        <Link
                          to={`/supplier/${product.supplier_id}`}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <span>{product.business_name || 'Supplier'}</span>
                          {product.rating_average && (
                            <div className="flex items-center gap-1">
                              <Star className="size-4 fill-amber-400 text-amber-400" />
                              <span className="font-medium">{Number(product.rating_average).toFixed(1)}</span>
                            </div>
                          )}
                        </Link>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          {isAuthenticated ? (
                            <>
                              <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2">
                                <ShoppingCart className="size-5" />
                                Add to Cart
                              </button>
                              <button className="p-2 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:text-red-500 transition-all">
                                <Heart className="size-5" />
                              </button>
                            </>
                          ) : (
                            <Link
                              to="/register"
                              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all font-medium text-center border-2 border-gray-300"
                            >
                              Sign up to purchase
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Empty State */}
              {!isLoadingProducts && productsData && productsData.products.length === 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="size-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600 mb-6">
                      Try adjusting your filters or search terms
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Error State */}
              {productsError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <p className="text-red-700 font-medium">Failed to load products</p>
                  <p className="text-red-600 text-sm mt-2">Please try again later</p>
                </div>
              )}
              
              {/* Pagination */}
              {!isLoadingProducts && productsData && totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border-2 border-gray-200 rounded-lg hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                      let pageNum: number;
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
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'border-2 border-gray-200 text-gray-700 hover:border-blue-500'
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
                    className="p-2 border-2 border-gray-200 rounded-lg hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
        
        {/* Comparison Bar (Sticky Bottom) */}
        {comparisonProducts.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">
                    {comparisonProducts.length} products selected for comparison
                  </span>
                  <button
                    onClick={clearComparison}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Clear all
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <Link
                    to={`/compare?products=${comparisonProducts.join(',')}`}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-lg hover:shadow-xl"
                  >
                    Compare Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_Catalog;