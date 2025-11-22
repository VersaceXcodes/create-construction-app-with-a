import React, { useState } from 'react';
import { Link} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { FileText, Upload, X, CheckCircle, AlertCircle, Loader2, Phone, Mail, MessageSquare } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SupportFormData {
  issue_category: 'delivery' | 'product_quality' | 'payment' | 'account' | 'technical' | 'other' | '';
  subject: string;
  message: string;
  order_id: string | null;
  attachments: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface Order {
  order_id: string;
  order_number: string;
  order_date: string;
  status: string;
  total_amount: number;
}

interface ValidationErrors {
  issue_category: string | null;
  subject: string | null;
  message: string | null;
}

interface SubmissionState {
  is_submitting: boolean;
  submission_success: boolean;
  ticket_id: string | null;
  error_message: string | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchUserOrders = async (authToken: string): Promise<Order[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      params: {
        limit: 10,
        sort_by: 'order_date',
        sort_order: 'desc',
      },
    }
  );
  
  return response.data.orders || [];
};

const submitSupportTicket = async (
  formData: SupportFormData,
  userId: string,
  authToken: string
): Promise<{ ticket_id: string }> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/support/tickets`,
    {
      user_id: userId,
      order_id: formData.order_id,
      issue_category: formData.issue_category,
      subject: formData.subject,
      message: formData.message,
      attachments: formData.attachments,
      priority: formData.priority,
    },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupportContact: React.FC = () => {
  // const navigate = useNavigate();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Local state
  const [supportForm, setSupportForm] = useState<SupportFormData>({
    issue_category: '',
    subject: '',
    message: '',
    order_id: null,
    attachments: [],
    priority: 'normal',
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    issue_category: null,
    subject: null,
    message: null,
  });
  
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    is_submitting: false,
    submission_success: false,
    ticket_id: null,
    error_message: null,
  });
  
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  
  // Fetch user orders for dropdown
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['userOrders', currentUser?.user_id],
    queryFn: () => fetchUserOrders(authToken || ''),
    enabled: !!authToken && !!currentUser?.user_id,
    staleTime: 5 * 60 * 1000,
  });
  
  // Clear validation errors on input change
  const clearFieldError = (field: keyof ValidationErrors) => {
    setValidationErrors(prev => ({ ...prev, [field]: null }));
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      issue_category: null,
      subject: null,
      message: null,
    };
    
    let isValid = true;
    
    if (!supportForm.issue_category) {
      errors.issue_category = 'Please select an issue category';
      isValid = false;
    }
    
    if (!supportForm.subject.trim()) {
      errors.subject = 'Subject is required';
      isValid = false;
    } else if (supportForm.subject.length > 255) {
      errors.subject = 'Subject must be less than 255 characters';
      isValid = false;
    }
    
    if (!supportForm.message.trim()) {
      errors.message = 'Message is required';
      isValid = false;
    } else if (supportForm.message.trim().length < 50) {
      errors.message = 'Message must be at least 50 characters';
      isValid = false;
    } else if (supportForm.message.length > 5000) {
      errors.message = 'Message must be less than 5000 characters';
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };
  
  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file count
    if (supportForm.attachments.length + files.length > 5) {
      alert('Maximum 5 attachments allowed');
      return;
    }
    
    // Validate file sizes and types
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} exceeds 5MB limit`);
        continue;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} has invalid type. Only JPG, PNG, and PDF allowed`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadingFiles(validFiles);
    
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of validFiles) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // TODO: Implement presigned URL upload to S3
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const uploadedUrl = `https://cdn.buildeasy.com/support/${Date.now()}_${file.name}`;
        uploadedUrls.push(uploadedUrl);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }
      
      setSupportForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedUrls],
      }));
      
      setUploadingFiles([]);
      setUploadProgress({});
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Remove attachment
  const removeAttachment = (index: number) => {
    setSupportForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    if (!currentUser?.user_id || !authToken) {
      setSubmissionState(prev => ({
        ...prev,
        error_message: 'Authentication required. Please log in again.',
      }));
      return;
    }
    
    setSubmissionState({
      is_submitting: true,
      submission_success: false,
      ticket_id: null,
      error_message: null,
    });
    
    try {
      const result = await submitSupportTicket(supportForm, currentUser.user_id, authToken);
      
      setSubmissionState({
        is_submitting: false,
        submission_success: true,
        ticket_id: result.ticket_id,
        error_message: null,
      });
      
      // Reset form
      setSupportForm({
        issue_category: '',
        subject: '',
        message: '',
        order_id: null,
        attachments: [],
        priority: 'normal',
      });
      
    } catch (error: any) {
      console.error('Ticket submission error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to submit support ticket. Please try again.';
      
      setSubmissionState({
        is_submitting: false,
        submission_success: false,
        ticket_id: null,
        error_message: errorMessage,
      });
    }
  };
  
  // Reset form and success state
  const resetForm = () => {
    setSupportForm({
      issue_category: '',
      subject: '',
      message: '',
      order_id: null,
      attachments: [],
      priority: 'normal',
    });
    
    setValidationErrors({
      issue_category: null,
      subject: null,
      message: null,
    });
    
    setSubmissionState({
      is_submitting: false,
      submission_success: false,
      ticket_id: null,
      error_message: null,
    });
  };
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
          
          {/* Success State */}
          {submissionState.submission_success && submissionState.ticket_id && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8">
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Support Ticket Created! 🎉
                </h2>
                
                <p className="text-lg text-gray-600 mb-6">
                  Your support ticket <span className="font-semibold text-blue-600">#{submissionState.ticket_id}</span> has been created successfully.
                </p>
                
                <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">✓</span>
                      <span>You'll receive a confirmation email within a few minutes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">→</span>
                      <span>Our support team will review your ticket (within 24 hours)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">→</span>
                      <span>You'll receive updates via email and in-app notifications</span>
                    </li>
                  </ul>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/support/tickets"
                    className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View My Tickets
                  </Link>
                  
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Submit Another Ticket
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Form State */}
          {!submissionState.submission_success && (
            <>
              {/* Header */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Contact Support
                  </h1>
                  <p className="text-blue-100">
                    We're here to help. Fill out the form below and we'll get back to you within 24 hours.
                  </p>
                </div>
                
                {/* Alternative Contact Methods */}
                <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600 mb-3 font-medium">Need immediate assistance?</p>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href="tel:1-800-BUILD-EZ"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      1-800-BUILD-EZ
                    </a>
                    
                    <a
                      href="mailto:support@buildeasy.com"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      support@buildeasy.com
                    </a>
                    
                    <button
                      type="button"
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Live Chat
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Error Banner */}
              {submissionState.error_message && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6" role="alert" aria-live="polite">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-800 mb-1">Error Submitting Ticket</h3>
                      <p className="text-sm text-red-700">{submissionState.error_message}</p>
                    </div>
                    <button
                      onClick={() => setSubmissionState(prev => ({ ...prev, error_message: null }))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Support Form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-8 space-y-8">
                  {/* Issue Category */}
                  <div>
                    <label htmlFor="issue_category" className="block text-sm font-semibold text-gray-900 mb-2">
                      Issue Category <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="issue_category"
                      value={supportForm.issue_category}
                      onChange={(e) => {
                        setSupportForm(prev => ({ ...prev, issue_category: e.target.value as any }));
                        clearFieldError('issue_category');
                      }}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.issue_category
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 focus:outline-none transition-all`}
                    >
                      <option value="">Select an issue category</option>
                      <option value="delivery">Delivery Issue</option>
                      <option value="product_quality">Product Quality</option>
                      <option value="payment">Payment or Billing</option>
                      <option value="account">Account Issue</option>
                      <option value="technical">Technical Problem</option>
                      <option value="other">Other</option>
                    </select>
                    {validationErrors.issue_category && (
                      <p className="mt-2 text-sm text-red-600 flex items-center" role="alert">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {validationErrors.issue_category}
                      </p>
                    )}
                  </div>
                  
                  {/* Related Order (Optional) */}
                  <div>
                    <label htmlFor="order_id" className="block text-sm font-semibold text-gray-900 mb-2">
                      Related Order (Optional)
                    </label>
                    {ordersLoading ? (
                      <div className="flex items-center text-gray-500 text-sm py-3">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading your orders...
                      </div>
                    ) : orders.length > 0 ? (
                      <select
                        id="order_id"
                        value={supportForm.order_id || ''}
                        onChange={(e) => setSupportForm(prev => ({ ...prev, order_id: e.target.value || null }))}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                      >
                        <option value="">Not related to a specific order</option>
                        {orders.map((order) => (
                          <option key={order.order_id} value={order.order_id}>
                            {order.order_number} - {new Date(order.order_date).toLocaleDateString()} - ${Number(order.total_amount).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-500 py-3">No recent orders found</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      If your issue relates to a specific order, select it here for faster resolution
                    </p>
                  </div>
                  
                  {/* Subject */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-2">
                      Subject <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="subject"
                      type="text"
                      value={supportForm.subject}
                      onChange={(e) => {
                        setSupportForm(prev => ({ ...prev, subject: e.target.value }));
                        clearFieldError('subject');
                      }}
                      placeholder="Brief summary of your issue"
                      maxLength={255}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.subject
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 focus:outline-none transition-all`}
                    />
                    <div className="mt-2 flex justify-between items-center">
                      {validationErrors.subject ? (
                        <p className="text-sm text-red-600 flex items-center" role="alert">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {validationErrors.subject}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Example: "Damaged product in Order #12345"
                        </p>
                      )}
                      <span className="text-xs text-gray-400">
                        {supportForm.subject.length}/255
                      </span>
                    </div>
                  </div>
                  
                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-2">
                      Detailed Description <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      id="message"
                      value={supportForm.message}
                      onChange={(e) => {
                        setSupportForm(prev => ({ ...prev, message: e.target.value }));
                        clearFieldError('message');
                      }}
                      placeholder="Please describe your issue in detail. Include relevant information like dates, product names, or error messages."
                      rows={8}
                      maxLength={5000}
                      className={`w-full px-4 py-3 rounded-lg border-2 ${
                        validationErrors.message
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      } focus:ring-4 focus:outline-none transition-all resize-none leading-relaxed`}
                    />
                    <div className="mt-2 flex justify-between items-start">
                      <div className="flex-1">
                        {validationErrors.message ? (
                          <p className="text-sm text-red-600 flex items-center" role="alert">
                            <AlertCircle className="w-4 h-4 mr-1" />
                            {validationErrors.message}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Minimum 50 characters. Be as detailed as possible to help us assist you better.
                          </p>
                        )}
                      </div>
                      <span className={`text-xs ml-4 flex-shrink-0 ${
                        supportForm.message.trim().length < 50 
                          ? 'text-red-500' 
                          : supportForm.message.length > 4500 
                            ? 'text-amber-500' 
                            : 'text-gray-400'
                      }`}>
                        {supportForm.message.length}/5000
                      </span>
                    </div>
                  </div>
                  
                  {/* File Attachments */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Attachments (Optional)
                    </label>
                    
                    {/* Upload Button */}
                    {supportForm.attachments.length < 5 && (
                      <div className="mb-4">
                        <label
                          htmlFor="file_upload"
                          className={`flex items-center justify-center px-6 py-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                            isUploading
                              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                              : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
                          }`}
                        >
                          <Upload className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-600">
                            {isUploading ? 'Uploading...' : 'Upload Files (JPG, PNG, PDF)'}
                          </span>
                        </label>
                        <input
                          id="file_upload"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,application/pdf"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                          className="hidden"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Maximum 5 files, 5MB each. Supported: JPG, PNG, PDF
                        </p>
                      </div>
                    )}
                    
                    {/* Uploading Files */}
                    {uploadingFiles.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {uploadingFiles.map((file) => (
                          <div key={file.name} className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 truncate flex-1">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {(file.size / 1024).toFixed(0)}KB
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[file.name] || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Uploaded Attachments */}
                    {supportForm.attachments.length > 0 && (
                      <div className="space-y-2">
                        {supportForm.attachments.map((_url, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-green-50 rounded-lg p-3 border border-green-200"
                          >
                            <div className="flex items-center flex-1 min-w-0">
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate">
                                Attachment {index + 1}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="ml-3 text-red-600 hover:text-red-700 transition-colors flex-shrink-0"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Priority Level */}
                  <div>
                    <label htmlFor="priority" className="block text-sm font-semibold text-gray-900 mb-2">
                      Priority Level
                    </label>
                    <select
                      id="priority"
                      value={supportForm.priority}
                      onChange={(e) => setSupportForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all"
                    >
                      <option value="low">Low - General inquiry</option>
                      <option value="normal">Normal - Standard support</option>
                      <option value="high">High - Urgent issue</option>
                      <option value="urgent">Urgent - Critical problem</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      High and Urgent priorities receive faster response times
                    </p>
                  </div>
                  
                  {/* Form Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={submissionState.is_submitting || isUploading}
                      className="flex-1 inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                    >
                      {submissionState.is_submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Submitting Ticket...
                        </>
                      ) : (
                        <>
                          <FileText className="w-5 h-5 mr-2" />
                          Submit Support Ticket
                        </>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={submissionState.is_submitting}
                      className="sm:w-auto px-8 py-4 bg-white text-gray-700 font-medium rounded-lg border-2 border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Clear Form
                    </button>
                  </div>
                </div>
              </form>
              
              {/* Help Section */}
              <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Before submitting a ticket
                  </h3>
                  
                  <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                      You might find answers faster in our{' '}
                      <Link to="/help" className="text-blue-600 hover:text-blue-700 font-medium">
                        Knowledge Base
                      </Link>
                      . Common topics include:
                    </p>
                    
                    <ul className="space-y-2 ml-6">
                      <li className="text-gray-700">
                        <Link to="/help/article/tracking-orders" className="text-blue-600 hover:text-blue-700">
                          • How to track your order
                        </Link>
                      </li>
                      <li className="text-gray-700">
                        <Link to="/help/article/returns" className="text-blue-600 hover:text-blue-700">
                          • Return and refund policies
                        </Link>
                      </li>
                      <li className="text-gray-700">
                        <Link to="/help/article/payment" className="text-blue-600 hover:text-blue-700">
                          • Payment methods and issues
                        </Link>
                      </li>
                      <li className="text-gray-700">
                        <Link to="/help/article/account" className="text-blue-600 hover:text-blue-700">
                          • Managing your account
                        </Link>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> For order-specific issues, you can also report directly from the{' '}
                      <Link to="/orders" className="underline font-medium">
                        order details page
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SupportContact;