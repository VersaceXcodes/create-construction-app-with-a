import React, { useState, useEffect } from 'react';
import { useSearchParams,  Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { User, Search, Filter, Download, X, Mail, UserCog, CheckCircle, XCircle, AlertCircle, ExternalLink, ChevronLeft, ChevronRight, Eye, Ban, RefreshCw } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CustomerListItem {
  user_id: string;
  customer_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  account_type: string | null;
  trade_credit_status: string | null;
  total_orders: number;
  total_spent: number;
  registration_date: string;
  last_login_date: string | null;
  status: string;
  email_verified: boolean;
}

interface CustomerDetail {
  user_id: string;
  customer_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  account_type: string | null;
  trade_credit_limit: number | null;
  trade_credit_balance: number | null;
  trade_credit_used: number | null;
  trade_credit_status: string | null;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  registration_date: string;
  last_login_date: string | null;
  status: string;
  email_verified: boolean;
  addresses: any[];
  payment_methods: any[];
  recent_orders: any[];
}

interface SearchFilters {
  query: string | null;
  status: string | null;
  account_type: string | null;
  date_range: string | null;
  spending_tier: string | null;
  sort_by: string;
  sort_order: string;
}

interface PaginationState {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

interface AdminUsersResponse {
  users: any[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchCustomers = async (
  filters: SearchFilters,
  pagination: PaginationState,
  authToken: string | null
): Promise<{ customers_list: CustomerListItem[]; pagination: PaginationState }> => {
  if (!authToken) throw new Error('No auth token');

  const params = new URLSearchParams();
  params.append('user_type', 'customer');
  if (filters.query) params.append('query', filters.query);
  if (filters.status) params.append('status', filters.status);
  params.append('limit', pagination.limit.toString());
  params.append('offset', ((pagination.current_page - 1) * pagination.limit).toString());
  params.append('sort_by', filters.sort_by);
  params.append('sort_order', filters.sort_order);

  const response = await axios.get<AdminUsersResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/users?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  // Transform response according to dataMapper
  const customers_list: CustomerListItem[] = response.data.users.map((user: any) => ({
    user_id: user.user_id,
    customer_id: user.customer?.customer_id || null,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    account_type: user.customer?.account_type || null,
    trade_credit_status: user.customer?.trade_credit_status || null,
    total_orders: user.customer?.total_orders || 0,
    total_spent: user.customer?.total_spent || 0,
    registration_date: user.registration_date,
    last_login_date: user.last_login_date,
    status: user.status,
    email_verified: user.email_verified
  }));

  const paginationState: PaginationState = {
    current_page: Math.floor(response.data.offset / response.data.limit) + 1,
    total_pages: Math.ceil(response.data.total / response.data.limit),
    total_count: response.data.total,
    limit: response.data.limit
  };

  return { customers_list, pagination: paginationState };
};

const fetchCustomerDetail = async (
  userId: string,
  authToken: string | null
): Promise<CustomerDetail> => {
  if (!authToken) throw new Error('No auth token');

  const response = await axios.get<any>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/users/${userId}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  // Transform detailed user response to customer detail format
  return {
    user_id: response.data.user_id,
    customer_id: response.data.customer?.customer_id || null,
    email: response.data.email,
    first_name: response.data.first_name,
    last_name: response.data.last_name,
    phone_number: response.data.phone_number,
    account_type: response.data.customer?.account_type || null,
    trade_credit_limit: response.data.customer?.trade_credit_limit || null,
    trade_credit_balance: response.data.customer?.trade_credit_balance || null,
    trade_credit_used: response.data.customer?.trade_credit_used || null,
    trade_credit_status: response.data.customer?.trade_credit_status || null,
    total_orders: response.data.customer?.total_orders || 0,
    total_spent: response.data.customer?.total_spent || 0,
    avg_order_value: response.data.customer?.total_orders > 0 
      ? (response.data.customer?.total_spent || 0) / response.data.customer.total_orders 
      : 0,
    registration_date: response.data.registration_date,
    last_login_date: response.data.last_login_date,
    status: response.data.status,
    email_verified: response.data.email_verified,
    addresses: response.data.addresses || [],
    payment_methods: response.data.payment_methods || [],
    recent_orders: response.data.recent_orders || []
  };
};

const updateCustomerStatus = async (
  userId: string,
  newStatus: string,
  authToken: string | null
): Promise<void> => {
  if (!authToken) throw new Error('No auth token');

  await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/users/${userId}`,
    { status: newStatus },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminUserManagement_Customers: React.FC = () => {
  // const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  // Search and filters from URL params
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: searchParams.get('search_query') || null,
    status: searchParams.get('status_filter') || null,
    account_type: searchParams.get('account_type_filter') || null,
    date_range: searchParams.get('registration_date_range') || null,
    spending_tier: searchParams.get('spending_tier') || null,
    sort_by: searchParams.get('sort_by') || 'registration_date',
    sort_order: searchParams.get('sort_order') || 'desc'
  });

  const [pagination, setPagination] = useState<PaginationState>({
    current_page: parseInt(searchParams.get('page') || '1'),
    total_pages: 1,
    total_count: 0,
    limit: 50
  });

  const [customerDetailModalOpen, setCustomerDetailModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [bulkSelectedCustomers, setBulkSelectedCustomers] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(searchFilters.query || '');
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

  // ============================================================================
  // SYNC URL PARAMS WITH STATE
  // ============================================================================

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchFilters.query) params.set('search_query', searchFilters.query);
    if (searchFilters.status) params.set('status_filter', searchFilters.status);
    if (searchFilters.account_type) params.set('account_type_filter', searchFilters.account_type);
    if (searchFilters.date_range) params.set('registration_date_range', searchFilters.date_range);
    if (searchFilters.spending_tier) params.set('spending_tier', searchFilters.spending_tier);
    if (pagination.current_page > 1) params.set('page', pagination.current_page.toString());
    if (searchFilters.sort_by) params.set('sort_by', searchFilters.sort_by);
    if (searchFilters.sort_order) params.set('sort_order', searchFilters.sort_order);

    setSearchParams(params, { replace: true });
  }, [searchFilters, pagination.current_page, setSearchParams]);

  // ============================================================================
  // DEBOUNCED SEARCH
  // ============================================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchFilters.query) {
        setSearchFilters(prev => ({ ...prev, query: searchInput || null }));
        setPagination(prev => ({ ...prev, current_page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ============================================================================
  // REACT QUERY: FETCH CUSTOMERS LIST
  // ============================================================================

  const {
    data: customersData,
    isLoading: isLoadingList,
    error: listError,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ['admin-customers', searchFilters, pagination.current_page],
    queryFn: () => fetchCustomers(searchFilters, pagination, authToken),
    enabled: !!authToken && currentUser?.user_type === 'admin',
    staleTime: 60000, // 1 minute
  });
  
  // React Query v5: Replace onSuccess with useEffect
  useEffect(() => {
    if (customersData?.pagination) {
      setPagination(prev => ({ ...prev, ...customersData.pagination }));
    }
  }, [customersData]);

  const customers = customersData?.customers_list || [];

  // ============================================================================
  // REACT QUERY: FETCH CUSTOMER DETAIL
  // ============================================================================

  const {
    data: selectedCustomer,
    isLoading: isLoadingDetail,
    error: detailError
  } = useQuery({
    queryKey: ['admin-customer-detail', selectedCustomerId],
    queryFn: () => fetchCustomerDetail(selectedCustomerId!, authToken),
    enabled: !!selectedCustomerId && !!authToken,
    staleTime: 30000
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, newStatus }: { userId: string; newStatus: string }) =>
      updateCustomerStatus(userId, newStatus, authToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customer-detail', selectedCustomerId] });
    }
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCustomerClick = (userId: string) => {
    setSelectedCustomerId(userId);
    setCustomerDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setCustomerDetailModalOpen(false);
    setSelectedCustomerId(null);
  };

  const handleBulkSelect = (userId: string) => {
    setBulkSelectedCustomers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (bulkSelectedCustomers.length === customers.length) {
      setBulkSelectedCustomers([]);
    } else {
      setBulkSelectedCustomers(customers.map(c => c.user_id));
    }
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ userId, newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      await Promise.all(
        bulkSelectedCustomers.map(userId =>
          updateStatusMutation.mutateAsync({ userId, newStatus })
        )
      );
      setBulkSelectedCustomers([]);
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  const handleExport = async () => {
    // Mock export - in production would call POST /admin/exports/customers
    const csvContent = [
      ['Email', 'Name', 'Account Type', 'Status', 'Total Orders', 'Total Spent', 'Registration Date'].join(','),
      ...customers.map(c => [
        c.email,
        `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        c.account_type || 'N/A',
        c.status,
        c.total_orders,
        c.total_spent.toFixed(2),
        new Date(c.registration_date).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const displayName = (customer: CustomerListItem) => {
    if (customer.first_name && customer.last_name) {
      return `${customer.first_name} ${customer.last_name}`;
    }
    return customer.email;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAccountTypeBadge = (accountType: string | null) => {
    if (!accountType) return null;
    return accountType === 'trade' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-purple-100 text-purple-800 border-purple-200';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage customer accounts, monitor activity, and provide support
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExport}
                  disabled={isLoadingList}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
                {bulkSelectedCustomers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700 font-medium">
                      {bulkSelectedCustomers.length} selected
                    </span>
                    <button
                      onClick={() => handleBulkStatusUpdate('suspended')}
                      disabled={updateStatusMutation.isPending}
                      className="inline-flex items-center px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('active')}
                      disabled={updateStatusMutation.isPending}
                      className="inline-flex items-center px-3 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Activate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Search Input */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  {searchInput && (
                    <button
                      onClick={() => {
                        setSearchInput('');
                        setSearchFilters(prev => ({ ...prev, query: null }));
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Toggles */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFiltersPanelOpen(!filtersPanelOpen)}
                  className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                    filtersPanelOpen
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(searchFilters.status || searchFilters.account_type || searchFilters.spending_tier) && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      {[searchFilters.status, searchFilters.account_type, searchFilters.spending_tier].filter(Boolean).length}
                    </span>
                  )}
                </button>

                <select
                  value={`${searchFilters.sort_by}:${searchFilters.sort_order}`}
                  onChange={(e) => {
                    const [sort_by, sort_order] = e.target.value.split(':');
                    setSearchFilters(prev => ({ ...prev, sort_by, sort_order }));
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="registration_date:desc">Newest First</option>
                  <option value="registration_date:asc">Oldest First</option>
                  <option value="last_login_date:desc">Recent Activity</option>
                  <option value="total_spent:desc">Highest Spending</option>
                  <option value="total_orders:desc">Most Orders</option>
                </select>

                <button
                  onClick={() => refetchCustomers()}
                  disabled={isLoadingList}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingList ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {filtersPanelOpen && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Status
                    </label>
                    <select
                      value={searchFilters.status || ''}
                      onChange={(e) => handleFilterChange('status', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  {/* Account Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <select
                      value={searchFilters.account_type || ''}
                      onChange={(e) => handleFilterChange('account_type', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="retail">Retail</option>
                      <option value="trade">Trade</option>
                    </select>
                  </div>

                  {/* Spending Tier Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spending Tier
                    </label>
                    <select
                      value={searchFilters.spending_tier || ''}
                      onChange={(e) => handleFilterChange('spending_tier', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Tiers</option>
                      <option value="high">High Value ($10k+)</option>
                      <option value="medium">Medium Value ($1k-$10k)</option>
                      <option value="low">Low Value (&lt;$1k)</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchFilters({
                          query: null,
                          status: null,
                          account_type: null,
                          date_range: null,
                          spending_tier: null,
                          sort_by: 'registration_date',
                          sort_order: 'desc'
                        });
                        setSearchInput('');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {pagination.total_count.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Accounts</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">
                    {customers.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Verified Emails</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">
                    {customers.filter(c => c.email_verified).length}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trade Accounts</p>
                  <p className="mt-2 text-3xl font-bold text-purple-600">
                    {customers.filter(c => c.account_type === 'trade').length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <UserCog className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Customer Accounts
                  {searchFilters.query && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      - Results for "{searchFilters.query}"
                    </span>
                  )}
                </h2>
                {customers.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {bulkSelectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isLoadingList && (
              <div className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading customers...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {listError && (
              <div className="py-12 px-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                    <p className="text-red-800">
                      Failed to load customers. Please try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingList && !listError && customers.length === 0 && (
              <div className="py-12 text-center">
                <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-600">
                  {searchFilters.query 
                    ? 'Try adjusting your search or filters'
                    : 'No customer accounts in the system yet'}
                </p>
              </div>
            )}

            {/* Table */}
            {!isLoadingList && !listError && customers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={bulkSelectedCustomers.length === customers.length && customers.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registered
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr
                        key={customer.user_id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleCustomerClick(customer.user_id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={bulkSelectedCustomers.includes(customer.user_id)}
                            onChange={() => handleBulkSelect(customer.user_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {(customer.first_name?.[0] || customer.email[0]).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {displayName(customer)}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                {customer.email}
                               {!customer.email_verified && (
                                 <XCircle className="h-3 w-3 text-amber-500 ml-1" aria-label="Email not verified" />
                               )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.account_type && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAccountTypeBadge(customer.account_type)}`}>
                              {customer.account_type === 'trade' ? 'Trade' : 'Retail'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(customer.status)}`}>
                            {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.total_orders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${customer.total_spent.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(customer.registration_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCustomerClick(customer.user_id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Eye className="h-4 w-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!isLoadingList && customers.length > 0 && pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((pagination.current_page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.current_page * pagination.limit, pagination.total_count)}
                    </span> of{' '}
                    <span className="font-medium">{pagination.total_count}</span> customers
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                      className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {pagination.current_page} of {pagination.total_pages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.total_pages}
                      className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Detail Modal */}
        {customerDetailModalOpen && selectedCustomerId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Customer Details</h2>
                  <button
                    onClick={handleCloseDetailModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              {isLoadingDetail && (
                <div className="py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading customer details...</p>
                  </div>
                </div>
              )}

              {detailError && (
                <div className="p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">Failed to load customer details</p>
                  </div>
                </div>
              )}

              {!isLoadingDetail && !detailError && selectedCustomer && (
                <div className="p-6 space-y-6">
                  {/* Customer Info Section */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-2xl">
                            {(selectedCustomer.first_name?.[0] || selectedCustomer.email[0]).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {selectedCustomer.first_name && selectedCustomer.last_name
                              ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                              : 'No name provided'}
                          </h3>
                          <p className="text-gray-600">{selectedCustomer.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(selectedCustomer.status)}`}>
                              {selectedCustomer.status}
                            </span>
                            {selectedCustomer.email_verified ? (
                              <span className="inline-flex items-center text-xs text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs text-amber-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unverified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <select
                          value={selectedCustomer.status}
                          onChange={(e) => handleStatusUpdate(selectedCustomer.user_id, e.target.value)}
                          disabled={updateStatusMutation.isPending}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Account Type</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {selectedCustomer.account_type ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getAccountTypeBadge(selectedCustomer.account_type)}`}>
                              {selectedCustomer.account_type === 'trade' ? 'Trade' : 'Retail'}
                            </span>
                          ) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{selectedCustomer.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Spent</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">${selectedCustomer.total_spent.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Order Value</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">${selectedCustomer.avg_order_value.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h4>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Email:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedCustomer.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Phone:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedCustomer.phone_number || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Registered:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedCustomer.registration_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Login:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedCustomer.last_login_date 
                            ? new Date(selectedCustomer.last_login_date).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trade Credit Info (if applicable) */}
                  {selectedCustomer.account_type === 'trade' && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Trade Credit</h4>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-blue-700 uppercase tracking-wide">Credit Limit</p>
                            <p className="mt-1 text-lg font-bold text-blue-900">
                              ${(selectedCustomer.trade_credit_limit || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700 uppercase tracking-wide">Used</p>
                            <p className="mt-1 text-lg font-bold text-blue-900">
                              ${(selectedCustomer.trade_credit_used || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700 uppercase tracking-wide">Available</p>
                            <p className="mt-1 text-lg font-bold text-green-700">
                              ${(selectedCustomer.trade_credit_balance || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {selectedCustomer.trade_credit_status && (
                          <div className="mt-3">
                            <span className="text-xs text-blue-700">Status: </span>
                            <span className="text-xs font-semibold text-blue-900">
                              {selectedCustomer.trade_credit_status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Addresses */}
                  {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Saved Addresses</h4>
                      <div className="space-y-2">
                        {selectedCustomer.addresses.map((address: any, index: number) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-900">
                              {address.street_address}
                              {address.apt_suite && `, ${address.apt_suite}`}
                            </p>
                            <p className="text-sm text-gray-600">
                              {address.city}, {address.state} {address.postal_code}
                            </p>
                            {address.is_default && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                Default
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Orders */}
                  {selectedCustomer.recent_orders && selectedCustomer.recent_orders.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Recent Orders</h4>
                      <div className="space-y-2">
                        {selectedCustomer.recent_orders.slice(0, 5).map((order: any, index: number) => (
                          <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                Order #{order.order_number || order.order_id?.substring(0, 8)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.order_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                ${order.total_amount?.toFixed(2) || '0.00'}
                              </p>
                              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Admin Actions</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to={`/admin/orders?customer_id=${selectedCustomer.customer_id}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View All Orders
                      </Link>
                      <button
                        onClick={() => {
                          // Mock impersonate - would call POST /admin/users/{user_id}/impersonate
                          alert('Impersonation feature - would open customer session');
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Impersonate Account
                      </button>
                      <button
                        onClick={() => {
                          // Mock message - would open message form
                          alert('Send message feature');
                        }}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Send Message
                      </button>
                      <button
                        onClick={handleCloseDetailModal}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminUserManagement_Customers;