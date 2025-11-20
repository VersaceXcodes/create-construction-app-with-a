import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Issue {
  issue_id: string;
  order_id: string;
  customer_id: string;
  supplier_id: string;
  issue_type: string;
  affected_items: string[];
  status: string;
  description: string;
  evidence_photos: string[];
  desired_resolution: string;
  resolution_offered: string | null;
  resolution_amount: number | null;
  resolution_accepted: boolean;
  resolution_accepted_date: string | null;
  opened_date: string;
  resolved_date: string | null;
  escalated_to_admin: boolean;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DisputeMessage {
  message_id: string;
  sender_id: string;
  sender_type: 'customer' | 'supplier' | 'admin';
  message_text: string;
  timestamp: string;
  attachments: string[];
}

interface DisputeAnalytics {
  open_disputes_count: number;
  avg_resolution_time: number;
  resolution_outcomes: Record<string, number>;
}

interface FilterConfig {
  status: string | null;
  issue_type: string | null;
  assigned_admin_id: string | null;
}

interface ResolutionForm {
  resolution_type: string;
  resolution_amount: number | null;
  resolution_description: string;
  admin_notes: string;
}

interface PaginationState {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchDisputes = async (
  authToken: string,
  filters: FilterConfig,
  pagination: PaginationState
): Promise<{ issues: Issue[]; total: number }> => {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.issue_type) params.append('issue_type', filters.issue_type);
  if (filters.assigned_admin_id) params.append('assigned_admin', filters.assigned_admin_id);
  params.append('limit', pagination.limit.toString());
  params.append('offset', ((pagination.current_page - 1) * pagination.limit).toString());
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/disputes?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  
  return {
    issues: response.data,
    total: response.data.length, // Backend should return total count in production
  };
};

const fetchDisputeDetails = async (
  authToken: string,
  issueId: string
): Promise<{ issue: Issue; messages: DisputeMessage[] }> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/issues/${issueId}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );
  
  return {
    issue: response.data.issue || response.data,
    messages: response.data.messages || [],
  };
};

const resolveDispute = async (
  authToken: string,
  issueId: string,
  resolutionData: {
    resolution_offered: string;
    resolution_amount: number | null;
    admin_notes: string;
  }
): Promise<Issue> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/disputes/${issueId}/resolve`,
    resolutionData,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};

const addDisputeMessage = async (
  authToken: string,
  issueId: string,
  messageData: {
    message_text: string;
    attachments: string[];
  }
): Promise<DisputeMessage> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/issues/${issueId}/messages`,
    messageData,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminDisputeManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [selected_dispute, set_selected_dispute] = useState<Issue | null>(null);
  const [active_tab, set_active_tab] = useState<'details' | 'evidence' | 'communication' | 'resolution'>('details');
  const [message_input, set_message_input] = useState('');
  
  const [filter_config, set_filter_config] = useState<FilterConfig>({
    status: searchParams.get('status_filter'),
    issue_type: searchParams.get('dispute_type'),
    assigned_admin_id: searchParams.get('assigned_admin'),
  });

  const [resolution_form, set_resolution_form] = useState<ResolutionForm>({
    resolution_type: '',
    resolution_amount: null,
    resolution_description: '',
    admin_notes: '',
  });

  const [pagination, set_pagination] = useState<PaginationState>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    limit: 50,
  });

  // ============================================================================
  // SYNC FILTERS WITH URL
  // ============================================================================

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter_config.status) params.set('status_filter', filter_config.status);
    if (filter_config.issue_type) params.set('dispute_type', filter_config.issue_type);
    if (filter_config.assigned_admin_id) params.set('assigned_admin', filter_config.assigned_admin_id);
    setSearchParams(params, { replace: true });
  }, [filter_config, setSearchParams]);

  // ============================================================================
  // QUERIES
  // ============================================================================

  const {
    data: disputes_data,
    isLoading: disputes_loading,
    error: disputes_error,
  } = useQuery({
    queryKey: ['admin_disputes', filter_config, pagination.current_page],
    queryFn: () => fetchDisputes(authToken!, filter_config, pagination),
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
  });

  const disputes_list = disputes_data?.issues || [];

  const {
    data: dispute_details,
    isLoading: details_loading,
  } = useQuery({
    queryKey: ['dispute_details', selected_dispute?.issue_id],
    queryFn: () => fetchDisputeDetails(authToken!, selected_dispute!.issue_id),
    enabled: !!authToken && !!selected_dispute,
    staleTime: 10000, // 10 seconds
  });

  const communication_thread = dispute_details?.messages || [];

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const resolve_mutation = useMutation({
    mutationFn: (data: { issue_id: string; resolution_data: any }) =>
      resolveDispute(authToken!, data.issue_id, data.resolution_data),
    onSuccess: (updated_issue) => {
      queryClient.invalidateQueries({ queryKey: ['admin_disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute_details'] });
      set_selected_dispute(updated_issue);
      set_resolution_form({
        resolution_type: '',
        resolution_amount: null,
        resolution_description: '',
        admin_notes: '',
      });
      alert('Dispute resolved successfully!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to resolve dispute');
    },
  });

  const message_mutation = useMutation({
    mutationFn: (data: { issue_id: string; message_data: any }) =>
      addDisputeMessage(authToken!, data.issue_id, data.message_data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute_details'] });
      set_message_input('');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to send message');
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handle_filter_change = (key: keyof FilterConfig, value: string | null) => {
    set_filter_config(prev => ({ ...prev, [key]: value }));
    set_pagination(prev => ({ ...prev, current_page: 1 })); // Reset to page 1
  };

  const handle_dispute_select = (dispute: Issue) => {
    set_selected_dispute(dispute);
    set_active_tab('details');
  };

  const handle_resolve_submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selected_dispute || !resolution_form.resolution_type) {
      alert('Please fill in required fields');
      return;
    }

    resolve_mutation.mutate({
      issue_id: selected_dispute.issue_id,
      resolution_data: {
        resolution_offered: resolution_form.resolution_type,
        resolution_amount: resolution_form.resolution_amount,
        admin_notes: resolution_form.admin_notes,
      },
    });
  };

  const handle_send_message = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selected_dispute || !message_input.trim()) {
      return;
    }

    message_mutation.mutate({
      issue_id: selected_dispute.issue_id,
      message_data: {
        message_text: message_input,
        attachments: [],
      },
    });
  };

  // ============================================================================
  // ANALYTICS CALCULATION (from disputes list)
  // ============================================================================

  const dispute_analytics: DisputeAnalytics = {
    open_disputes_count: disputes_list.filter(d => d.status === 'open' || d.status === 'under_review').length,
    avg_resolution_time: disputes_list
      .filter(d => d.resolved_date)
      .reduce((acc, d) => {
        const opened = new Date(d.opened_date).getTime();
        const resolved = new Date(d.resolved_date!).getTime();
        return acc + (resolved - opened) / (1000 * 60 * 60); // Hours
      }, 0) / (disputes_list.filter(d => d.resolved_date).length || 1),
    resolution_outcomes: disputes_list
      .filter(d => d.resolution_offered)
      .reduce((acc, d) => {
        acc[d.resolution_offered!] = (acc[d.resolution_offered!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const format_date = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const get_status_color = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const get_issue_type_label = (type: string) => {
    const labels: Record<string, string> = {
      late_delivery: 'Late Delivery',
      wrong_item: 'Wrong Item',
      damaged_item: 'Damaged Item',
      missing_item: 'Missing Item',
      quality_issue: 'Quality Issue',
      billing_issue: 'Billing Issue',
      delivery_not_attempted: 'Delivery Not Attempted',
      other: 'Other',
    };
    return labels[type] || type;
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution Center</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage and resolve customer disputes with mediation tools
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-4 md:mt-0 flex space-x-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-yellow-800">{dispute_analytics.open_disputes_count}</div>
                  <div className="text-xs text-yellow-600">Open Disputes</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <div className="text-2xl font-bold text-blue-800">{dispute_analytics.avg_resolution_time.toFixed(1)}h</div>
                  <div className="text-xs text-blue-600">Avg Resolution Time</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
              {/* Status Filter */}
              <div className="flex-1">
                <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  value={filter_config.status || ''}
                  onChange={(e) => handle_filter_change('status', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="awaiting_response">Awaiting Response</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Issue Type Filter */}
              <div className="flex-1">
                <label htmlFor="type-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  Issue Type
                </label>
                <select
                  id="type-filter"
                  value={filter_config.issue_type || ''}
                  onChange={(e) => handle_filter_change('issue_type', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="late_delivery">Late Delivery</option>
                  <option value="wrong_item">Wrong Item</option>
                  <option value="damaged_item">Damaged Item</option>
                  <option value="missing_item">Missing Item</option>
                  <option value="quality_issue">Quality Issue</option>
                  <option value="billing_issue">Billing Issue</option>
                  <option value="delivery_not_attempted">Delivery Not Attempted</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(filter_config.status || filter_config.issue_type || filter_config.assigned_admin_id) && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      set_filter_config({ status: null, issue_type: null, assigned_admin_id: null });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Disputes List - Left Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Disputes</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {disputes_list.length} dispute{disputes_list.length !== 1 ? 's' : ''} found
                  </p>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                  {disputes_loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : disputes_error ? (
                    <div className="p-6 text-center">
                      <p className="text-red-600 text-sm">Failed to load disputes</p>
                    </div>
                  ) : disputes_list.length === 0 ? (
                    <div className="p-8 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">No disputes found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {disputes_list.map((dispute) => (
                        <div
                          key={dispute.issue_id}
                          onClick={() => handle_dispute_select(dispute)}
                          className={`p-4 cursor-pointer transition-all hover:bg-gray-50 ${
                            selected_dispute?.issue_id === dispute.issue_id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${get_status_color(dispute.status)}`}>
                                  {dispute.status.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {get_issue_type_label(dispute.issue_type)}
                                </span>
                              </div>
                              
                              <p className="text-sm font-medium text-gray-900 truncate">
                                Order #{dispute.order_id.slice(-8)}
                              </p>
                              
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {dispute.description}
                              </p>
                              
                              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                <span>{format_date(dispute.opened_date)}</span>
                                {dispute.escalated_to_admin && (
                                  <span className="inline-flex items-center text-red-600 font-medium">
                                    <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Escalated
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <svg
                              className="h-5 w-5 text-gray-400 ml-2"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {disputes_list.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <button
                      onClick={() => set_pagination(prev => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))}
                      disabled={pagination.current_page === 1}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.current_page}
                    </span>
                    <button
                      onClick={() => set_pagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                      disabled={disputes_list.length < pagination.limit}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Dispute Detail Panel - Right Panel */}
            <div className="lg:col-span-7">
              {!selected_dispute ? (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Dispute Selected</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Select a dispute from the list to view details and manage resolution
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Dispute Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-xl font-bold text-gray-900">
                            Issue #{selected_dispute.issue_id.slice(-8)}
                          </h2>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${get_status_color(selected_dispute.status)}`}>
                            {selected_dispute.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Order #{selected_dispute.order_id.slice(-8)} • {get_issue_type_label(selected_dispute.issue_type)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => set_selected_dispute(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                      {(['details', 'evidence', 'communication', 'resolution'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => set_active_tab(tab)}
                          className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            active_tab === tab
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' ')}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                    {details_loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <>
                        {/* Details Tab */}
                        {active_tab === 'details' && (
                          <div className="space-y-6">
                            <div>
                              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                              <p className="text-sm text-gray-900 bg-gray-50 rounded-lg p-4">
                                {selected_dispute.description}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Opened Date</h3>
                                <p className="text-sm text-gray-900">{format_date(selected_dispute.opened_date)}</p>
                              </div>
                              
                              <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-1">Desired Resolution</h3>
                                <p className="text-sm text-gray-900 capitalize">
                                  {selected_dispute.desired_resolution.replace('_', ' ')}
                                </p>
                              </div>
                              
                              {selected_dispute.resolved_date && (
                                <div>
                                  <h3 className="text-sm font-medium text-gray-700 mb-1">Resolved Date</h3>
                                  <p className="text-sm text-gray-900">{format_date(selected_dispute.resolved_date)}</p>
                                </div>
                              )}
                              
                              {selected_dispute.assigned_admin_id && (
                                <div>
                                  <h3 className="text-sm font-medium text-gray-700 mb-1">Assigned Admin</h3>
                                  <p className="text-sm text-gray-900">{selected_dispute.assigned_admin_id}</p>
                                </div>
                              )}
                            </div>

                            {selected_dispute.affected_items.length > 0 && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Affected Items</h3>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <ul className="list-disc list-inside text-sm text-gray-900 space-y-1">
                                    {selected_dispute.affected_items.map((item, idx) => (
                                      <li key={idx}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            <div className="pt-4 border-t border-gray-200">
                              <Link
                                to={`/admin/orders?order_id=${selected_dispute.order_id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                View Related Order →
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Evidence Tab */}
                        {active_tab === 'evidence' && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-700">Evidence Photos</h3>
                            
                            {selected_dispute.evidence_photos.length === 0 ? (
                              <div className="text-center py-8">
                                <svg
                                  className="mx-auto h-12 w-12 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                <p className="mt-2 text-sm text-gray-600">No evidence photos uploaded</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4">
                                {selected_dispute.evidence_photos.map((photo_url, idx) => (
                                  <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                    <img
                                      src={photo_url}
                                      alt={`Evidence ${idx + 1}`}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => window.open(photo_url, '_blank')}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Communication Tab */}
                        {active_tab === 'communication' && (
                          <div className="space-y-6">
                            <div className="space-y-4 mb-6" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                              {communication_thread.length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-sm text-gray-600">No messages yet</p>
                                </div>
                              ) : (
                                communication_thread.map((msg) => (
                                  <div
                                    key={msg.message_id}
                                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                                      msg.sender_type === 'admin'
                                        ? 'bg-blue-600 text-white'
                                        : msg.sender_type === 'customer'
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'bg-green-100 text-gray-900'
                                    }`}>
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className="text-xs font-medium opacity-75">
                                          {msg.sender_type.charAt(0).toUpperCase() + msg.sender_type.slice(1)}
                                        </span>
                                        <span className="text-xs opacity-60">
                                          {format_date(msg.timestamp)}
                                        </span>
                                      </div>
                                      <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                                      
                                      {msg.attachments.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {msg.attachments.map((url, idx) => (
                                            <a
                                              key={idx}
                                              href={url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block text-xs underline opacity-75 hover:opacity-100"
                                            >
                                              Attachment {idx + 1}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Message Input */}
                            <form onSubmit={handle_send_message} className="border-t border-gray-200 pt-4">
                              <div className="flex space-x-2">
                                <input
                                  type="text"
                                  value={message_input}
                                  onChange={(e) => set_message_input(e.target.value)}
                                  placeholder="Type your message..."
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                                <button
                                  type="submit"
                                  disabled={!message_input.trim() || message_mutation.isPending}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {message_mutation.isPending ? 'Sending...' : 'Send'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Resolution Tab */}
                        {active_tab === 'resolution' && (
                          <form onSubmit={handle_resolve_submit} className="space-y-6">
                            {selected_dispute.status === 'resolved' || selected_dispute.status === 'closed' ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-green-800 mb-2">Dispute Resolved</h3>
                                {selected_dispute.resolution_offered && (
                                  <div className="space-y-2 text-sm text-green-700">
                                    <p><strong>Resolution:</strong> {selected_dispute.resolution_offered}</p>
                                    {selected_dispute.resolution_amount && (
                                      <p><strong>Amount:</strong> ${selected_dispute.resolution_amount.toFixed(2)}</p>
                                    )}
                                    {selected_dispute.resolved_date && (
                                      <p><strong>Resolved on:</strong> {format_date(selected_dispute.resolved_date)}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <div>
                                  <label htmlFor="resolution-type" className="block text-sm font-medium text-gray-700 mb-2">
                                    Resolution Type *
                                  </label>
                                  <select
                                    id="resolution-type"
                                    value={resolution_form.resolution_type}
                                    onChange={(e) => set_resolution_form(prev => ({ ...prev, resolution_type: e.target.value }))}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value="">Select resolution...</option>
                                    <option value="full_refund">Full Refund</option>
                                    <option value="partial_refund">Partial Refund</option>
                                    <option value="replacement">Replacement Item</option>
                                    <option value="credit">Store Credit</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>

                                {(resolution_form.resolution_type === 'full_refund' || 
                                  resolution_form.resolution_type === 'partial_refund' || 
                                  resolution_form.resolution_type === 'credit') && (
                                  <div>
                                    <label htmlFor="resolution-amount" className="block text-sm font-medium text-gray-700 mb-2">
                                      Amount (USD)
                                    </label>
                                    <input
                                      id="resolution-amount"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={resolution_form.resolution_amount || ''}
                                      onChange={(e) => set_resolution_form(prev => ({ 
                                        ...prev, 
                                        resolution_amount: e.target.value ? parseFloat(e.target.value) : null 
                                      }))}
                                      placeholder="Enter amount"
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                )}

                                <div>
                                  <label htmlFor="resolution-description" className="block text-sm font-medium text-gray-700 mb-2">
                                    Resolution Description
                                  </label>
                                  <textarea
                                    id="resolution-description"
                                    value={resolution_form.resolution_description}
                                    onChange={(e) => set_resolution_form(prev => ({ ...prev, resolution_description: e.target.value }))}
                                    rows={4}
                                    placeholder="Explain the resolution to the customer..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                <div>
                                  <label htmlFor="admin-notes" className="block text-sm font-medium text-gray-700 mb-2">
                                    Internal Admin Notes
                                  </label>
                                  <textarea
                                    id="admin-notes"
                                    value={resolution_form.admin_notes}
                                    onChange={(e) => set_resolution_form(prev => ({ ...prev, admin_notes: e.target.value }))}
                                    rows={3}
                                    placeholder="Internal notes (not visible to customer/supplier)..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                <div className="flex space-x-3 pt-4">
                                  <button
                                    type="submit"
                                    disabled={!resolution_form.resolution_type || resolve_mutation.isPending}
                                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                  >
                                    {resolve_mutation.isPending ? (
                                      <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Resolving...
                                      </span>
                                    ) : (
                                      'Resolve Dispute'
                                    )}
                                  </button>
                                </div>
                              </>
                            )}
                          </form>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_AdminDisputeManagement;