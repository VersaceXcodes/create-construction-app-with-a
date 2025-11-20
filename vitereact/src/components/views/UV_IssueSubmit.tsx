import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrderContextData {
  order: {
    order_id: string;
    order_number: string;
    order_date: string;
    status: string;
    total_amount: number;
  };
  items: {
    order_item_id: string;
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    supplier_id: string;
  }[];
}

interface IssueFormData {
  order_id: string | null;
  issue_type: string;
  affected_items: string[];
  description: string;
  evidence_photos: string[];
  desired_resolution: string;
}

interface ValidationErrors {
  issue_type?: string;
  affected_items?: string;
  description?: string;
  desired_resolution?: string;
}

interface PhotoUploadProgress {
  [fileName: string]: number;
}

interface PresignedUploadResponse {
  upload_url: string;
  file_key: string;
  cdn_url: string;
  expires_in: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchOrderContext = async (order_id: string, auth_token: string): Promise<OrderContextData> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/orders/${order_id}`,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`
      }
    }
  );
  
  return {
    order: {
      order_id: response.data.order.order_id,
      order_number: response.data.order.order_number,
      order_date: response.data.order.order_date,
      status: response.data.order.status,
      total_amount: response.data.order.total_amount
    },
    items: response.data.items.map((item: any) => ({
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      quantity: item.quantity,
      supplier_id: item.supplier_id
    }))
  };
};

const requestPresignedUrl = async (file: File, auth_token: string): Promise<PresignedUploadResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/uploads/request-url`,
    {
      file_type: file.type,
      file_size: file.size,
      upload_context: 'issue'
    },
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

const uploadFileToS3 = async (file: File, presigned_url: string): Promise<void> => {
  await axios.put(presigned_url, file, {
    headers: {
      'Content-Type': file.type
    }
  });
};

const submitIssueReport = async (
  issue_data: {
    order_id: string;
    issue_type: string;
    affected_items: string[];
    description: string;
    evidence_photos: string[];
    desired_resolution: string;
  },
  auth_token: string
): Promise<{ issue_id: string }> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/issues`,
    issue_data,
    {
      headers: {
        'Authorization': `Bearer ${auth_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_IssueSubmit: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const customerId = useAppStore(state => state.authentication_state.customer_profile?.customer_id);
  
  // Get order_id from URL params
  const orderIdFromUrl = searchParams.get('order_id');
  
  // Form State
  const [issueForm, setIssueForm] = useState<IssueFormData>({
    order_id: orderIdFromUrl || null,
    issue_type: '',
    affected_items: [],
    description: '',
    evidence_photos: [],
    desired_resolution: ''
  });
  
  // Validation State
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Photo Upload State
  const [uploadingPhotos, setUploadingPhotos] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<PhotoUploadProgress>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  
  // Fetch order context if order_id provided
  const { data: orderContext, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order-context', orderIdFromUrl],
    queryFn: () => fetchOrderContext(orderIdFromUrl!, authToken!),
    enabled: !!orderIdFromUrl && !!authToken,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
  
  // Update form when order context loads
  useEffect(() => {
    if (orderContext && !issueForm.order_id) {
      setIssueForm(prev => ({
        ...prev,
        order_id: orderContext.order.order_id
      }));
    }
  }, [orderContext, issueForm.order_id]);
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  const handleIssueTypeChange = (value: string) => {
    setIssueForm(prev => ({ ...prev, issue_type: value }));
    setValidationErrors(prev => ({ ...prev, issue_type: undefined }));
  };
  
  const handleAffectedItemToggle = (item_id: string) => {
    setIssueForm(prev => {
      const isSelected = prev.affected_items.includes(item_id);
      return {
        ...prev,
        affected_items: isSelected
          ? prev.affected_items.filter(id => id !== item_id)
          : [...prev.affected_items, item_id]
      };
    });
    setValidationErrors(prev => ({ ...prev, affected_items: undefined }));
  };
  
  const handleDescriptionChange = (value: string) => {
    setIssueForm(prev => ({ ...prev, description: value }));
    setValidationErrors(prev => ({ ...prev, description: undefined }));
  };
  
  const handleResolutionChange = (value: string) => {
    setIssueForm(prev => ({ ...prev, desired_resolution: value }));
    setValidationErrors(prev => ({ ...prev, desired_resolution: undefined }));
  };
  
  // ============================================================================
  // PHOTO UPLOAD HANDLER
  // ============================================================================
  
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Clear previous upload errors
    setUploadErrors([]);
    
    // Validate file count
    const currentPhotoCount = issueForm.evidence_photos.length;
    const newPhotoCount = files.length;
    
    if (currentPhotoCount + newPhotoCount > 10) {
      setUploadErrors(['Maximum 10 photos allowed']);
      return;
    }
    
    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        
        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          setUploadErrors(prev => [...prev, `${fileName}: Invalid file type. Only JPG, PNG, WEBP allowed.`]);
          continue;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setUploadErrors(prev => [...prev, `${fileName}: File too large. Maximum 5MB.`]);
          continue;
        }
        
        // Add to uploading list
        setUploadingPhotos(prev => [...prev, fileName]);
        setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));
        
        try {
          // Step 1: Request presigned URL
          const presignedData = await requestPresignedUrl(file, authToken!);
          
          setUploadProgress(prev => ({ ...prev, [fileName]: 30 }));
          
          // Step 2: Upload to S3
          await uploadFileToS3(file, presignedData.upload_url);
          
          setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
          
          // Step 3: Store CDN URL
          uploadedUrls.push(presignedData.cdn_url);
          
        } catch (error: any) {
          setUploadErrors(prev => [...prev, `${fileName}: Upload failed`]);
          console.error(`Upload error for ${fileName}:`, error);
        } finally {
          // Remove from uploading list
          setUploadingPhotos(prev => prev.filter(name => name !== fileName));
          setTimeout(() => {
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[fileName];
              return newProgress;
            });
          }, 1000);
        }
      }
      
      // Update form with uploaded URLs
      if (uploadedUrls.length > 0) {
        setIssueForm(prev => ({
          ...prev,
          evidence_photos: [...prev.evidence_photos, ...uploadedUrls]
        }));
      }
      
    } catch (error: any) {
      setUploadErrors(prev => [...prev, 'Upload failed. Please try again.']);
      console.error('Photo upload error:', error);
    }
  };
  
  const removePhoto = (photoUrl: string) => {
    setIssueForm(prev => ({
      ...prev,
      evidence_photos: prev.evidence_photos.filter(url => url !== photoUrl)
    }));
  };
  
  // ============================================================================
  // FORM VALIDATION
  // ============================================================================
  
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!issueForm.issue_type) {
      errors.issue_type = 'Please select an issue type';
    }
    
    if (!issueForm.order_id) {
      errors.affected_items = 'No order selected';
    } else if (issueForm.affected_items.length === 0) {
      errors.affected_items = 'Please select at least one affected item';
    }
    
    if (!issueForm.description || issueForm.description.trim().length < 50) {
      errors.description = 'Please provide at least 50 characters describing the issue';
    }
    
    if (issueForm.description && issueForm.description.length > 2000) {
      errors.description = 'Description must be less than 2000 characters';
    }
    
    if (!issueForm.desired_resolution) {
      errors.desired_resolution = 'Please select your desired resolution';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setSubmissionError(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Ensure we have order_id
    if (!issueForm.order_id) {
      setSubmissionError('No order selected. Please select an order to report an issue.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const issue_data = {
        order_id: issueForm.order_id,
        issue_type: issueForm.issue_type,
        affected_items: issueForm.affected_items,
        description: issueForm.description,
        evidence_photos: issueForm.evidence_photos,
        desired_resolution: issueForm.desired_resolution
      };
      
      const response = await submitIssueReport(issue_data, authToken!);
      
      // Navigate to issue detail page
      navigate(`/issues/${response.issue_id}`);
      
    } catch (error: any) {
      console.error('Issue submission error:', error);
      setSubmissionError(
        error.response?.data?.message || 
        'Failed to submit issue. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ============================================================================
  // ISSUE TYPE OPTIONS
  // ============================================================================
  
  const issueTypes = [
    { value: 'late_delivery', label: 'Late Delivery', icon: '🕐' },
    { value: 'wrong_item', label: 'Wrong Item Delivered', icon: '📦' },
    { value: 'damaged_item', label: 'Damaged Item', icon: '💔' },
    { value: 'missing_item', label: 'Missing Item(s)', icon: '🔍' },
    { value: 'quality_issue', label: 'Quality Issue', icon: '⚠️' },
    { value: 'billing_issue', label: 'Overcharged/Billing Issue', icon: '💳' },
    { value: 'delivery_not_attempted', label: 'Delivery Not Attempted', icon: '🚫' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];
  
  const resolutionOptions = [
    { value: 'full_refund', label: 'Full Refund' },
    { value: 'partial_refund', label: 'Partial Refund' },
    { value: 'replacement', label: 'Replacement Item' },
    { value: 'credit', label: 'Credit for Future Purchase' },
    { value: 'no_action', label: 'Just Want to Report (No Action Needed)' }
  ];
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Issue</h1>
            <p className="text-gray-600 leading-relaxed">
              Help us resolve your concern by providing detailed information about the issue you experienced.
            </p>
          </div>
          
          {/* Order Context Card (if loaded) */}
          {isLoadingOrder && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          )}
          
          {orderContext && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Order Context</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-800">
                      <span className="font-medium">Order Number:</span> {orderContext.order.order_number}
                    </p>
                    <p className="text-blue-800">
                      <span className="font-medium">Order Date:</span> {new Date(orderContext.order.order_date).toLocaleDateString()}
                    </p>
                    <p className="text-blue-800">
                      <span className="font-medium">Status:</span> {orderContext.order.status}
                    </p>
                    <p className="text-blue-800">
                      <span className="font-medium">Total:</span> ${orderContext.order.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {orderContext.items.length} item{orderContext.items.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
          
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Submission Error */}
            {submissionError && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{submissionError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 1: Issue Type */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">What went wrong?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {issueTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleIssueTypeChange(type.value)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                      ${issueForm.issue_type === type.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{type.icon}</span>
                      <span className="font-medium text-gray-900">{type.label}</span>
                    </div>
                    {issueForm.issue_type === type.value && (
                      <div className="absolute top-2 right-2">
                        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {validationErrors.issue_type && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.issue_type}</p>
              )}
            </div>
            
            {/* Step 2: Affected Items */}
            {orderContext && orderContext.items.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Which items are affected?
                </h2>
                
                <div className="space-y-3">
                  {orderContext.items.map(item => (
                    <label
                      key={item.order_item_id}
                      className={`
                        flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${issueForm.affected_items.includes(item.order_item_id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={issueForm.affected_items.includes(item.order_item_id)}
                        onChange={() => handleAffectedItemToggle(item.order_item_id)}
                        className="mt-1 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600 mt-1">SKU: {item.sku}</p>
                        <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                      </div>
                    </label>
                  ))}
                </div>
                
                {validationErrors.affected_items && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.affected_items}</p>
                )}
              </div>
            )}
            
            {/* Step 3: Description */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Tell us what happened
              </h2>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={6}
                  value={issueForm.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Please describe what happened in detail. Include dates, times, and any relevant information that will help us understand the situation..."
                  className={`
                    w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200
                    ${validationErrors.description
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500'
                    }
                  `}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Minimum 50 characters, maximum 2000 characters
                  </p>
                  <p className={`text-xs font-medium ${
                    issueForm.description.length < 50 
                      ? 'text-red-500' 
                      : issueForm.description.length > 2000
                      ? 'text-red-500'
                      : 'text-gray-500'
                  }`}>
                    {issueForm.description.length} / 2000
                  </p>
                </div>
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                )}
              </div>
            </div>
            
            {/* Step 4: Evidence Photos */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Add Evidence Photos <span className="text-gray-500 text-sm font-normal">(Optional but recommended)</span>
              </h2>
              
              <div>
                <label
                  htmlFor="photo-upload"
                  className={`
                    flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
                    ${uploadingPhotos.length > 0
                      ? 'border-blue-400 bg-blue-50 cursor-not-allowed'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-600">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG, or WEBP (Max 5MB per file, up to 10 files)</p>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhotos.length > 0}
                    className="hidden"
                  />
                </label>
                
                {/* Upload Progress */}
                {uploadingPhotos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadingPhotos.map(fileName => (
                      <div key={fileName} className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-blue-900 truncate flex-1 mr-2">
                            {fileName}
                          </p>
                          <span className="text-xs text-blue-600 font-medium">
                            {uploadProgress[fileName] || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress[fileName] || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload Errors */}
                {uploadErrors.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadErrors.map((error, index) => (
                      <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Uploaded Photos Preview */}
                {issueForm.evidence_photos.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Uploaded Photos ({issueForm.evidence_photos.length}/10)
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {issueForm.evidence_photos.map((photoUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photoUrl}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(photoUrl)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                            aria-label="Remove photo"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 5: Desired Resolution */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                What would you like us to do?
              </h2>
              
              <div className="space-y-3">
                {resolutionOptions.map(option => (
                  <label
                    key={option.value}
                    className={`
                      flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                      ${issueForm.desired_resolution === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="desired_resolution"
                      value={option.value}
                      checked={issueForm.desired_resolution === option.value}
                      onChange={(e) => handleResolutionChange(e.target.value)}
                      className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 font-medium text-gray-900">{option.label}</span>
                  </label>
                ))}
              </div>
              
              {validationErrors.desired_resolution && (
                <p className="mt-2 text-sm text-red-600">{validationErrors.desired_resolution}</p>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingPhotos.length > 0}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting Issue...
                    </span>
                  ) : uploadingPhotos.length > 0 ? (
                    `Uploading ${uploadingPhotos.length} photo${uploadingPhotos.length !== 1 ? 's' : ''}...`
                  ) : (
                    'Submit Issue Report'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 border border-gray-300"
                >
                  Cancel
                </button>
              </div>
              
              <p className="mt-4 text-sm text-gray-600 text-center">
                We'll review your issue and get back to you within 24-48 hours.
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_IssueSubmit;