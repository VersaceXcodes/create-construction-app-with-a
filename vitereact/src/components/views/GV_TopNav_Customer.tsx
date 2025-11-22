import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import {
  ShoppingCartIcon,
  BellIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  StarIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CartItem {
  cart_item_id: string;
  cart_id: string;
  product_id: string;
  supplier_id: string;
  quantity: number;
  price_per_unit: number;
  added_date: string;
  product_name?: string;
  primary_image_url?: string;
  supplier_name?: string;
}

interface Cart {
  cart_id: string;
  customer_id: string;
  created_date: string;
  last_modified_date: string;
  status: string;
}

interface CartSummaryResponse {
  cart: Cart | null;
  items: CartItem[];
  subtotal: number;
  total_items: number;
}

interface Notification {
  notification_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  created_date: string;
  is_read: boolean;
  read_at: string | null;
}

interface NotificationSummaryResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchCartSummary = async (authToken: string | null): Promise<CartSummaryResponse> => {
  if (!authToken) {
    return { cart: null, items: [], subtotal: 0, total_items: 0 };
  }

  // Use relative URL - axios baseURL already includes /api prefix and auth header is set globally
  const response = await axios.get<CartSummaryResponse>('/cart');

  return response.data;
};

const fetchNotificationsSummary = async (authToken: string | null): Promise<NotificationSummaryResponse> => {
  if (!authToken) {
    return { notifications: [], total: 0, unread_count: 0 };
  }

  // Use relative URL - axios baseURL already includes /api prefix and auth header is set globally
  const response = await axios.get<NotificationSummaryResponse>(
    '/notifications',
    {
      params: {
        limit: 10,
        is_read: false,
      },
    }
  );

  return response.data;
};

const markNotificationRead = async (authToken: string, notification_id: string): Promise<void> => {
  // Use relative URL - axios baseURL already includes /api prefix and auth header is set globally
  await axios.patch(
    `/notifications/${notification_id}`,
    { is_read: true }
  );
};

const logoutApi = async (authToken: string): Promise<void> => {
  // Use relative URL - axios baseURL already includes /api prefix and auth header is set globally
  await axios.post('/auth/logout', {});
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GV_TopNav_Customer: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const customerProfile = useAppStore(state => state.authentication_state.customer_profile);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const logoutUser = useAppStore(state => state.logout_user);

  // Local state
  const [search_query, setSearchQuery] = useState('');
  const [mobile_menu_open, setMobileMenuOpen] = useState(false);
  const [notifications_open, setNotificationsOpen] = useState(false);
  const [account_menu_open, setAccountMenuOpen] = useState(false);

  // Refs for click outside detection
  const notificationRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // API QUERIES
  // ============================================================================

  // Fetch cart summary with polling
  const { data: cartSummary, isLoading: cartLoading } = useQuery({
    queryKey: ['cart-summary'],
    queryFn: () => fetchCartSummary(authToken),
    enabled: isAuthenticated && !!authToken,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Poll every 30 seconds
    retry: 1,
    select: (data) => ({
      total_items: data.total_items || 0,
      is_loading: false,
    }),
  });

  // Fetch notifications summary with polling
  const { data: notificationSummary, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications-summary'],
    queryFn: () => fetchNotificationsSummary(authToken),
    enabled: isAuthenticated && !!authToken,
    staleTime: 60000, // 60 seconds
    refetchInterval: 60000, // Poll every 60 seconds
    retry: 1,
    select: (data) => ({
      unread_count: data.unread_count || 0,
      latest_notifications: data.notifications || [],
    }),
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (notification_id: string) => {
      if (!authToken) throw new Error('Not authenticated');
      return markNotificationRead(authToken, notification_id);
    },
    onSuccess: () => {
      // Invalidate notifications query to refetch
      queryClient.invalidateQueries({ queryKey: ['notifications-summary'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => {
      if (!authToken) throw new Error('Not authenticated');
      return logoutApi(authToken);
    },
    onSuccess: () => {
      // Call store logout to clear all state
      logoutUser();
      navigate('/');
    },
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search_query.trim()) {
      navigate(`/products?search_query=${encodeURIComponent(search_query.trim())}`);
      setSearchQuery('');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    markReadMutation.mutate(notification.notification_id);
    
    // Close dropdown
    setNotificationsOpen(false);
    
    // Navigate to action URL if exists
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleLogout = () => {
    setAccountMenuOpen(false);
    logoutMutation.mutate();
  };

  const toggleNotifications = () => {
    setNotificationsOpen(!notifications_open);
    setAccountMenuOpen(false);
  };

  const toggleAccountMenu = () => {
    setAccountMenuOpen(!account_menu_open);
    setNotificationsOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobile_menu_open);
  };

  // ============================================================================
  // CLICK OUTSIDE HANDLERS
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const cart_total = cartSummary?.total_items || 0;
  const unread_count = notificationSummary?.unread_count || 0;
  const latest_notifications = notificationSummary?.latest_notifications || [];
  
  const user_first_name = currentUser?.first_name || 'Customer';
  const user_email = currentUser?.email || '';
  const profile_photo_url = currentUser?.profile_photo_url;
  const account_type = customerProfile?.account_type || 'retail';

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* ============================================ */}
            {/* LEFT SECTION: Logo + Nav Links */}
            {/* ============================================ */}
            
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link 
                to="/dashboard" 
                className="flex items-center space-x-2 transition-opacity hover:opacity-80"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">BuildEasy</span>
              </Link>
              
              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link 
                  to="/orders" 
                  className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 flex items-center space-x-1"
                >
                  <ClipboardDocumentListIcon className="w-5 h-5" />
                  <span>Orders</span>
                </Link>
                
                <Link 
                  to="/projects" 
                  className="text-gray-700 hover:text-blue-600 font-medium text-sm transition-colors duration-200 flex items-center space-x-1"
                >
                  <FolderIcon className="w-5 h-5" />
                  <span>Projects</span>
                </Link>
              </nav>
            </div>
            
            {/* ============================================ */}
            {/* CENTER: Search Bar */}
            {/* ============================================ */}
            
            <div className="flex-1 max-w-2xl mx-4 hidden lg:block">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="search"
                  value={search_query}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search construction materials..."
                  className="w-full px-4 py-2 pl-10 pr-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-sm"
                />
                <button
                  type="submit"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Search"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
            
            {/* ============================================ */}
            {/* RIGHT SECTION: Cart, Notifications, Help, Account */}
            {/* ============================================ */}
            
            <div className="flex items-center space-x-4">
              
              {/* Cart Icon with Badge */}
              <Link 
                to="/cart" 
                className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                aria-label="Shopping cart"
              >
                <ShoppingCartIcon className="w-6 h-6" />
                {cart_total > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart_total > 99 ? '99+' : cart_total}
                  </span>
                )}
                {cartLoading && (
                  <span className="absolute -top-1 -right-1 w-3 h-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  </span>
                )}
              </Link>
              
              {/* Notification Bell with Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={toggleNotifications}
                  className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors duration-200"
                  aria-label="Notifications"
                  aria-expanded={notifications_open}
                >
                  <BellIcon className="w-6 h-6" />
                  {unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unread_count > 99 ? '99+' : unread_count}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {notifications_open && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      {unread_count > 0 && (
                        <span className="text-xs text-blue-600 font-medium">{unread_count} unread</span>
                      )}
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="px-4 py-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                        </div>
                      ) : latest_notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No notifications yet</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {latest_notifications.map((notification) => (
                            <button
                              key={notification.notification_id}
                              onClick={() => handleNotificationClick(notification)}
                              className="w-full px-4 py-3 hover:bg-blue-50 transition-colors duration-150 text-left"
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${!notification.is_read ? 'bg-blue-600' : 'bg-transparent'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.created_date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                      <Link
                        to="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors block text-center"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Help Link */}
              <Link 
                to="/help" 
                className="p-2 text-gray-700 hover:text-blue-600 transition-colors duration-200 hidden sm:block"
                aria-label="Help center"
              >
                <QuestionMarkCircleIcon className="w-6 h-6" />
              </Link>
              
              {/* Account Menu */}
              <div className="relative hidden sm:block" ref={accountMenuRef}>
                <button
                  onClick={toggleAccountMenu}
                  className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  aria-label="Account menu"
                  aria-expanded={account_menu_open}
                >
                  {profile_photo_url ? (
                    <img
                      src={profile_photo_url}
                      alt={`${user_first_name}'s profile`}
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <UserCircleIcon className="w-8 h-8 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900 hidden lg:block">
                    {user_first_name}
                  </span>
                </button>
                
                {/* Account Dropdown */}
                {account_menu_open && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* User Info Section */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">{user_first_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user_email}</p>
                      <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                        account_type === 'trade' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {account_type === 'trade' ? 'Trade Account' : 'Retail Account'}
                      </span>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                      >
                        <Cog6ToothIcon className="w-5 h-5" />
                        <span>Account Settings</span>
                      </Link>
                      
                      <Link
                        to="/account/reviews"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                      >
                        <StarIcon className="w-5 h-5" />
                        <span>My Reviews</span>
                      </Link>
                      
                      <Link
                        to="/wishlist"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>Saved Items</span>
                      </Link>
                      
                      {account_type === 'trade' && (
                        <Link
                          to="/trade-credit"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span>Trade Credit</span>
                        </Link>
                      )}
                      
                      <div className="border-t border-gray-200 my-2"></div>
                      
                      <button
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 disabled:opacity-50"
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        <span>{logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="sm:hidden p-2 text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="Toggle menu"
              >
                {mobile_menu_open ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Search Bar (below main nav) */}
          <div className="lg:hidden pb-4">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <input
                  type="search"
                  value={search_query}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search construction materials..."
                  className="w-full px-4 py-2 pl-10 pr-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-sm"
                />
                <button
                  type="submit"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  aria-label="Search"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* ============================================ */}
        {/* MOBILE MENU OVERLAY */}
        {/* ============================================ */}
        
        {mobile_menu_open && (
          <div className="sm:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-2">
              {/* Profile Section */}
              <div className="pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  {profile_photo_url ? (
                    <img
                      src={profile_photo_url}
                      alt={`${user_first_name}'s profile`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <UserCircleIcon className="w-12 h-12 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user_first_name}</p>
                    <p className="text-xs text-gray-500">{user_email}</p>
                  </div>
                </div>
              </div>
              
              {/* Navigation Links */}
              <Link
                to="/orders"
                onClick={toggleMobileMenu}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <ClipboardDocumentListIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Orders</span>
              </Link>
              
              <Link
                to="/projects"
                onClick={toggleMobileMenu}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <FolderIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Projects</span>
              </Link>
              
              <Link
                to="/wishlist"
                onClick={toggleMobileMenu}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-sm font-medium">Saved Items</span>
              </Link>
              
              <Link
                to="/help"
                onClick={toggleMobileMenu}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Help Center</span>
              </Link>
              
              <div className="border-t border-gray-200 my-2"></div>
              
              <Link
                to="/account"
                onClick={toggleMobileMenu}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Account Settings</span>
              </Link>
              
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                </span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default GV_TopNav_Customer;