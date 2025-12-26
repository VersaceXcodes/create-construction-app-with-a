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
  Bell,
  Menu,
  X,
  ChevronDown,
  Shield,
  LogOut,
  UserCog,
  Database
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

// ============================================================================
// COMPONENT
// ============================================================================

const GV_TopNav_Admin: React.FC = () => {
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

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  // ============================================================================
  // API CALLS - ALERT COUNTS
  // ============================================================================

  const { data: alertCounts } = useQuery<AlertCounts>({
    queryKey: ['admin-alerts'],
    queryFn: async () => {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

      try {
        const [disputesRes, applicationsRes, reviewsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/disputes?status=open&limit=1`, { headers }),
          axios.get(`${API_BASE_URL}/api/admin/supplier-applications?application_status=pending_review&limit=1`, { headers }),
          axios.get(`${API_BASE_URL}/api/admin/reviews/flagged`, { headers })
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
  // SYSTEM HEALTH
  // ============================================================================

  const { data: systemHealth } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      // TODO: Call GET /admin/system/health when implemented
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
  // HANDLERS
  // ============================================================================

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Force full page reload to clear any cached state
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
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
                  </button>
                  {(alertCounts?.supplier_applications || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {alertCounts?.supplier_applications}
                    </span>
                  )}

                  {/* Dropdown Menu */}
                  {usersDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                      <Link
                        to="/admin/customers"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUsersDropdownOpen(false)}
                      >
                        Customers
                      </Link>
                      <Link
                        to="/admin/suppliers"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUsersDropdownOpen(false)}
                      >
                        Suppliers
                      </Link>
                      <Link
                        to="/admin/supplier-applications"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUsersDropdownOpen(false)}
                      >
                        Supplier Applications
                        {(alertCounts?.supplier_applications || 0) > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {alertCounts?.supplier_applications}
                          </span>
                        )}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Orders */}
                <Link
                  to="/admin/orders"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin/orders') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Orders</span>
                </Link>

                {/* Disputes */}
                <Link
                  to="/admin/disputes"
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin/disputes') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Disputes</span>
                  {(alertCounts?.disputes || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {alertCounts?.disputes}
                    </span>
                  )}
                </Link>

                {/* Products */}
                <Link
                  to="/admin/products"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin/products') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Products</span>
                </Link>

                {/* Reviews */}
                <Link
                  to="/admin/reviews"
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin/reviews') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Reviews</span>
                  {(alertCounts?.flagged_content || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {alertCounts?.flagged_content}
                    </span>
                  )}
                </Link>

                {/* Financials */}
                <Link
                  to="/admin/financials"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin/financials') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Financials</span>
                </Link>

                {/* Analytics */}
                <Link
                  to="/admin/analytics"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin/analytics') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </Link>

                {/* Settings */}
                <Link
                  to="/admin/settings"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                    isActiveRoute('/admin/settings') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </div>
            </div>

            {/* Right section: Search, Notifications, System Health, Account */}
            <div className="flex items-center space-x-4">
              {/* System Health Indicator */}
              <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-gray-800 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${systemHealthColor} animate-pulse`}></div>
                <span className="text-xs text-gray-300 font-medium">
                  {systemHealth?.status === 'operational' ? 'Operational' : 
                   systemHealth?.status === 'degraded' ? 'Degraded' : 'Down'}
                </span>
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                <Bell className="w-5 h-5" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              <div className="relative account-dropdown">
                <button
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
                >
                  <UserCog className="w-5 h-5" />
                  <span className="hidden lg:block text-sm font-medium">
                    {currentUser?.email || 'Admin'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {accountDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {adminProfile?.role || 'Administrator'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {currentUser?.email}
                      </p>
                    </div>
                    <Link
                      to="/admin/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setAccountDropdownOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-3 space-y-2">
              <Link
                to="/admin"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-sm font-medium">Dashboard</span>
                </div>
              </Link>

              <Link
                to="/admin/customers"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Customers</span>
                </div>
              </Link>

              <Link
                to="/admin/suppliers"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Suppliers</span>
                </div>
              </Link>

              <Link
                to="/admin/supplier-applications"
                className="flex items-center justify-between px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Supplier Applications</span>
                </div>
                {(alertCounts?.supplier_applications || 0) > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {alertCounts?.supplier_applications}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/orders"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-sm font-medium">Orders</span>
                </div>
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
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {alertCounts?.disputes}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/products"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5" />
                  <span className="text-sm font-medium">Products</span>
                </div>
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
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {alertCounts?.flagged_content}
                  </span>
                )}
              </Link>

              <Link
                to="/admin/financials"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Financials</span>
                </div>
              </Link>

              <Link
                to="/admin/analytics"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-sm font-medium">Analytics</span>
                </div>
              </Link>

              <Link
                to="/admin/settings"
                className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5" />
                  <span className="text-sm font-medium">Settings</span>
                </div>
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