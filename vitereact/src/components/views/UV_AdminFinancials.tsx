import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  Download,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  Search,
  Eye
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RevenueMetrics {
  total_revenue: number;
  commission_revenue: number;
  subscription_revenue: number;
  payment_processing_fees: number;
  net_revenue: number;
  revenue_trend: Array<{ date: string; revenue: number; orders: number }>;
}

interface CommissionSettings {
  default_commission_rate: number;
  tier_rates: Record<string, number>;
  custom_supplier_rates: Array<{ supplier_id: string; business_name: string; rate: number }>;
  commission_exemptions: string[];
}

interface Payout {
  payout_id: string;
  supplier_id: string;
  amount: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  scheduled_date: string;
  processed_date: string | null;
  transaction_reference: string | null;
  included_orders: string[];
  platform_commission: number;
  net_amount: number;
  failure_reason: string | null;
  supplier_name?: string;
}

interface Transaction {
  transaction_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  supplier_name: string;
  transaction_date: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  payment_method: string;
  status: string;
}

interface FinancialReport {
  report_id: string;
  report_type: string;
  report_name: string;
  period_start: string;
  period_end: string;
  generated_date: string;
  file_url: string | null;
  status: 'pending' | 'completed' | 'failed';
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchRevenueMetrics = async (
  authToken: string,
  dateFrom: string | null,
  dateTo: string | null,
  period: string
): Promise<RevenueMetrics> => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  params.append('period', period);

  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/analytics/dashboard?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  // Transform backend response to frontend structure
  const data = response.data;
  
  // Calculate commission revenue (8.5% of GMV based on default commission_rate)
  const commission_revenue = (data.gmv || 0) * 0.085;
  const subscription_revenue = 0; // Not in MVP
  const payment_processing_fees = (data.total_revenue || 0) * 0.029 + 0.30; // Stripe fees estimate
  const net_revenue = (data.total_revenue || 0) - payment_processing_fees;

  return {
    total_revenue: data.total_revenue || 0,
    commission_revenue,
    subscription_revenue,
    payment_processing_fees,
    net_revenue,
    revenue_trend: [] // Not in basic analytics endpoint
  };
};

const fetchPayoutQueue = async (authToken: string): Promise<{
  scheduled_payouts: Payout[];
  pending_payouts: Payout[];
  failed_payouts: Payout[];
  payout_summary: { total_scheduled_amount: number; total_pending_amount: number };
}> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/payouts?status=scheduled,processing,failed&limit=100`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  const payouts = response.data as Payout[];

  const scheduled = payouts.filter(p => p.status === 'scheduled');
  const pending = payouts.filter(p => p.status === 'processing');
  const failed = payouts.filter(p => p.status === 'failed');

  return {
    scheduled_payouts: scheduled,
    pending_payouts: pending,
    failed_payouts: failed,
    payout_summary: {
      total_scheduled_amount: scheduled.reduce((sum, p) => sum + p.amount, 0),
      total_pending_amount: pending.reduce((sum, p) => sum + p.amount, 0)
    }
  };
};

const fetchCommissionSettings = async (authToken: string): Promise<CommissionSettings> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/settings?setting_category=commission`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  const settings = response.data || [];
  
  // Find commission settings
  const defaultRateSetting = settings.find((s: any) => s.setting_key === 'default_commission_rate');
  const tierRatesSetting = settings.find((s: any) => s.setting_key === 'tier_commission_rates');
  const customRatesSetting = settings.find((s: any) => s.setting_key === 'custom_supplier_rates');

  return {
    default_commission_rate: defaultRateSetting?.setting_value?.rate || 8.5,
    tier_rates: tierRatesSetting?.setting_value || {},
    custom_supplier_rates: customRatesSetting?.setting_value || [],
    commission_exemptions: []
  };
};

const processPayoutBatch = async (authToken: string, payoutIds: string[]): Promise<void> => {
  await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/payouts/process-batch`,
    { payout_ids: payoutIds },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
};

const updateCommissionRates = async (
  authToken: string,
  defaultRate: number,
  tierRates: Record<string, number>
): Promise<void> => {
  await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/settings`,
    {
      setting_key: 'default_commission_rate',
      setting_value: { rate: defaultRate },
      setting_category: 'commission'
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  if (Object.keys(tierRates).length > 0) {
    await axios.put(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/settings`,
      {
        setting_key: 'tier_commission_rates',
        setting_value: tierRates,
        setting_category: 'commission'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminFinancials: React.FC = () => {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const periodParam = searchParams.get('period') || 'current_month';
  const reportTypeParam = searchParams.get('report_type') || 'revenue_overview';
  // const supplierIdParam = searchParams.get('supplier_id') || null;

  // Global state - CRITICAL: Individual selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Local state
  const [activeTab, setActiveTab] = useState<'revenue' | 'commission' | 'payouts' | 'transactions' | 'reports'>(
    reportTypeParam === 'commission_summary' ? 'commission' :
    reportTypeParam === 'payout_report' ? 'payouts' :
    reportTypeParam === 'transaction_ledger' ? 'transactions' : 'revenue'
  );

  const [dateRangeFilter, setDateRangeFilter] = useState({
    start_date: null as string | null,
    end_date: null as string | null,
    preset: periodParam
  });

  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [commissionEditMode, setCommissionEditMode] = useState(false);
  const [editedCommissionRate, setEditedCommissionRate] = useState<number>(8.5);

  const queryClient = useQueryClient();

  // Calculate date range based on preset
  const calculatedDateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    
    switch (dateRangeFilter.preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'current_month':
        start.setDate(1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start.setMonth(quarter * 3);
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0);
        start.setDate(1);
        break;
      case 'custom':
        return {
          start: dateRangeFilter.start_date,
          end: dateRangeFilter.end_date
        };
      default:
        start.setDate(1);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  }, [dateRangeFilter.preset, dateRangeFilter.start_date, dateRangeFilter.end_date]);

  // ============================================================================
  // QUERIES
  // ============================================================================

  const revenueQuery = useQuery({
    queryKey: ['admin-revenue-metrics', calculatedDateRange.start, calculatedDateRange.end, periodParam],
    queryFn: () => fetchRevenueMetrics(
      authToken!,
      calculatedDateRange.start,
      calculatedDateRange.end,
      periodParam
    ),
    enabled: !!authToken && activeTab === 'revenue',
    staleTime: 5 * 60 * 1000
  });

  const payoutsQuery = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: () => fetchPayoutQueue(authToken!),
    enabled: !!authToken && activeTab === 'payouts',
    staleTime: 2 * 60 * 1000
  });

  const commissionQuery = useQuery({
    queryKey: ['admin-commission-settings'],
    queryFn: () => fetchCommissionSettings(authToken!),
    enabled: !!authToken && activeTab === 'commission',
    staleTime: 10 * 60 * 1000
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const processPayoutsMutation = useMutation({
    mutationFn: (payoutIds: string[]) => processPayoutBatch(authToken!, payoutIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      setSelectedPayouts([]);
    }
  });

  const updateCommissionMutation = useMutation({
    mutationFn: ({ defaultRate, tierRates }: { defaultRate: number; tierRates: Record<string, number> }) =>
      updateCommissionRates(authToken!, defaultRate, tierRates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-settings'] });
      setCommissionEditMode(false);
    }
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePeriodChange = (preset: string) => {
    setDateRangeFilter(prev => ({ ...prev, preset }));
    const newParams = new URLSearchParams(searchParams);
    newParams.set('period', preset);
    setSearchParams(newParams);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'commission') {
      newParams.set('report_type', 'commission_summary');
    } else if (tab === 'payouts') {
      newParams.set('report_type', 'payout_report');
    } else if (tab === 'transactions') {
      newParams.set('report_type', 'transaction_ledger');
    } else {
      newParams.set('report_type', 'revenue_overview');
    }
    setSearchParams(newParams);
  };

  const handlePayoutSelection = (payoutId: string) => {
    setSelectedPayouts(prev =>
      prev.includes(payoutId)
        ? prev.filter(id => id !== payoutId)
        : [...prev, payoutId]
    );
  };

  const handleProcessPayouts = () => {
    if (selectedPayouts.length === 0) return;
    if (confirm(`Process ${selectedPayouts.length} payout(s)?`)) {
      processPayoutsMutation.mutate(selectedPayouts);
    }
  };

  const handleCommissionSave = () => {
    updateCommissionMutation.mutate({
      defaultRate: editedCommissionRate,
      tierRates: {}
    });
  };

  // Initialize edited commission rate
  useEffect(() => {
    if (commissionQuery.data) {
      setEditedCommissionRate(commissionQuery.data.default_commission_rate);
    }
  }, [commissionQuery.data]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-12">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Financials</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Revenue tracking, commission management, and payout processing
                </p>
              </div>

              {/* Period Selector */}
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <select
                  value={dateRangeFilter.preset}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="current_month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mt-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {[
                  { id: 'revenue', label: 'Revenue Overview', icon: TrendingUp },
                  { id: 'commission', label: 'Commission Settings', icon: Settings },
                  { id: 'payouts', label: 'Payouts', icon: DollarSign },
                  { id: 'transactions', label: 'Transactions', icon: CreditCard },
                  { id: 'reports', label: 'Reports', icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as typeof activeTab)}
                      className={`
                        flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                        ${activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                      aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* ============================================ */}
          {/* REVENUE OVERVIEW TAB */}
          {/* ============================================ */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* Metrics Cards */}
              {revenueQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : revenueQuery.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-700">Failed to load revenue metrics</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Revenue */}
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {formatCurrency(revenueQuery.data?.total_revenue || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <DollarSign className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span>Platform gross revenue</span>
                    </div>
                  </div>

                  {/* Commission Revenue */}
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Commission Revenue</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {formatCurrency(revenueQuery.data?.commission_revenue || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <span>Platform earnings</span>
                    </div>
                  </div>

                  {/* Payment Processing Fees */}
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Processing Fees</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {formatCurrency(revenueQuery.data?.payment_processing_fees || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-amber-100 rounded-lg">
                        <CreditCard className="h-8 w-8 text-amber-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <span>Payment gateway fees</span>
                    </div>
                  </div>

                  {/* Net Revenue */}
                  <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Net Revenue</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900">
                          {formatCurrency(revenueQuery.data?.net_revenue || 0)}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <span>After processing fees</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Breakdown */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <span className="text-sm font-medium text-gray-700">Gross Marketplace Volume (GMV)</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(revenueQuery.data?.total_revenue || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                      <span className="text-sm font-medium text-gray-700">Platform Commission (8.5%)</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      +{formatCurrency(revenueQuery.data?.commission_revenue || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                      <span className="text-sm font-medium text-gray-700">Payment Processing Fees (~2.9%)</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      -{formatCurrency(revenueQuery.data?.payment_processing_fees || 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 pt-4">
                    <span className="text-sm font-bold text-gray-900">Net Platform Revenue</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(revenueQuery.data?.net_revenue || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* COMMISSION SETTINGS TAB */}
          {/* ============================================ */}
          {activeTab === 'commission' && (
            <div className="space-y-6">
              {commissionQuery.isLoading ? (
                <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Commission Rate Configuration</h3>
                      {!commissionEditMode ? (
                        <button
                          onClick={() => setCommissionEditMode(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Edit Rates
                        </button>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setCommissionEditMode(false);
                              setEditedCommissionRate(commissionQuery.data?.default_commission_rate || 8.5);
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCommissionSave}
                            disabled={updateCommissionMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {updateCommissionMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Default Commission Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Default Commission Rate
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editedCommissionRate}
                          onChange={(e) => setEditedCommissionRate(parseFloat(e.target.value))}
                          disabled={!commissionEditMode}
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-lg font-semibold text-gray-700">%</span>
                        <p className="text-sm text-gray-600">
                          Applied to all supplier transactions unless custom rate set
                        </p>
                      </div>
                    </div>

                    {/* Commission Calculation Example */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Calculation Example</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Order Total:</span>
                          <span className="font-medium text-gray-900">$1,000.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Commission ({editedCommissionRate}%):</span>
                          <span className="font-medium text-green-600">
                            ${(1000 * editedCommissionRate / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-300">
                          <span className="font-semibold text-gray-900">Supplier Receives:</span>
                          <span className="font-bold text-gray-900">
                            ${(1000 - (1000 * editedCommissionRate / 100)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Custom Supplier Rates */}
                    {commissionQuery.data?.custom_supplier_rates && commissionQuery.data.custom_supplier_rates.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Custom Supplier Rates</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Custom Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {commissionQuery.data.custom_supplier_rates.map((rate) => (
                                <tr key={rate.supplier_id}>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                    {rate.business_name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {rate.rate}%
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    Immediate
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* PAYOUTS TAB */}
          {/* ============================================ */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              {payoutsQuery.isLoading ? (
                <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Payout Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Scheduled Payouts</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">
                            {payoutsQuery.data?.scheduled_payouts.length || 0}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {formatCurrency(payoutsQuery.data?.payout_summary.total_scheduled_amount || 0)} total
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Processing</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">
                            {payoutsQuery.data?.pending_payouts.length || 0}
                          </p>
                        </div>
                        <RefreshCcw className="h-8 w-8 text-amber-600 animate-spin" />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {formatCurrency(payoutsQuery.data?.payout_summary.total_pending_amount || 0)} total
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Failed</p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">
                            {payoutsQuery.data?.failed_payouts.length || 0}
                          </p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <p className="mt-2 text-sm text-red-600">
                        Requires attention
                      </p>
                    </div>
                  </div>

                  {/* Scheduled Payouts Table */}
                  {payoutsQuery.data && payoutsQuery.data.scheduled_payouts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Scheduled Payouts</h3>
                          {selectedPayouts.length > 0 && (
                            <button
                              onClick={handleProcessPayouts}
                              disabled={processPayoutsMutation.isPending}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {processPayoutsMutation.isPending ? 'Processing...' : `Process ${selectedPayouts.length} Payout(s)`}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedPayouts.length === payoutsQuery.data.scheduled_payouts.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPayouts(payoutsQuery.data!.scheduled_payouts.map(p => p.payout_id));
                                    } else {
                                      setSelectedPayouts([]);
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Supplier
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Commission
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Net Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Scheduled Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Orders
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {payoutsQuery.data.scheduled_payouts.map((payout) => (
                              <tr key={payout.payout_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedPayouts.includes(payout.payout_id)}
                                    onChange={() => handlePayoutSelection(payout.payout_id)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {payout.supplier_name || payout.supplier_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(payout.amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                  -{formatCurrency(payout.platform_commission)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                  {formatCurrency(payout.net_amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {formatDate(payout.scheduled_date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {payout.included_orders?.length || 0} orders
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Processing Payouts */}
                  {payoutsQuery.data && payoutsQuery.data.pending_payouts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Processing Payouts</h3>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Supplier
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Net Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transaction Ref
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {payoutsQuery.data.pending_payouts.map((payout) => (
                              <tr key={payout.payout_id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {payout.supplier_name || payout.supplier_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(payout.net_amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
                                    Processing
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {payout.transaction_reference || 'Pending...'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Failed Payouts */}
                  {payoutsQuery.data && payoutsQuery.data.failed_payouts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-red-200">
                      <div className="p-6 border-b border-red-200 bg-red-50">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <h3 className="text-lg font-semibold text-red-900">Failed Payouts - Requires Attention</h3>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Supplier
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Scheduled Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Failure Reason
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {payoutsQuery.data.failed_payouts.map((payout) => (
                              <tr key={payout.payout_id} className="bg-red-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {payout.supplier_name || payout.supplier_id}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(payout.net_amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {formatDate(payout.scheduled_date)}
                                </td>
                                <td className="px-6 py-4 text-sm text-red-700">
                                  {payout.failure_reason || 'Unknown error'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <button className="text-blue-600 hover:text-blue-800 font-medium">
                                    Retry
                                  </button>
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

          {/* ============================================ */}
          {/* TRANSACTIONS TAB */}
          {/* ============================================ */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Transaction Ledger</h3>
                    <div className="flex items-center space-x-3">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2">
                        <Filter className="h-4 w-4" />
                        <span>Filter</span>
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2">
                        <Download className="h-4 w-4" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Transaction History</h4>
                    <p className="text-sm text-gray-600 mb-6">
                      Detailed transaction ledger will be available in the next release
                    </p>
                    <Link
                      to="/admin/orders"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All Orders
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* REPORTS TAB */}
          {/* ============================================ */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Financial Reports</h3>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Generate Revenue Report */}
                    <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-2">Revenue Report</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Comprehensive revenue breakdown with commission details
                          </p>
                        </div>
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Generate Report
                      </button>
                    </div>

                    {/* Generate Payout Report */}
                    <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-2">Payout Report</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Supplier payout history and reconciliation
                          </p>
                        </div>
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Generate Report
                      </button>
                    </div>

                    {/* Generate Tax Report */}
                    <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-2">Tax Summary</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Sales tax collected and payment processing fees
                          </p>
                        </div>
                        <FileText className="h-6 w-6 text-purple-600" />
                      </div>
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Generate Report
                      </button>
                    </div>

                    {/* Generate Audit Report */}
                    <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-2">Audit Trail</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Complete financial transaction audit log
                          </p>
                        </div>
                        <FileText className="h-6 w-6 text-gray-600" />
                      </div>
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Generate Report
                      </button>
                    </div>
                  </div>

                  {/* Recent Reports (Empty State) */}
                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">Recent Reports</h4>
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">No reports generated yet</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_AdminFinancials;
