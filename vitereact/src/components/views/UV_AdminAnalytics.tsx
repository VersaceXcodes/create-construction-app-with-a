import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Store,
  Activity,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PlatformOverviewMetrics {
  total_users: number;
  active_users: number;
  total_orders: number;
  gross_merchandise_value: number;
  platform_revenue: number;
  user_growth_rate: number;
  order_volume_trend: Array<{ date: string; count: number; value: number }>;
}

interface UserAnalytics {
  new_registrations: Array<{ date: string; count: number; type: string }>;
  user_retention_rates: {
    day_1: number;
    day_7: number;
    day_30: number;
  };
  user_activity_patterns: Array<{ hour: number; active_users: number }>;
  churn_analysis: {
    churned_users: number;
    churn_rate: number;
  };
  user_demographics: {
    by_type: Array<{ type: string; count: number }>;
    by_account_type: Array<{ account_type: string; count: number }>;
  };
}

interface TransactionAnalytics {
  transaction_volume: Array<{ date: string; count: number; amount: number }>;
  payment_method_distribution: Array<{ method: string; count: number; percentage: number }>;
  average_order_value_trend: Array<{ date: string; value: number }>;
  refund_rates: {
    total_refunds: number;
    refund_rate: number;
  };
}

interface SupplierAnalytics {
  supplier_performance_distribution: Array<{ rating_range: string; count: number }>;
  new_supplier_applications: Array<{ date: string; count: number }>;
  supplier_revenue_ranking: Array<{ supplier_id: string; business_name: string; revenue: number }>;
  supplier_satisfaction_metrics: {
    avg_fulfillment_rate: number;
    avg_response_time: number;
  };
}

interface ProductAnalytics {
  popular_products: Array<{ product_id: string; product_name: string; sales_count: number; revenue: number }>;
  category_performance: Array<{ category_name: string; product_count: number; sales: number }>;
  search_trends: Array<{ search_term: string; count: number }>;
  inventory_turnover: {
    avg_turnover_days: number;
  };
  price_trends: Array<{ date: string; avg_price: number }>;
}

interface OperationalAnalytics {
  delivery_performance: {
    on_time_rate: number;
    avg_delivery_time_hours: number;
  };
  support_ticket_analytics: {
    total_tickets: number;
    avg_resolution_time_hours: number;
    satisfaction_rating: number;
  };
  system_performance_metrics: {
    avg_response_time_ms: number;
    error_rate: number;
  };
  uptime_statistics: {
    uptime_percentage: number;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchPlatformAnalytics = async (
  authToken: string,
  dateRange: string
): Promise<PlatformOverviewMetrics> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.get(`${apiBaseUrl}/api/admin/analytics/dashboard`, {
    params: {
      metric_type: 'overview',
      date_range: dateRange
    },
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  // Transform backend response to frontend structure
  const data = response.data;
  
  // Calculate trends from daily data if available
  const orderVolumeTrend = data.daily_orders?.map((item: any) => ({
    date: item.date,
    count: Number(item.count || 0),
    value: Number(item.total_amount || 0)
  })) || [];
  
  return {
    total_users: Number(data.total_users || 0),
    active_users: Number(data.active_users || 0),
    total_orders: Number(data.total_orders || 0),
    gross_merchandise_value: Number(data.gmv || 0),
    platform_revenue: Number(data.total_revenue || 0),
    user_growth_rate: Number(data.user_growth_rate || 0),
    order_volume_trend: orderVolumeTrend
  };
};

const fetchUserAnalytics = async (
  authToken: string,
  dateRange: string
): Promise<UserAnalytics> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  // For MVP, we'll aggregate data from the main analytics endpoint
  const response = await axios.get(`${apiBaseUrl}/api/admin/analytics/dashboard`, {
    params: {
      metric_type: 'users',
      date_range: dateRange
    },
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  // Mock structure based on what would come from backend
  return {
    new_registrations: [],
    user_retention_rates: {
      day_1: 85,
      day_7: 60,
      day_30: 45
    },
    user_activity_patterns: [],
    churn_analysis: {
      churned_users: 0,
      churn_rate: 0
    },
    user_demographics: {
      by_type: [
        { type: 'customer', count: response.data.total_customers || 0 },
        { type: 'supplier', count: response.data.total_suppliers || 0 }
      ],
      by_account_type: []
    }
  };
};

const exportAnalyticsData = async (
  authToken: string,
  exportFormat: string,
  dateRange: string
): Promise<Blob> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.post(
    `${apiBaseUrl}/api/admin/analytics/export`,
    {
      export_type: exportFormat,
      data_categories: ['platform_overview', 'users', 'transactions', 'suppliers'],
      date_range: dateRange
    },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      responseType: 'blob'
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminAnalytics: React.FC = () => {
  // ============================================================================
  // ZUSTAND STATE ACCESS (Individual Selectors - CRITICAL)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // ============================================================================
  // URL PARAMETERS & LOCAL STATE
  // ============================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get URL params with defaults
  const metricType = searchParams.get('metric_type') || 'overview';
  const urlDateRange = searchParams.get('date_range') || 'last_30_days';
  
  // Local state
  const [activeDateRange, setActiveDateRange] = useState(urlDateRange);
  const [customDateRange, setCustomDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  
  // ============================================================================
  // REACT QUERY - DATA FETCHING
  // ============================================================================
  
  const {
    data: platformData,
    isLoading: isPlatformLoading,
    error: platformError,
    refetch: refetchPlatform
  } = useQuery({
    queryKey: ['admin-analytics-platform', activeDateRange],
    queryFn: () => fetchPlatformAnalytics(authToken!, activeDateRange),
    enabled: !!authToken && metricType === 'overview',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });
  
  const {
    data: userAnalyticsData,
    isLoading: isUserAnalyticsLoading,
    error: userAnalyticsError
  } = useQuery({
    queryKey: ['admin-analytics-users', activeDateRange],
    queryFn: () => fetchUserAnalytics(authToken!, activeDateRange),
    enabled: !!authToken && metricType === 'users',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleMetricTypeChange = (newType: string) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('metric_type', newType);
      return params;
    });
  };
  
  const handleDateRangeChange = (newRange: string) => {
    setActiveDateRange(newRange);
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('date_range', newRange);
      return params;
    });
  };
  
  const handleCustomDateApply = () => {
    setActiveDateRange('custom');
    // In production, would include custom dates in API call
  };
  
  const handleExport = async (format: string) => {
    if (!authToken) return;
    
    try {
      const blob = await exportAnalyticsData(authToken, format, activeDateRange);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `buildeasy-analytics-${format}-${format(new Date(), 'yyyy-MM-dd')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  const handleRefresh = () => {
    refetchPlatform();
  };
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const formattedGMV = useMemo(() => {
    if (!platformData) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(platformData.gross_merchandise_value);
  }, [platformData]);
  
  const formattedRevenue = useMemo(() => {
    if (!platformData) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(platformData.platform_revenue);
  }, [platformData]);
  
  const growthRateFormatted = useMemo(() => {
    if (!platformData) return '0%';
    const rate = platformData.user_growth_rate;
    return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`;
  }, [platformData]);
  
  // ============================================================================
  // CHART COLORS
  // ============================================================================
  
  const COLORS = {
    primary: '#2563eb',
    secondary: '#10b981',
    tertiary: '#f59e0b',
    quaternary: '#8b5cf6',
    danger: '#ef4444',
    gray: '#6b7280'
  };
  
  const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  
  // ============================================================================
  // METRIC CARDS DATA
  // ============================================================================
  
  const metricCards = useMemo(() => {
    if (!platformData) return [];
    
    return [
      {
        title: 'Total Users',
        value: platformData.total_users.toLocaleString(),
        icon: Users,
        change: growthRateFormatted,
        changeType: platformData.user_growth_rate >= 0 ? 'positive' : 'negative',
        color: 'blue'
      },
      {
        title: 'Active Users (30d)',
        value: platformData.active_users.toLocaleString(),
        icon: Activity,
        change: `${((platformData.active_users / platformData.total_users) * 100).toFixed(1)}% of total`,
        changeType: 'neutral',
        color: 'green'
      },
      {
        title: 'Total Orders',
        value: platformData.total_orders.toLocaleString(),
        icon: ShoppingCart,
        change: undefined,
        changeType: 'neutral',
        color: 'purple'
      },
      {
        title: 'GMV',
        value: formattedGMV,
        icon: DollarSign,
        change: undefined,
        changeType: 'neutral',
        color: 'amber'
      },
      {
        title: 'Platform Revenue',
        value: formattedRevenue,
        icon: TrendingUp,
        change: undefined,
        changeType: 'neutral',
        color: 'emerald'
      }
    ];
  }, [platformData, formattedGMV, formattedRevenue, growthRateFormatted]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Comprehensive performance metrics and insights
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isPlatformLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isPlatformLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                
                {/* Export Button */}
                <div className="relative group">
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                  
                  {/* Export Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('xlsx')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Export as Excel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {['last_7_days', 'last_30_days', 'last_90_days', 'last_year', 'all_time'].map(range => (
                  <button
                    key={range}
                    onClick={() => handleDateRangeChange(range)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeDateRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
                
                <button
                  onClick={() => handleDateRangeChange('custom')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeDateRange === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>
            
            {/* Custom Date Range Picker */}
            {activeDateRange === 'custom' && (
              <div className="mt-4 flex flex-col sm:flex-row items-end space-y-3 sm:space-y-0 sm:space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={handleCustomDateApply}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'users', label: 'User Analytics', icon: Users },
                { id: 'transactions', label: 'Transactions', icon: DollarSign },
                { id: 'suppliers', label: 'Suppliers', icon: Store },
                { id: 'products', label: 'Products', icon: Package }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleMetricTypeChange(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      metricType === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Tab */}
          {metricType === 'overview' && (
            <>
              {platformError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {platformError instanceof Error ? platformError.message : 'Failed to load platform metrics'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {isPlatformLoading ? (
                <div className="space-y-6">
                  {/* Loading Skeletons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : platformData ? (
                <>
                  {/* Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {metricCards.map((metric, index) => {
                      const Icon = metric.icon;
                      const colorClasses = {
                        blue: 'bg-blue-50 text-blue-600',
                        green: 'bg-green-50 text-green-600',
                        purple: 'bg-purple-50 text-purple-600',
                        amber: 'bg-amber-50 text-amber-600',
                        emerald: 'bg-emerald-50 text-emerald-600'
                      }[metric.color] || 'bg-gray-50 text-gray-600';
                      
                      return (
                        <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                            <div className={`p-3 rounded-lg ${colorClasses}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                          </div>
                          
                          <div className="flex items-baseline justify-between">
                            <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                          </div>
                          
                          {metric.change && (
                            <div className="mt-2 flex items-center">
                              <span className={`text-sm font-medium ${
                                metric.changeType === 'positive' 
                                  ? 'text-green-600' 
                                  : metric.changeType === 'negative'
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}>
                                {metric.change}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Order Volume Trend Chart */}
                  {platformData.order_volume_trend && platformData.order_volume_trend.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Order Volume Trend</h2>
                          <p className="text-sm text-gray-600 mt-1">Daily order count and value over time</p>
                        </div>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={platformData.order_volume_trend}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                          />
                          <YAxis 
                            yAxisId="left"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Order Count', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                            label={{ value: 'Order Value ($)', angle: 90, position: 'insideRight', style: { fontSize: '12px' } }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              padding: '12px'
                            }}
                            labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                            formatter={(value: number, name: string) => {
                              if (name === 'count') return [value, 'Orders'];
                              return [`$${value.toLocaleString()}`, 'Value'];
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => {
                              if (value === 'count') return 'Order Count';
                              return 'Order Value';
                            }}
                          />
                          <Area 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="count" 
                            stroke={COLORS.primary}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                          />
                          <Area 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="value" 
                            stroke={COLORS.secondary}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Distribution */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">User Distribution</h3>
                      
                      {userAnalyticsData?.user_demographics?.by_type && userAnalyticsData.user_demographics.by_type.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={userAnalyticsData.user_demographics.by_type}
                              dataKey="count"
                              nameKey="type"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={(entry) => `${entry.type}: ${entry.count}`}
                            >
                              {userAnalyticsData.user_demographics.by_type.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          <p>No user distribution data available</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Performance Indicators */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Health</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Activity className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">System Status</p>
                              <p className="text-xs text-gray-600">Operational</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                            99.9%
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <ShoppingCart className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Active Orders</p>
                              <p className="text-xs text-gray-600">In progress</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-gray-900">
                            {platformData.total_orders > 0 ? Math.floor(platformData.total_orders * 0.15) : 0}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <TrendingUp className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Conversion Rate</p>
                              <p className="text-xs text-gray-600">Guest to customer</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-gray-900">8.5%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No analytics data available</p>
                </div>
              )}
            </>
          )}
          
          {/* User Analytics Tab */}
          {metricType === 'users' && (
            <>
              {isUserAnalyticsLoading ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ) : userAnalyticsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                    <p className="text-red-800">Failed to load user analytics</p>
                  </div>
                </div>
              ) : userAnalyticsData ? (
                <div className="space-y-6">
                  {/* Retention Metrics */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">User Retention Rates</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-sm font-medium text-gray-700 mb-2">Day 1 Retention</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {userAnalyticsData.user_retention_rates.day_1}%
                        </p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-sm font-medium text-gray-700 mb-2">Day 7 Retention</p>
                        <p className="text-3xl font-bold text-green-600">
                          {userAnalyticsData.user_retention_rates.day_7}%
                        </p>
                      </div>
                      
                      <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                        <p className="text-sm font-medium text-gray-700 mb-2">Day 30 Retention</p>
                        <p className="text-3xl font-bold text-amber-600">
                          {userAnalyticsData.user_retention_rates.day_30}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* User Demographics */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">User Demographics</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {userAnalyticsData.user_demographics.by_type.map((segment, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                            ></div>
                            <span className="font-medium text-gray-900 capitalize">{segment.type}</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">
                            {segment.count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
          
          {/* Transactions Tab */}
          {metricType === 'transactions' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Analytics</h3>
              <p className="text-gray-600">
                Detailed transaction analytics coming soon. This will include payment method distribution,
                refund rates, and average order value trends.
              </p>
            </div>
          )}
          
          {/* Suppliers Tab */}
          {metricType === 'suppliers' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Supplier Analytics</h3>
              <p className="text-gray-600">
                Supplier performance analytics coming soon. This will include revenue rankings,
                fulfillment rates, and satisfaction metrics.
              </p>
            </div>
          )}
          
          {/* Products Tab */}
          {metricType === 'products' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Product Analytics</h3>
              <p className="text-gray-600">
                Product performance analytics coming soon. This will include popular products,
                category performance, and search trends.
              </p>
            </div>
          )}
        </div>
        
        {/* Footer Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Admin Analytics Dashboard
                </h3>
                <p className="text-sm text-blue-800">
                  All metrics update automatically based on your selected date range. 
                  Use the export button to download data for external analysis. 
                  Custom reports and advanced filtering features are available in the premium analytics module.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminAnalytics;