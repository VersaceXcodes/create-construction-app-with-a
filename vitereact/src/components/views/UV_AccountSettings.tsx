import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Shield, 
  Bell, 
  Lock, 
  Trash2, 
  Plus, 
  Edit2, 
  Check, 
  X,
  Home,
  Building2,
  Warehouse,
  AlertCircle,
  DollarSign
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  profile_photo_url: string | null;
  email_verified: boolean;
  status: string;
  registration_date: string;
  last_login_date: string | null;
}

interface CustomerProfile {
  customer_id: string;
  user_id: string;
  account_type: 'retail' | 'trade';
  default_delivery_address_id: string | null;
  trade_credit_limit: number;
  trade_credit_balance: number;
  trade_credit_used: number;
  trade_credit_terms: string | null;
  trade_credit_status: string | null;
  preferred_brands: string[];
  preferred_suppliers: string[];
  preferred_categories: string[];
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    order_updates: boolean;
    promotions: boolean;
  };
  onboarding_completed: boolean;
}

interface Address {
  address_id: string;
  user_id: string;
  label: string | null;
  full_name: string;
  phone_number: string;
  street_address: string;
  apt_suite: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: string | null;
  delivery_instructions: string | null;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface PaymentMethod {
  payment_method_id: string;
  user_id: string;
  payment_type: 'credit_card' | 'debit_card' | 'trade_credit';
  card_brand: string | null;
  card_last_four: string | null;
  card_expiry_month: string | null;
  card_expiry_year: string | null;
  cardholder_name: string | null;
  billing_address_id: string | null;
  is_default: boolean;
}

// ============================================================================
// API CLIENT SETUP
// ============================================================================

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

const createAuthHeader = (token: string | null) => ({
  headers: token ? { 'Authorization': `Bearer ${token}` } : {}
});

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchUserProfile = async (token: string | null): Promise<UserProfile> => {
  const response = await axios.get(`${API_BASE_URL}/users/me`, createAuthHeader(token));
  return response.data;
};

const fetchCustomerProfile = async (token: string | null): Promise<CustomerProfile> => {
  const response = await axios.get(`${API_BASE_URL}/customers/me`, createAuthHeader(token));
  return response.data;
};

const updateUserProfile = async (token: string | null, data: Partial<UserProfile>): Promise<UserProfile> => {
  const response = await axios.patch(`${API_BASE_URL}/users/me`, data, createAuthHeader(token));
  return response.data;
};

const updateCustomerProfile = async (token: string | null, data: Partial<CustomerProfile>): Promise<CustomerProfile> => {
  const response = await axios.patch(`${API_BASE_URL}/customers/me`, data, createAuthHeader(token));
  return response.data;
};

const fetchAddresses = async (token: string | null): Promise<Address[]> => {
  const response = await axios.get(`${API_BASE_URL}/addresses`, createAuthHeader(token));
  return response.data;
};

const createAddress = async (token: string | null, data: Partial<Address>): Promise<Address> => {
  const response = await axios.post(`${API_BASE_URL}/addresses`, data, createAuthHeader(token));
  return response.data;
};

const updateAddress = async (token: string | null, address_id: string, data: Partial<Address>): Promise<Address> => {
  const response = await axios.patch(`${API_BASE_URL}/addresses/${address_id}`, data, createAuthHeader(token));
  return response.data;
};

const deleteAddress = async (token: string | null, address_id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/addresses/${address_id}`, createAuthHeader(token));
};

const fetchPaymentMethods = async (token: string | null): Promise<PaymentMethod[]> => {
  const response = await axios.get(`${API_BASE_URL}/payment-methods`, createAuthHeader(token));
  return response.data;
};

const updatePaymentMethod = async (token: string | null, payment_method_id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
  const response = await axios.patch(`${API_BASE_URL}/payment-methods/${payment_method_id}`, data, createAuthHeader(token));
  return response.data;
};

const deletePaymentMethod = async (token: string | null, payment_method_id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/payment-methods/${payment_method_id}`, createAuthHeader(token));
};

const changePassword = async (token: string | null, data: { current_password: string; new_password: string }): Promise<void> => {
  await axios.post(`${API_BASE_URL}/users/me/change-password`, data, createAuthHeader(token));
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [activeSection, setActiveSection] = useState<string>(searchParams.get('section') || 'profile');
  const [editingProfile, setEditingProfile] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'address' | 'payment' | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    profile_photo_url: ''
  });

  // Address form state
  const [addressForm, setAddressForm] = useState({
    label: '',
    full_name: '',
    phone_number: '',
    street_address: '',
    apt_suite: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    address_type: 'residential' as 'residential' | 'commercial' | 'warehouse',
    delivery_instructions: '',
    is_default: false
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    card_expiry_month: '',
    card_expiry_year: '',
    billing_address_id: '',
    is_default: false
  });

  // Notification preferences form state
  const [notificationPrefsForm, setNotificationPrefsForm] = useState({
    email: true,
    sms: true,
    push: true,
    order_updates: true,
    promotions: true
  });

  // ============================================================================
  // QUERIES
  // ============================================================================

  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => fetchUserProfile(authToken),
    enabled: !!authToken,
    staleTime: 60000
  });

  const { data: customerProfile, isLoading: customerLoading } = useQuery({
    queryKey: ['customerProfile'],
    queryFn: () => fetchCustomerProfile(authToken),
    enabled: !!authToken,
    staleTime: 60000
  });

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => fetchAddresses(authToken),
    enabled: !!authToken && activeSection === 'addresses',
    staleTime: 60000
  });

  const { data: paymentMethods = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => fetchPaymentMethods(authToken),
    enabled: !!authToken && activeSection === 'payments',
    staleTime: 60000
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => updateUserProfile(authToken, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      setEditingProfile(false);
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ profile: error.response?.data?.message || 'Failed to update profile' });
    }
  });

  useMutation({
    mutationFn: (data: Partial<CustomerProfile>) => updateCustomerProfile(authToken, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      setSuccessMessage('Preferences updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ customer: error.response?.data?.message || 'Failed to update preferences' });
    }
  });

  const createAddressMutation = useMutation({
    mutationFn: (data: Partial<Address>) => createAddress(authToken, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setAddressFormOpen(false);
      resetAddressForm();
      setSuccessMessage('Address added successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ address: error.response?.data?.message || 'Failed to add address' });
    }
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ address_id, data }: { address_id: string; data: Partial<Address> }) =>
      updateAddress(authToken, address_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setEditingAddressId(null);
      resetAddressForm();
      setSuccessMessage('Address updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ address: error.response?.data?.message || 'Failed to update address' });
    }
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (address_id: string) => deleteAddress(authToken, address_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setDeleteConfirmId(null);
      setDeleteConfirmType(null);
      setSuccessMessage('Address deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ address: error.response?.data?.message || 'Failed to delete address' });
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ payment_method_id, data }: { payment_method_id: string; data: Partial<PaymentMethod> }) =>
      updatePaymentMethod(authToken, payment_method_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      setEditingPaymentId(null);
      setSuccessMessage('Payment method updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ payment: error.response?.data?.message || 'Failed to update payment method' });
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (payment_method_id: string) => deletePaymentMethod(authToken, payment_method_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      setDeleteConfirmId(null);
      setDeleteConfirmType(null);
      setSuccessMessage('Payment method deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ payment: error.response?.data?.message || 'Failed to delete payment method' });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      changePassword(authToken, data),
    onSuccess: () => {
      setPasswordFormOpen(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setSuccessMessage('Password changed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ password: error.response?.data?.message || 'Failed to change password' });
    }
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: (preferences: any) => 
      updateCustomerProfile(authToken, { notification_preferences: preferences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      setSuccessMessage('Notification preferences updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setValidationErrors({ notifications: error.response?.data?.message || 'Failed to update preferences' });
    }
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize profile form when data loads
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        phone_number: userProfile.phone_number || '',
        profile_photo_url: userProfile.profile_photo_url || ''
      });
    }
  }, [userProfile]);

  // Initialize notification preferences when customer data loads
  useEffect(() => {
    if (customerProfile?.notification_preferences) {
      setNotificationPrefsForm(customerProfile.notification_preferences);
    }
  }, [customerProfile]);

  // Sync active section with URL
  useEffect(() => {
    const section = searchParams.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [searchParams]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    navigate(`/account?section=${section}`, { replace: true });
    setValidationErrors({});
    setSuccessMessage(null);
  };

  const handleProfileEdit = () => {
    setEditingProfile(true);
    setValidationErrors({});
  };

  const handleProfileSave = () => {
    setValidationErrors({});
    
    // Validation
    if (!profileForm.first_name || !profileForm.last_name) {
      setValidationErrors({ profile: 'First and last name are required' });
      return;
    }

    updateProfileMutation.mutate({
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
      phone_number: profileForm.phone_number,
      profile_photo_url: profileForm.profile_photo_url
    });
  };

  const handleProfileCancel = () => {
    setEditingProfile(false);
    setValidationErrors({});
    if (userProfile) {
      setProfileForm({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        phone_number: userProfile.phone_number || '',
        profile_photo_url: userProfile.profile_photo_url || ''
      });
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      label: '',
      full_name: '',
      phone_number: '',
      street_address: '',
      apt_suite: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      address_type: 'residential',
      delivery_instructions: '',
      is_default: false
    });
  };

  const handleAddressEdit = (address: Address) => {
    setEditingAddressId(address.address_id);
    setAddressForm({
      label: address.label || '',
      full_name: address.full_name,
      phone_number: address.phone_number,
      street_address: address.street_address,
      apt_suite: address.apt_suite || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      address_type: (address.address_type as any) || 'residential',
      delivery_instructions: address.delivery_instructions || '',
      is_default: address.is_default
    });
  };

  const handleAddressSave = () => {
    setValidationErrors({});
    
    // Validation
    if (!addressForm.full_name || !addressForm.phone_number || !addressForm.street_address || 
        !addressForm.city || !addressForm.state || !addressForm.postal_code) {
      setValidationErrors({ address: 'All required fields must be filled' });
      return;
    }

    if (editingAddressId) {
      updateAddressMutation.mutate({ address_id: editingAddressId, data: addressForm });
    } else {
      createAddressMutation.mutate(addressForm);
    }
  };

  const handleAddressCancel = () => {
    setEditingAddressId(null);
    setAddressFormOpen(false);
    resetAddressForm();
    setValidationErrors({});
  };

  const handleAddressDelete = (address_id: string) => {
    setDeleteConfirmId(address_id);
    setDeleteConfirmType('address');
  };

  const confirmDelete = () => {
    if (deleteConfirmType === 'address' && deleteConfirmId) {
      deleteAddressMutation.mutate(deleteConfirmId);
    } else if (deleteConfirmType === 'payment' && deleteConfirmId) {
      deletePaymentMutation.mutate(deleteConfirmId);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmType(null);
  };

  const handlePaymentEdit = (payment: PaymentMethod) => {
    setEditingPaymentId(payment.payment_method_id);
    setPaymentForm({
      card_expiry_month: payment.card_expiry_month || '',
      card_expiry_year: payment.card_expiry_year || '',
      billing_address_id: payment.billing_address_id || '',
      is_default: payment.is_default
    });
  };

  const handlePaymentSave = () => {
    setValidationErrors({});
    
    if (!editingPaymentId) return;

    updatePaymentMutation.mutate({
      payment_method_id: editingPaymentId,
      data: paymentForm
    });
  };

  const handlePaymentCancel = () => {
    setEditingPaymentId(null);
    setValidationErrors({});
  };

  const handlePaymentDelete = (payment_method_id: string) => {
    setDeleteConfirmId(payment_method_id);
    setDeleteConfirmType('payment');
  };

  const handlePasswordChange = () => {
    setValidationErrors({});
    
    // Validation
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setValidationErrors({ password: 'All password fields are required' });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setValidationErrors({ password: 'New passwords do not match' });
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setValidationErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    changePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password
    });
  };

  const handleNotificationPrefsUpdate = () => {
    updateNotificationsMutation.mutate(notificationPrefsForm);
  };

  const handleSetDefaultAddress = (address_id: string) => {
    updateAddressMutation.mutate({
      address_id,
      data: { is_default: true }
    });
  };

  const handleSetDefaultPayment = (payment_method_id: string) => {
    updatePaymentMutation.mutate({
      payment_method_id,
      data: { is_default: true }
    });
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderTabButton = (section: string, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => handleSectionChange(section)}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${
        activeSection === section
          ? 'bg-blue-50 text-blue-700 font-medium border-l-4 border-blue-600'
          : 'text-gray-700 hover:bg-gray-100 border-l-4 border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const getAddressTypeIcon = (type: string | null) => {
    switch (type) {
      case 'commercial':
        return <Building2 className="h-5 w-5 text-gray-400" />;
      case 'warehouse':
        return <Warehouse className="h-5 w-5 text-gray-400" />;
      default:
        return <Home className="h-5 w-5 text-gray-400" />;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-2 text-gray-600">Manage your account information and preferences</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-lg flex items-center space-x-3">
              <Check className="h-5 w-5 flex-shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-4 space-y-2 sticky top-24">
                {renderTabButton('profile', <User className="h-5 w-5" />, 'Profile')}
                {renderTabButton('addresses', <MapPin className="h-5 w-5" />, 'Addresses')}
                {renderTabButton('payments', <CreditCard className="h-5 w-5" />, 'Payment Methods')}
                {renderTabButton('security', <Shield className="h-5 w-5" />, 'Security')}
                {renderTabButton('notifications', <Bell className="h-5 w-5" />, 'Notifications')}
                {renderTabButton('privacy', <Lock className="h-5 w-5" />, 'Privacy')}
                {customerProfile?.account_type === 'trade' && 
                  renderTabButton('trade_credit', <DollarSign className="h-5 w-5" />, 'Trade Credit')}
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
                
                {/* PROFILE SECTION */}
                {activeSection === 'profile' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                      {!editingProfile && (
                        <button
                          onClick={handleProfileEdit}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span>Edit Profile</span>
                        </button>
                      )}
                    </div>

                    {profileLoading ? (
                      <div className="space-y-4">
                        <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {validationErrors.profile && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm">{validationErrors.profile}</p>
                          </div>
                        )}

                        {/* Profile Photo */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                          <div className="flex items-center space-x-4">
                            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                              {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
                            </div>
                            {editingProfile && (
                              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                                Change Photo
                              </button>
                            )}
                          </div>
                        </div>

                        {/* First Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                          <input
                            type="text"
                            value={profileForm.first_name}
                            onChange={(e) => {
                              setProfileForm(prev => ({ ...prev, first_name: e.target.value }));
                              setValidationErrors(prev => ({ ...prev, profile: '' }));
                            }}
                            disabled={!editingProfile}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                          <input
                            type="text"
                            value={profileForm.last_name}
                            onChange={(e) => {
                              setProfileForm(prev => ({ ...prev, last_name: e.target.value }));
                              setValidationErrors(prev => ({ ...prev, profile: '' }));
                            }}
                            disabled={!editingProfile}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="email"
                              value={userProfile?.email || ''}
                              disabled
                              className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 cursor-not-allowed"
                            />
                            {userProfile?.email_verified ? (
                              <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center space-x-1">
                                <Check className="h-4 w-4" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
                                Unverified
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-500">Email changes require verification</p>
                        </div>

                        {/* Phone Number */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={profileForm.phone_number}
                            onChange={(e) => {
                              setProfileForm(prev => ({ ...prev, phone_number: e.target.value }));
                              setValidationErrors(prev => ({ ...prev, profile: '' }));
                            }}
                            disabled={!editingProfile}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Account Type Badge */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                          <span className={`inline-flex px-4 py-2 rounded-lg font-medium ${
                            customerProfile?.account_type === 'trade' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {customerProfile?.account_type === 'trade' ? 'Trade/Professional' : 'Retail/DIY'}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        {editingProfile && (
                          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                            <button
                              onClick={handleProfileSave}
                              disabled={updateProfileMutation.isPending}
                              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={handleProfileCancel}
                              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ADDRESSES SECTION */}
                {activeSection === 'addresses' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Delivery Addresses</h2>
                      <button
                        onClick={() => {
                          setAddressFormOpen(true);
                          resetAddressForm();
                          setValidationErrors({});
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Address</span>
                      </button>
                    </div>

                    {addressesLoading ? (
                      <div className="space-y-4">
                        <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    ) : (
                      <>
                        {/* Address List */}
                        {addresses.length === 0 && !addressFormOpen ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-4">No addresses saved yet</p>
                            <button
                              onClick={() => setAddressFormOpen(true)}
                              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              Add Your First Address
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {addresses.map((address) => (
                              <div key={address.address_id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                                {editingAddressId === address.address_id ? (
                                  // Edit Mode
                                  <div className="space-y-4">
                                    {validationErrors.address && (
                                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-sm">{validationErrors.address}</p>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Label</label>
                                        <input
                                          type="text"
                                          value={addressForm.label}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
                                          placeholder="e.g., Home, Office, Job Site"
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                        <input
                                          type="text"
                                          value={addressForm.full_name}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, full_name: e.target.value }))}
                                          required
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                        <input
                                          type="tel"
                                          value={addressForm.phone_number}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                          required
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                                        <input
                                          type="text"
                                          value={addressForm.street_address}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, street_address: e.target.value }))}
                                          required
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Apt/Suite</label>
                                        <input
                                          type="text"
                                          value={addressForm.apt_suite}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, apt_suite: e.target.value }))}
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                        <input
                                          type="text"
                                          value={addressForm.city}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                                          required
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                                        <input
                                          type="text"
                                          value={addressForm.state}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                                          required
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                                        <input
                                          type="text"
                                          value={addressForm.postal_code}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                          required
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
                                        <select
                                          value={addressForm.address_type}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, address_type: e.target.value as any }))}
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        >
                                          <option value="residential">Residential</option>
                                          <option value="commercial">Commercial</option>
                                          <option value="warehouse">Warehouse</option>
                                        </select>
                                      </div>
                                      <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
                                        <textarea
                                          value={addressForm.delivery_instructions}
                                          onChange={(e) => setAddressForm(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                                          rows={2}
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={addressForm.is_default}
                                            onChange={(e) => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                          />
                                          <span className="text-sm font-medium text-gray-700">Set as default delivery address</span>
                                        </label>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                                      <button
                                        onClick={handleAddressSave}
                                        disabled={updateAddressMutation.isPending}
                                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {updateAddressMutation.isPending ? 'Saving...' : 'Save Address'}
                                      </button>
                                      <button
                                        onClick={handleAddressCancel}
                                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // View Mode
                                  <div>
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex items-center space-x-3">
                                        {getAddressTypeIcon(address.address_type)}
                                        <div>
                                          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                                            <span>{address.label || 'Address'}</span>
                                            {address.is_default && (
                                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                                                Default
                                              </span>
                                            )}
                                          </h3>
                                          <p className="text-sm text-gray-600">{address.full_name}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleAddressEdit(address)}
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleAddressDelete(address.address_id)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-1 text-gray-700">
                                      <p>{address.street_address}{address.apt_suite ? `, ${address.apt_suite}` : ''}</p>
                                      <p>{address.city}, {address.state} {address.postal_code}</p>
                                      <p className="text-sm text-gray-500">{address.phone_number}</p>
                                      {address.delivery_instructions && (
                                        <p className="text-sm text-gray-600 mt-2 italic">
                                          Note: {address.delivery_instructions}
                                        </p>
                                      )}
                                    </div>
                                    {!address.is_default && (
                                      <button
                                        onClick={() => handleSetDefaultAddress(address.address_id)}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                      >
                                        Set as Default
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Address Form */}
                        {addressFormOpen && !editingAddressId && (
                          <div className="border-2 border-blue-300 rounded-xl p-6 bg-blue-50">
                            <h3 className="font-semibold text-gray-900 mb-4">Add New Address</h3>
                            
                            {validationErrors.address && (
                              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p className="text-sm">{validationErrors.address}</p>
                              </div>
                            )}

                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Label</label>
                                  <input
                                    type="text"
                                    value={addressForm.label}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
                                    placeholder="e.g., Home, Office, Job Site"
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                  <input
                                    type="text"
                                    value={addressForm.full_name}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, full_name: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                  <input
                                    type="tel"
                                    value={addressForm.phone_number}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                                  <input
                                    type="text"
                                    value={addressForm.street_address}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, street_address: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Apt/Suite</label>
                                  <input
                                    type="text"
                                    value={addressForm.apt_suite}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, apt_suite: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                  <input
                                    type="text"
                                    value={addressForm.city}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                                  <input
                                    type="text"
                                    value={addressForm.state}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                                  <input
                                    type="text"
                                    value={addressForm.postal_code}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
                                  <select
                                    value={addressForm.address_type}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, address_type: e.target.value as any }))}
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  >
                                    <option value="residential">Residential</option>
                                    <option value="commercial">Commercial</option>
                                    <option value="warehouse">Warehouse</option>
                                  </select>
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
                                  <textarea
                                    value={addressForm.delivery_instructions}
                                    onChange={(e) => setAddressForm(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={addressForm.is_default}
                                      onChange={(e) => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Set as default delivery address</span>
                                  </label>
                                </div>
                              </div>

                              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                                <button
                                  onClick={handleAddressSave}
                                  disabled={createAddressMutation.isPending}
                                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {createAddressMutation.isPending ? 'Adding...' : 'Add Address'}
                                </button>
                                <button
                                  onClick={handleAddressCancel}
                                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* PAYMENT METHODS SECTION */}
                {activeSection === 'payments' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
                    </div>

                    {paymentsLoading ? (
                      <div className="space-y-4">
                        <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    ) : (
                      <>
                        {paymentMethods.length === 0 ? (
                          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 mb-2">No payment methods saved yet</p>
                            <p className="text-sm text-gray-500">Add a payment method to checkout faster</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {paymentMethods.map((payment) => (
                              <div key={payment.payment_method_id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                                {editingPaymentId === payment.payment_method_id ? (
                                  // Edit Mode
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Month</label>
                                        <input
                                          type="text"
                                          value={paymentForm.card_expiry_month}
                                          onChange={(e) => setPaymentForm(prev => ({ ...prev, card_expiry_month: e.target.value }))}
                                          placeholder="MM"
                                          maxLength={2}
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Year</label>
                                        <input
                                          type="text"
                                          value={paymentForm.card_expiry_year}
                                          onChange={(e) => setPaymentForm(prev => ({ ...prev, card_expiry_year: e.target.value }))}
                                          placeholder="YYYY"
                                          maxLength={4}
                                          className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                        />
                                      </div>
                                      <div className="col-span-2">
                                        <label className="flex items-center space-x-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={paymentForm.is_default}
                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                          />
                                          <span className="text-sm font-medium text-gray-700">Set as default payment method</span>
                                        </label>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                                      <button
                                        onClick={handlePaymentSave}
                                        disabled={updatePaymentMutation.isPending}
                                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {updatePaymentMutation.isPending ? 'Saving...' : 'Save Changes'}
                                      </button>
                                      <button
                                        onClick={handlePaymentCancel}
                                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // View Mode
                                  <div>
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center space-x-3">
                                        <CreditCard className="h-6 w-6 text-gray-400" />
                                        <div>
                                          <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                                            <span>{payment.card_brand || 'Card'} •••• {payment.card_last_four}</span>
                                            {payment.is_default && (
                                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                                                Default
                                              </span>
                                            )}
                                          </h3>
                                          <p className="text-sm text-gray-600">
                                            Expires {payment.card_expiry_month}/{payment.card_expiry_year}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handlePaymentEdit(payment)}
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handlePaymentDelete(payment.payment_method_id)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    {payment.cardholder_name && (
                                      <p className="text-sm text-gray-600">{payment.cardholder_name}</p>
                                    )}
                                    {!payment.is_default && (
                                      <button
                                        onClick={() => handleSetDefaultPayment(payment.payment_method_id)}
                                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                      >
                                        Set as Default
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* SECURITY SECTION */}
                {activeSection === 'security' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>

                    {/* Change Password */}
                    <div className="border-2 border-gray-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">Password</h3>
                          <p className="text-sm text-gray-600">Update your password regularly for security</p>
                        </div>
                        {!passwordFormOpen && (
                          <button
                            onClick={() => {
                              setPasswordFormOpen(true);
                              setValidationErrors({});
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Change Password
                          </button>
                        )}
                      </div>

                      {passwordFormOpen && (
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                          {validationErrors.password && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5 flex-shrink-0" />
                              <p className="text-sm">{validationErrors.password}</p>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                              type="password"
                              value={passwordForm.current_password}
                              onChange={(e) => {
                                setPasswordForm(prev => ({ ...prev, current_password: e.target.value }));
                                setValidationErrors(prev => ({ ...prev, password: '' }));
                              }}
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                              type="password"
                              value={passwordForm.new_password}
                              onChange={(e) => {
                                setPasswordForm(prev => ({ ...prev, new_password: e.target.value }));
                                setValidationErrors(prev => ({ ...prev, password: '' }));
                              }}
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                            <p className="mt-1 text-sm text-gray-500">At least 8 characters</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                              type="password"
                              value={passwordForm.confirm_password}
                              onChange={(e) => {
                                setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }));
                                setValidationErrors(prev => ({ ...prev, password: '' }));
                              }}
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={handlePasswordChange}
                              disabled={changePasswordMutation.isPending}
                              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {changePasswordMutation.isPending ? 'Changing...' : 'Update Password'}
                            </button>
                            <button
                              onClick={() => {
                                setPasswordFormOpen(false);
                                setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
                                setValidationErrors({});
                              }}
                              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="border-2 border-gray-200 rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                        </div>
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                          Enable 2FA
                        </button>
                      </div>
                    </div>

                    {/* Active Sessions */}
                    <div className="border-2 border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Active Sessions</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">Current Session</p>
                            <p className="text-sm text-gray-600">Last active: Just now</p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS SECTION */}
                {activeSection === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>

                    {customerLoading ? (
                      <div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
                    ) : (
                      <>
                        {validationErrors.notifications && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm">{validationErrors.notifications}</p>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="border-2 border-gray-200 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Notification Channels</h3>
                            <div className="space-y-4">
                              <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                  <p className="font-medium text-gray-900">Email Notifications</p>
                                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPrefsForm.email}
                                  onChange={(e) => setNotificationPrefsForm(prev => ({ ...prev, email: e.target.checked }))}
                                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </label>

                              <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                  <p className="font-medium text-gray-900">SMS Notifications</p>
                                  <p className="text-sm text-gray-600">Receive notifications via text message</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPrefsForm.sms}
                                  onChange={(e) => setNotificationPrefsForm(prev => ({ ...prev, sms: e.target.checked }))}
                                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </label>

                              <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                  <p className="font-medium text-gray-900">Push Notifications</p>
                                  <p className="text-sm text-gray-600">Receive browser push notifications</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPrefsForm.push}
                                  onChange={(e) => setNotificationPrefsForm(prev => ({ ...prev, push: e.target.checked }))}
                                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </label>
                            </div>
                          </div>

                          <div className="border-2 border-gray-200 rounded-xl p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Notification Types</h3>
                            <div className="space-y-4">
                              <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                  <p className="font-medium text-gray-900">Order Updates</p>
                                  <p className="text-sm text-gray-600">Status updates for your orders</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPrefsForm.order_updates}
                                  onChange={(e) => setNotificationPrefsForm(prev => ({ ...prev, order_updates: e.target.checked }))}
                                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </label>

                              <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                  <p className="font-medium text-gray-900">Promotional Emails</p>
                                  <p className="text-sm text-gray-600">Deals and special offers</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPrefsForm.promotions}
                                  onChange={(e) => setNotificationPrefsForm(prev => ({ ...prev, promotions: e.target.checked }))}
                                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </label>
                            </div>
                          </div>

                          <button
                            onClick={handleNotificationPrefsUpdate}
                            disabled={updateNotificationsMutation.isPending}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updateNotificationsMutation.isPending ? 'Saving...' : 'Save Preferences'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* PRIVACY SECTION */}
                {activeSection === 'privacy' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Privacy & Data</h2>

                    <div className="border-2 border-gray-200 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Data Export</h3>
                      <p className="text-gray-600 mb-4">Download a copy of your account data</p>
                      <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Download My Data
                      </button>
                    </div>

                    <div className="border-2 border-red-200 rounded-xl p-6 bg-red-50">
                      <h3 className="font-semibold text-red-900 mb-2">Delete Account</h3>
                      <p className="text-red-700 text-sm mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                        Delete My Account
                      </button>
                    </div>
                  </div>
                )}

                {/* TRADE CREDIT SECTION */}
                {activeSection === 'trade_credit' && customerProfile?.account_type === 'trade' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Trade Credit</h2>

                    <div className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-br from-purple-50 to-blue-50">
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Credit Limit</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${customerProfile.trade_credit_limit?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Available Credit</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${customerProfile.trade_credit_balance?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Used Credit</p>
                          <p className="text-2xl font-bold text-orange-600">
                            ${customerProfile.trade_credit_used?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>

                      {customerProfile.trade_credit_status === 'approved' && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            Request Credit Increase
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && deleteConfirmType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {deleteConfirmType === 'address' ? 'address' : 'payment method'}? 
              This action cannot be undone.
            </p>

            <div className="flex items-center space-x-3">
              <button
                onClick={confirmDelete}
                disabled={deleteAddressMutation.isPending || deletePaymentMutation.isPending}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(deleteAddressMutation.isPending || deletePaymentMutation.isPending) ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={cancelDelete}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AccountSettings;