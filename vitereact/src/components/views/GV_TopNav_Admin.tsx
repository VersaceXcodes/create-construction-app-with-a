import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  AlertTriangle, 
  FileText, 
  DollarSign, 
  BarChart3, 
  Settings, 
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  Shield,
  Activity,
  LogOut,
  UserCog,
  Database,
  Server
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AlertCounts {
  disputes: number;
  flagged_content: number;
  supplier_applications: number;
}

interface SystemHealth {
  status: 'operational' | 'degraded' | 'down';
  uptime_percentage: number;
  api_response_time: number;
}

interface SearchResult {
  entity_type: 'user' | 'order' | 'product' | 'supplier';
  entity_id: string;
  display_name: string;
  secondary_info: string;
  url: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

const GV_TopNav_Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore((state) => state.authentication_state.current_user);
  const adminProfile = useAppStore((state) => state.authentication_state.admin_profile);
  const authToken = useAppStore((state) => state.authentication_state.auth_token);
  const logoutUser = useAppStore((state) => state.logout_user);

  // Local state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
  const [contentDropdownOpen, setContentDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

  // ============================================================================
  // API CALLS - ALERT COUNTS
  // ============================================================================

  const { data: alertCounts } = useQuery<AlertCounts>({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      try {
        const [disputesRes, applicationsRes, reviewsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/disputes?status=open&limit=1`, { headers }),
          axios.get(`${API_BASE_URL}/admin/supplier-applications?application_status=pending_review&limit=1`, { headers }),
          axios.get(`${API_BASE_URL}/admin/reviews/flagged`, { headers })
        ]);

        return {
          disputes: Number(disputesRes.data.total || disputesRes.data.length || 0),
          flagged_content: Number(reviewsRes.data.length || 0),
          supplier_applications: Number(applicationsRes.data.length || 0)
        };
      } catch (error) {
        console.error('Error fetching admin alerts:', error);
        return { disputes: 0, flagged_content: 0, supplier_applications: 0 };
      }
    },
    enabled: !!authToken,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 60000,
    retry: 1
  });

  // ============================================================================
  // SYSTEM HEALTH (MOCK - Endpoint not implemented)
  // ============================================================================

  const { data: systemHealth } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      // Mock implementation since endpoint doesn't exist
      // In production, would call GET /admin/system/health
      return {
        status: 'operational' as const,
        uptime_percentage: 99.9,
        api_response_time: 120
      };
    },
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 30000,
    retry: 0
  });

  // ============================================================================
  // GLOBAL SEARCH
  // ============================================================================

  const { data: searchResults, isLoading: searchIsLoading } = useQuery<SearchResult[]>({
    queryKey: ['admin-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      try {
        // Search across multiple entity types
        const [usersRes, ordersRes, productsRes, suppliersRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/admin/users?query=${encodeURIComponent(searchQuery)}&limit=5`, { headers }),
          axios.get(`${API_BASE_URL}/admin/orders?limit=5`, { headers }).catch(() => ({ data: { orders: [] } })),
          axios.get(`${API_BASE_URL}/products?search_query=${encodeURIComponent(searchQuery)}&limit=5`, { headers }).catch(() => ({ data: { products: [] } })),
          axios.get(`${API_BASE_URL}/suppliers?query=${encodeURIComponent(searchQuery)}&limit=5`, { headers }).catch(() => ({ data: { suppliers: [] } }))
        ]);

        const results: SearchResult[] = [];

        // Users
        if (usersRes.data.users) {
          usersRes.data.users.forEach((user: any) => {
            results.push({
              entity_type: 'user',
              entity_id: user.user_id,
              display_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
              secondary_info: `${user.user_type} - ${user.email}`,
              url: `/admin/${user.user_type === 'customer' ? 'customers' : 'suppliers'}`
            });
          });
        }

        // Orders
        if (ordersRes.data.orders) {
          ordersRes.data.orders.slice(0, 3).forEach((order: any) => {
            results.push({
              entity_type: 'order',
              entity_id: order.order_id,
              display_name: order.order_number,
              secondary_info: `$${Number(order.total_amount).toFixed(2)} - ${order.status}`,
              url: `/admin/orders`
            });
          });
        }

        // Products
        if (productsRes.data.products) {
          productsRes.data.products.slice(0, 3).forEach((product: any) => {
            results.push({
              entity_type: 'product',
              entity_id: product.product_id,
              display_name: product.product_name,
              secondary_info: `${product.business_name || 'Unknown Supplier'}`,
              url: `/admin/products`
            });
          });
        }

        // Suppliers
        if (suppliersRes.data.suppliers) {
          suppliersRes.data.suppliers.slice(0, 3).forEach((supplier: any) => {
            results.push({
              entity_type: 'supplier',
              entity_id: supplier.supplier_id,
              display_name: supplier.business_name,
              secondary_info: `Rating: ${Number(supplier.rating_average).toFixed(1)}`,
              url: `/admin/suppliers`
            });
          });
        }

        return results;
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    enabled: !!authToken && searchQuery.length >= 2,
    staleTime: 30000,
    retry: 1
  });

  // ============================================================================
  // DEBOUNCED SEARCH
  // ============================================================================

  useEffect(() => {
    if (searchQuery.length >= 2) {
      setSearchDropdownOpen(true);
    } else {
      setSearchDropdownOpen(false);
    }
  }, [searchQuery, searchResults]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchDropdownOpen(false);
    }
  };

  const handleSearchResultClick = (url: string) => {
    navigate(url);
    setSearchDropdownOpen(false);
    setSearchQuery('');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.account-dropdown')) {
        setAccountDropdownOpen(false);
      }
      if (!target.closest('.users-dropdown')) {
        setUsersDropdownOpen(false);
      }
      if (!target.closest('.content-dropdown')) {
        setContentDropdownOpen(false);
      }
      if (!target.closest('.search-container')) {
        setSearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const totalAlerts = (alertCounts?.disputes || 0) + 
                      (alertCounts?.flagged_content || 0) + 
                      (alertCounts?.supplier_applications || 0);

  const systemHealthColor = systemHealth?.status === 'operational' 
    ? 'bg-green-500' 
    : systemHealth?.status === 'degraded' 
    ? 'bg-yellow-500' 
    : 'bg-red-500';

  const isActiveRoute = (path: string) => location.pathname === path;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-lg border-b border-gray-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left section: Logo + Brand */}
            <div className="flex items-center space-x-8">
              <Link 
                to="/admin" 
                className="flex items-center space-x-3 group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white">BuildEasy</span>
                  <span className="text-xs text-gray-400 font-medium">Admin Panel</span>
                </div>
              </Link>

              {/* Desktop Navigation Tabs */}
              <div className="hidden lg:flex items-center space-x-1">
                {/* Dashboard */}
                <Link
                  to="/admin"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                {/* Users (Dropdown) */}
                <div className="relative users-dropdown">
                  <button
                    onClick={() => setUsersDropdownOpen(!usersDropdownOpen)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                      location.pathname.includes('/admin/customers') || 
                      location.pathname.includes('/admin/suppliers') || 
                      location.pathname.includes('/admin/supplier-applications')
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Users</span>
                    <ChevronDown className="w-3 h-3" />
                {(alertCounts?.supplier_applications || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {alertCounts?.supplier_applications}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/orders"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="text-sm font-medium">Orders</span>
              </Link>

              <Link
                to="/admin/disputes"
                className="flex items-center justify-between px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-sm font-medium">Disputes</span>
                </div>
                {(alertCounts?.disputes || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {alertCounts?.disputes}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/products"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Database className="w-5 h-5" />
                <span className="text-sm font-medium">Products</span>
              </Link>

              <Link
                to="/admin/reviews"
                className="flex items-center justify-between px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">Reviews</span>
                </div>
                {(alertCounts?.flagged_content || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {alertCounts?.flagged_content}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/financials"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Financials</span>
              </Link>

              <Link
                to="/admin/analytics"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-medium">Analytics</span>
              </Link>

              <Link
                to="/admin/settings"
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </Link>

              {/* Mobile System Health */}
              <div className="px-4 py-3 border-t border-gray-700 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">System Status</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${systemHealthColor}`}></div>
                    <span className="text-xs text-gray-300">
                      {systemHealth?.status === 'operational' ? 'Operational' : 
                       systemHealth?.status === 'degraded' ? 'Degraded' : 'Down'}
                    </span>
                  </div>
                </div>
                {systemHealth && (
                  <div className="mt-2 text-xs text-gray-400">
                    <p>Uptime: {systemHealth.uptime_percentage}%</p>
                    <p>Response: {systemHealth.api_response_time}ms</p>
                  </div>
                )}
              </div>

              {/* Mobile Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from being hidden under fixed navbar */}
      <div className="h-16"></div>
    </>
  );
};

export default GV_TopNav_Admin;