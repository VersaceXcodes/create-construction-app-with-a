import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  CreditCard,
  Building2
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EarningsOverview {
  total_earnings_ytd: number;
  current_month_earnings: number;
  pending_payout_amount: number;
  next_payout_date: string | null;
  available_balance: number;
  total_commission_paid: number;
}

interface PayoutRecord {
  payout_id: string;
  amount: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  scheduled_date: string;
  processed_date: string | null;
  transaction_reference: string | null;
  included_orders: string[] | null;
  platform_commission: number;
  net_amount: number;
  failure_reason: string | null;
}

interface TransactionRecord {
  order_id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  payout_id: string | null;
  transaction_type: string;
}

interface BankAccountSettings {
  bank_account_info: string | null;
  account_verified: boolean;
  payout_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  minimum_payout_threshold: number;
}

interface TaxDocumentation {
  tax_year: number;
  gross_income: number;
  commission_paid: number;
  net_income: number;
  document_urls: string[];
  generated_date: string | null;
}

interface FinancialFilters {
  date_range: string;
  transaction_type: string | null;
  payout_status: string | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchPayoutHistory = async (supplier_id: string, filters: FinancialFilters): Promise<PayoutRecord[]> => {
  const params: any = {
    supplier_id,
    limit: 50,
    offset: 0,
    sort_by: 'scheduled_date',
    sort_order: 'desc'
  };

  if (filters.payout_status) {
    params.status = filters.payout_status;
  }

  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/payouts`, {
    params,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  });

  return response.data;
};

const fetchSupplierProfile = async (): Promise<any> => {
  const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    }
  });
  return response.data;
};

const updatePayoutSettings = async (settings: Partial<BankAccountSettings>): Promise<any> => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me`,
    settings,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    }
  );
  return response.data;
};

// Mock function for earnings overview (until backend endpoint exists)
const calculateEarningsOverview = (payouts: PayoutRecord[]): EarningsOverview => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const ytdPayouts = payouts.filter(p => {
    const payoutDate = new Date(p.scheduled_date);
    return payoutDate.getFullYear() === currentYear && p.status !== 'failed';
  });

  const monthPayouts = payouts.filter(p => {
    const payoutDate = new Date(p.scheduled_date);
    return payoutDate.getFullYear() === currentYear && 
           payoutDate.getMonth() === currentMonth &&
           p.status !== 'failed';
  });

  const pendingPayouts = payouts.filter(p => 
    p.status === 'scheduled' || p.status === 'processing'
  );

  const total_earnings_ytd = ytdPayouts.reduce((sum, p) => sum + p.net_amount, 0);
  const current_month_earnings = monthPayouts.reduce((sum, p) => sum + p.net_amount, 0);
  const pending_payout_amount = pendingPayouts.reduce((sum, p) => sum + p.net_amount, 0);
  const total_commission_paid = ytdPayouts.reduce((sum, p) => sum + p.platform_commission, 0);

  const nextScheduledPayout = payouts
    .filter(p => p.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())[0];

  return {
    total_earnings_ytd,
    current_month_earnings,
    pending_payout_amount,
    next_payout_date: nextScheduledPayout?.scheduled_date || null,
    available_balance: pending_payout_amount,
    total_commission_paid
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierFinancials: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Global state access - CRITICAL: Individual selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [financial_filters, setFinancialFilters] = useState<FinancialFilters>({
    date_range: searchParams.get('period') || 'current_month',
    transaction_type: null,
    payout_status: null
  });

  const [active_tab, setActiveTab] = useState<string>(
    searchParams.get('section') || 'overview'
  );

  const [modal_open, setModalOpen] = useState(false);
  const [editing_bank_account, setEditingBankAccount] = useState(false);

  const [bank_form, setBankForm] = useState({
    bank_account_info: '',
    payout_frequency: 'monthly' as 'weekly' | 'bi-weekly' | 'monthly'
  });

  // Get supplier_id from auth
  const supplier_id = supplierProfile?.supplier_id || '';

  // Sync URL params with state
  useEffect(() => {
    const newParams: any = {};
    if (active_tab !== 'overview') newParams.section = active_tab;
    if (financial_filters.date_range !== 'current_month') newParams.period = financial_filters.date_range;
    setSearchParams(newParams, { replace: true });
  }, [active_tab, financial_filters.date_range, setSearchParams]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['payouts', supplier_id, financial_filters],
    queryFn: () => fetchPayoutHistory(supplier_id, financial_filters),
    enabled: !!supplier_id && active_tab === 'payouts',
    staleTime: 60000
  });

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ['supplier-profile', supplier_id],
    queryFn: fetchSupplierProfile,
    enabled: !!supplier_id,
    staleTime: 300000
  });

  // Calculate earnings overview from payouts
  const earnings_overview: EarningsOverview = React.useMemo(() => {
    if (!payouts || payouts.length === 0) {
      return {
        total_earnings_ytd: 0,
        current_month_earnings: 0,
        pending_payout_amount: 0,
        next_payout_date: null,
        available_balance: 0,
        total_commission_paid: 0
      };
    }
    return calculateEarningsOverview(payouts);
  }, [payouts]);

  // Initialize bank form from supplier data
  useEffect(() => {
    if (supplier && active_tab === 'settings') {
      setBankForm({
        bank_account_info: supplier.bank_account_info || '',
        payout_frequency: supplier.payout_frequency || 'monthly'
      });
    }
  }, [supplier, active_tab]);

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const updateSettingsMutation = useMutation({
    mutationFn: updatePayoutSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-profile'] });
      setEditingBankAccount(false);
      alert('Payout settings updated successfully!');
    },
    onError: (error: any) => {
      alert(`Failed to update settings: ${error.response?.data?.message || error.message}`);
    }
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleFilterChange = (key: keyof FinancialFilters, value: any) => {
    setFinancialFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(bank_form);
  };

  const handleGenerateTaxDocs = () => {
    alert('Tax document generation requires backend implementation (POST /suppliers/me/tax-documents)');
  };

  const handleRequestEarlyPayout = () => {
    alert('Early payout request requires backend implementation (POST /suppliers/me/payouts/early-request)');
  };

  const handleDownloadStatement = () => {
    alert('Financial statement download requires backend implementation (GET /suppliers/me/statements/{period})');
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: 'blue', icon: Clock, text: 'Scheduled' },
      processing: { color: 'yellow', icon: Clock, text: 'Processing' },
      completed: { color: 'green', icon: CheckCircle, text: 'Completed' },
      failed: { color: 'red', icon: XCircle, text: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || AlertCircle;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
        ${config.color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
        ${config.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
        ${config.color === 'green' ? 'bg-green-100 text-green-800' : ''}
        ${config.color === 'red' ? 'bg-red-100 text-red-800' : ''}
      `}>
        <Icon className="w-3 h-3 mr-1" />
        {config?.text || status}
      </span>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Track your earnings, manage payouts, and access financial reports
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    active_tab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="w-5 h-5 inline-block mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => handleTabChange('payouts')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    active_tab === 'payouts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className="w-5 h-5 inline-block mr-2" />
                  Payouts
                </button>
                <button
                  onClick={() => handleTabChange('transactions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    active_tab === 'transactions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-5 h-5 inline-block mr-2" />
                  Transactions
                </button>
                <button
                  onClick={() => handleTabChange('settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    active_tab === 'settings'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="w-5 h-5 inline-block mr-2" />
                  Settings
                </button>
              </nav>
            </div>
          </div>

          {/* TAB CONTENT: OVERVIEW */}
          {active_tab === 'overview' && (
            <div className="space-y-6">
              {/* Earnings Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Total Earnings YTD</h3>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(earnings_overview.total_earnings_ytd)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Commission paid: {formatCurrency(earnings_overview.total_commission_paid)}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">This Month</h3>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(earnings_overview.current_month_earnings)}
                  </p>
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    {earnings_overview.current_month_earnings > 0 ? '+' : ''}
                    {((earnings_overview.current_month_earnings / Math.max(earnings_overview.total_earnings_ytd || 1, 1)) * 100).toFixed(1)}% of YTD
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Pending Payout</h3>
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(earnings_overview.pending_payout_amount)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {earnings_overview.next_payout_date ? (
                      <>Next payout: {formatDate(earnings_overview.next_payout_date)}</>
                    ) : (
                      'No scheduled payouts'
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={handleDownloadStatement}
                    className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Statement
                  </button>
                  <button
                    onClick={handleGenerateTaxDocs}
                    className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Tax Docs
                  </button>
                  <button
                    onClick={handleRequestEarlyPayout}
                    className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Request Early Payout
                  </button>
                </div>
              </div>

              {/* Recent Payouts Preview */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payouts</h3>
                  <button
                    onClick={() => handleTabChange('payouts')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All →
                  </button>
                </div>
                {payoutsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No payout records yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payouts.slice(0, 5).map((payout) => (
                      <div key={payout.payout_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(payout.status)}
                            <span className="text-sm text-gray-600">
                              {formatDate(payout.scheduled_date)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {payout.included_orders?.length || 0} orders included
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(payout.net_amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            -{formatCurrency(payout.platform_commission)} commission
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: PAYOUTS */}
          {active_tab === 'payouts' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Range
                    </label>
                    <select
                      value={financial_filters.date_range}
                      onChange={(e) => handleFilterChange('date_range', e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="current_month">Current Month</option>
                      <option value="last_month">Last Month</option>
                      <option value="last_3_months">Last 3 Months</option>
                      <option value="last_6_months">Last 6 Months</option>
                      <option value="ytd">Year to Date</option>
                      <option value="all_time">All Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payout Status
                    </label>
                    <select
                      value={financial_filters.payout_status || ''}
                      onChange={(e) => handleFilterChange('payout_status', e.target.value || null)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => setFinancialFilters({
                        date_range: 'current_month',
                        transaction_type: null,
                        payout_status: null
                      })}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* Payouts List */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
                </div>
                
                {payoutsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium">No payouts found</p>
                    <p className="text-sm mt-2">Payouts matching your filters will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {payouts.map((payout) => (
                      <div key={payout.payout_id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {getStatusBadge(payout.status)}
                              <span className="text-sm font-medium text-gray-900">
                                Payout ID: {payout.payout_id.substring(0, 8)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                              <div>
                                <span className="text-gray-500">Scheduled:</span>
                                <span className="ml-2 text-gray-900">{formatDate(payout.scheduled_date)}</span>
                              </div>
                              {payout.processed_date && (
                                <div>
                                  <span className="text-gray-500">Processed:</span>
                                  <span className="ml-2 text-gray-900">{formatDate(payout.processed_date)}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Orders:</span>
                                <span className="ml-2 text-gray-900">{payout.included_orders?.length || 0}</span>
                              </div>
                              {payout.transaction_reference && (
                                <div>
                                  <span className="text-gray-500">Reference:</span>
                                  <span className="ml-2 text-gray-900 font-mono text-xs">{payout.transaction_reference}</span>
                                </div>
                              )}
                            </div>
                            {payout.failure_reason && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800">
                                  <strong>Failure Reason:</strong> {payout.failure_reason}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-6">
                            <p className="text-2xl font-bold text-gray-900">
                              {formatCurrency(payout.net_amount)}
                            </p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-gray-600">
                                Gross: {formatCurrency(payout.amount)}
                              </p>
                              <p className="text-red-600">
                                Commission: -{formatCurrency(payout.platform_commission)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: TRANSACTIONS */}
          {active_tab === 'transactions' && (
            <div className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Transaction History</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This feature requires backend implementation. 
                      A dedicated transaction history endpoint (GET /suppliers/me/transactions) is needed to display order-level financial details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mock Transaction History Table */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">Transaction Ledger</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gross
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commission
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Net
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payout
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p>Transaction history endpoint not yet implemented</p>
                          <p className="text-sm mt-2">Contact support for transaction details</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: SETTINGS */}
          {active_tab === 'settings' && (
            <div className="space-y-6">
              {/* Bank Account Settings */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Bank Account & Payout Settings</h3>
                    <p className="text-sm text-gray-600 mt-1">Configure your payment method and payout preferences</p>
                  </div>
                  {!editing_bank_account && (
                    <button
                      onClick={() => setEditingBankAccount(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Edit Settings
                    </button>
                  )}
                </div>

                {supplierLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : editing_bank_account ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Account Information
                      </label>
                      <input
                        type="text"
                        value={bank_form.bank_account_info}
                        onChange={(e) => setBankForm(prev => ({ ...prev, bank_account_info: e.target.value }))}
                        placeholder="Bank Name - Account ending in XXXX"
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        For security, only enter masked account information (e.g., "Chase Bank - ****1234")
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payout Frequency
                      </label>
                      <select
                        value={bank_form.payout_frequency}
                        onChange={(e) => setBankForm(prev => ({ 
                          ...prev, 
                          payout_frequency: e.target.value as 'weekly' | 'bi-weekly' | 'monthly' 
                        }))}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleSaveSettings}
                        disabled={updateSettingsMutation.isPending}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingBankAccount(false)}
                        disabled={updateSettingsMutation.isPending}
                        className="px-6 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Bank Account</p>
                          <p className="text-sm text-gray-600">
                            {supplier?.bank_account_info || 'Not configured'}
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        supplier?.bank_account_info 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {supplier?.bank_account_info ? 'Configured' : 'Setup Required'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Payout Frequency</p>
                          <p className="text-sm text-gray-600 capitalize">
                            {supplier?.payout_frequency || 'monthly'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Automatic Payouts</p>
                          <p className="mt-1">
                            Payouts are processed automatically based on your frequency setting. 
                            Minimum threshold: $100.00
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Information */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Documentation</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Annual Tax Forms</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Generate 1099 forms and annual income reports
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateTaxDocs}
                        className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        Generate Forms
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Business Registration</p>
                        <p className="mt-1">
                          Tax ID: {supplier?.business_registration_number || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State for Other Tabs */}
          {!['overview', 'payouts', 'settings'].includes(active_tab) && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Content Not Available</h3>
              <p className="text-gray-600">This section is under development</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SupplierFinancials;