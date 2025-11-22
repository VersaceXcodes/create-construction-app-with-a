import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Store, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  MessageSquare, 
  Star,
  BarChart3,
  DollarSign,
  Settings,
  Bell,
  HelpCircle,
  Search,
  Menu,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SupplierProfile {
  supplier_id: string;
  business_name: string;
  logo_url: string | null;
  verification_status: string;
  rating_average: number;
  total_reviews: number;
}

interface ChatConversation {
  conversation_id: string;
  unread_count?: number;
}

interface Product {
  product_id: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchSupplierProfile = async (token: string): Promise<SupplierProfile> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const fetchUnreadMessagesCount = async (token: string): Promise<number> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/chat/conversations`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { conversation_type: 'customer_supplier' }
    }
  );
  
  // Count unread messages across all conversations
  const conversations: ChatConversation[] = response.data || [];
  return conversations.reduce((count, conv) => count + (conv.unread_count || 0), 0);
};

const fetchLowStockCount = async (token: string): Promise<number> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/products`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 1000 } // Get all products to count client-side
    }
  );
  
  const products: Product[] = response.data.products || [];
  return products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;
};

const fetchPendingOrdersCount = async (token: string): Promise<number> => {
  // Workaround: Use products endpoint as proxy since orders endpoint is missing
  // In production, this would be GET /api/suppliers/me/orders?status=pending
  try {
    await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/products`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { status_filter: 'pending', limit: 1 }
      }
    );
    // Return 0 as placeholder since endpoint doesn't exist
    return 0;
  } catch {
    return 0;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_TopNav_Supplier: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // CRITICAL: Individual selectors only
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);
  const logoutUser = useAppStore(state => state.logout_user);
  
  // Local state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // React-Query: Fetch supplier profile
  const { data: profileData } = useQuery<SupplierProfile>({
    queryKey: ['supplier-profile'],
    queryFn: () => fetchSupplierProfile(authToken || ''),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
  
  // React-Query: Fetch pending orders count (with polling)
  const { data: pendingOrdersCount = 0 } = useQuery<number>({
    queryKey: ['supplier-pending-orders-count'],
    queryFn: () => fetchPendingOrdersCount(authToken || ''),
    enabled: !!authToken,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchOnWindowFocus: false,
  });
  
  // React-Query: Fetch unread messages count (with polling)
  const { data: unreadMessagesCount = 0 } = useQuery<number>({
    queryKey: ['supplier-unread-messages'],
    queryFn: () => fetchUnreadMessagesCount(authToken || ''),
    enabled: !!authToken,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false,
  });
  
  // React-Query: Fetch low stock count (with polling)
  const { data: lowStockCount = 0 } = useQuery<number>({
    queryKey: ['supplier-low-stock-count'],
    queryFn: () => fetchLowStockCount(authToken || ''),
    enabled: !!authToken,
    staleTime: 60 * 1000, // 60 seconds
    refetchInterval: 60 * 1000, // Poll every minute
    refetchOnWindowFocus: false,
  });
  
  // Handlers
  const handleLogout = useCallback(async () => {
    await logoutUser();
    navigate('/login');
  }, [logoutUser, navigate]);
  
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/supplier/products?search_query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }, [searchQuery, navigate]);
  
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);
  
  const toggleAccountDropdown = useCallback(() => {
    setIsAccountDropdownOpen(prev => !prev);
  }, []);
  
  // Close dropdowns on route change
  useEffect(() => {
    setIsAccountDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#account-dropdown-button') && !target.closest('#account-dropdown-menu')) {
        setIsAccountDropdownOpen(false);
      }
    };
    
    if (isAccountDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isAccountDropdownOpen]);
  
  // Derived data
  const businessName = profileData?.business_name || supplierProfile?.business_name || 'My Business';
  const logoUrl = profileData?.logo_url || supplierProfile?.logo_url;
  const verificationStatus = profileData?.verification_status || supplierProfile?.verification_status || 'pending';
  const ratingAverageRaw = profileData?.rating_average || supplierProfile?.rating_average || 0;
  const ratingAverage = Number(ratingAverageRaw) || 0;
  
  // Navigation items
  const navItems = [
    { label: 'Dashboard', path: '/supplier/dashboard', icon: Store },
    { label: 'Products', path: '/supplier/products', icon: Package, badge: lowStockCount > 0 ? lowStockCount : null },
    { label: 'Inventory', path: '/supplier/inventory', icon: Package, badge: lowStockCount },
    { label: 'Orders', path: '/supplier/orders', icon: ShoppingCart, badge: pendingOrdersCount },
    { label: 'Analytics', path: '/supplier/analytics', icon: BarChart3 },
    { label: 'Financials', path: '/supplier/financials', icon: DollarSign },
  ];
  
  const isActivePath = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  
  return (
    <>
      {/* Fixed top navigation bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Section: Logo & Brand */}
            <div className="flex items-center space-x-8">
              {/* Mobile menu button */}
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              
              {/* Logo */}
              <Link to="/supplier/dashboard" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                  <Store className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">BuildEasy</span>
                <span className="text-xs font-medium text-gray-500 hidden md:block">Supplier</span>
              </Link>
              
              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      
                      {/* Alert badge */}
                      {item.badge && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            {/* Center Section: Search Bar (Desktop only) */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your products..."
                    className="w-full px-4 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    aria-label="Search your products"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </form>
            </div>
            
            {/* Right Section: Actions & Account */}
            <div className="flex items-center space-x-2">
              
              {/* Messages Button */}
              <Link
                to="/supplier/messages"
                className="relative p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label={`Messages ${unreadMessagesCount > 0 ? `(${unreadMessagesCount} unread)` : ''}`}
              >
                <MessageSquare className="h-5 w-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </Link>
              
              {/* Notifications Button */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {/* Placeholder badge - could fetch from notification state */}
              </Link>
              
              {/* Help Button */}
              <Link
                to="/help"
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </Link>
              
              {/* Account Dropdown */}
              <div className="relative">
                <button
                  id="account-dropdown-button"
                  type="button"
                  onClick={toggleAccountDropdown}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-haspopup="true"
                  aria-expanded={isAccountDropdownOpen}
                >
                  {/* Business Logo or Default Icon */}
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={businessName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <Store className="h-5 w-5 text-white" />
                    </div>
                  )}
                  
                  {/* Business Name (Desktop only) */}
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
                      {businessName}
                    </span>
                    <div className="flex items-center space-x-1">
                      {verificationStatus === 'verified' && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      <span className="text-xs text-gray-500 flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        {(isNaN(ratingAverage) || !isFinite(ratingAverage) ? 0 : ratingAverage).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform hidden md:block ${
                    isAccountDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {/* Dropdown Menu */}
                {isAccountDropdownOpen && (
                  <div
                    id="account-dropdown-menu"
                    className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    {/* Business Info Header */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">{businessName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {verificationStatus === 'verified' ? (
                          <span className="flex items-center text-xs text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center text-xs text-gray-500">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {verificationStatus === 'pending' ? 'Pending Verification' : 'Not Verified'}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center">
                          <Star className="h-3 w-3 text-yellow-500 mr-1" />
                          {(isNaN(ratingAverage) || !isFinite(ratingAverage) ? 0 : ratingAverage).toFixed(1)} rating
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{currentUser?.email}</p>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to="/supplier/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        role="menuitem"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-500" />
                        Business Settings
                      </Link>
                      
                      <Link
                        to="/supplier/settings#team"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        role="menuitem"
                      >
                        <Store className="h-4 w-4 mr-3 text-gray-500" />
                        Team Management
                      </Link>
                      
                      <Link
                        to="/supplier/analytics"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        role="menuitem"
                      >
                        <TrendingUp className="h-4 w-4 mr-3 text-gray-500" />
                        Performance
                      </Link>
                      
                      <Link
                        to="/supplier/education"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        role="menuitem"
                      >
                        <HelpCircle className="h-4 w-4 mr-3 text-gray-500" />
                        Resources
                      </Link>
                    </div>
                    
                    {/* Logout */}
                    <div className="border-t border-gray-200 py-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        role="menuitem"
                      >
                        <svg className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu (Slide-in drawer) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-2">
              
              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your products..."
                    className="w-full px-4 py-2 pl-10 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Search products"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </form>
              
              {/* Mobile Navigation Links */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    
                    {item.badge && item.badge > 0 && (
                      <span className="flex items-center justify-center h-6 w-6 text-xs font-bold text-white bg-red-500 rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              
              {/* Additional Mobile Links */}
              <Link
                to="/supplier/messages"
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-all ${
                  isActivePath('/supplier/messages')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5" />
                  <span>Messages</span>
                </div>
                {unreadMessagesCount > 0 && (
                  <span className="flex items-center justify-center h-6 w-6 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </Link>
              
              <Link
                to="/supplier/reviews"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all ${
                  isActivePath('/supplier/reviews')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Star className="h-5 w-5" />
                <span>Reviews</span>
              </Link>
              
              <Link
                to="/supplier/settings"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all ${
                  isActivePath('/supplier/settings')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
              
              {/* Mobile Account Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center space-x-3 px-4 py-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt={businessName} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                      <Store className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{businessName}</p>
                    <p className="text-xs text-gray-500">{currentUser?.email}</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full mt-2 flex items-center space-x-3 px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Mobile Menu Overlay (darken background) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default GV_TopNav_Supplier;