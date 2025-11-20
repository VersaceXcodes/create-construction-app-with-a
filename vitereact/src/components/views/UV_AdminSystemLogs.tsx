import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  Download, 
  
  RefreshCw, 
  Search, 
  Server, 
  TrendingUp, 
  Users, 
  XCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SystemHealthMetrics {
  uptime_percentage: number;
  response_time_avg: number;
  error_rate: number;
  active_connections: number;
  database_status: string;
  api_status: string;
  last_updated: string;
}

interface LogEntry {
  log_id: string;
  timestamp: string;
  level: string;
  component: string;
  message: string;
  stack_trace: string | null;
  user_id: string | null;
  request_id: string | null;
}

interface ApplicationLogsData {
  logs: LogEntry[];
  total_count: number;
  current_page: number;
}

interface ApiEndpointMetric {
  endpoint: string;
  method: string;
  avg_response_time: number;
  request_count: number;
  error_count: number;
  success_rate: number;
}

interface ApiPerformanceMetrics {
  endpoints: ApiEndpointMetric[];
  api_health_score: number;
}

interface ActivityLog {
  activity_id: string;
  user_id: string;
  user_type: string;
  action_type: string;
  resource: string;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface UserActivityLogs {
  activities: ActivityLog[];
  total_count: number;
}

interface ErrorTrendItem {
  hour: string;
  error_count: number;
}

interface TopError {
  error_type: string;
  count: number;
  latest_occurrence: string;
}

interface ErrorSummary {
  total_errors_24h: number;
  critical_errors: number;
  error_trend: ErrorTrendItem[];
  top_errors: TopError[];
}

interface ActiveFilters {
  log_level: string | null;
  component: string | null;
  time_range: string;
  date_from: string | null;
  date_to: string | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchSystemHealth = async (token: string): Promise<SystemHealthMetrics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/system/health`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // Transform backend response to frontend format
  return {
    uptime_percentage: response.data.uptime_percentage || 99.9,
    response_time_avg: response.data.average_response_time_ms || 150,
    error_rate: response.data.error_rate_percentage || 0.01,
    active_connections: response.data.active_websocket_connections || 0,
    database_status: response.data.database_status || 'operational',
    api_status: response.data.api_status || 'operational',
    last_updated: response.data.last_checked_timestamp || new Date().toISOString()
  };
};

const fetchApplicationLogs = async (
  token: string,
  filters: ActiveFilters,
  page: number
): Promise<ApplicationLogsData> => {
  const params = new URLSearchParams();
  
  if (filters.log_level) params.append('level', filters.log_level);
  if (filters.component) params.append('component', filters.component);
  if (filters.time_range) params.append('time_range', filters.time_range);
  params.append('limit', '50');
  params.append('offset', String((page - 1) * 50));
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/logs/application?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    logs: response.data.logs?.map((log: any) => ({
      log_id: log.log_id,
      timestamp: log.timestamp,
      level: log.severity_level || log.level,
      component: log.component_name || log.component,
      message: log.log_message || log.message,
      stack_trace: log.stack_trace,
      user_id: log.user_id,
      request_id: log.request_id
    })) || [],
    total_count: response.data.total_count || 0,
    current_page: Math.floor((response.data.offset || 0) / 50) + 1
  };
};

const fetchApiPerformance = async (
  token: string,
  timeRange: string
): Promise<ApiPerformanceMetrics> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/logs/api-performance?time_range=${timeRange}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    endpoints: response.data.endpoint_metrics?.map((metric: any) => ({
      endpoint: metric.endpoint_path || metric.endpoint,
      method: metric.http_method || metric.method,
      avg_response_time: metric.average_response_time_ms || 0,
      request_count: metric.total_requests || 0,
      error_count: metric.error_count || 0,
      success_rate: ((metric.total_requests - metric.error_count) / metric.total_requests) * 100 || 100
    })) || [],
    api_health_score: response.data.overall_api_health_score || 100
  };
};

const fetchUserActivity = async (
  token: string,
  timeRange: string
): Promise<UserActivityLogs> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/logs/user-activity?time_range=${timeRange}&limit=100&offset=0`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    activities: response.data.activity_logs?.map((activity: any) => ({
      activity_id: activity.activity_id,
      user_id: activity.user_id,
      user_type: activity.user_type,
      action_type: activity.action_type,
      resource: activity.affected_resource || activity.resource,
      timestamp: activity.timestamp,
      ip_address: activity.ip_address,
      user_agent: activity.user_agent
    })) || [],
    total_count: response.data.total_count || 0
  };
};

const fetchErrorSummary = async (token: string): Promise<ErrorSummary> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/logs/error-summary?period=24h`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return {
    total_errors_24h: response.data.total_errors_last_24h || 0,
    critical_errors: response.data.critical_error_count || 0,
    error_trend: response.data.hourly_error_counts?.map((item: any) => ({
      hour: item.hour_timestamp,
      error_count: item.error_count
    })) || [],
    top_errors: response.data.top_error_types?.map((error: any) => ({
      error_type: error.error_type,
      count: error.occurrence_count,
      latest_occurrence: error.latest_timestamp
    })) || []
  };
};

const exportLogs = async (
  token: string,
  filters: ActiveFilters
): Promise<Blob> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/logs/export`,
    {
      log_type: filters.component,
      time_range: filters.time_range,
      format: 'csv'
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'blob'
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminSystemLogs: React.FC = () => {
  // Global state - CRITICAL: Individual selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // URL parameters
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'logs' | 'api' | 'activity' | 'errors'>('logs');
  
  // Initialize filters from URL params
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    log_level: searchParams.get('log_level') || null,
    component: searchParams.get('component') || null,
    time_range: searchParams.get('time_range') || 'last_24_hours',
    date_from: null,
    date_to: null
  });
  
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ============================================================================
  // REACT QUERY - DATA FETCHING
  // ============================================================================
  
  // System Health (auto-refresh every 30s)
  const { data: healthMetrics, isLoading: healthLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => fetchSystemHealth(authToken!),
    enabled: !!authToken,
    refetchInterval: 30000, // 30 seconds
    staleTime: 25000
  });
  
  // Application Logs
  const { data: appLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['application-logs', activeFilters, currentPage],
    queryFn: () => fetchApplicationLogs(authToken!, activeFilters, currentPage),
    enabled: !!authToken && activeTab === 'logs',
    staleTime: 60000
  });
  
  // API Performance
  const { data: apiMetrics, isLoading: apiLoading, refetch: refetchApi } = useQuery({
    queryKey: ['api-performance', activeFilters.time_range],
    queryFn: () => fetchApiPerformance(authToken!, activeFilters.time_range),
    enabled: !!authToken && activeTab === 'api',
    staleTime: 60000
  });
  
  // User Activity
  const { data: activityLogs, isLoading: activityLoading } = useQuery({
    queryKey: ['user-activity', activeFilters.time_range],
    queryFn: () => fetchUserActivity(authToken!, activeFilters.time_range),
    enabled: !!authToken && activeTab === 'activity',
    staleTime: 60000
  });
  
  // Error Summary
  const { data: errorSummary, isLoading: errorLoading, refetch: refetchErrors } = useQuery({
    queryKey: ['error-summary'],
    queryFn: () => fetchErrorSummary(authToken!),
    enabled: !!authToken && activeTab === 'errors',
    refetchInterval: 60000, // 1 minute
    staleTime: 55000
  });
  
  // Export Mutation
  const exportMutation = useMutation({
    mutationFn: () => exportLogs(authToken!, activeFilters),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-export-${new Date().toISOString()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  });
  
  // ============================================================================
  // FILTER HANDLERS
  // ============================================================================
  
  const updateFilters = (updates: Partial<ActiveFilters>) => {
    const newFilters = { ...activeFilters, ...updates };
    setActiveFilters(newFilters);
    
    // Sync with URL
    const params = new URLSearchParams();
    if (newFilters.log_level) params.set('log_level', newFilters.log_level);
    if (newFilters.component) params.set('component', newFilters.component);
    if (newFilters.time_range) params.set('time_range', newFilters.time_range);
    params.set('page', '1');
    
    setSearchParams(params);
    setCurrentPage(1);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };
  
  const handleExport = () => {
    exportMutation.mutate();
  };
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  const getStatusColor = (status: string) => {
    return status === 'operational' ? 'text-green-600' : 'text-red-600';
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">System Monitoring & Logs</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Monitor system health, analyze logs, and track performance metrics
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    refetchLogs();
                    refetchApi();
                    refetchErrors();
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
                <button
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportMutation.isPending ? 'Exporting...' : 'Export Logs'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* System Health Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {healthLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Uptime */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-600">System Uptime</p>
                  <Server className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {healthMetrics?.uptime_percentage.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
              </div>
              
              {/* Response Time */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {healthMetrics?.response_time_avg}ms
                </p>
                <p className="text-xs text-gray-500 mt-2">API average</p>
              </div>
              
              {/* Error Rate */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-600">Error Rate</p>
                  <AlertCircle className={`h-5 w-5 ${(healthMetrics?.error_rate || 0) > 1 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {healthMetrics?.error_rate.toFixed(3)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">Last 24 hours</p>
              </div>
              
              {/* Active Connections */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-600">Active Connections</p>
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {healthMetrics?.active_connections.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-2">WebSocket clients</p>
              </div>
            </div>
          )}
          
          {/* System Status Indicators */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className={`h-6 w-6 mr-3 ${getStatusColor(healthMetrics?.database_status || 'operational')}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Database Status</p>
                    <p className={`text-lg font-semibold capitalize ${getStatusColor(healthMetrics?.database_status || 'operational')}`}>
                      {healthMetrics?.database_status || 'operational'}
                    </p>
                  </div>
                </div>
                {healthMetrics?.database_status === 'operational' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wifi className={`h-6 w-6 mr-3 ${getStatusColor(healthMetrics?.api_status || 'operational')}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-600">API Status</p>
                    <p className={`text-lg font-semibold capitalize ${getStatusColor(healthMetrics?.api_status || 'operational')}`}>
                      {healthMetrics?.api_status || 'operational'}
                    </p>
                  </div>
                </div>
                {healthMetrics?.api_status === 'operational' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Application Logs
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('api')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'api'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    API Performance
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'activity'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <Users className="h-5 w-5 mr-2" />
                    User Activity
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('errors')}
                  className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'errors'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Error Summary
                    {(errorSummary?.critical_errors || 0) > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {errorSummary?.critical_errors}
                      </span>
                    )}
                  </div>
                </button>
              </nav>
            </div>
            
            {/* Filters Bar */}
            {activeTab === 'logs' && (
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Log Level Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Log Level
                    </label>
                    <select
                      value={activeFilters.log_level || 'all'}
                      onChange={(e) => updateFilters({ log_level: e.target.value === 'all' ? null : e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  {/* Component Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Component
                    </label>
                    <select
                      value={activeFilters.component || 'all'}
                      onChange={(e) => updateFilters({ component: e.target.value === 'all' ? null : e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Components</option>
                      <option value="api">API</option>
                      <option value="database">Database</option>
                      <option value="auth">Authentication</option>
                      <option value="payment">Payment</option>
                      <option value="email">Email Service</option>
                      <option value="websocket">WebSocket</option>
                    </select>
                  </div>
                  
                  {/* Time Range Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Time Range
                    </label>
                    <select
                      value={activeFilters.time_range}
                      onChange={(e) => updateFilters({ time_range: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="last_hour">Last Hour</option>
                      <option value="last_24_hours">Last 24 Hours</option>
                      <option value="last_7_days">Last 7 Days</option>
                      <option value="last_30_days">Last 30 Days</option>
                    </select>
                  </div>
                  
                  {/* Search */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Search Logs
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search in logs..."
                        className="block w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tab Content */}
            <div className="p-6">
              {/* Application Logs Tab */}
              {activeTab === 'logs' && (
                <>
                  {logsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : appLogs && appLogs.logs.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {appLogs.logs
                          .filter(log => 
                            !searchQuery || 
                            log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            log.component.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map(log => (
                          <div
                            key={log.log_id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-2">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLogLevelColor(log.level)}`}>
                                    {log.level.toUpperCase()}
                                  </span>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                    {log.component}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTimestamp(log.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 font-medium line-clamp-2">
                                  {log.message}
                                </p>
                                {log.stack_trace && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                                      View Stack Trace
                                    </summary>
                                    <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
                                      {log.stack_trace}
                                    </pre>
                                  </details>
                                )}
                                {log.user_id && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    User ID: {log.user_id}
                                  </p>
                                )}
                                {log.request_id && (
                                  <p className="text-xs text-gray-500">
                                    Request ID: {log.request_id}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination */}
                      {appLogs.total_count > 50 && (
                        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                          <div className="text-sm text-gray-700">
                            Showing <span className="font-medium">{((currentPage - 1) * 50) + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * 50, appLogs.total_count)}</span> of{' '}
                            <span className="font-medium">{appLogs.total_count}</span> logs
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage * 50 >= appLogs.total_count}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Try adjusting your filters or time range
                      </p>
                    </div>
                  )}
                </>
              )}
              
              {/* API Performance Tab */}
              {activeTab === 'api' && (
                <>
                  {apiLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : apiMetrics ? (
                    <>
                      {/* API Health Score */}
                      <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Overall API Health Score</p>
                            <p className="text-4xl font-bold text-blue-900">
                              {apiMetrics.api_health_score.toFixed(1)}%
                            </p>
                          </div>
                          <div className={`text-6xl ${apiMetrics.api_health_score >= 95 ? 'text-green-500' : apiMetrics.api_health_score >= 85 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {apiMetrics.api_health_score >= 95 ? '✓' : apiMetrics.api_health_score >= 85 ? '⚠' : '✗'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Endpoints Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Endpoint
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Method
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Avg Response
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Requests
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Errors
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Success Rate
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {apiMetrics.endpoints.map((endpoint, index) => (
                              <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {endpoint.endpoint}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                    endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                    endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {endpoint.method}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className={`font-medium ${
                                    endpoint.avg_response_time < 200 ? 'text-green-600' :
                                    endpoint.avg_response_time < 500 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {endpoint.avg_response_time}ms
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {endpoint.request_count.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <span className={endpoint.error_count > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                    {endpoint.error_count}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <div className="flex items-center">
                                    <div className="flex-1">
                                      <div className="relative pt-1">
                                        <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                          <div
                                            style={{ width: `${endpoint.success_rate}%` }}
                                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                              endpoint.success_rate >= 99 ? 'bg-green-500' :
                                              endpoint.success_rate >= 95 ? 'bg-yellow-500' :
                                              'bg-red-500'
                                            }`}
                                          ></div>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                      {endpoint.success_rate.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No metrics available</h3>
                    </div>
                  )}
                </>
              )}
              
              {/* User Activity Tab */}
              {activeTab === 'activity' && (
                <>
                  {activityLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : activityLogs && activityLogs.activities.length > 0 ? (
                    <div className="space-y-3">
                      {activityLogs.activities.map(activity => (
                        <div
                          key={activity.activity_id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                  {activity.user_type}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(activity.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-900 font-medium">
                                {activity.action_type} - {activity.resource}
                              </p>
                              <div className="mt-2 text-xs text-gray-500 space-x-4">
                                <span>User: {activity.user_id}</span>
                                {activity.ip_address && <span>IP: {activity.ip_address}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No activity logs</h3>
                    </div>
                  )}
                </>
              )}
              
              {/* Error Summary Tab */}
              {activeTab === 'errors' && (
                <>
                  {errorLoading ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {[1, 2].map(i => (
                          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : errorSummary ? (
                    <>
                      {/* Error Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-gray-600">Total Errors (24h)</p>
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <p className="text-4xl font-bold text-gray-900">
                            {errorSummary.total_errors_24h.toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-gray-600">Critical Errors</p>
                            <XCircle className="h-5 w-5 text-red-600" />
                          </div>
                          <p className="text-4xl font-bold text-red-600">
                            {errorSummary.critical_errors}
                          </p>
                        </div>
                      </div>
                      
                      {/* Top Errors */}
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Error Types</h3>
                        <div className="space-y-3">
                          {errorSummary.top_errors.map((error, index) => (
                            <div
                              key={index}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{error.error_type}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Last occurred: {formatTimestamp(error.latest_occurrence)}
                                  </p>
                                </div>
                                <div className="ml-4 flex items-center space-x-4">
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-red-600">{error.count}</p>
                                    <p className="text-xs text-gray-500">occurrences</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Error Trend Chart (Simple Bar Chart) */}
                      {errorSummary.error_trend.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Trend (24h)</h3>
                          <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-end justify-between space-x-2 h-48">
                              {errorSummary.error_trend.map((item, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center justify-end">
                                  <div
                                    className="w-full bg-red-500 rounded-t transition-all hover:bg-red-600"
                                    style={{ 
                                      height: `${(item.error_count / Math.max(...errorSummary.error_trend.map(i => i.error_count))) * 100}%`,
                                      minHeight: item.error_count > 0 ? '4px' : '0'
                                    }}
                                    title={`${item.error_count} errors`}
                                  ></div>
                                  <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                                    {new Date(item.hour).getHours()}:00
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No error data available</h3>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminSystemLogs;