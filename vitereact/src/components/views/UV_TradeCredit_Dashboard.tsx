import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  
  Download,
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CreditAccountSummary {
  trade_credit_limit: number;
  trade_credit_balance: number;
  trade_credit_used: number;
  trade_credit_terms: string;
  trade_credit_status: string;
  available_credit: number;
  credit_utilization_percentage: number;
}

interface Transaction {
  transaction_id: string;
  transaction_type: 'purchase' | 'payment' | 'credit' | 'debit' | 'adjustment';
  amount: number;
  description: string;
  transaction_date: string;
  reference_order_id: string | null;
  running_balance: number;
}

interface PaymentMethod {
  payment_method_id: string;
  payment_type: string;
  card_brand: string | null;
  card_last_four: string | null;
  card_expiry_month: string | null;
  card_expiry_year: string | null;
  is_default: boolean;
}

interface PaymentFormData {
  payment_amount: number;
  payment_method_id: string;
  payment_date: string;
}

interface CreditIncreaseRequest {
  requested_new_limit: number;
  business_justification: string;
  updated_financial_documents: string[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const fetchCreditAccountSummary = async (token: string: string): Promise<CreditAccountSummary> => {
  const response = await axios.get(`${API_BASE_URL}/customers/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = response.data;
  
  return {
    trade_credit_limit: Number(data.trade_credit_limit || 0),
    trade_credit_balance: Number(data.trade_credit_balance || 0),
    trade_credit_used: Number(data.trade_credit_used || 0),
    trade_credit_terms: data.trade_credit_terms || 'Net 30',
    trade_credit_status: data.trade_credit_status || 'pending',
    available_credit: Number(data.trade_credit_balance || 0),
    credit_utilization_percentage: data.trade_credit_limit > 0 
      ? (Number(data.trade_credit_used || 0) / Number(data.trade_credit_limit)) * 100 
      : 0
  };
};

const fetchPaymentMethods = async (token: string): Promise<PaymentMethod[]> => {
  const response = await axios.get(`${API_BASE_URL}/payment-methods`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return response.data.filter((pm: PaymentMethod) => 
    pm.payment_type === 'credit_card' || pm.payment_type === 'debit_card'
  );
};

// Note: These endpoints would need backend implementation
const fetchTransactionHistory = async (
  token: string, 
  customer_id: string,
  date_from?: string,
  date_to?: string
): Promise<Transaction[]> => {
  // Mock data for now - backend would implement GET /api/trade-credit/transactions
  // In production, this would be:
  // const response = await axios.get(`${API_BASE_URL}/trade-credit/transactions`, {
  //   headers: { Authorization: `Bearer ${token}` },
  //   params: { customer_id, date_from, date_to, limit: 50, offset: 0 }
  // });
  // return response.data.transactions;
  
  return [
    {
      transaction_id: 'txn_001',
      transaction_type: 'purchase',
      amount: 1500.00,
      description: 'Order ORD-2024-001',
      transaction_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      reference_order_id: 'order_001',
      running_balance: 48500.00
    },
    {
      transaction_id: 'txn_002',
      transaction_type: 'payment',
      amount: -2000.00,
      description: 'Payment received',
      transaction_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      reference_order_id: null,
      running_balance: 50000.00
    }
  ];
};

const submitPayment = async (
  token: string,
  payment_data: { customer_id: string; payment_amount: number; payment_method_id: string }
) => {
  // Backend would implement POST /api/trade-credit/payments
  // For now, return mock success
  return {
    transaction_id: `txn_${Date.now()}`,
    status: 'completed',
    new_balance: 0,
    confirmation_number: `CONF${Date.now()}`
  };
};

const submitCreditIncreaseRequest = async (
  token: string,
  request_data: CreditIncreaseRequest & { customer_id: string; current_limit: number }
) => {
  // Backend would implement POST /api/trade-credit/increase-request
  return {
    request_id: `req_${Date.now()}`,
    status: 'pending_review',
    estimated_review_time: '2-3 business days'
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_TradeCredit_Dashboard: React.FC = () => {
  // Global state access - CRITICAL: Individual selectors
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const customerProfile = useAppStore(state => state.authentication_state.customer_profile);

  const queryClient = useQueryClient();

  // Local state
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'payment' | 'increase'>('overview');
  // const [showPaymentModal, setShowPaymentModal] = useState(false);
  // const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState({
    start_date: '',
    end_date: '',
    period_preset: 'last_30_days'
  });
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    payment_amount: 0,
    payment_method_id: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const [creditIncreaseRequest, setCreditIncreaseRequest] = useState<CreditIncreaseRequest>({
    requested_new_limit: 0,
    business_justification: '',
    updated_financial_documents: []
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [increaseError, setIncreaseError] = useState<string | null>(null);

  // Fetch credit account summary
  const { 
    data: creditSummary, 
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['credit-account-summary', customerProfile?.customer_id],
    queryFn: () => fetchCreditAccountSummary(authToken!, customerProfile!.customer_id),
    enabled: !!authToken && !!customerProfile,
    staleTime: 60000,
    refetchOnWindowFocus: true,
    select: (data) => ({
      ...data,
      trade_credit_limit: Number(data.trade_credit_limit || 0),
      trade_credit_balance: Number(data.trade_credit_balance || 0),
      trade_credit_used: Number(data.trade_credit_used || 0)
    })
  });

  // Fetch transaction history
  const {
    data: transactions = [],
    isLoading: transactionsLoading
  } = useQuery({
    queryKey: ['trade-credit-transactions', customerProfile?.customer_id, dateRangeFilter],
    queryFn: () => fetchTransactionHistory(
      authToken!,
      customerProfile!.customer_id,
      dateRangeFilter.start_date,
      dateRangeFilter.end_date
    ),
    enabled: !!authToken && !!customerProfile && activeTab === 'transactions',
    staleTime: 30000
  });

  // Fetch payment methods
  const {
    data: paymentMethods = [],
    isLoading: paymentMethodsLoading
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => fetchPaymentMethods(authToken!),
    enabled: !!authToken && activeTab === 'payment',
    staleTime: 300000
  });

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: (payment_data: { customer_id: string; payment_amount: number; payment_method_id: string }) => 
      submitPayment(authToken!, payment_data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-account-summary'] });
      queryClient.invalidateQueries({ queryKey: ['trade-credit-transactions'] });
      setShowPaymentModal(false);
      setPaymentFormData({
        payment_amount: 0,
        payment_method_id: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
      setPaymentError(null);
    },
    onError: (error: any) => {
      setPaymentError(error.response?.data?.message || 'Payment failed. Please try again.');
    }
  });

  // Credit increase mutation
  const increaseMutation = useMutation({
    mutationFn: (request_data: CreditIncreaseRequest & { customer_id: string; current_limit: number }) =>
      submitCreditIncreaseRequest(authToken!, request_data),
    onSuccess: () => {
      setShowIncreaseModal(false);
      setCreditIncreaseRequest({
        requested_new_limit: 0,
        business_justification: '',
        updated_financial_documents: []
      });
      setIncreaseError(null);
    },
    onError: (error: any) => {
      setIncreaseError(error.response?.data?.message || 'Request failed. Please try again.');
    }
  });

  // Handlers
  const handleMakePayment = () => {
    setPaymentError(null);
    
    if (!paymentFormData.payment_amount || paymentFormData.payment_amount <= 0) {
      setPaymentError('Please enter a valid payment amount');
      return;
    }
    
    if (!paymentFormData.payment_method_id) {
      setPaymentError('Please select a payment method');
      return;
    }
    
    if (paymentFormData.payment_amount > (creditSummary?.trade_credit_used || 0)) {
      setPaymentError('Payment amount cannot exceed outstanding balance');
      return;
    }
    
    paymentMutation.mutate({
      customer_id: customerProfile!.customer_id,
      payment_amount: paymentFormData.payment_amount,
      payment_method_id: paymentFormData.payment_method_id
    });
  };

  const handleRequestIncrease = () => {
    setIncreaseError(null);
    
    if (!creditIncreaseRequest.requested_new_limit || creditIncreaseRequest.requested_new_limit <= (creditSummary?.trade_credit_limit || 0)) {
      setIncreaseError('Requested limit must be greater than current limit');
      return;
    }
    
    if (!creditIncreaseRequest.business_justification || creditIncreaseRequest.business_justification.length < 50) {
      setIncreaseError('Please provide a detailed business justification (minimum 50 characters)');
      return;
    }
    
    increaseMutation.mutate({
      customer_id: customerProfile!.customer_id,
      current_limit: creditSummary!.trade_credit_limit,
      requested_new_limit: creditIncreaseRequest.requested_new_limit,
      business_justification: creditIncreaseRequest.business_justification,
      updated_financial_documents: creditIncreaseRequest.updated_financial_documents
    });
  };

  const handleDownloadStatement = () => {
    // Would call: GET /api/trade-credit/statement
    window.open(`${API_BASE_URL}/trade-credit/statement?customer_id=${customerProfile?.customer_id}&format=pdf`, '_blank');
  };

  const handleDateRangePreset = (preset: string) => {
    const now = new Date();
    let start_date = '';
    
    switch (preset) {
      case 'last_30_days':
        start_date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last_90_days':
        start_date = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'this_year':
        start_date = `${now.getFullYear()}-01-01`;
        break;
      case 'all_time':
        start_date = '';
        break;
    }
    
    setDateRangeFilter({
      start_date,
      end_date: now.toISOString().split('T')[0],
      period_preset: preset
    });
  };

  // Check if credit is approved
  if (creditSummary && creditSummary.trade_credit_status !== 'approved') {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
              <AlertCircle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Trade Credit Not Available</h2>
              <p className="text-gray-600 mb-6">
                {creditSummary.trade_credit_status === 'pending' && 'Your trade credit application is being reviewed. We\'ll notify you once approved.'}
                {creditSummary.trade_credit_status === 'rejected' && 'Your trade credit application was not approved at this time.'}
                {creditSummary.trade_credit_status === 'suspended' && 'Your trade credit account has been temporarily suspended.'}
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  to="/dashboard"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Return to Dashboard
                </Link>
                {creditSummary.trade_credit_status === 'rejected' && (
                  <Link
                    to="/trade-credit/apply"
                    className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-300"
                  >
                    Reapply
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (summaryLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="h-32 bg-gray-200 rounded-xl"></div>
                <div className="h-32 bg-gray-200 rounded-xl"></div>
                <div className="h-32 bg-gray-200 rounded-xl"></div>
              </div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (summaryError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Failed to Load Credit Account</h2>
              <p className="text-red-700 mb-6">
                {(summaryError as any)?.response?.data?.message || 'An error occurred while loading your credit account. Please try again.'}
              </p>
              <button
                onClick={() => refetchSummary()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const outstanding_balance = {
    total_outstanding: Number(creditSummary?.trade_credit_used || 0),
    current_due: Number(creditSummary?.trade_credit_used || 0),
    overdue_amount: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: creditSummary?.trade_credit_terms || 'Net 30',
    late_fees: 0
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Trade Credit Account</h1>
                <p className="mt-2 text-gray-600">Manage your trade credit, view transactions, and make payments</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadStatement}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download Statement</span>
                </button>
                <button
                  onClick={() => refetchSummary()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Credit Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Credit Limit */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Credit Limit</span>
              </div>
              <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">
                  ${creditSummary?.trade_credit_limit.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-gray-500">{creditSummary?.trade_credit_terms}</p>
            </div>

            {/* Available Credit */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Available</span>
              </div>
              <div className="mb-2">
                <p className="text-3xl font-bold text-green-600">
                  ${creditSummary?.available_credit.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {creditSummary?.credit_utilization_percentage.toFixed(1)}% utilized
              </p>
            </div>

            {/* Outstanding Balance */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <DollarSign className="h-6 w-6 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">Outstanding</span>
              </div>
              <div className="mb-2">
                <p className="text-3xl font-bold text-amber-600">
                  ${creditSummary?.trade_credit_used.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Due: {new Date(outstanding_balance.due_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Credit Utilization Bar */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Credit Utilization</h3>
              <span className="text-sm font-medium text-gray-600">
                {creditSummary?.credit_utilization_percentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (creditSummary?.credit_utilization_percentage || 0) > 80 
                    ? 'bg-red-500' 
                    : (creditSummary?.credit_utilization_percentage || 0) > 50 
                    ? 'bg-amber-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(creditSummary?.credit_utilization_percentage || 0, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>$0</span>
              <span>${creditSummary?.trade_credit_limit.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => {
                setShowPaymentModal(true);
                setActiveTab('payment');
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
            >
              <DollarSign className="h-5 w-5" />
              Make Payment
            </button>
            <button
              onClick={() => {
                setShowIncreaseModal(true);
                setActiveTab('increase');
              }}
              className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300"
            >
              <ArrowUpRight className="h-5 w-5" />
              Request Credit Increase
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'transactions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Transaction History
                </button>
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'payment'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Make Payment
                </button>
                <button
                  onClick={() => setActiveTab('increase')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'increase'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Request Increase
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Status */}
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600 capitalize">
                              {creditSummary?.trade_credit_status}
                            </span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Terms:</span>
                          <span className="font-medium text-gray-900">{creditSummary?.trade_credit_terms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Account Type:</span>
                          <span className="font-medium text-gray-900">Trade</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Due:</span>
                          <span className="font-medium text-gray-900">
                            ${outstanding_balance.current_due.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Payment Due:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(outstanding_balance.due_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Overdue:</span>
                          <span className="font-medium text-red-600">
                            ${outstanding_balance.overdue_amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((txn) => (
                        <div 
                          key={txn.transaction_id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              txn.transaction_type === 'payment' 
                                ? 'bg-green-50' 
                                : 'bg-blue-50'
                            }`}>
                              {txn.transaction_type === 'payment' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{txn.description}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(txn.transaction_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              txn.transaction_type === 'payment' 
                                ? 'text-green-600' 
                                : 'text-gray-900'
                            }`}>
                              {txn.amount < 0 ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Balance: ${txn.running_balance.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="space-y-6">
                  {/* Date Range Filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Period:</label>
                    <div className="flex gap-2">
                      {['last_30_days', 'last_90_days', 'this_year', 'all_time'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handleDateRangePreset(preset)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            dateRangeFilter.period_preset === preset
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {preset.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction Table */}
                  {transactionsLoading ? (
                    <div className="animate-pulse space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
                      <p className="text-gray-600">No transactions found for the selected period</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Balance
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions.map((txn) => (
                            <tr key={txn.transaction_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(txn.transaction_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  txn.transaction_type === 'payment' 
                                    ? 'bg-green-100 text-green-800' 
                                    : txn.transaction_type === 'purchase'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {txn.transaction_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {txn.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                <span className={txn.transaction_type === 'payment' ? 'text-green-600' : 'text-gray-900'}>
                                  {txn.amount < 0 ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                ${txn.running_balance.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                {txn.reference_order_id ? (
                                  <Link
                                    to={`/orders/${txn.reference_order_id}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    View Order
                                  </Link>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Tab */}
              {activeTab === 'payment' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Make a Payment</h2>
                    <p className="text-gray-600">
                      Outstanding Balance: <span className="font-semibold text-amber-600">
                        ${outstanding_balance.total_outstanding.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  {paymentError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      <p className="text-sm">{paymentError}</p>
                    </div>
                  )}

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={outstanding_balance.total_outstanding}
                        value={paymentFormData.payment_amount || ''}
                        onChange={(e) => {
                          setPaymentError(null);
                          setPaymentFormData({
                            ...paymentFormData,
                            payment_amount: Number(e.target.value)
                          });
                        }}
                        placeholder="0.00"
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <button
                        onClick={() => setPaymentFormData({
                          ...paymentFormData,
                          payment_amount: outstanding_balance.total_outstanding
                        })}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Pay Full Balance
                      </button>
                      <button
                        onClick={() => setPaymentFormData({
                          ...paymentFormData,
                          payment_amount: outstanding_balance.total_outstanding / 2
                        })}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Pay Half
                      </button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    {paymentMethodsLoading ? (
                      <div className="animate-pulse h-12 bg-gray-200 rounded-lg"></div>
                    ) : paymentMethods.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-600 mb-4">No payment methods saved</p>
                        <Link
                          to="/account#payments"
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Add Payment Method
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={paymentFormData.payment_method_id}
                        onChange={(e) => {
                          setPaymentError(null);
                          setPaymentFormData({
                            ...paymentFormData,
                            payment_method_id: e.target.value
                          });
                        }}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select payment method</option>
                        {paymentMethods.map((pm) => (
                          <option key={pm.payment_method_id} value={pm.payment_method_id}>
                            {pm.card_brand} •••• {pm.card_last_four} 
                            {pm.is_default && ' (Default)'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData({
                        ...paymentFormData,
                        payment_date: e.target.value
                      })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleMakePayment}
                    disabled={paymentMutation.isPending}
                    className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentMutation.isPending ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-5 w-5" />
                        Submit Payment
                      </>
                    )}
                  </button>

                  {paymentMutation.isSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                      <p className="text-sm font-medium">Payment submitted successfully!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Request Increase Tab */}
              {activeTab === 'increase' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Credit Increase</h2>
                    <p className="text-gray-600">
                      Current Limit: <span className="font-semibold text-blue-600">
                        ${creditSummary?.trade_credit_limit.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  {increaseError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      <p className="text-sm">{increaseError}</p>
                    </div>
                  )}

                  {/* Requested New Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Requested New Credit Limit
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="1000"
                        min={creditSummary?.trade_credit_limit}
                        value={creditIncreaseRequest.requested_new_limit || ''}
                        onChange={(e) => {
                          setIncreaseError(null);
                          setCreditIncreaseRequest({
                            ...creditIncreaseRequest,
                            requested_new_limit: Number(e.target.value)
                          });
                        }}
                        placeholder="Enter requested amount"
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Increase of ${Math.max(0, (creditIncreaseRequest.requested_new_limit || 0) - (creditSummary?.trade_credit_limit || 0)).toFixed(2)}
                    </p>
                  </div>

                  {/* Business Justification */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Justification
                    </label>
                    <textarea
                      value={creditIncreaseRequest.business_justification}
                      onChange={(e) => {
                        setIncreaseError(null);
                        setCreditIncreaseRequest({
                          ...creditIncreaseRequest,
                          business_justification: e.target.value
                        });
                      }}
                      placeholder="Explain why you need the credit increase..."
                      rows={6}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      {creditIncreaseRequest.business_justification.length} / 500 characters (minimum 50)
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleRequestIncrease}
                    disabled={increaseMutation.isPending}
                    className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {increaseMutation.isPending ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-5 w-5" />
                        Submit Request
                      </>
                    )}
                  </button>

                  {increaseMutation.isSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                      <p className="text-sm font-medium">
                        Credit increase request submitted successfully! We'll review and respond within 2-3 business days.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Trade Credit Information</h3>
                <p className="text-blue-800 text-sm mb-3">
                  Your trade credit account allows you to make purchases now and pay later according to your agreed terms.
                </p>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Payment terms: {creditSummary?.trade_credit_terms}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Make payments anytime to free up credit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Request credit increases as your business grows</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_TradeCredit_Dashboard;