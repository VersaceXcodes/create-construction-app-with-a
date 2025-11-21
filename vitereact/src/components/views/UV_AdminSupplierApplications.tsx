import React, { useState } from 'react';
import { useSearchParams} from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Building2, 
  User, 
  
  
  MapPin,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckSquare,
  Square,
  Eye
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SupplierApplication {
  application_id: string;
  user_id: string;
  business_name: string;
  business_registration_number: string;
  business_type: string;
  contact_person_name: string;
  business_address: string;
  business_description: string;
  application_status: 'pending_review' | 'under_review' | 'approved' | 'rejected';
  submitted_documents: Record<string, string | null>;
  verification_checklist: {
    business_registration_verified: boolean;
    tax_id_verified: boolean;
    address_verified: boolean;
    identity_verified: boolean;
    background_check_completed: boolean;
  };
  assigned_reviewer_id: string | null;
  rejection_reason: string | null;
  submitted_date: string;
  reviewed_date: string | null;
  approved_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ApplicationsListResponse {
  applications: SupplierApplication[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

const fetchSupplierApplications = async (
  token: string,
  status_filter?: string | null,
  assigned_reviewer?: string | null,
  limit: number = 50,
  offset: number = 0
): Promise<ApplicationsListResponse> => {
  const params: Record<string, any> = { limit, offset };
  
  if (status_filter) params.application_status = status_filter;
  if (assigned_reviewer) params.assigned_reviewer_id = assigned_reviewer;
  
  const response = await axios.get(`${API_BASE_URL}/admin/supplier-applications`, {
    headers: { Authorization: `Bearer ${token}` },
    params
  });
  
  return response.data;
};

const fetchApplicationDetails = async (
  token: string,
  application_id: string
): Promise<SupplierApplication> => {
  const response = await axios.get(
    `${API_BASE_URL}/admin/supplier-applications/${application_id}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return response.data;
};

const approveApplication = async (
  token: string,
  application_id: string
): Promise<{ message: string; supplier: any }> => {
  const response = await axios.post(
    `${API_BASE_URL}/admin/supplier-applications/${application_id}/approve`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return response.data;
};

const rejectApplication = async (
  token: string,
  application_id: string,
  rejection_reason: string
): Promise<{ message: string }> => {
  const response = await axios.post(
    `${API_BASE_URL}/admin/supplier-applications/${application_id}/reject`,
    { rejection_reason },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return response.data;
};

const updateVerificationChecklist = async (
  token: string,
  application_id: string,
  verification_checklist: Record<string, boolean>
): Promise<SupplierApplication> => {
  const response = await axios.patch(
    `${API_BASE_URL}/admin/supplier-applications/${application_id}`,
    { verification_checklist },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminSupplierApplications: React.FC = () => {
  // const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [selected_application_id, setSelectedApplicationId] = useState<string | null>(null);
  const [show_rejection_modal, setShowRejectionModal] = useState(false);
  const [rejection_reason, setRejectionReason] = useState('');
  const [rejection_notes, setRejectionNotes] = useState('');
  const [show_document_modal, setShowDocumentModal] = useState(false);
  const [selected_document_url, setSelectedDocumentUrl] = useState('');
  
  // URL params state
  const status_filter = searchParams.get('status_filter');
  const assigned_reviewer = searchParams.get('assigned_reviewer');
  const current_page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 50;
  
  // Fetch applications list
  const { 
    data: applications_data, 
    isLoading: applications_loading,
    error: applications_error
  } = useQuery({
    queryKey: ['admin-supplier-applications', status_filter, assigned_reviewer, current_page],
    queryFn: () => fetchSupplierApplications(
      authToken!,
      status_filter,
      assigned_reviewer,
      limit,
      (current_page - 1) * limit
    ),
    enabled: !!authToken,
    staleTime: 30000,
    select: (data) => ({
      ...data,
      applications: data.applications || []
    })
  });
  
  // Fetch selected application details
  const { 
    data: selected_application,
    isLoading: details_loading
  } = useQuery({
    queryKey: ['supplier-application-details', selected_application_id],
    queryFn: () => fetchApplicationDetails(authToken!, selected_application_id!),
    enabled: !!authToken && !!selected_application_id,
    staleTime: 30000
  });
  
  // Approve mutation
  const approve_mutation = useMutation({
    mutationFn: (application_id: string) => approveApplication(authToken!, application_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-supplier-applications'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-application-details'] });
      setSelectedApplicationId(null);
    }
  });
  
  // Reject mutation
  const reject_mutation = useMutation({
    mutationFn: ({ application_id, reason }: { application_id: string; reason: string }) =>
      rejectApplication(authToken!, application_id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-supplier-applications'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-application-details'] });
      setShowRejectionModal(false);
      setRejectionReason('');
      setRejectionNotes('');
      setSelectedApplicationId(null);
    }
  });
  
  // Update checklist mutation
  const update_checklist_mutation = useMutation({
    mutationFn: ({ application_id, checklist }: { 
      application_id: string; 
      checklist: Record<string, boolean> 
    }) => updateVerificationChecklist(authToken!, application_id, checklist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-application-details', selected_application_id] });
    }
  });
  
  // Computed values
  const applications_list = applications_data?.applications || [];
  const total_count = applications_data?.total || 0;
  const total_pages = Math.ceil(total_count / limit);
  
  // Filter handlers
  const handleFilterChange = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };
  
  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };
  
  // Application selection
  const handleSelectApplication = (application_id: string) => {
    setSelectedApplicationId(application_id);
  };
  
  // Checklist toggle
  const handleChecklistToggle = (field: string) => {
    if (!selected_application) return;
    
    const updated_checklist = {
      ...selected_application.verification_checklist,
      [field]: !selected_application.verification_checklist[field as keyof typeof selected_application.verification_checklist]
    };
    
    update_checklist_mutation.mutate({
      application_id: selected_application.application_id,
      checklist: updated_checklist
    });
  };
  
  // Approve handler
  const handleApprove = () => {
    if (!selected_application) return;
    
    if (!window.confirm(`Are you sure you want to approve ${selected_application.business_name}?`)) {
      return;
    }
    
    approve_mutation.mutate(selected_application.application_id);
  };
  
  // Reject handlers
  const handleOpenRejectModal = () => {
    setShowRejectionModal(true);
  };
  
  const handleReject = () => {
    if (!selected_application || !rejection_reason.trim()) {
      return;
    }
    
    reject_mutation.mutate({
      application_id: selected_application.application_id,
      reason: rejection_reason.trim()
    });
  };
  
  // Document viewer
  const handleViewDocument = (url: string) => {
    setSelectedDocumentUrl(url);
    setShowDocumentModal(true);
  };
  
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Format status text
  const formatStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  // Calculate verification progress
  const getVerificationProgress = (checklist: Record<string, boolean> | undefined) => {
    if (!checklist) return 0;
    const total = Object.keys(checklist).length;
    const completed = Object.values(checklist).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Supplier Applications</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Review and approve supplier applications for platform onboarding
                </p>
              </div>
              
              {/* Stats Summary */}
              <div className="flex items-center space-x-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                  <p className="text-xs text-yellow-600 font-medium">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {applications_list.filter(app => app.application_status === 'pending_review').length}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <p className="text-xs text-blue-600 font-medium">Under Review</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {applications_list.filter(app => app.application_status === 'under_review').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Applications List */}
            <div className="lg:col-span-1 space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                </div>
                
                {/* Status Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Status
                  </label>
                  <select
                    value={status_filter || ''}
                    onChange={(e) => handleFilterChange('status_filter', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                {/* Clear Filters */}
                {(status_filter || assigned_reviewer) && (
                  <button
                    onClick={() => {
                      setSearchParams({});
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              
              {/* Applications List */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {applications_loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading applications...</p>
                  </div>
                ) : applications_error ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600">Failed to load applications</p>
                  </div>
                ) : applications_list.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No applications found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {applications_list.map((app) => (
                      <button
                        key={app.application_id}
                        onClick={() => handleSelectApplication(app.application_id)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selected_application_id === app.application_id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {app.business_name}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full border ${getStatusBadgeColor(app.application_status)}`}>
                            {formatStatusText(app.application_status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{app.business_type}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Submitted: {new Date(app.submitted_date).toLocaleDateString()}</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${getVerificationProgress(app.verification_checklist)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{getVerificationProgress(app.verification_checklist)}%</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Pagination */}
                {total_pages > 1 && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <button
                      onClick={() => handlePageChange(current_page - 1)}
                      disabled={current_page === 1}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                    
                    <span className="text-sm text-gray-700">
                      Page {current_page} of {total_pages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(current_page + 1)}
                      disabled={current_page === total_pages}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Column: Application Details */}
            <div className="lg:col-span-2">
              {!selected_application_id ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Application Selected</h3>
                  <p className="text-gray-600">
                    Select an application from the list to view details and begin review
                  </p>
                </div>
              ) : details_loading ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading application details...</p>
                </div>
              ) : !selected_application ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Not Found</h3>
                  <p className="text-gray-600">Unable to load application details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Application Header */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">
                            {selected_application.business_name}
                          </h2>
                          <p className="text-blue-100 text-sm">{selected_application.business_type}</p>
                        </div>
                        <span className={`text-sm px-3 py-1 rounded-full border ${getStatusBadgeColor(selected_application.application_status)} bg-white`}>
                          {formatStatusText(selected_application.application_status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      {/* Business Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start space-x-3">
                          <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Registration Number</p>
                            <p className="text-sm text-gray-900">{selected_application.business_registration_number}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <User className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Contact Person</p>
                            <p className="text-sm text-gray-900">{selected_application.contact_person_name}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Business Address</p>
                            <p className="text-sm text-gray-900">{selected_application.business_address}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Submitted Date</p>
                            <p className="text-sm text-gray-900">
                              {new Date(selected_application.submitted_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Business Description */}
                      {selected_application.business_description && (
                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-xs text-gray-500 font-medium mb-2">Business Description</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {selected_application.business_description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Verification Checklist */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Verification Checklist</h3>
                        <span className="text-sm font-medium text-blue-600">
                          {getVerificationProgress(selected_application.verification_checklist)}% Complete
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getVerificationProgress(selected_application.verification_checklist)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-3">
                      {Object.entries(selected_application.verification_checklist).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => handleChecklistToggle(key)}
                          disabled={update_checklist_mutation.isPending || selected_application.application_status !== 'under_review'}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center space-x-3">
                            {value ? (
                              <CheckSquare className="w-5 h-5 text-green-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                            <span className={`text-sm font-medium ${value ? 'text-gray-900' : 'text-gray-600'}`}>
                              {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </div>
                          {value && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Submitted Documents */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Submitted Documents</h3>
                    </div>
                    
                    <div className="p-6 space-y-3">
                      {Object.entries(selected_application.submitted_documents || {}).map(([doc_type, url]) => (
                        <div
                          key={doc_type}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                              {doc_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </div>
                          {url ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDocument(url)}
                                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <a
                                href={url}
                                download
                                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not provided</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  {selected_application.application_status === 'pending_review' || selected_application.application_status === 'under_review' ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Actions</h3>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleApprove}
                          disabled={approve_mutation.isPending || getVerificationProgress(selected_application.verification_checklist) < 100}
                          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {approve_mutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Approving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              <span>Approve Application</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={handleOpenRejectModal}
                          disabled={reject_mutation.isPending}
                          className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-5 h-5" />
                          <span>Reject Application</span>
                        </button>
                      </div>
                      
                      {getVerificationProgress(selected_application.verification_checklist) < 100 && (
                        <p className="mt-3 text-xs text-amber-600 flex items-center space-x-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>Complete all verification items before approving</span>
                        </p>
                      )}
                    </div>
                  ) : selected_application.application_status === 'approved' ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-green-900">Application Approved</p>
                          <p className="text-xs text-green-700">
                            Approved on {selected_application.approved_date ? new Date(selected_application.approved_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : selected_application.application_status === 'rejected' ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                      <div className="flex items-start space-x-3">
                        <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-900 mb-1">Application Rejected</p>
                          {selected_application.rejection_reason && (
                            <p className="text-sm text-red-700 bg-red-100 rounded-md p-3 mt-2">
                              <strong>Reason:</strong> {selected_application.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Rejection Modal */}
      {show_rejection_modal && selected_application && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Reject Application</h3>
              <p className="text-sm text-gray-600 mt-1">
                Provide a reason for rejecting {selected_application.business_name}
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <select
                  id="rejection_reason"
                  value={rejection_reason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select a reason</option>
                  <option value="incomplete_documentation">Incomplete Documentation</option>
                  <option value="failed_verification">Failed Verification</option>
                  <option value="business_type_not_eligible">Business Type Not Eligible</option>
                  <option value="duplicate_application">Duplicate Application</option>
                  <option value="suspicious_activity">Suspicious Activity</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="rejection_notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="rejection_notes"
                  value={rejection_notes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                  placeholder="Provide additional details about the rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                ></textarea>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                  setRejectionNotes('');
                }}
                disabled={reject_mutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={reject_mutation.isPending || !rejection_reason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {reject_mutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Viewer Modal */}
      {show_document_modal && selected_document_url && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Document Preview</h3>
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  setSelectedDocumentUrl('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {selected_document_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img 
                  src={selected_document_url} 
                  alt="Document" 
                  className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                />
              ) : selected_document_url.match(/\.pdf$/i) ? (
                <iframe
                  src={selected_document_url}
                  className="w-full h-full min-h-[600px] rounded-lg"
                  title="PDF Document"
                ></iframe>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Preview not available for this file type</p>
                  <a
                    href={selected_document_url}
                    download
                    className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminSupplierApplications;