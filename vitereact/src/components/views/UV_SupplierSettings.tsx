import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Building2, 
  Users, 
  Bell, 
  Code, 
  CreditCard, 
  Save, 
  
  Plus, 
  Trash2, 
  Check,
  X,
  AlertCircle,
  Settings,
  Clock,
  DollarSign,
  Mail,
  Phone,
  Smartphone
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SupplierProfile {
  supplier_id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  operating_hours: Record<string, any> | null;
  service_areas: string[] | null;
  return_policy: string | null;
  shipping_policy: string | null;
  minimum_order_value: number | null;
  payout_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  commission_rate: number;
  subscription_plan: 'basic' | 'standard' | 'premium';
  onboarding_completed: boolean;
  verification_status: string;
  rating_average: number;
  total_reviews: number;
}

interface TeamMember {
  member_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  permissions: Record<string, boolean>;
  status: 'active' | 'pending' | 'inactive';
  invited_date: string;
  last_active: string | null;
}

interface NotificationPreferences {
  new_orders: { email: boolean; sms: boolean; push: boolean };
  low_stock_alerts: { email: boolean; sms: boolean; push: boolean };
  customer_messages: { email: boolean; sms: boolean; push: boolean };
  payment_updates: { email: boolean; sms: boolean };
  marketing_emails: boolean;
}

interface BankAccountInfo {
  account_holder_name: string;
  bank_name: string;
  account_number_last_four: string;
  routing_number_masked: string;
  account_type: 'checking' | 'savings';
}

interface IntegrationSettings {
  inventory_sync_enabled: boolean;
  inventory_api_key: string | null;
  last_sync_timestamp: string | null;
  webhooks_enabled: boolean;
  webhook_url: string | null;
}

// interface SubscriptionDetails {
//   plan: 'basic' | 'standard' | 'premium';
//   billing_cycle: 'monthly' | 'annual';
//   next_billing_date: string;
//   amount: number;
//   features: string[];
//   usage_limits: Record<string, any>;
// }

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchSupplierProfile = async (authToken: string): Promise<SupplierProfile> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data;
};

const updateSupplierProfile = async (data: Partial<SupplierProfile>, authToken: string) => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me`,
    data,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data;
};

// Mock team members endpoint (would need backend implementation)
const fetchTeamMembers = async (_authToken: string): Promise<TeamMember[]> => {
  // Mock data for MVP
  return [];
};

const addTeamMember = async (_data: { email: string; role: string; permissions: Record<string, boolean> }) => {
  // Mock for MVP
  return { success: true, member_id: `member_${Date.now()}` };
};

// const updateTeamMember = async (memberId: string, data: { role: string; permissions: Record<string, boolean> }) => {
// //   // Mock for MVP
// //   return { success: true };
// // };

const removeTeamMember = async (_memberId: string) => {
  // Mock for MVP
  return { success: true };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierSettings: React.FC = () => {
  // ============================================================================
  // ZUSTAND STATE (CRITICAL: Individual selectors)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  // const supplierProfileGlobal = useAppStore(state => state.authentication_state.supplier_profile);
  
  // ============================================================================
  // URL PARAMS & NAVIGATION
  // ============================================================================
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'profile';
  
  const setActiveSection = (section: string) => {
    setSearchParams({ section });
  };
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  // Profile form state
  const [profileForm, setProfileForm] = useState<Partial<SupplierProfile>>({});
  
  // Team form state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamMember, setNewTeamMember] = useState<{ email: string; role: 'admin' | 'manager' | 'staff' }>({ email: '', role: 'staff' });
  
  // Notification form state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    new_orders: { email: true, sms: true, push: true },
    low_stock_alerts: { email: true, sms: false, push: true },
    customer_messages: { email: true, sms: false, push: true },
    payment_updates: { email: true, sms: false },
    marketing_emails: false
  });
  
  // Integration form state
  const [integrationForm, setIntegrationForm] = useState<IntegrationSettings>({
    inventory_sync_enabled: false,
    inventory_api_key: null,
    last_sync_timestamp: null,
    webhooks_enabled: false,
    webhook_url: null
  });
  
  // Bank account form state
  const [bankForm, setBankForm] = useState<Partial<BankAccountInfo>>({});
  const [showBankForm, setShowBankForm] = useState(false);
  
  // Success/error messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // ============================================================================
  // REACT QUERY - FETCH DATA
  // ============================================================================
  
  const queryClient = useQueryClient();
  
  const { data: supplierProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['supplier-profile'],
    queryFn: () => fetchSupplierProfile(authToken!),
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false
  });
  
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => fetchTeamMembers(authToken!),
    enabled: !!authToken && activeSection === 'team',
    staleTime: 60000
  });
  
  // ============================================================================
  // REACT QUERY - MUTATIONS
  // ============================================================================
  
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<SupplierProfile>) => updateSupplierProfile(data!, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-profile'] });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to update profile');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  });
  
  const addTeamMemberMutation = useMutation({
    mutationFn: (data: { email: string; role: string; permissions: Record<string, boolean> }) => 
      addTeamMember(data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setShowAddTeamModal(false);
      setNewTeamMember({ email: '', role: 'staff' });
      setSuccessMessage('Team member invited successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || 'Failed to add team member');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  });
  
  const removeTeamMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeTeamMember(memberId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setSuccessMessage('Team member removed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  });
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initialize profile form when data loads
  useEffect(() => {
    if (supplierProfile) {
      setProfileForm({
        business_name: supplierProfile.business_name,
        business_description: supplierProfile.business_description,
        logo_url: supplierProfile.logo_url,
        cover_photo_url: supplierProfile.cover_photo_url,
        operating_hours: supplierProfile.operating_hours,
        service_areas: supplierProfile.service_areas,
        return_policy: supplierProfile.return_policy,
        shipping_policy: supplierProfile.shipping_policy,
        minimum_order_value: supplierProfile.minimum_order_value
      });
    }
  }, [supplierProfile]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };
  
  const handleNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ 
      // Note: backend PATCH /api/suppliers/me doesn't currently support notification_preferences
      // This would need backend update to store in suppliers table
    });
    setSuccessMessage('Notification preferences updated!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  
  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    addTeamMemberMutation.mutate({
      email: newTeamMember.email,
      role: newTeamMember.role,
      permissions: {
        manage_products: newTeamMember.role !== 'staff',
        manage_orders: true,
        manage_inventory: true,
        view_analytics: newTeamMember.role !== 'staff',
        manage_team: false
      }
    });
  };
  
  const handleRemoveTeamMember = (memberId: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      removeTeamMemberMutation.mutate(memberId);
    }
  };
  
  const handleBankAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock for MVP - would call payout-settings endpoint
    setSuccessMessage('Bank account information updated!');
    setShowBankForm(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  
  const handleIntegrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock for MVP - would call integrations endpoint
    setSuccessMessage('Integration settings updated!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  
  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  
  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'team', label: 'Team Management', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Code },
    { id: 'billing', label: 'Billing & Payouts', icon: CreditCard }
  ];
  
  // const defaultPermissions = {
  //   manage_products: false,
  //   manage_orders: true,
  //   manage_inventory: true,
  //   view_analytics: false,
  //   manage_team: false
  // };
  
  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================
  
  if (profileLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading settings...</p>
          </div>
        </div>
      </>
    );
  }
  
  if (profileError) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="flex items-center space-x-3 text-red-700">
              <AlertCircle className="h-6 w-6" />
              <p className="font-medium">Failed to load settings</p>
            </div>
            <p className="text-red-600 text-sm mt-2">Please try refreshing the page</p>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                  <Settings className="h-8 w-8 text-blue-600" />
                  <span>Settings</span>
                </h1>
                <p className="text-gray-600 mt-2">Manage your business configuration and preferences</p>
              </div>
              <Link 
                to="/supplier/dashboard"
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2 transition-colors"
              >
                <span>← Back to Dashboard</span>
              </Link>
            </div>
          </div>
          
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
              <Check className="h-5 w-5 text-green-600" />
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700 font-medium">{errorMessage}</p>
            </div>
          )}
          
          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSection(tab.id)}
                      className={`
                        py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors
                        ${isActive 
                          ? 'border-blue-600 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* PROFILE SECTION */}
            {activeSection === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Profile</h2>
                  
                  {/* Business Name */}
                  <div className="mb-6">
                    <label htmlFor="business_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      id="business_name"
                      value={profileForm.business_name || ''}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, business_name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      required
                    />
                  </div>
                  
                  {/* Business Description */}
                  <div className="mb-6">
                    <label htmlFor="business_description" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Description
                    </label>
                    <textarea
                      id="business_description"
                      value={profileForm.business_description || ''}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, business_description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="Tell customers about your business..."
                    />
                  </div>
                  
                  {/* Logo & Cover Photo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                        Logo URL
                      </label>
                      <div className="space-y-2">
                        <input
                          type="url"
                          id="logo_url"
                          value={profileForm.logo_url || ''}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, logo_url: e.target.value }))}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          placeholder="https://..."
                        />
                        {profileForm.logo_url && (
                          <div className="mt-2">
                            <img src={profileForm.logo_url} alt="Logo preview" className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="cover_photo_url" className="block text-sm font-medium text-gray-700 mb-2">
                        Cover Photo URL
                      </label>
                      <div className="space-y-2">
                        <input
                          type="url"
                          id="cover_photo_url"
                          value={profileForm.cover_photo_url || ''}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, cover_photo_url: e.target.value }))}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          placeholder="https://..."
                        />
                        {profileForm.cover_photo_url && (
                          <div className="mt-2">
                            <img src={profileForm.cover_photo_url} alt="Cover preview" className="h-20 w-full object-cover rounded-lg border-2 border-gray-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Service Areas */}
                  <div className="mb-6">
                    <label htmlFor="service_areas" className="block text-sm font-medium text-gray-700 mb-2">
                      Service Areas (comma-separated postal codes or cities)
                    </label>
                    <input
                      type="text"
                      id="service_areas"
                      value={profileForm.service_areas?.join(', ') || ''}
                      onChange={(e) => setProfileForm(prev => ({ 
                        ...prev, 
                        service_areas: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                      }))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="78701, 78702, Austin, Round Rock"
                    />
                  </div>
                  
                  {/* Policies */}
                  <div className="mb-6">
                    <label htmlFor="return_policy" className="block text-sm font-medium text-gray-700 mb-2">
                      Return Policy
                    </label>
                    <textarea
                      id="return_policy"
                      value={profileForm.return_policy || ''}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, return_policy: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="Describe your return policy..."
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="shipping_policy" className="block text-sm font-medium text-gray-700 mb-2">
                      Shipping Policy
                    </label>
                    <textarea
                      id="shipping_policy"
                      value={profileForm.shipping_policy || ''}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, shipping_policy: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="Describe your shipping policy..."
                    />
                  </div>
                  
                  {/* Minimum Order Value */}
                  <div className="mb-6">
                    <label htmlFor="minimum_order_value" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Order Value ($)
                    </label>
                    <input
                      type="number"
                      id="minimum_order_value"
                      value={profileForm.minimum_order_value || ''}
                      onChange={(e) => setProfileForm(prev => ({ 
                        ...prev, 
                        minimum_order_value: e.target.value ? Number(e.target.value) : null 
                      }))}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
            
            {/* TEAM SECTION */}
            {activeSection === 'team' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
                    <p className="text-gray-600 mt-1">Manage team members and their permissions</p>
                  </div>
                  <button
                    onClick={() => setShowAddTeamModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Team Member</span>
                  </button>
                </div>
                
                {/* Team Members Table */}
                {teamLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading team members...</p>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No team members yet</p>
                    <p className="text-gray-500 text-sm mt-2">Invite team members to help manage your business</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamMembers.map((member) => (
                          <tr key={member.member_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                                  <div className="text-sm text-gray-500">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`
                                px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}
                                ${member.role === 'manager' ? 'bg-blue-100 text-blue-800' : ''}
                                ${member.role === 'staff' ? 'bg-gray-100 text-gray-800' : ''}
                              `}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`
                                px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                ${member.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                                ${member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                                ${member.status === 'inactive' ? 'bg-gray-100 text-gray-800' : ''}
                              `}>
                                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {member.last_active ? new Date(member.last_active).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                type="button"
                                onClick={() => handleRemoveTeamMember(member.member_id)}
                                className="text-red-600 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Add Team Member Modal */}
                {showAddTeamModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900">Add Team Member</h3>
                        <button
                          onClick={() => setShowAddTeamModal(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      
                      <form onSubmit={handleAddTeamMember} className="space-y-4">
                        <div>
                          <label htmlFor="team_email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            id="team_email"
                            value={newTeamMember.email}
                            onChange={(e) => setNewTeamMember(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            required
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="team_role" className="block text-sm font-medium text-gray-700 mb-2">
                            Role *
                          </label>
                          <select
                            id="team_role"
                            value={newTeamMember.role}
                            onChange={(e) => setNewTeamMember(prev => ({ 
                              ...prev, 
                              role: e.target.value as 'admin' | 'manager' | 'staff' 
                            }))}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          >
                            <option value="staff">Staff - Basic access</option>
                            <option value="manager">Manager - Full access except team</option>
                            <option value="admin">Admin - Full access</option>
                          </select>
                        </div>
                        
                        <div className="flex space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setShowAddTeamModal(false)}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={addTeamMemberMutation.isPending}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addTeamMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* NOTIFICATIONS SECTION */}
            {activeSection === 'notifications' && (
              <form onSubmit={handleNotificationSubmit} className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Preferences</h2>
                  <p className="text-gray-600 mb-6">Choose how you want to be notified about important events</p>
                  
                  {/* New Orders */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      <span>New Orders</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.new_orders.email}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            new_orders: { ...prev.new_orders, email: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Email</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.new_orders.sms}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            new_orders: { ...prev.new_orders, sms: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">SMS</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.new_orders.push}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            new_orders: { ...prev.new_orders, push: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Push</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Low Stock Alerts */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span>Low Stock Alerts</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.low_stock_alerts.email}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            low_stock_alerts: { ...prev.low_stock_alerts, email: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Email</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.low_stock_alerts.sms}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            low_stock_alerts: { ...prev.low_stock_alerts, sms: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">SMS</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.low_stock_alerts.push}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            low_stock_alerts: { ...prev.low_stock_alerts, push: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Push</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Customer Messages */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-green-600" />
                      <span>Customer Messages</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.customer_messages.email}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            customer_messages: { ...prev.customer_messages, email: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Email</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.customer_messages.sms}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            customer_messages: { ...prev.customer_messages, sms: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">SMS</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.customer_messages.push}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            customer_messages: { ...prev.customer_messages, push: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Push</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Payment Updates */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span>Payment Updates</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.payment_updates.email}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            payment_updates: { ...prev.payment_updates, email: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Email</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationPrefs.payment_updates.sms}
                          onChange={(e) => setNotificationPrefs(prev => ({
                            ...prev,
                            payment_updates: { ...prev.payment_updates, sms: e.target.checked }
                          }))}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">SMS</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Marketing Emails */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.marketing_emails}
                        onChange={(e) => setNotificationPrefs(prev => ({
                          ...prev,
                          marketing_emails: e.target.checked
                        }))}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Marketing Emails</span>
                        <p className="text-xs text-gray-500">Receive tips, updates, and promotional content</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all flex items-center space-x-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Preferences</span>
                  </button>
                </div>
              </form>
            )}
            
            {/* INTEGRATIONS SECTION */}
            {activeSection === 'integrations' && (
              <form onSubmit={handleIntegrationSubmit} className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">API Integrations</h2>
                  <p className="text-gray-600 mb-6">Connect external systems to automate inventory management</p>
                  
                  {/* Inventory Sync */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Inventory Synchronization</h3>
                        <p className="text-sm text-gray-600">Automatically sync stock levels from your system</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integrationForm.inventory_sync_enabled}
                          onChange={(e) => setIntegrationForm(prev => ({
                            ...prev,
                            inventory_sync_enabled: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {integrationForm.inventory_sync_enabled && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="password"
                              value={integrationForm.inventory_api_key || ''}
                              onChange={(e) => setIntegrationForm(prev => ({
                                ...prev,
                                inventory_api_key: e.target.value
                              }))}
                              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                              placeholder="Enter your API key"
                            />
                            <button
                              type="button"
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                              Generate
                            </button>
                          </div>
                        </div>
                        
                        {integrationForm.last_sync_timestamp && (
                          <div className="text-sm text-gray-600 flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Last synced: {new Date(integrationForm.last_sync_timestamp).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Webhooks */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Webhooks</h3>
                        <p className="text-sm text-gray-600">Receive real-time notifications about events</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integrationForm.webhooks_enabled}
                          onChange={(e) => setIntegrationForm(prev => ({
                            ...prev,
                            webhooks_enabled: e.target.checked
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {integrationForm.webhooks_enabled && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          value={integrationForm.webhook_url || ''}
                          onChange={(e) => setIntegrationForm(prev => ({
                            ...prev,
                            webhook_url: e.target.value
                          }))}
                          className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          placeholder="https://your-server.com/webhook"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all flex items-center space-x-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Integration Settings</span>
                  </button>
                </div>
              </form>
            )}
            
            {/* BILLING SECTION */}
            {activeSection === 'billing' && supplierProfile && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Billing & Payouts</h2>
                  <p className="text-gray-600 mb-6">Manage your subscription and payout settings</p>
                  
                  {/* Current Subscription */}
                  <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Current Subscription</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Plan</p>
                        <p className="text-lg font-bold text-gray-900 capitalize">{supplierProfile.subscription_plan}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Billing Cycle</p>
                        <p className="text-lg font-bold text-gray-900">Monthly</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Commission Rate</p>
                        <p className="text-lg font-bold text-gray-900">{supplierProfile.commission_rate}%</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payout Frequency */}
                  <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Payout Settings</h3>
                    <div className="mb-4">
                      <label htmlFor="payout_frequency" className="block text-sm font-medium text-gray-700 mb-2">
                        Payout Frequency
                      </label>
                      <select
                        id="payout_frequency"
                        value={profileForm.payout_frequency || supplierProfile.payout_frequency}
                        onChange={(e) => setProfileForm(prev => ({ 
                          ...prev, 
                          payout_frequency: e.target.value as 'weekly' | 'bi-weekly' | 'monthly' 
                        }))}
                        className="w-full md:w-64 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    {/* Bank Account Info */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">Bank Account</h4>
                        <button
                          type="button"
                          onClick={() => setShowBankForm(!showBankForm)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                          {showBankForm ? 'Cancel' : 'Update Account'}
                        </button>
                      </div>
                      
                      {!showBankForm ? (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-600">Account ending in •••• 1234</p>
                          <p className="text-sm text-gray-600">Bank: Sample Bank</p>
                        </div>
                      ) : (
                        <form onSubmit={handleBankAccountSubmit} className="space-y-4 bg-white rounded-lg p-4 border border-gray-200">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Holder Name
                            </label>
                            <input
                              type="text"
                              value={bankForm.account_holder_name || ''}
                              onChange={(e) => setBankForm(prev => ({ ...prev, account_holder_name: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Bank Name
                            </label>
                            <input
                              type="text"
                              value={bankForm.bank_name || ''}
                              onChange={(e) => setBankForm(prev => ({ ...prev, bank_name: e.target.value }))}
                              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Account Type
                            </label>
                            <select
                              value={bankForm.account_type || 'checking'}
                              onChange={(e) => setBankForm(prev => ({ 
                                ...prev, 
                                account_type: e.target.value as 'checking' | 'savings' 
                              }))}
                              className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            >
                              <option value="checking">Checking</option>
                              <option value="savings">Savings</option>
                            </select>
                          </div>
                          
                          <div className="flex space-x-3 pt-4">
                            <button
                              type="button"
                              onClick={() => setShowBankForm(false)}
                              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                              Update Account
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                    
                    {/* Update Payout Frequency Button */}
                    {profileForm.payout_frequency !== supplierProfile.payout_frequency && (
                      <div className="mt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={() => updateProfileMutation.mutate({ payout_frequency: profileForm.payout_frequency })}
                          disabled={updateProfileMutation.isPending}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <Save className="h-5 w-5" />
                          <span>Update Payout Frequency</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SupplierSettings;