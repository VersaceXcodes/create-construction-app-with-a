import  { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Server,
  Database,
  CreditCard,
  Mail,
  Smartphone,
  Cloud,
  RefreshCw,
  X,
  ExternalLink,
  FileText,
  Flag,
  AlertCircle
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (matching backend schemas)
// ============================================================================

interface PlatformMetrics {
  total_users: number;
  total_customers: number;
  total_suppliers: number;
  total_orders: number;
  total_revenue: number;
  gmv: number;
  active_orders: number;
  pending_disputes: number;
  platform_uptime?: number;
  avg_response_time?: number;
}

interface SystemHealth {
  api_status: string;
  database_status: string;
  payment_gateway_status: string;
  email_service_status: string;
  sms_service_status: string;
  cdn_status: string;
  overall_status: string;
  last_checked: string;
}

interface ActivityItem {
  activity_id: string;
  activity_type: string;
  description: string;
  timestamp: string;
  user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
}

interface Alert {
  alert_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  created_date: string;
  status: string;
  affected_users: number | null;
}

interface GrowthDataPoint {
  date: string;
  users?: number;
  revenue?: number;
  orders?: number;
}

interface GrowthMetrics {
  period: string;
  user_growth: GrowthDataPoint[];
  revenue_growth: GrowthDataPoint[];
  order_volume: GrowthDataPoint[];
}

interface QuickStats {
  pending_supplier_applications: number;
  open_disputes: number;
  flagged_content: number;
  failed_payments: number;
  system_errors: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchPlatformMetrics = async (authToken: string, dateRange: string): Promise<PlatformMetrics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/dashboard`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { date_range: dateRange }
    }
  );
  return response.data;
};

const fetchSystemHealth = async (authToken: string): Promise<SystemHealth> => {
  // Mock implementation since endpoint doesn't exist in backend yet
  // In production, this would call: GET /api/admin/system/health
  return {
    api_status: 'operational',
    database_status: 'operational',
    payment_gateway_status: 'operational',
    email_service_status: 'operational',
    sms_service_status: 'operational',
    cdn_status: 'operational',
    overall_status: 'operational',
    last_checked: new Date().toISOString()
  };
};

const fetchRecentActivity = async (authToken: string): Promise<ActivityItem[]> => {
  // Mock implementation since endpoint doesn't exist in backend yet
  // In production, this would call: GET /api/admin/activity/recent?limit=20
  return [];
};

const fetchActiveAlerts = async (authToken: string): Promise<Alert[]> => {
  // Mock implementation since endpoint doesn't exist in backend yet
  // In production, this would call: GET /api/admin/alerts/active
  return [];
};

const fetchGrowthMetrics = async (authToken: string, period: string): Promise<GrowthMetrics> => {
  // Mock implementation since endpoint doesn't exist in backend yet
  // In production, this would call: GET /api/admin/analytics/growth?period={period}
  return {
    period,
    user_growth: [],
    revenue_growth: [],
    order_volume: []
  };
};

const dismissAlert = async (authToken: string, alertId: string): Promise<void> => {
  // Mock implementation since endpoint doesn't exist in backend yet
  // In production, this would call: PATCH /api/admin/alerts/{alert_id}
  await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/alerts/${alertId}`,
    { status: 'dismissed' },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UV_AdminDashboard() {
  // CRITICAL: Individual selectors to avoid infinite loops
  // const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Get date_range from URL or default to 'last_30_days'
  const selectedDateRange = searchParams.get('date_range') || 'last_30_days';
  // const metricView = searchParams.get('metric_view');
  
  // const [localLoadingStates, setLocalLoadingStates] = useState({
  //   metrics: false,
  //   health: false,
  //   activity: false,
  //   alerts: false,
  //   growth: false
  // });

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Platform Metrics Query
  const { 
    data: platformMetrics, 
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['platformMetrics', selectedDateRange],
    queryFn: () => fetchPlatformMetrics(authToken!, selectedDateRange),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // System Health Query (polled every 30 seconds)
  const { 
    data: systemHealth,
    isLoading: healthLoading,
    refetch: refetchHealth
  } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => fetchSystemHealth(authToken!),
    enabled: !!authToken,
    refetchInterval: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Recent Activity Query
  const { 
    data: recentActivity = [],
    isLoading: activityLoading,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: () => fetchRecentActivity(authToken!),
    enabled: !!authToken,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false
  });

  // Active Alerts Query
  const { 
    data: activeAlerts = [],
    isLoading: alertsLoading,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: ['activeAlerts'],
    queryFn: () => fetchActiveAlerts(authToken!),
    enabled: !!authToken,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Growth Metrics Query
  const { 
    data: growthMetrics,
    isLoading: growthLoading,
    refetch: refetchGrowth
  } = useQuery({
    queryKey: ['growthMetrics', selectedDateRange],
    queryFn: () => fetchGrowthMetrics(authToken!, selectedDateRange),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const dismissAlertMutation = useMutation({
    mutationFn: (alertId: string) => dismissAlert(authToken!, alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeAlerts'] });
    }
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleDateRangeChange = (newRange: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('date_range', newRange);
      return newParams;
    });
  };

  const handleDismissAlert = (alertId: string) => {
    dismissAlertMutation.mutate(alertId);
  };

  const handleRefreshAll = () => {
    refetchMetrics();
    refetchHealth();
    refetchActivity();
    refetchAlerts();
    refetchGrowth();
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const quickStats = useMemo((): QuickStats => {
    // In production, this would come from platformMetrics response
    return {
      pending_supplier_applications: 0,
      open_disputes: platformMetrics?.pending_disputes || 0,
      flagged_content: 0,
      failed_payments: 0,
      system_errors: 0
    };
  }, [platformMetrics]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'operational':
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'down':
      case 'error':
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* ============================================ */}
          {/* HEADER SECTION */}
          {/* ============================================ */}
          
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Operations Center</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Welcome back, {currentUser?.first_name} {currentUser?.last_name}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Date Range Selector */}
                <select
                  value={selectedDateRange}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="today">Today</option>
                  <option value="last_7_days">Last 7 Days</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_quarter">Last Quarter</option>
                  <option value="last_year">Last Year</option>
                </select>
                
                {/* Refresh Button */}
                <button
                  onClick={handleRefreshAll}
                  disabled={metricsLoading || healthLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${(metricsLoading || healthLoading) ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* SYSTEM HEALTH STATUS BAR */}
          {/* ============================================ */}
          
          {systemHealth && (
            <div className={`mb-6 p-4 rounded-lg border-2 ${
              systemHealth.overall_status === 'operational' 
                ? 'bg-green-50 border-green-200' 
                : systemHealth.overall_status === 'degraded'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {systemHealth.overall_status === 'operational' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : systemHealth.overall_status === 'degraded' ? (
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <h3 className={`font-semibold ${
                      systemHealth.overall_status === 'operational' 
                        ? 'text-green-900' 
                        : systemHealth.overall_status === 'degraded'
                        ? 'text-yellow-900'
                        : 'text-red-900'
                    }`}>
                      System Status: {systemHealth.overall_status.charAt(0).toUpperCase() + systemHealth.overall_status.slice(1)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Last checked: {formatRelativeTime(systemHealth.last_checked)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Server className={`w-4 h-4 ${systemHealth.api_status === 'operational' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-xs font-medium text-gray-700">API</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Database className={`w-4 h-4 ${systemHealth.database_status === 'operational' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-xs font-medium text-gray-700">DB</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className={`w-4 h-4 ${systemHealth.payment_gateway_status === 'operational' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-xs font-medium text-gray-700">Payments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className={`w-4 h-4 ${systemHealth.email_service_status === 'operational' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-xs font-medium text-gray-700">Email</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Smartphone className={`w-4 h-4 ${systemHealth.sms_service_status === 'operational' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-xs font-medium text-gray-700">SMS</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Cloud className={`w-4 h-4 ${systemHealth.cdn_status === 'operational' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="text-xs font-medium text-gray-700">CDN</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* EXECUTIVE METRICS CARDS */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {metricsLoading ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      formatNumber(platformMetrics?.total_users || 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatNumber(platformMetrics?.total_customers || 0)} customers • {formatNumber(platformMetrics?.total_suppliers || 0)} suppliers
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {metricsLoading ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      formatNumber(platformMetrics?.total_orders || 0)
                    )}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatNumber(platformMetrics?.active_orders || 0)} active
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {metricsLoading ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      formatCurrency(platformMetrics?.total_revenue || 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    GMV: {formatCurrency(platformMetrics?.gmv || 0)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Pending Disputes */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Disputes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {metricsLoading ? (
                      <span className="animate-pulse">-</span>
                    ) : (
                      formatNumber(platformMetrics?.pending_disputes || 0)
                    )}
                  </p>
                  <Link 
                    to="/admin/disputes"
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center space-x-1"
                  >
                    <span>View all</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* QUICK STATS / ACTION ITEMS */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Link
              to="/admin/supplier-applications?status_filter=pending_review"
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Pending Applications</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {quickStats.pending_supplier_applications}
                  </p>
                </div>
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </Link>

            <Link
              to="/admin/disputes?status_filter=open"
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Open Disputes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {quickStats.open_disputes}
                  </p>
                </div>
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </Link>

            <Link
              to="/admin/reviews?flagged_only=true"
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Flagged Content</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {quickStats.flagged_content}
                  </p>
                </div>
                <Flag className="w-6 h-6 text-red-600" />
              </div>
            </Link>

            <Link
              to="/admin/financials?section=failed_payments"
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Failed Payments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {quickStats.failed_payments}
                  </p>
                </div>
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </Link>

            <Link
              to="/admin/system-logs?log_level=error"
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">System Errors</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {quickStats.system_errors}
                  </p>
                </div>
                <Activity className="w-6 h-6 text-gray-600" />
              </div>
            </Link>
          </div>

          {/* ============================================ */}
          {/* MAIN CONTENT GRID */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* ============================================ */}
            {/* LEFT COLUMN: Growth Metrics & Recent Activity */}
            {/* ============================================ */}
            
            <div className="lg:col-span-2 space-y-6">
              
              {/* Growth Metrics Chart */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Growth Trends</h2>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                
                {growthLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* User Growth */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">User Growth</span>
                        <span className="text-sm text-gray-500">
                          {growthMetrics?.user_growth?.length || 0} data points
                        </span>
                      </div>
                      <div className="h-32 flex items-end space-x-1">
                        {growthMetrics?.user_growth?.slice(-30).map((point, index) => (
                          <div 
                            key={index}
                            className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                            style={{ height: `${(point.users || 0) / Math.max(...growthMetrics.user_growth.map(p => p.users || 0), 1) * 100}%` }}
                            title={`${point.date}: ${point.users} users`}
                          ></div>
                        )) || (
                          <div className="w-full text-center text-gray-400 py-12">
                            No growth data available
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Revenue Growth */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Revenue Growth</span>
                        <span className="text-sm text-gray-500">
                          {growthMetrics?.revenue_growth?.length || 0} data points
                        </span>
                      </div>
                      <div className="h-32 flex items-end space-x-1">
                        {growthMetrics?.revenue_growth?.slice(-30).map((point, index) => (
                          <div 
                            key={index}
                            className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                            style={{ height: `${(point.revenue || 0) / Math.max(...growthMetrics.revenue_growth.map(p => p.revenue || 0), 1) * 100}%` }}
                            title={`${point.date}: ${formatCurrency(point.revenue || 0)}`}
                          ></div>
                        )) || (
                          <div className="w-full text-center text-gray-400 py-12">
                            No revenue data available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <button
                    onClick={() => refetchActivity()}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Refresh
                  </button>
                </div>
                
                {activityLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {recentActivity.map((activity) => (
                      <div 
                        key={activity.activity_id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                        {activity.entity_type && activity.entity_id && (
                          <Link
                            to={`/admin/${activity.entity_type}s/${activity.entity_id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ============================================ */}
            {/* RIGHT COLUMN: Active Alerts & System Details */}
            {/* ============================================ */}
            
            <div className="space-y-6">
              
              {/* Active Alerts */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                    {activeAlerts.length}
                  </span>
                </div>
                
                {alertsLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : activeAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-gray-600 font-medium">All systems normal</p>
                    <p className="text-sm text-gray-400 mt-1">No active alerts</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {activeAlerts.map((alert) => (
                      <div 
                        key={alert.alert_id}
                        className={`p-4 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(alert.created_date)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {alert.title}
                            </h3>
                            <p className="text-sm text-gray-700 mt-1">
                              {alert.description}
                            </p>
                            {alert.affected_users && (
                              <p className="text-xs text-gray-500 mt-2">
                                Affects {formatNumber(alert.affected_users)} users
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDismissAlert(alert.alert_id)}
                            disabled={dismissAlertMutation.isPending}
                            className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Performance */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">System Performance</h2>
                
                <div className="space-y-4">
                  {/* Platform Uptime */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Platform Uptime</span>
                      <span className="text-sm font-bold text-green-600">
                        {((platformMetrics?.platform_uptime || 99.9)).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${platformMetrics?.platform_uptime || 99.9}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Avg Response Time */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Avg Response Time</span>
                      <span className="text-sm font-bold text-blue-600">
                        {platformMetrics?.avg_response_time || 0}ms
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          (platformMetrics?.avg_response_time || 0) < 200 
                            ? 'bg-green-600' 
                            : (platformMetrics?.avg_response_time || 0) < 500 
                            ? 'bg-yellow-600' 
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min((platformMetrics?.avg_response_time || 0) / 1000 * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <Link
                        to="/admin/customers"
                        className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        → Manage Customers
                      </Link>
                      <Link
                        to="/admin/suppliers"
                        className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        → Manage Suppliers
                      </Link>
                      <Link
                        to="/admin/orders"
                        className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        → View All Orders
                      </Link>
                      <Link
                        to="/admin/analytics"
                        className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        → Detailed Analytics
                      </Link>
                      <Link
                        to="/admin/settings"
                        className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        → Platform Settings
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* ERROR STATES */}
          {/* ============================================ */}
          
          {metricsError && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Failed to load platform metrics</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {metricsError instanceof Error ? metricsError.message : 'An error occurred'}
                  </p>
                  <button
                    onClick={() => refetchMetrics()}
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-800 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
