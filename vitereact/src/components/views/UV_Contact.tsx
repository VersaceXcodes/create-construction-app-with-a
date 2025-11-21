import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios, { AxiosError } from 'axios';
import { Mail, Phone, MessageCircle, Clock, MapPin, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ContactFormData {
  full_name: string;
  email: string;
  phone_number: string | null;
  inquiry_type: string;
  subject: string;
  message: string;
  order_id: string | null;
  attachment_urls: string[];
  privacy_consent: boolean;
}

interface ContactMethods {
  support_email: string;
  support_phone: string;
  business_hours: {
    monday_friday: string;
    weekend: string;
    timezone: string;
  };
  office_address: {
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
  };
  response_times: {
    email: string;
    phone: string;
    chat: string;
  };
}

interface InquiryCategory {
  category_id: string;
  category_name: string;
  description: string;
  requires_order_id: boolean;
  estimated_response_time: string;
}

interface SubmittedTicket {
  ticket_id: string | null;
  submission_timestamp: string | null;
  estimated_response_time: string | null;
  next_steps: string | null;
}

interface FormValidationErrors {
  full_name: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  privacy_consent: string | null;
}

interface ChatAvailability {
  is_available: boolean;
  queue_length: number;
  estimated_wait_time: string | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchContactInformation = async (): Promise<ContactMethods> => {
  // TODO: Implement backend endpoint
  return {
    support_email: 'support@buildeasy.com',
    support_phone: '1-800-BUILD-EZ',
    business_hours: {
      monday_friday: '8:00 AM - 8:00 PM',
      weekend: '9:00 AM - 5:00 PM',
      timezone: 'EST'
    },
    office_address: {
      street_address: '123 Construction Ave',
      city: 'Austin',
      state: 'TX',
      postal_code: '78701'
    },
    response_times: {
      email: '24 hours',
      phone: 'Immediate',
      chat: '2 minutes'
    }
  };
};

const fetchInquiryCategories = async (): Promise<InquiryCategory[]> => {
  // TODO: Implement backend endpoint
  return [
    {
      category_id: 'general',
      category_name: 'General Inquiry',
      description: 'General questions about BuildEasy',
      requires_order_id: false,
      estimated_response_time: '24 hours'
    },
    {
      category_id: 'delivery',
      category_name: 'Delivery Question',
      description: 'Questions about order delivery',
      requires_order_id: true,
      estimated_response_time: '12 hours'
    },
    {
      category_id: 'product_quality',
      category_name: 'Product Quality',
      description: 'Issues with product quality',
      requires_order_id: true,
      estimated_response_time: '24 hours'
    },
    {
      category_id: 'payment',
      category_name: 'Payment Issue',
      description: 'Payment or billing questions',
      requires_order_id: true,
      estimated_response_time: '12 hours'
    },
    {
      category_id: 'account',
      category_name: 'Account Help',
      description: 'Account settings and access',
      requires_order_id: false,
      estimated_response_time: '24 hours'
    },
    {
      category_id: 'technical',
      category_name: 'Technical Support',
      description: 'Website or app technical issues',
      requires_order_id: false,
      estimated_response_time: '24 hours'
    },
    {
      category_id: 'other',
      category_name: 'Other',
      description: 'Other inquiries',
      requires_order_id: false,
      estimated_response_time: '48 hours'
    }
  ];
};

const checkChatAvailability = async (): Promise<ChatAvailability> => {
  // TODO: Implement backend endpoint
  const currentHour = new Date().getHours();
  const isBusinessHours = currentHour >= 8 && currentHour < 20;
  
  return {
    is_available: isBusinessHours,
    queue_length: isBusinessHours ? Math.floor(Math.random() * 3) : 0,
    estimated_wait_time: isBusinessHours ? '2 minutes' : null
  };
};

const submitContactForm = async (formData: ContactFormData, authToken?: string | null): Promise<any> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const payload = {
    user_id: null, // Will be set by backend from token if authenticated
    order_id: formData.order_id,
    issue_category: formData.inquiry_type,
    subject: formData.subject,
    message: formData.message,
    attachments: formData.attachment_urls,
    priority: 'normal'
  };
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await axios.post(
    `${API_BASE_URL}/api/support/tickets`,
    payload,
    { headers }
  );
  
  return response.data;
};

const uploadAttachment = async (file: File, authToken?: string | null): Promise<{ attachment_url: string; file_name: string; file_size: number }> => {
  // TODO: Implement backend endpoint
  void authToken; // Will be used when endpoint is implemented
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        attachment_url: `https://cdn.buildeasy.com/support/${Date.now()}_${file.name}`,
        file_name: file.name,
        file_size: file.size
      });
    }, 1000);
  });
};

const initiateLiveChat = async (inquiryType: string, authToken: string): Promise<any> => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  const response = await axios.post(
    `${API_BASE_URL}/api/chat/conversations`,
    {
      conversation_type: 'customer_support',
      related_entity_type: 'contact_page',
      related_entity_id: inquiryType
    },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_Contact: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // CRITICAL: Individual Zustand selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  // const openChat = useAppStore(state => state.ui_state.active_modal);
  const setActiveModal = useAppStore(state => state.open_modal);
  
  // State Variables
  const [formData, setFormData] = useState<ContactFormData>({
    full_name: '',
    email: '',
    phone_number: null,
    inquiry_type: 'general',
    subject: '',
    message: '',
    order_id: null,
    attachment_urls: [],
    privacy_consent: false
  });
  
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({
    full_name: null,
    email: null,
    subject: null,
    message: null,
    privacy_consent: null
  });
  
  const [submittedTicket, setSubmittedTicket] = useState<SubmittedTicket>({
    ticket_id: null,
    submission_timestamp: null,
    estimated_response_time: null,
    next_steps: null
  });
  
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  
  // React Query: Fetch contact information
  const { data: contactMethods } = useQuery({
    queryKey: ['contactInformation'],
    queryFn: fetchContactInformation,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1
  });
  
  // React Query: Fetch inquiry categories
  const { data: inquiryCategories = [] } = useQuery({
    queryKey: ['inquiryCategories'],
    queryFn: fetchInquiryCategories,
    staleTime: 30 * 60 * 1000,
    retry: 1
  });
  
  // React Query: Check chat availability
  const { data: chatAvailability } = useQuery({
    queryKey: ['chatAvailability'],
    queryFn: checkChatAvailability,
    refetchInterval: 60000, // Refetch every minute
    retry: 1
  });
  
  // React Query: Submit contact form
  const submitMutation = useMutation({
    mutationFn: (data: ContactFormData) => submitContactForm(data, authToken),
    onSuccess: (response) => {
      setSubmittedTicket({
        ticket_id: response.ticket_id,
        submission_timestamp: response.created_date,
        estimated_response_time: '24 hours',
        next_steps: 'Our team will review your message and respond via email within 24 hours.'
      });
      
      // Reset form
      setFormData({
        full_name: currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() : '',
        email: currentUser?.email || '',
        phone_number: currentUser?.phone_number || null,
        inquiry_type: 'general',
        subject: '',
        message: '',
        order_id: null,
        attachment_urls: [],
        privacy_consent: false
      });
      
      setValidationErrors({
        full_name: null,
        email: null,
        subject: null,
        message: null,
        privacy_consent: null
      });
      
      // Scroll to success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: AxiosError<any>) => {
      console.error('Contact form submission error:', error);
      alert(error.response?.data?.message || 'Failed to submit contact form. Please try again.');
    }
  });
  
  // Initialize form with URL params and user data
  useEffect(() => {
    const urlInquiryType = searchParams.get('inquiry_type');
    const urlOrderId = searchParams.get('order_id');
    
    setFormData(prev => ({
      ...prev,
      full_name: currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() : prev.full_name,
      email: currentUser?.email || prev.email,
      phone_number: currentUser?.phone_number || prev.phone_number,
      inquiry_type: urlInquiryType || prev.inquiry_type,
      order_id: urlOrderId || prev.order_id
    }));
  }, [currentUser, searchParams]);
  
  // Validation function
  const validateField = useCallback((field: keyof FormValidationErrors, value: any): string | null => {
    switch (field) {
      case 'full_name':
        if (!value || value.trim().length === 0) {
          return 'Full name is required';
        }
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        return null;
        
      case 'email':
        if (!value || value.trim().length === 0) {
          return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        return null;
        
      case 'subject': {
        if (!value || value.trim().length === 0) {
          return 'Subject is required';
        }
        if (value.trim().length < 5) {
          return 'Subject must be at least 5 characters';
        }
        return null;
      }
        
      case 'message':
        if (!value || value.trim().length === 0) {
          return 'Message is required';
        }
        if (value.trim().length < 20) {
          return 'Message must be at least 20 characters';
        }
        return null;
        
      case 'privacy_consent':
        if (!value) {
          return 'You must agree to the privacy policy';
        }
        return null;
        
      default:
        return null;
    }
  }, []);
  
  // Handle field blur
  const handleFieldBlur = (field: keyof FormValidationErrors) => {
    const value = formData[field as keyof ContactFormData];
    const error = validateField(field, value);
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  };
  
  // Handle field change
  const handleFieldChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (validationErrors[field as keyof FormValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Validate file count
    if (formData.attachment_urls.length + files.length > 5) {
      alert('Maximum 5 attachments allowed');
      return;
    }
    
    setUploadingFiles(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File ${file.name} exceeds 5MB limit`);
        }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File ${file.name} has invalid type. Only images and PDFs allowed.`);
        }
        
        const result = await uploadAttachment(file);
        return result.attachment_url;
      });
      
      const uploadedUrls = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        attachment_urls: [...prev.attachment_urls, ...uploadedUrls]
      }));
    } catch (error: any) {
      alert(error.message || 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
      // Reset file input
      e.target.value = '';
    }
  };
  
  // Remove attachment
  const removeAttachment = (url: string) => {
    setFormData(prev => ({
      ...prev,
      attachment_urls: prev.attachment_urls.filter(u => u !== url)
    }));
  };
  
  // Validate entire form
  const validateForm = (): boolean => {
    const errors: FormValidationErrors = {
      full_name: validateField('full_name', formData.full_name),
      email: validateField('email', formData.email),
      subject: validateField('subject', formData.subject),
      message: validateField('message', formData.message),
      privacy_consent: validateField('privacy_consent', formData.privacy_consent)
    };
    
    setValidationErrors(errors);
    
    return !Object.values(errors).some(error => error !== null);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    submitMutation.mutate(formData);
  };
  
  // Handle live chat
  const handleLiveChat = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to use live chat');
      return;
    }
    
    if (!authToken) {
      alert('Authentication token missing');
      return;
    }
    
    try {
      await initiateLiveChat(formData.inquiry_type, authToken);
      // Open chat widget (assuming global chat state)
      setActiveModal('chat_widget');
    } catch (error) {
      console.error('Failed to initiate chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  };
  
  // Get selected category
  const selectedCategory = inquiryCategories.find(cat => cat.category_id === formData.inquiry_type);
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Success Message */}
          {submittedTicket.ticket_id && (
            <div className="mb-8 bg-green-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-green-800 mb-3">
                    Thank you for contacting us. We've received your message and created support ticket{' '}
                    <span className="font-mono font-semibold">#{submittedTicket.ticket_id}</span>.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Expected Response Time:</strong> {submittedTicket.estimated_response_time}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Next Steps:</strong> {submittedTicket.next_steps}
                    </p>
                  </div>
                  {isAuthenticated && (
                    <div className="mt-4">
                      <Link 
                        to="/support"
                        className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-800"
                      >
                        View all support tickets →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Have questions? We're here to help. Choose your preferred method of contact below.
            </p>
          </div>
          
          {/* Contact Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            
            {/* Email Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-200">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Mail className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Email Us</h3>
              <p className="text-gray-600 text-sm mb-4">
                Send us a detailed message and we'll respond within {contactMethods?.response_times.email || '24 hours'}.
              </p>
              <a
                href={`mailto:${contactMethods?.support_email || 'support@buildeasy.com'}`}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {contactMethods?.support_email || 'support@buildeasy.com'}
              </a>
            </div>
            
            {/* Phone Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-200">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Phone className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600 text-sm mb-4">
                Speak with our team directly. Available {contactMethods?.business_hours.monday_friday || 'Mon-Fri 8AM-8PM'}.
              </p>
              <a
                href={`tel:${contactMethods?.support_phone || '1-800-BUILD-EZ'}`}
                className="text-green-600 hover:text-green-700 font-medium text-sm"
              >
                {contactMethods?.support_phone || '1-800-BUILD-EZ'}
              </a>
            </div>
            
            {/* Live Chat Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-200">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-gray-600 text-sm mb-4">
                Get instant help from our support team. Average response: {contactMethods?.response_times.chat || '2 minutes'}.
              </p>
              {chatAvailability?.is_available ? (
                <button
                  onClick={handleLiveChat}
                  disabled={!isAuthenticated}
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthenticated ? (
                    <>Start Chat • {chatAvailability.queue_length} in queue</>
                  ) : (
                    'Sign in to chat'
                  )}
                </button>
              ) : (
                <span className="text-gray-500 text-sm">Currently offline</span>
              )}
            </div>
            
          </div>
          
          {/* Main Contact Form */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                <h2 className="text-2xl font-bold text-white">Send Us a Message</h2>
                <p className="text-blue-100 mt-1">Fill out the form below and we'll get back to you soon</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                
                {/* Inquiry Type Dropdown */}
                <div>
                  <label htmlFor="inquiry_type" className="block text-sm font-semibold text-gray-900 mb-2">
                    Inquiry Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="inquiry_type"
                    value={formData.inquiry_type}
                    onChange={(e) => handleFieldChange('inquiry_type', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-gray-900"
                  >
                    {inquiryCategories.map(category => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                  {selectedCategory && (
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedCategory.description} • Response time: {selectedCategory.estimated_response_time}
                    </p>
                  )}
                </div>
                
                {/* Order ID (conditional) */}
                {selectedCategory?.requires_order_id && (
                  <div>
                    <label htmlFor="order_id" className="block text-sm font-semibold text-gray-900 mb-2">
                      Order Number
                    </label>
                    <input
                      id="order_id"
                      type="text"
                      value={formData.order_id || ''}
                      onChange={(e) => handleFieldChange('order_id', e.target.value || null)}
                      placeholder="e.g., ORD-2024-001"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Enter your order number if your inquiry is related to a specific order
                    </p>
                  </div>
                )}
                
                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    onBlur={() => handleFieldBlur('full_name')}
                    placeholder="John Smith"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                      validationErrors.full_name
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  />
                  {validationErrors.full_name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {validationErrors.full_name}
                    </p>
                  )}
                </div>
                
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    placeholder="john.smith@example.com"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                      validationErrors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  />
                  {validationErrors.email && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {validationErrors.email}
                    </p>
                  )}
                </div>
                
                {/* Phone Number (optional) */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone Number <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    id="phone_number"
                    type="tel"
                    value={formData.phone_number || ''}
                    onChange={(e) => handleFieldChange('phone_number', e.target.value || null)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-gray-900 placeholder-gray-400"
                  />
                </div>
                
                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => handleFieldChange('subject', e.target.value)}
                    onBlur={() => handleFieldBlur('subject')}
                    placeholder="Brief description of your inquiry"
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                      validationErrors.subject
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  />
                  {validationErrors.subject && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {validationErrors.subject}
                    </p>
                  )}
                </div>
                
                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => handleFieldChange('message', e.target.value)}
                    onBlur={() => handleFieldBlur('message')}
                    placeholder="Please provide as much detail as possible..."
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 text-gray-900 placeholder-gray-400 resize-none ${
                      validationErrors.message
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                  />
                  <div className="flex items-center justify-between mt-2">
                    {validationErrors.message ? (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.message}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {formData.message.length} / 5000 characters
                      </p>
                    )}
                  </div>
                </div>
                
                {/* File Attachments */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Attachments <span className="text-gray-400">(Optional, max 5 files)</span>
                  </label>
                  
                  {/* File Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      id="file_upload"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handleFileUpload}
                      disabled={uploadingFiles || formData.attachment_urls.length >= 5}
                      className="hidden"
                    />
                    <label
                      htmlFor="file_upload"
                      className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                        uploadingFiles || formData.attachment_urls.length >= 5
                          ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-blue-400'
                      }`}
                    >
                      <Upload className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {uploadingFiles ? 'Uploading...' : 'Click to upload files'}
                      </span>
                    </label>
                  </div>
                  
                  <p className="mt-2 text-xs text-gray-500">
                    Accepted formats: JPG, PNG, WebP, PDF • Max size: 5MB per file
                  </p>
                  
                  {/* Uploaded Files List */}
                  {formData.attachment_urls.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {formData.attachment_urls.map((url, index) => (
                        <div
                          key={url}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 border border-gray-200"
                        >
                          <span className="text-sm text-gray-700 truncate flex-1">
                            Attachment {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(url)}
                            className="ml-2 text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Privacy Consent */}
                <div>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.privacy_consent}
                      onChange={(e) => handleFieldChange('privacy_consent', e.target.checked)}
                      className={`mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                        validationErrors.privacy_consent ? 'border-red-300' : ''
                      }`}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I agree to the{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">
                        Privacy Policy
                      </Link>{' '}
                      and consent to BuildEasy storing and processing my information.{' '}
                      <span className="text-red-500">*</span>
                    </span>
                  </label>
                  {validationErrors.privacy_consent && (
                    <p className="mt-2 text-sm text-red-600 flex items-center ml-6">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {validationErrors.privacy_consent}
                    </p>
                  )}
                </div>
                
                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitMutation.isPending || uploadingFiles}
                    className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold text-base hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {submitMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending Message...
                      </span>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </div>
                
              </form>
            </div>
          </div>
          
          {/* Business Hours & Address */}
          <div className="max-w-3xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Business Hours Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monday - Friday:</span>
                  <span className="font-medium text-gray-900">
                    {contactMethods?.business_hours.monday_friday || '8:00 AM - 8:00 PM'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Weekend:</span>
                  <span className="font-medium text-gray-900">
                    {contactMethods?.business_hours.weekend || '9:00 AM - 5:00 PM'}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Timezone:</span>
                  <span className="font-medium text-gray-900">
                    {contactMethods?.business_hours.timezone || 'EST'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Office Address Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Office Location</h3>
              </div>
              <div className="space-y-1 text-sm text-gray-700">
                <p>{contactMethods?.office_address.street_address || '123 Construction Ave'}</p>
                <p>
                  {contactMethods?.office_address.city || 'Austin'},{' '}
                  {contactMethods?.office_address.state || 'TX'}{' '}
                  {contactMethods?.office_address.postal_code || '78701'}
                </p>
              </div>
            </div>
            
          </div>
          
          {/* Additional Help Links */}
          <div className="max-w-3xl mx-auto mt-12 bg-blue-50 border-2 border-blue-200 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Before You Reach Out</h3>
            <p className="text-gray-700 mb-4">
              You might find answers to your questions faster in our help resources:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/help"
                className="flex items-center px-4 py-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
              >
                <span className="text-blue-600 font-medium text-sm">Knowledge Base</span>
                <span className="ml-auto text-blue-600">→</span>
              </Link>
              <Link
                to="/how-it-works"
                className="flex items-center px-4 py-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
              >
                <span className="text-blue-600 font-medium text-sm">How It Works</span>
                <span className="ml-auto text-blue-600">→</span>
              </Link>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
};

export default UV_Contact;