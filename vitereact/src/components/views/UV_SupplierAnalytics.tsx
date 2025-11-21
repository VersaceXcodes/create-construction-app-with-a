import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  Star,
  Calendar,
  Download,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  BarChart3,
  LineChart
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DashboardMetrics {
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  fulfillment_rate: number;
  customer_count: number;
  product_count: number;
  rating_average: number;
}

interface SalesDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface SalesData {
  daily_sales: SalesDataPoint[];
  weekly_sales: SalesDataPoint[];
  monthly_sales: SalesDataPoint[];
  revenue_trends: SalesDataPoint[];
  order_volume_trends: SalesDataPoint[];
}

interface ProductPerformance {
  product_id: string;
  product_name: string;
  sales_count: number;
  views_count: number;
  revenue: number;
  profit_margin: number;
}

interface ProductInsights {
  top_performers: ProductPerformance[];
  underperformers: ProductPerformance[];
  inventory_turnover: { product_id: string; turnover_rate: number }[];
  margin_analysis: { product_id: string; margin_percent: number }[];
}

interface CustomerInsights {
  acquisition_metrics: {
    new_customers: number;
    acquisition_cost: number;
    conversion_rate: number;
  };
  retention_metrics: {
    repeat_customers: number;
    retention_rate: number;
    churn_rate: number;
  };
  customer_segments: Array<{
    segment_name: string;
    customer_count: number;
    avg_order_value: number;
    total_revenue: number;
  }>;
  geographic_data: Array<{
    state: string;
    customer_count: number;
    total_revenue: number;
  }>;
}

interface FinancialOverview {
  gross_revenue: number;
  net_revenue: number;
  commission_costs: number;
  profit_margins: Array<{
    period: string;
    gross_margin: number;
    net_margin: number;
  }>;
  payout_history: Array<{
    payout_id: string;
    amount: number;
    scheduled_date: string;
    status: string;
  }>;
}

interface DateSelection {
  range_type: 'today' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
  custom_start: string | null;
  custom_end: string | null;
  comparison_period: string | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchDashboardMetrics = async (dateRange: string): Promise<DashboardMetrics> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/analytics/dashboard`,
    {
      params: { date_range: dateRange },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const fetchSalesAnalytics = async (dateRange: string): Promise<SalesData> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/analytics/sales`,
    {
      params: { date_range: dateRange },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const fetchProductPerformance = async (dateRange: string): Promise<ProductInsights> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/analytics/products`,
    {
      params: { date_range: dateRange },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const fetchCustomerInsights = async (dateRange: string): Promise<CustomerInsights> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/analytics/customers`,
    {
      params: { date_range: dateRange },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const fetchFinancialOverview = async (dateRange: string): Promise<FinancialOverview> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/analytics/financials`,
    {
      params: { date_range: dateRange },
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const exportAnalyticsData = async (format: string, dateRange: string, sections: string[]): Promise<Blob> => {
  const token = localStorage.getItem('auth_token');
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/analytics/export`,
    { format, date_range: dateRange, sections },
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierAnalytics: React.FC = () => {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Global state - CRITICAL: Individual selectors
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get('metric_category') || 'dashboard'
  );
  
  const [dateSelection, setDateSelection] = useState<DateSelection>({
    range_type: (searchParams.get('date_range') as any) || 'last_30_days',
    custom_start: null,
    custom_end: null,
    comparison_period: null
  });
  
  const [comparisonEnabled] = useState<boolean>(
    searchParams.get('comparison_enabled') === 'true'
  );
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  
  // React Query - Dashboard Metrics
  const {
    data: dashboardMetrics,
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['supplier-analytics-dashboard', dateSelection.range_type],
    queryFn: () => fetchDashboardMetrics(dateSelection.range_type),
    enabled: activeTab === 'dashboard',
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (data) => ({
      total_sales: Number(data.total_sales || 0),
      total_orders: Number(data.total_orders || 0),
      avg_order_value: Number(data.avg_order_value || 0),
      fulfillment_rate: Number(data.fulfillment_rate || 0),
      customer_count: Number(data.customer_count || 0),
      product_count: Number(data.product_count || 0),
      rating_average: Number(data.rating_average || 0)
    })
  });
  
  // React Query - Sales Analytics
  const {
    data: salesData,
    isLoading: isSalesLoading,
    error: salesError,
    refetch: refetchSales
  } = useQuery({
    queryKey: ['supplier-analytics-sales', dateSelection.range_type],
    queryFn: () => fetchSalesAnalytics(dateSelection.range_type),
    enabled: activeTab === 'sales',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
  
  // React Query - Product Performance
  const {
    data: productInsights,
    isLoading: isProductsLoading,
    error: productsError,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['supplier-analytics-products', dateSelection.range_type],
    queryFn: () => fetchProductPerformance(dateSelection.range_type),
    enabled: activeTab === 'products',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
  
  // React Query - Customer Insights
  const {
    data: customerInsights,
    isLoading: isCustomersLoading,
    error: customersError,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ['supplier-analytics-customers', dateSelection.range_type],
    queryFn: () => fetchCustomerInsights(dateSelection.range_type),
    enabled: activeTab === 'customers',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
  
  // React Query - Financial Overview
  const {
    data: financialOverview,
    isLoading: isFinancialLoading,
    error: financialError,
    refetch: refetchFinancial
  } = useQuery({
    queryKey: ['supplier-analytics-financial', dateSelection.range_type],
    queryFn: () => fetchFinancialOverview(dateSelection.range_type),
    enabled: activeTab === 'financial',
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
  
  // Sync URL params with state
  useEffect(() => {
    const params: Record<string, string> = {};
    
    if (activeTab !== 'dashboard') {
      params.metric_category = activeTab;
    }
    
    if (dateSelection.range_type !== 'last_30_days') {
      params.date_range = dateSelection.range_type;
    }
    
    if (comparisonEnabled) {
      params.comparison_enabled = 'true';
    }
    
    setSearchParams(params, { replace: true });
  }, [activeTab, dateSelection.range_type, comparisonEnabled, setSearchParams]);
  
  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Handle date range change
  const handleDateRangeChange = (rangeType: DateSelection['range_type']) => {
    setDateSelection(prev => ({
      ...prev,
      range_type: rangeType,
      custom_start: null,
      custom_end: null
    }));
    setShowDatePicker(false);
  };
  
  // Handle export
  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      const sections = [activeTab];
      const blob = await exportAnalyticsData(exportFormat, dateSelection.range_type, sections);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${activeTab}-${dateSelection.range_type}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format percentage
  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };
  
  // Get date range label
  const getDateRangeLabel = (): string => {
    const labels: Record<string, string> = {
      today: 'Today',
      last_7_days: 'Last 7 Days',
      last_30_days: 'Last 30 Days',
      last_90_days: 'Last 90 Days',
      custom: 'Custom Range'
    };
    return labels[dateSelection.range_type] || 'Last 30 Days';
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Business Analytics</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Comprehensive performance insights for <span className="font-medium">{supplierProfile?.business_name}</span>
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Date Range Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {getDateRangeLabel()}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </button>
                  
                  {showDatePicker && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div className="py-1">
                        {[
                          { value: 'today', label: 'Today' },
                          { value: 'last_7_days', label: 'Last 7 Days' },
                          { value: 'last_30_days', label: 'Last 30 Days' },
                          { value: 'last_90_days', label: 'Last 90 Days' }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => handleDateRangeChange(option.value as DateSelection['range_type'])}
                            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                              dateSelection.range_type === option.value
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 overflow-x-auto" aria-label="Analytics tabs">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'sales', label: 'Sales', icon: TrendingUp },
                { id: 'products', label: 'Products', icon: Package },
                { id: 'customers', label: 'Customers', icon: Users },
                { id: 'financial', label: 'Financial', icon: DollarSign }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {isDashboardLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : dashboardError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Failed to load dashboard metrics</h3>
                      <p className="mt-1 text-sm text-red-700">
                        {axios.isAxiosError(dashboardError) 
                          ? dashboardError.response?.data?.message || dashboardError.message 
                          : 'An unknown error occurred'}
                      </p>
                      <button
                        onClick={() => refetchDashboard()}
                        className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Sales */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Total Sales</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardMetrics?.total_sales || 0)}
                      </p>
                    </div>
                    
                    {/* Total Orders */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ShoppingCart className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Total Orders</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardMetrics?.total_orders || 0}
                      </p>
                    </div>
                    
                    {/* Average Order Value */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(dashboardMetrics?.avg_order_value || 0)}
                      </p>
                    </div>
                    
                    {/* Fulfillment Rate */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Package className="h-6 w-6 text-amber-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Fulfillment Rate</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPercent(dashboardMetrics?.fulfillment_rate || 0)}
                      </p>
                    </div>
                    
                    {/* Customer Count */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <Users className="h-6 w-6 text-indigo-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Total Customers</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardMetrics?.customer_count || 0}
                      </p>
                    </div>
                    
                    {/* Product Count */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-pink-100 rounded-lg">
                          <Package className="h-6 w-6 text-pink-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Active Products</h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardMetrics?.product_count || 0}
                      </p>
                    </div>
                    
                    {/* Rating Average */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Star className="h-6 w-6 text-yellow-600" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Average Rating</h3>
                      <p className="text-2xl font-bold text-gray-900 flex items-center">
                        {(dashboardMetrics?.rating_average || 0).toFixed(1)}
                        <Star className="h-5 w-5 text-yellow-500 ml-1 fill-current" />
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Link
                        to="/supplier/products"
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Package className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Manage Products</p>
                          <p className="text-sm text-gray-600">Update inventory & pricing</p>
                        </div>
                      </Link>
                      
                      <Link
                        to="/supplier/orders"
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <ShoppingCart className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">View Orders</p>
                          <p className="text-sm text-gray-600">Process pending orders</p>
                        </div>
                      </Link>
                      
                      <Link
                        to="/supplier/financials"
                        className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">Financial Details</p>
                          <p className="text-sm text-gray-600">View payouts & earnings</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {isSalesLoading ? (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                      <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : salesError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Failed to load sales analytics</h3>
                      <p className="mt-1 text-sm text-red-700">
                        {axios.isAxiosError(salesError) 
                          ? salesError.response?.data?.message || salesError.message 
                          : 'An unknown error occurred'}
                      </p>
                      <button
                        onClick={() => refetchSales()}
                        className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Revenue Trends */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <LineChart className="h-5 w-5 mr-2 text-blue-600" />
                      Revenue Trends
                    </h2>
                    <div className="space-y-2">
                      {salesData?.revenue_trends && salesData.revenue_trends.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Orders</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {salesData.revenue_trends.slice(0, 10).map((point, idx) => (
                                <tr key={idx}>
                                  <td className="px-4 py-3 text-sm text-gray-900">{point.date}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                    {formatCurrency(point.revenue)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{point.orders}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">No sales data available for this period</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Daily Sales Overview */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales Summary</h2>
                    <div className="space-y-3">
                      {salesData?.daily_sales && salesData.daily_sales.length > 0 ? (
                        salesData.daily_sales.slice(0, 7).map((day, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">{day.date}</span>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-600">{day.orders} orders</span>
                              <span className="text-sm font-semibold text-gray-900">{formatCurrency(day.revenue)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No daily sales data available</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {isProductsLoading ? (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : productsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Failed to load product analytics</h3>
                      <p className="mt-1 text-sm text-red-700">
                        {axios.isAxiosError(productsError) 
                          ? productsError.response?.data?.message || productsError.message 
                          : 'An unknown error occurred'}
                      </p>
                      <button
                        onClick={() => refetchProducts()}
                        className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Performers */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                      Top Performing Products
                    </h2>
                    <div className="overflow-x-auto">
                      {productInsights?.top_performers && productInsights.top_performers.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {productInsights.top_performers.slice(0, 10).map((product) => (
                              <tr key={product.product_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <Link 
                                    to={`/supplier/products/${product.product_id}/edit`}
                                    className="font-medium text-blue-600 hover:text-blue-800"
                                  >
                                    {product.product_name}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{product.sales_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{product.views_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                  {formatCurrency(product.revenue)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    product.profit_margin >= 30 
                                      ? 'bg-green-100 text-green-800'
                                      : product.profit_margin >= 20
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercent(product.profit_margin)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-gray-500 text-center py-8">No product performance data available</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Underperformers */}
                  {productInsights?.underperformers && productInsights.underperformers.length > 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
                        Products Needing Attention
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {productInsights.underperformers.slice(0, 5).map((product) => (
                              <tr key={product.product_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <Link 
                                    to={`/supplier/products/${product.product_id}/edit`}
                                    className="font-medium text-blue-600 hover:text-blue-800"
                                  >
                                    {product.product_name}
                                  </Link>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{product.sales_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{product.views_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 text-right">{formatCurrency(product.revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              {isCustomersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : customersError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Failed to load customer analytics</h3>
                      <p className="mt-1 text-sm text-red-700">
                        {axios.isAxiosError(customersError) 
                          ? customersError.response?.data?.message || customersError.message 
                          : 'An unknown error occurred'}
                      </p>
                      <button
                        onClick={() => refetchCustomers()}
                        className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Acquisition & Retention Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Acquisition */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Acquisition</h2>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">New Customers</span>
                          <span className="text-xl font-bold text-gray-900">
                            {customerInsights?.acquisition_metrics?.new_customers || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Conversion Rate</span>
                          <span className="text-xl font-bold text-gray-900">
                            {formatPercent(customerInsights?.acquisition_metrics?.conversion_rate || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Avg Acquisition Cost</span>
                          <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(customerInsights?.acquisition_metrics?.acquisition_cost || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Retention */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Retention</h2>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Repeat Customers</span>
                          <span className="text-xl font-bold text-gray-900">
                            {customerInsights?.retention_metrics?.repeat_customers || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Retention Rate</span>
                          <span className="text-xl font-bold text-green-600">
                            {formatPercent(customerInsights?.retention_metrics?.retention_rate || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Churn Rate</span>
                          <span className="text-xl font-bold text-red-600">
                            {formatPercent(customerInsights?.retention_metrics?.churn_rate || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Customer Segments */}
                  {customerInsights?.customer_segments && customerInsights.customer_segments.length > 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Customers</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {customerInsights.customer_segments.map((segment, idx) => (
                              <tr key={idx}>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{segment.segment_name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">{segment.customer_count}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                  {formatCurrency(segment.avg_order_value)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                  {formatCurrency(segment.total_revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              {isFinancialLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : financialError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Failed to load financial analytics</h3>
                      <p className="mt-1 text-sm text-red-700">
                        {axios.isAxiosError(financialError) 
                          ? financialError.response?.data?.message || financialError.message 
                          : 'An unknown error occurred'}
                      </p>
                      <button
                        onClick={() => refetchFinancial()}
                        className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Revenue Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Gross Revenue</h3>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(financialOverview?.gross_revenue || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Platform Fees</h3>
                      <p className="text-3xl font-bold text-red-600">
                        -{formatCurrency(financialOverview?.commission_costs || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">Net Revenue</h3>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(financialOverview?.net_revenue || 0)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Payout History */}
                  {financialOverview?.payout_history && financialOverview.payout_history.length > 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payouts</h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {financialOverview.payout_history.slice(0, 10).map((payout) => (
                              <tr key={payout.payout_id}>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {new Date(payout.scheduled_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                  {formatCurrency(payout.amount)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    payout.status === 'completed' 
                                      ? 'bg-green-100 text-green-800'
                                      : payout.status === 'processing'
                                      ? 'bg-blue-100 text-blue-800'
                                      : payout.status === 'scheduled'
                                      ? 'bg-gray-100 text-gray-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {payout.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Link to Full Financials */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      For detailed financial reports and payout management, visit the{' '}
                      <Link to="/supplier/financials" className="font-medium underline hover:text-blue-900">
                        Financials dashboard
                      </Link>
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Empty State for No Data */}
          {!isDashboardLoading && !isSalesLoading && !isProductsLoading && !isCustomersLoading && !isFinancialLoading && (
            activeTab === 'sales' && (!salesData || (salesData.daily_sales?.length === 0 && salesData.revenue_trends?.length === 0))
          ) && (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Available</h3>
              <p className="text-gray-600 mb-6">
                Start making sales to see your analytics data here.
              </p>
              <Link
                to="/supplier/products"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Manage Products
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SupplierAnalytics;