import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Upload, FileText, CheckCircle, AlertCircle, Building2, DollarSign, Users, FileCheck } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TradeReference {
  company_name: string;
  contact_name: string;
  phone_number: string;
  relationship_years: number;
}

interface ApplicationFormData {
  business_name: string;
  business_registration_number: string;
  business_type: string;
  annual_revenue: number;
  years_in_business: number;
  requested_credit_limit: number;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  business_address: string;
  tax_identification_number: string;
  bank_name: string;
  bank_account_type: string;
  trade_references: TradeReference[];
}

interface UploadedDocument {
  document_type: string;
  file_name: string;
  file_url: string;
  upload_date: string;
}

interface DocumentUploadProgress {
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
}

interface ExistingApplication {
  application_id: string;
  application_data: ApplicationFormData;
  status: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const checkExistingApplication = async (authToken: string): Promise<ExistingApplication | null> => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/trade-credit/applications/me`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    return response.data.existing_application || null;
  } catch (error) {
    // No existing application or error - return null
    return null;
  }
};

const uploadDocument = async (
  file: File,
  documentType: string,
  authToken: string
): Promise<UploadedDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  formData.append('application_context', 'trade_credit_application');

  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/uploads/trade-credit-documents`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  return {
    document_type: documentType,
    file_name: file.name,
    file_url: response.data.file_url,
    upload_date: new Date().toISOString()
  };
};

// Unused validation function - kept for future reference
// const validateApplication = async (
//   _applicationData: ApplicationFormData,
//   _authToken: string
// ): Promise<{ is_valid: boolean; errors: Record<string, string>; estimated_timeline: string }> => {
//   // Mock implementation for MVP - to be replaced with actual API call
//   return {
//     is_valid: true,
//     errors: {},
//     estimated_timeline: '3-5 business days'
//   };
// };

const submitApplication = async (
  applicationData: ApplicationFormData,
  uploadedDocuments: UploadedDocument[],
  creditCheckConsent: boolean,
  customerId: string,
  authToken: string
): Promise<{ application_id: string; status: string; estimated_review_time: string }> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/trade-credit/applications`,
    {
      customer_id: customerId,
      business_name: applicationData.business_name,
      business_registration_number: applicationData.business_registration_number,
      business_type: applicationData.business_type,
      annual_revenue: applicationData.annual_revenue,
      years_in_business: applicationData.years_in_business,
      requested_credit_limit: applicationData.requested_credit_limit,
      primary_contact_name: applicationData.primary_contact_name,
      primary_contact_email: applicationData.primary_contact_email,
      primary_contact_phone: applicationData.primary_contact_phone,
      business_address: applicationData.business_address,
      tax_identification_number: applicationData.tax_identification_number,
      bank_name: applicationData.bank_name,
      bank_account_type: applicationData.bank_account_type,
      verification_documents: uploadedDocuments,
      trade_references: applicationData.trade_references,
      credit_check_consent: creditCheckConsent
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );

  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_TradeCredit_Application: React.FC = () => {
  const navigate = useNavigate();

  // CRITICAL: Individual selectors
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const customerProfile = useAppStore(state => state.authentication_state.customer_profile);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local State
  const [current_application_step, setCurrentApplicationStep] = useState(1);
  const [_existingApplicationId, setExistingApplicationId] = useState<string | null>(null); // For future implementation
  const [credit_check_consent, setCreditCheckConsent] = useState(false);
  const [submission_error, setSubmissionError] = useState<string | null>(null);

  const [application_form_data, setApplicationFormData] = useState<ApplicationFormData>({
    business_name: '',
    business_registration_number: '',
    business_type: '',
    annual_revenue: 0,
    years_in_business: 0,
    requested_credit_limit: 0,
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    business_address: '',
    tax_identification_number: '',
    bank_name: '',
    bank_account_type: '',
    trade_references: []
  });

  const [uploaded_documents, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [validation_errors, setValidationErrors] = useState<Record<string, string>>({});
  const [document_upload_progress, setDocumentUploadProgress] = useState<Record<string, DocumentUploadProgress>>({});

  // Check existing application on mount
  const { data: existingApp } = useQuery({
    queryKey: ['existing-trade-credit-application'],
    queryFn: () => checkExistingApplication(authToken || ''),
    enabled: !!authToken,
    staleTime: 0,
    retry: false
  });

  useEffect(() => {
    if (existingApp) {
      setExistingApplicationId(existingApp.application_id);
      setApplicationFormData(existingApp.application_data);
      
      // If application is pending or under review, redirect to dashboard
      if (existingApp.status === 'pending' || existingApp.status === 'under_review') {
        navigate('/trade-credit');
      }
    }
  }, [existingApp, navigate]);

  // Verify customer is trade account
  useEffect(() => {
    if (customerProfile && customerProfile.account_type !== 'trade') {
      navigate('/dashboard');
    }
    
    if ((customerProfile as any)?.trade_credit_status === 'approved') {
      navigate('/trade-credit');
    }
  }, [customerProfile, navigate]);

  // Document upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: string }) =>
      uploadDocument(file, documentType, authToken || ''),
    onMutate: ({ documentType }) => {
      setDocumentUploadProgress(prev => ({
        ...prev,
        [documentType]: { progress: 0, status: 'uploading' }
      }));
    },
    onSuccess: (data, variables) => {
      setUploadedDocuments(prev => [...prev, data]);
      setDocumentUploadProgress(prev => ({
        ...prev,
        [variables.documentType]: { progress: 100, status: 'success' }
      }));
    },
    onError: (_error, variables) => {
      setDocumentUploadProgress(prev => ({
        ...prev,
        [variables.documentType]: { progress: 0, status: 'error' }
      }));
    }
  });

  // Application submission mutation
  const submitMutation = useMutation({
    mutationFn: () => submitApplication(
      application_form_data,
      uploaded_documents,
      credit_check_consent,
      customerProfile?.customer_id || '',
      authToken || ''
    ),
    onSuccess: (_data) => {
      navigate('/trade-credit');
    },
    onError: (error: any) => {
      setSubmissionError(error.response?.data?.message || 'Failed to submit application. Please try again.');
    }
  });

  // Form update handler
  const updateFormData = useCallback((field: keyof ApplicationFormData, value: any) => {
    setApplicationFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (validation_errors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validation_errors]);

  // Trade reference management
  const addTradeReference = () => {
    setApplicationFormData(prev => ({
      ...prev,
      trade_references: [
        ...prev.trade_references,
        { company_name: '', contact_name: '', phone_number: '', relationship_years: 0 }
      ]
    }));
  };

  const updateTradeReference = (index: number, field: keyof TradeReference, value: any) => {
    setApplicationFormData(prev => ({
      ...prev,
      trade_references: prev.trade_references.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const removeTradeReference = (index: number) => {
    setApplicationFormData(prev => ({
      ...prev,
      trade_references: prev.trade_references.filter((_, i) => i !== index)
    }));
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors(prev => ({ ...prev, [documentType]: 'File size must be less than 5MB' }));
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setValidationErrors(prev => ({ ...prev, [documentType]: 'Only PDF, JPG, and PNG files are allowed' }));
      return;
    }

    try {
      await uploadMutation.mutateAsync({ file, documentType });
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (current_application_step === 1) {
      if (!application_form_data.business_name.trim()) {
        errors.business_name = 'Business name is required';
      }
      if (!application_form_data.business_registration_number.trim()) {
        errors.business_registration_number = 'Registration number is required';
      }
      if (!application_form_data.business_type) {
        errors.business_type = 'Business type is required';
      }
      if (application_form_data.years_in_business < 1) {
        errors.years_in_business = 'Years in business must be at least 1';
      }
      if (application_form_data.annual_revenue <= 0) {
        errors.annual_revenue = 'Annual revenue is required';
      }
      if (application_form_data.requested_credit_limit <= 0) {
        errors.requested_credit_limit = 'Requested credit limit is required';
      }
    }

    if (current_application_step === 2) {
      if (!application_form_data.primary_contact_name.trim()) {
        errors.primary_contact_name = 'Contact name is required';
      }
      if (!application_form_data.primary_contact_email.trim()) {
        errors.primary_contact_email = 'Contact email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application_form_data.primary_contact_email)) {
        errors.primary_contact_email = 'Invalid email format';
      }
      if (!application_form_data.primary_contact_phone.trim()) {
        errors.primary_contact_phone = 'Contact phone is required';
      }
      if (!application_form_data.business_address.trim()) {
        errors.business_address = 'Business address is required';
      }
      if (!application_form_data.tax_identification_number.trim()) {
        errors.tax_identification_number = 'Tax ID is required';
      }
    }

    if (current_application_step === 3) {
      if (!application_form_data.bank_name.trim()) {
        errors.bank_name = 'Bank name is required';
      }
      if (!application_form_data.bank_account_type) {
        errors.bank_account_type = 'Account type is required';
      }
      if (application_form_data.trade_references.length < 2) {
        errors.trade_references = 'At least 2 trade references are required';
      }
      
      // Validate each reference
      application_form_data.trade_references.forEach((ref, index) => {
        if (!ref.company_name.trim()) {
          errors[`ref_${index}_company`] = 'Company name is required';
        }
        if (!ref.contact_name.trim()) {
          errors[`ref_${index}_contact`] = 'Contact name is required';
        }
        if (!ref.phone_number.trim()) {
          errors[`ref_${index}_phone`] = 'Phone number is required';
        }
        if (ref.relationship_years < 1) {
          errors[`ref_${index}_years`] = 'Years must be at least 1';
        }
      });
    }

    if (current_application_step === 4) {
      const requiredDocs = ['business_registration', 'tax_id', 'bank_statement', 'financial_statements'];
      const uploadedTypes = uploaded_documents.map(doc => doc.document_type);
      
      requiredDocs.forEach(docType => {
        if (!uploadedTypes.includes(docType)) {
          errors[docType] = 'This document is required';
        }
      });
      
      if (!credit_check_consent) {
        errors.credit_check_consent = 'You must consent to credit check';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step navigation
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      if (current_application_step < 4) {
        setCurrentApplicationStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const goToPreviousStep = () => {
    if (current_application_step > 1) {
      setCurrentApplicationStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCurrentStep()) {
      return;
    }

    setSubmissionError(null);
    await submitMutation.mutateAsync();
  };

  // Required document types
  const requiredDocuments = [
    { type: 'business_registration', label: 'Business Registration Certificate', icon: Building2 },
    { type: 'tax_id', label: 'Tax Identification Document', icon: FileText },
    { type: 'bank_statement', label: 'Recent Bank Statement (Last 3 months)', icon: DollarSign },
    { type: 'financial_statements', label: 'Financial Statements (Last year)', icon: FileCheck }
  ];

  const isDocumentUploaded = (docType: string) => {
    return uploaded_documents.some(doc => doc.document_type === docType);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Apply for Trade Credit
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Complete this application to access net payment terms and flexible credit lines
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8 lg:mb-12">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    current_application_step > step 
                      ? 'bg-green-600 border-green-600' 
                      : current_application_step === step
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-gray-300'
                  }`}>
                    {current_application_step > step ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <span className={`text-sm font-semibold ${
                        current_application_step === step ? 'text-white' : 'text-gray-400'
                      }`}>
                        {step}
                      </span>
                    )}
                  </div>
                  {step < 4 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      current_application_step > step ? 'bg-green-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3">
              <span className={`text-xs font-medium ${current_application_step === 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                Business Info
              </span>
              <span className={`text-xs font-medium ${current_application_step === 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                Contact Details
              </span>
              <span className={`text-xs font-medium ${current_application_step === 3 ? 'text-blue-600' : 'text-gray-500'}`}>
                Banking & Refs
              </span>
              <span className={`text-xs font-medium ${current_application_step === 4 ? 'text-blue-600' : 'text-gray-500'}`}>
                Documents
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {submission_error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Application Error</p>
                  <p className="text-sm text-red-700 mt-1">{submission_error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Business Information */}
              {current_application_step === 1 && (
                <div className="p-6 lg:p-8">
                  <div className="flex items-center mb-6">
                    <Building2 className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Business Name */}
                    <div>
                      <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-2">
                        Legal Business Name *
                      </label>
                      <input
                        type="text"
                        id="business_name"
                        value={application_form_data.business_name}
                        onChange={(e) => updateFormData('business_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.business_name 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="e.g., Acme Construction LLC"
                      />
                      {validation_errors.business_name && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.business_name}</p>
                      )}
                    </div>

                    {/* Business Registration Number */}
                    <div>
                      <label htmlFor="business_registration_number" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Registration Number *
                      </label>
                      <input
                        type="text"
                        id="business_registration_number"
                        value={application_form_data.business_registration_number}
                        onChange={(e) => updateFormData('business_registration_number', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.business_registration_number
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="e.g., 123456789"
                      />
                      {validation_errors.business_registration_number && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.business_registration_number}</p>
                      )}
                    </div>

                    {/* Business Type */}
                    <div>
                      <label htmlFor="business_type" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Type *
                      </label>
                      <select
                        id="business_type"
                        value={application_form_data.business_type}
                        onChange={(e) => updateFormData('business_type', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.business_type
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                      >
                        <option value="">Select business type</option>
                        <option value="Corporation">Corporation</option>
                        <option value="LLC">LLC</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                      </select>
                      {validation_errors.business_type && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.business_type}</p>
                      )}
                    </div>

                    {/* Years in Business */}
                    <div>
                      <label htmlFor="years_in_business" className="block text-sm font-medium text-gray-700 mb-2">
                        Years in Business *
                      </label>
                      <input
                        type="number"
                        id="years_in_business"
                        min="1"
                        value={application_form_data.years_in_business || ''}
                        onChange={(e) => updateFormData('years_in_business', Number(e.target.value))}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.years_in_business
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="e.g., 5"
                      />
                      {validation_errors.years_in_business && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.years_in_business}</p>
                      )}
                    </div>

                    {/* Annual Revenue */}
                    <div>
                      <label htmlFor="annual_revenue" className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Revenue (USD) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          id="annual_revenue"
                          min="0"
                          step="1000"
                          value={application_form_data.annual_revenue || ''}
                          onChange={(e) => updateFormData('annual_revenue', Number(e.target.value))}
                          className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 ${
                            validation_errors.annual_revenue
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all`}
                          placeholder="500000"
                        />
                      </div>
                      {validation_errors.annual_revenue && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.annual_revenue}</p>
                      )}
                    </div>

                    {/* Requested Credit Limit */}
                    <div>
                      <label htmlFor="requested_credit_limit" className="block text-sm font-medium text-gray-700 mb-2">
                        Requested Credit Limit (USD) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          id="requested_credit_limit"
                          min="0"
                          step="1000"
                          value={application_form_data.requested_credit_limit || ''}
                          onChange={(e) => updateFormData('requested_credit_limit', Number(e.target.value))}
                          className={`w-full pl-8 pr-4 py-3 rounded-lg border-2 ${
                            validation_errors.requested_credit_limit
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all`}
                          placeholder="50000"
                        />
                      </div>
                      {validation_errors.requested_credit_limit && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.requested_credit_limit}</p>
                      )}
                      <p className="mt-2 text-sm text-gray-500">
                        Typical approval ranges: $10,000 - $500,000 based on financials
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Contact & Address */}
              {current_application_step === 2 && (
                <div className="p-6 lg:p-8">
                  <div className="flex items-center mb-6">
                    <Users className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Primary Contact Name */}
                    <div>
                      <label htmlFor="primary_contact_name" className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Contact Name *
                      </label>
                      <input
                        type="text"
                        id="primary_contact_name"
                        value={application_form_data.primary_contact_name}
                        onChange={(e) => updateFormData('primary_contact_name', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.primary_contact_name
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="John Smith"
                      />
                      {validation_errors.primary_contact_name && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.primary_contact_name}</p>
                      )}
                    </div>

                    {/* Contact Email */}
                    <div>
                      <label htmlFor="primary_contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        id="primary_contact_email"
                        value={application_form_data.primary_contact_email}
                        onChange={(e) => updateFormData('primary_contact_email', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.primary_contact_email
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="john@acmeconstruction.com"
                      />
                      {validation_errors.primary_contact_email && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.primary_contact_email}</p>
                      )}
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label htmlFor="primary_contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        id="primary_contact_phone"
                        value={application_form_data.primary_contact_phone}
                        onChange={(e) => updateFormData('primary_contact_phone', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.primary_contact_phone
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="(555) 123-4567"
                      />
                      {validation_errors.primary_contact_phone && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.primary_contact_phone}</p>
                      )}
                    </div>

                    {/* Business Address */}
                    <div>
                      <label htmlFor="business_address" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Address *
                      </label>
                      <textarea
                        id="business_address"
                        rows={3}
                        value={application_form_data.business_address}
                        onChange={(e) => updateFormData('business_address', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.business_address
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="123 Main Street, Suite 100, Austin, TX 78701"
                      />
                      {validation_errors.business_address && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.business_address}</p>
                      )}
                    </div>

                    {/* Tax Identification Number */}
                    <div>
                      <label htmlFor="tax_identification_number" className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Identification Number (EIN/SSN) *
                      </label>
                      <input
                        type="text"
                        id="tax_identification_number"
                        value={application_form_data.tax_identification_number}
                        onChange={(e) => updateFormData('tax_identification_number', e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border-2 ${
                          validation_errors.tax_identification_number
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        } focus:ring-4 transition-all`}
                        placeholder="XX-XXXXXXX"
                      />
                      {validation_errors.tax_identification_number && (
                        <p className="mt-1 text-sm text-red-600">{validation_errors.tax_identification_number}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Banking & References */}
              {current_application_step === 3 && (
                <div className="p-6 lg:p-8">
                  <div className="flex items-center mb-6">
                    <DollarSign className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-900">Banking & Trade References</h2>
                  </div>

                  <div className="space-y-8">
                    {/* Banking Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800">Bank Account Information</h3>
                      
                      <div>
                        <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          id="bank_name"
                          value={application_form_data.bank_name}
                          onChange={(e) => updateFormData('bank_name', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validation_errors.bank_name
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all`}
                          placeholder="e.g., Chase Bank"
                        />
                        {validation_errors.bank_name && (
                          <p className="mt-1 text-sm text-red-600">{validation_errors.bank_name}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="bank_account_type" className="block text-sm font-medium text-gray-700 mb-2">
                          Account Type *
                        </label>
                        <select
                          id="bank_account_type"
                          value={application_form_data.bank_account_type}
                          onChange={(e) => updateFormData('bank_account_type', e.target.value)}
                          className={`w-full px-4 py-3 rounded-lg border-2 ${
                            validation_errors.bank_account_type
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                          } focus:ring-4 transition-all`}
                        >
                          <option value="">Select account type</option>
                          <option value="checking">Business Checking</option>
                          <option value="savings">Business Savings</option>
                        </select>
                        {validation_errors.bank_account_type && (
                          <p className="mt-1 text-sm text-red-600">{validation_errors.bank_account_type}</p>
                        )}
                      </div>
                    </div>

                    {/* Trade References */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">Trade References (Minimum 2)</h3>
                        <button
                          type="button"
                          onClick={addTradeReference}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          + Add Reference
                        </button>
                      </div>

                      {validation_errors.trade_references && (
                        <p className="text-sm text-red-600">{validation_errors.trade_references}</p>
                      )}

                      {application_form_data.trade_references.map((ref, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-700">Reference {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeTradeReference(index)}
                              className="text-sm text-red-600 hover:text-red-700 transition-colors"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Company Name *
                              </label>
                              <input
                                type="text"
                                value={ref.company_name}
                                onChange={(e) => updateTradeReference(index, 'company_name', e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border-2 ${
                                  validation_errors[`ref_${index}_company`]
                                    ? 'border-red-300'
                                    : 'border-gray-200'
                                } focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all`}
                                placeholder="ABC Supply Co"
                              />
                              {validation_errors[`ref_${index}_company`] && (
                                <p className="mt-1 text-xs text-red-600">{validation_errors[`ref_${index}_company`]}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Name *
                              </label>
                              <input
                                type="text"
                                value={ref.contact_name}
                                onChange={(e) => updateTradeReference(index, 'contact_name', e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border-2 ${
                                  validation_errors[`ref_${index}_contact`]
                                    ? 'border-red-300'
                                    : 'border-gray-200'
                                } focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all`}
                                placeholder="Jane Doe"
                              />
                              {validation_errors[`ref_${index}_contact`] && (
                                <p className="mt-1 text-xs text-red-600">{validation_errors[`ref_${index}_contact`]}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number *
                              </label>
                              <input
                                type="tel"
                                value={ref.phone_number}
                                onChange={(e) => updateTradeReference(index, 'phone_number', e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border-2 ${
                                  validation_errors[`ref_${index}_phone`]
                                    ? 'border-red-300'
                                    : 'border-gray-200'
                                } focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all`}
                                placeholder="(555) 123-4567"
                              />
                              {validation_errors[`ref_${index}_phone`] && (
                                <p className="mt-1 text-xs text-red-600">{validation_errors[`ref_${index}_phone`]}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Years of Relationship *
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={ref.relationship_years || ''}
                                onChange={(e) => updateTradeReference(index, 'relationship_years', Number(e.target.value))}
                                className={`w-full px-3 py-2 rounded-lg border-2 ${
                                  validation_errors[`ref_${index}_years`]
                                    ? 'border-red-300'
                                    : 'border-gray-200'
                                } focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all`}
                                placeholder="3"
                              />
                              {validation_errors[`ref_${index}_years`] && (
                                <p className="mt-1 text-xs text-red-600">{validation_errors[`ref_${index}_years`]}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {application_form_data.trade_references.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-500 mb-3">No trade references added yet</p>
                          <button
                            type="button"
                            onClick={addTradeReference}
                            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            Add Your First Reference
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Documents & Submit */}
              {current_application_step === 4 && (
                <div className="p-6 lg:p-8">
                  <div className="flex items-center mb-6">
                    <FileCheck className="w-6 h-6 text-blue-600 mr-3" />
                    <h2 className="text-2xl font-bold text-gray-900">Required Documents</h2>
                  </div>

                  <div className="space-y-6">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Upload the following documents to verify your business and financial information. All documents must be in PDF, JPG, or PNG format and under 5MB.
                    </p>

                    {/* Document Upload Cards */}
                    <div className="space-y-4">
                      {requiredDocuments.map((doc) => {
                        const uploaded = isDocumentUploaded(doc.type);
                        const progress = document_upload_progress[doc.type];
                        const Icon = doc.icon;

                        return (
                          <div key={doc.type} className={`p-4 rounded-lg border-2 transition-all ${
                            uploaded 
                              ? 'border-green-300 bg-green-50' 
                              : validation_errors[doc.type]
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-white'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start flex-1">
                                <Icon className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${
                                  uploaded ? 'text-green-600' : 'text-gray-400'
                                }`} />
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-gray-900">{doc.label}</h4>
                                  {uploaded && (
                                    <p className="text-sm text-green-600 mt-1 flex items-center">
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Uploaded successfully
                                    </p>
                                  )}
                                  {validation_errors[doc.type] && (
                                    <p className="text-sm text-red-600 mt-1">{validation_errors[doc.type]}</p>
                                  )}
                                  {progress?.status === 'uploading' && (
                                    <div className="mt-2">
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                          className="bg-blue-600 h-2 rounded-full transition-all"
                                          style={{ width: `${progress.progress}%` }}
                                        />
                                      </div>
                                      <p className="text-xs text-gray-600 mt-1">Uploading...</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {!uploaded && (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => handleFileUpload(e, doc.type)}
                                    className="hidden"
                                    disabled={progress?.status === 'uploading'}
                                  />
                                  <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium">
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    Upload
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Credit Check Consent */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="checkbox"
                          checked={credit_check_consent}
                          onChange={(e) => {
                            setCreditCheckConsent(e.target.checked);
                            if (validation_errors.credit_check_consent) {
                              setValidationErrors(prev => {
                                const errors = { ...prev };
                                delete errors.credit_check_consent;
                                return errors;
                              });
                            }
                          }}
                          className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-gray-700 leading-relaxed">
                          I authorize BuildEasy to conduct a credit check and verify the financial information provided. I understand this is necessary for processing my trade credit application. *
                        </span>
                      </label>
                      {validation_errors.credit_check_consent && (
                        <p className="mt-2 text-sm text-red-600 ml-8">{validation_errors.credit_check_consent}</p>
                      )}
                    </div>

                    {/* Application Summary */}
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Business Name</p>
                          <p className="font-medium text-gray-900">{application_form_data.business_name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Business Type</p>
                          <p className="font-medium text-gray-900">{application_form_data.business_type || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Annual Revenue</p>
                          <p className="font-medium text-gray-900">
                            ${application_form_data.annual_revenue.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Requested Credit Limit</p>
                          <p className="font-medium text-gray-900">
                            ${application_form_data.requested_credit_limit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Years in Business</p>
                          <p className="font-medium text-gray-900">{application_form_data.years_in_business} years</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Trade References</p>
                          <p className="font-medium text-gray-900">{application_form_data.trade_references.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Documents Uploaded</p>
                          <p className="font-medium text-gray-900">{uploaded_documents.length} / 4</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="px-6 py-4 lg:px-8 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                {current_application_step > 1 ? (
                  <button
                    type="button"
                    onClick={goToPreviousStep}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                  >
                    Previous
                  </button>
                ) : (
                  <div />
                )}

                {current_application_step < 4 ? (
                  <button
                    type="button"
                    onClick={goToNextStep}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-lg hover:shadow-xl"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitMutation.isPending ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Application...
                      </span>
                    ) : (
                      'Submit Application'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Help Text */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Application Review Process</p>
                <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                  Your application will be reviewed within 2-3 business days. We may contact you for additional information. You'll receive email and in-app notifications about your application status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_TradeCredit_Application;