import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Menu, X, HelpCircle, ChevronDown } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Category {
  category_id: string;
  category_name: string;
  category_slug: string;
  icon_url: string | null;
  display_order: number;
  parent_category_id: string | null;
}

interface SearchSuggestion {
  products: Array<{
    product_id: string;
    product_name: string;
    price_per_unit: number;
    primary_image_url: string | null;
    supplier_name?: string;
  }>;
  suppliers: any[];
  categories: any[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchCategories = async (): Promise<Category[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/categories`, {
    params: {
      is_active: 'true',
      limit: 100,
      sort_by: 'display_order',
      sort_order: 'asc'
    }
  });
  // Ensure we return an array
  return Array.isArray(response.data) ? response.data : [];
};

const fetchSearchSuggestions = async (query: string): Promise<SearchSuggestion> => {
  if (query.length < 3) {
    return { products: [], suppliers: [], categories: [] };
  }

  const response = await axios.get(`${API_BASE_URL}/api/products`, {
    params: {
      search_query: query,
      limit: 5,
      status: 'active'
    }
  });

  return {
    products: response.data.products?.slice(0, 5).map((p: any) => ({
      product_id: p.product_id,
      product_name: p.product_name,
      price_per_unit: Number(p.price_per_unit || 0),
      primary_image_url: p.primary_image_url,
      supplier_name: p.business_name || p.supplier_name || ''
    })) || [],
    suppliers: [],
    categories: []
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_TopNav_Guest: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  
  // Local State
  const [search_query, setSearchQuery] = useState('');
  const [is_mega_menu_open, setIsMegaMenuOpen] = useState(false);
  const [is_mobile_menu_open, setIsMobileMenuOpen] = useState(false);
  const [is_search_focused, setIsSearchFocused] = useState(false);
  const [search_suggestions, setSearchSuggestions] = useState<SearchSuggestion>({
    products: [],
    suppliers: [],
    categories: []
  });
  const [is_loading_suggestions, setIsLoadingSuggestions] = useState(false);
  
  // Refs for click outside detection
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch Categories (React Query)
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: fetchCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1
  });
  
  // Close menus on route change
  useEffect(() => {
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsSearchFocused(false);
  }, [location.pathname]);
  
  // Close mega-menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (megaMenuRef.current && !megaMenuRef.current.contains(event.target as Node)) {
        setIsMegaMenuOpen(false);
      }
    };
    
    if (is_mega_menu_open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [is_mega_menu_open]);
  
  // Close search suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    
    if (is_search_focused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [is_search_focused]);
  
  // Debounced search suggestions fetch
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Clear previous timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Don't fetch if query too short
    if (value.length < 3) {
      setSearchSuggestions({ products: [], suppliers: [], categories: [] });
      setIsLoadingSuggestions(false);
      return;
    }
    
    setIsLoadingSuggestions(true);
    
    // Debounce 300ms
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const suggestions = await fetchSearchSuggestions(value);
        setSearchSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching search suggestions:', error);
        setSearchSuggestions({ products: [], suppliers: [], categories: [] });
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);
  }, []);
  
  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search_query.trim()) {
      navigate(`/products?search_query=${encodeURIComponent(search_query.trim())}`);
      setIsSearchFocused(false);
      setSearchQuery('');
    }
  };
  
  // Handle category click
  const handleCategoryClick = (categoryId: string) => {
    navigate(`/products?category=${categoryId}`);
    setIsMegaMenuOpen(false);
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (productId: string) => {
    navigate(`/product/${productId}`);
    setIsSearchFocused(false);
    setSearchQuery('');
  };
  
  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (is_mobile_menu_open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [is_mobile_menu_open]);
  
  return (
    <>
      {/* Main Navigation Header - Fixed and Sticky */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Section: Logo + Categories (Desktop) */}
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link 
                to="/" 
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">BE</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">BuildEasy</span>
              </Link>
              
              {/* Categories Mega-Menu Button (Desktop) */}
              <div className="hidden md:block relative" ref={megaMenuRef}>
                <button
                  onClick={() => setIsMegaMenuOpen(!is_mega_menu_open)}
                  className="flex items-center space-x-1 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  aria-label="Browse categories"
                  aria-expanded={is_mega_menu_open}
                >
                  <span className="font-medium">Categories</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${is_mega_menu_open ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Mega-Menu Dropdown */}
                {is_mega_menu_open && (
                  <div className="absolute left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                        Browse by Category
                      </h3>
                      
                      {isCategoriesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : categories.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {categories.slice(0, 12).map((category) => (
                            <button
                              key={category.category_id}
                              onClick={() => handleCategoryClick(category.category_id)}
                              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 text-left"
                            >
                              {category.icon_url ? (
                                <img 
                                  src={category.icon_url} 
                                  alt={category.category_name}
                                  className="w-8 h-8 object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                                  <span className="text-gray-600 text-xs font-medium">
                                    {category.category_name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900 line-clamp-2">
                                {category.category_name}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm py-4 text-center">No categories available</p>
                      )}
                      
                      {categories.length > 12 && (
                        <Link
                          to="/products"
                          className="block mt-4 text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                          onClick={() => setIsMegaMenuOpen(false)}
                        >
                          View All Categories →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Center Section: Search Bar (Desktop/Tablet) */}
            <div className="hidden md:flex flex-1 max-w-md mx-8 relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={search_query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Search construction materials..."
                    className="block w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                  />
                  {search_query && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchSuggestions({ products: [], suppliers: [], categories: [] });
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </form>
              
              {/* Search Suggestions Dropdown */}
              {is_search_focused && search_query.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden max-h-96 overflow-y-auto z-50">
                  {is_loading_suggestions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : search_suggestions.products.length > 0 ? (
                    <div className="p-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Products
                      </h4>
                      <div className="space-y-2">
                        {search_suggestions.products.map((product) => (
                          <button
                            key={product.product_id}
                            onClick={() => handleSuggestionClick(product.product_id)}
                            className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 text-left"
                          >
                            {product.primary_image_url ? (
                              <img 
                                src={product.primary_image_url}
                                alt={product.product_name}
                                className="w-12 h-12 object-cover rounded-md"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No img</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {product.product_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                ${Number(product.price_per_unit || 0).toFixed(2)}
                                {product.supplier_name && (
                                  <span className="ml-2">• {product.supplier_name}</span>
                                )}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : search_query.length >= 3 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500 text-sm">No products found</p>
                      <p className="text-gray-400 text-xs mt-1">Try different keywords</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            
            {/* Right Section: Actions */}
            <div className="flex items-center space-x-4">
              {/* Help Link */}
              <Link
                to="/help"
                className="hidden lg:flex items-center text-gray-700 hover:text-blue-600 transition-colors duration-200"
                aria-label="Help center"
              >
                <HelpCircle className="w-5 h-5" />
              </Link>
              
              {/* Sign In Button */}
              <Link
                to="/login"
                className="hidden sm:block px-4 py-2 text-gray-900 hover:text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                Sign In
              </Link>
              
              {/* Sign Up Button (Primary CTA) */}
              <Link
                to="/register"
                className="hidden sm:block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Sign Up Free
              </Link>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!is_mobile_menu_open)}
                className="md:hidden p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                aria-label="Open menu"
              >
                {is_mobile_menu_open ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Search Bar (Below main nav on mobile) */}
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={search_query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search materials..."
                  className="block w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 text-sm"
                />
              </div>
            </form>
          </div>
        </nav>
      </header>
      
      {/* Mobile Menu Drawer */}
      {is_mobile_menu_open && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="p-6">
              {/* Close Button */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Sign In / Sign Up Buttons */}
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-gray-900 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-center text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg shadow-lg transition-all duration-200"
                >
                  Sign Up Free
                </Link>
              </div>
              
              {/* Categories */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Categories
                </h3>
                {isCategoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : categories.length > 0 ? (
                  <div className="space-y-2">
                    {categories.slice(0, 8).map((category) => (
                      <button
                        key={category.category_id}
                        onClick={() => {
                          handleCategoryClick(category.category_id);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-200 text-left"
                      >
                        {category.icon_url ? (
                          <img 
                            src={category.icon_url}
                            alt={category.category_name}
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-600 text-xs">
                              {category.category_name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {category.category_name}
                        </span>
                      </button>
                    ))}
                    
                    {categories.length > 8 && (
                      <Link
                        to="/products"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 text-center"
                      >
                        View All Categories →
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm py-4">No categories available</p>
                )}
              </div>
              
              {/* Help Link */}
              <div className="pt-6 border-t border-gray-200">
                <Link
                  to="/help"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Help Center</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GV_TopNav_Guest;