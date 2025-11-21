import React, { useState } from 'react';
import { useParams, Link} from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  AlertCircle, 
  CheckCircle, 
  
  Package, 
  MessageCircle, 
  ArrowLeft, 
  Send, 
  Paperclip,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
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
  resolution_accepted: boolean | null;
  resolution_accepted_date: string | null;
  opened_date: string;
  resolved_date: string | null;
  escalated_to_admin: boolean;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

interface IssueMessage {
  message_id: string;
  issue_id: string;
  sender_id: string;
  sender_type: 'customer' | 'supplier' | 'admin' | 'system';
  message_text: string;
  attachments: string[];
  timestamp: string;
  created_at: string;
}

interface IssueDetailsResponse {
  issue: Issue;
  messages: IssueMessage[];
}

interface AddMessagePayload {
  message_text: string;
  attachments: string[];
}

interface AddMessageResponse {
  message_id: string;
  issue_id: string;
  sender_id: string;
  sender_type: string;
  message_text: string;
  attachments: string[];
  timestamp: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchIssueDetails = async (issue_id: string, auth_token: string): Promise<IssueDetailsResponse> => {
  const response = await axios.get(`${API_BASE_URL}/api/issues/${issue_id}`, {
    headers: {
      'Authorization': `Bearer ${auth_token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return {
    issue: response.data.issue,
    messages: response.data.messages || []
  };
};

const addMessageToIssue = async (
  issue_id: string, 
  payload: AddMessagePayload, 
  auth_token: string
): Promise<AddMessageResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/issues/${issue_id}/messages`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

const acceptResolution = async (issue_id: string, auth_token: string): Promise<Issue> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/issues/${issue_id}/accept-resolution`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.issue;
};

const escalateToAdmin = async (issue_id: string, auth_token: string): Promise<void> => {
  await axios.post(
    `${API_BASE_URL}/api/issues/${issue_id}/escalate`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'open': 'bg-orange-100 text-orange-800 border-orange-200',
    'under_review': 'bg-blue-100 text-blue-800 border-blue-200',
    'awaiting_response': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'resolved': 'bg-green-100 text-green-800 border-green-200',
    'closed': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getIssueTypeLabel = (issue_type: string): string => {
  const labels: Record<string, string> = {
    'late_delivery': 'Late Delivery',
    'wrong_item': 'Wrong Item Delivered',
    'damaged_item': 'Damaged Item',
    'missing_item': 'Missing Item',
    'quality_issue': 'Quality Issue',
    'billing_issue': 'Billing Issue',
    'delivery_not_attempted': 'Delivery Not Attempted',
    'other': 'Other Issue'
  };
  return labels[issue_type] || issue_type;
};

const getResolutionTypeLabel = (resolution_type: string): string => {
  const labels: Record<string, string> = {
    'full_refund': 'Full Refund',
    'partial_refund': 'Partial Refund',
    'replacement': 'Replacement Item',
    'credit': 'Store Credit',
    'no_action': 'No Action Needed'
  };
  return labels[resolution_type] || resolution_type;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_IssueDetail: React.FC = () => {
  const { issue_id } = useParams<{ issue_id: string }>();
  // const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual Zustand selectors
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state for reply form
  const [message_text, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  const { 
    data: issueData, 
    isLoading: isLoadingIssue, 
    error: issueError
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // refetch: refetchIssue
  } = useQuery({
    queryKey: ['issue', issue_id],
    queryFn: () => fetchIssueDetails(issue_id!, authToken!),
    enabled: !!issue_id && !!authToken,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 1
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const addMessageMutation = useMutation({
    mutationFn: (payload: AddMessagePayload) => addMessageToIssue(issue_id!, payload, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issue_id] });
      setMessageText('');
      setAttachments([]);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to send message. Please try again.');
    }
  });
  
  const acceptResolutionMutation = useMutation({
    mutationFn: () => acceptResolution(issue_id!, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issue_id] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to accept resolution. Please try again.');
    }
  });
  
  const escalateMutation = useMutation({
    mutationFn: () => escalateToAdmin(issue_id!, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issue_id] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to escalate issue. Please try again.');
    }
  });
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message_text.trim()) return;
    
    addMessageMutation.mutate({
      message_text: message_text.trim(),
      attachments: attachments
    });
  };
  
  const handleAcceptResolution = () => {
    if (window.confirm('Are you sure you want to accept this resolution? This action cannot be undone.')) {
      acceptResolutionMutation.mutate();
    }
  };
  
  const handleEscalate = () => {
    if (window.confirm('This will escalate your issue to BuildEasy admin support. Do you want to continue?')) {
      escalateMutation.mutate();
    }
  };
  
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };
  
  // ============================================================================
  // DERIVED STATE
  // ============================================================================
  
  const issue = issueData?.issue || null;
  const messages = issueData?.messages || [];
  
  const has_resolution_offer = !!(issue?.resolution_offered);
  const can_escalate = issue?.status === 'open' && !issue?.escalated_to_admin;
  const is_resolved = issue?.status === 'resolved' || issue?.status === 'closed';
  
  // ============================================================================
  // LOADING STATE
  // ============================================================================
  
  if (isLoadingIssue) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // ERROR STATE
  // ============================================================================
  
  if (issueError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Issue Not Found</h2>
              <p className="text-gray-600 mb-6">
                We couldn't find this issue or you don't have permission to view it.
              </p>
              <Link
                to="/orders"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  if (!issue) {
    return null;
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb & Back Button */}
          <div className="mb-6">
            <Link
              to="/orders"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Orders
            </Link>
          </div>
          
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Issue #{issue.issue_id.slice(-8).toUpperCase()}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(issue.status)}`}>
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {issue.escalated_to_admin && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                      ESCALATED TO ADMIN
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Opened {formatDate(issue.opened_date)}
                  </div>
                  <div className="flex items-center">
                    <Package className="mr-2 h-4 w-4" />
                    <Link 
                      to={`/orders/${issue.order_id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Order #{issue.order_id.slice(-8).toUpperCase()}
                    </Link>
                  </div>
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    {getIssueTypeLabel(issue.issue_type)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Issue Details Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Issue Details</h2>
            
            <div className="space-y-4">
              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-gray-900 leading-relaxed">{issue.description}</p>
              </div>
              
              {/* Affected Items */}
              {issue.affected_items && issue.affected_items.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Affected Items</h3>
                  <div className="flex flex-wrap gap-2">
                    {issue.affected_items.map((item_id, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md border border-gray-200"
                      >
                        {item_id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Desired Resolution */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Desired Resolution</h3>
                <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-md border border-blue-200">
                  {getResolutionTypeLabel(issue.desired_resolution)}
                </span>
              </div>
              
              {/* Evidence Photos */}
              {issue.evidence_photos && issue.evidence_photos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Evidence Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {issue.evidence_photos.map((photo_url, index) => (
                      <button
                        key={index}
                        onClick={() => handleImageClick(photo_url)}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all group"
                      >
                        <img
                          src={photo_url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Resolution Offer Card (if exists) */}
          {has_resolution_offer && issue.resolution_offered && !is_resolved && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-200 p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Resolution Offered
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {issue.assigned_admin_id ? 'BuildEasy Admin' : 'Supplier'} has offered a resolution for your issue:
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Resolution Type</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {getResolutionTypeLabel(issue.resolution_offered)}
                      </span>
                    </div>
                    
                    {issue.resolution_amount && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Amount</span>
                        <span className="text-lg font-bold text-green-600">
                          ${Number(issue.resolution_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleAcceptResolution}
                      disabled={acceptResolutionMutation.isPending}
                      className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptResolutionMutation.isPending ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Accepting...
                        </span>
                      ) : (
                        'Accept Resolution'
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Decline & Continue Discussion
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Communication Thread */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Communication Thread</h2>
            
            <div className="space-y-4 mb-6">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>No messages yet. Start the conversation below.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const is_customer_message = msg.sender_type === 'customer';
                  const is_system_message = msg.sender_type === 'system';
                  
                  return (
                    <div 
                      key={msg.message_id}
                      className={`flex ${is_customer_message ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xl ${is_customer_message ? 'ml-12' : 'mr-12'}`}>
                        {/* Sender Info */}
                        <div className={`flex items-center gap-2 mb-1 ${is_customer_message ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs font-medium text-gray-500">
                            {is_customer_message && 'You'}
                            {msg.sender_type === 'supplier' && 'Supplier'}
                            {msg.sender_type === 'admin' && 'BuildEasy Admin'}
                            {is_system_message && 'System'}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(msg.timestamp)}
                          </span>
                        </div>
                        
                        {/* Message Bubble */}
                        <div className={`rounded-lg px-4 py-3 ${
                          is_customer_message 
                            ? 'bg-blue-600 text-white' 
                            : is_system_message
                            ? 'bg-gray-100 text-gray-700 border border-gray-200'
                            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.message_text}
                          </p>
                          
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200/30 space-y-1">
                              {msg.attachments.map((attachment, idx) => (
                                <a
                                  key={idx}
                                  href={attachment}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center text-xs ${
                                    is_customer_message 
                                      ? 'text-blue-100 hover:text-white' 
                                      : 'text-blue-600 hover:text-blue-700'
                                  }`}
                                >
                                  <Paperclip className="mr-1 h-3 w-3" />
                                  Attachment {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Reply Form */}
            {!is_resolved && (
              <form onSubmit={handleSubmitMessage} className="border-t border-gray-200 pt-6">
                <label htmlFor="message_text" className="block text-sm font-medium text-gray-700 mb-2">
                  Add a Message
                </label>
                <textarea
                  id="message_text"
                  value={message_text}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all resize-none"
                  disabled={addMessageMutation.isPending}
                />
                
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Attach Files
                    </button>
                    {attachments.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {attachments.length} file(s) attached
                      </span>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!message_text.trim() || addMessageMutation.isPending}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addMessageMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
            
            {/* Resolved Message */}
            {is_resolved && (
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-800">
                    This issue has been resolved
                  </p>
                  {issue.resolved_date && (
                    <p className="text-xs text-green-600 mt-1">
                      Resolved on {formatDate(issue.resolved_date)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Escalation Card */}
          {can_escalate && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Need Additional Help?
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    If the supplier's response is not satisfactory, you can escalate this issue to BuildEasy admin support for review.
                  </p>
                  <button
                    onClick={handleEscalate}
                    disabled={escalateMutation.isPending}
                    className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {escalateMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Escalating...
                      </span>
                    ) : (
                      <>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Escalate to Admin Support
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
      
      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt="Evidence"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default UV_IssueDetail;