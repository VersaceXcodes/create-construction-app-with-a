import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  Settings, 
  DollarSign, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Bell, 
  Zap,
  Save,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PlatformSetting {
  setting_id?: string;
  setting_key: string;
  setting_value: any;
  setting_category: string;
  last_updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface GeneralSettings {
  platform_name: string;
  logo_url: string;
  support_email: string;
  operating_regions: string[];
  default_currency: string;
  default_language: string;
}

interface CommissionSettings {
  default_commission_rate: number;
  tier_based_rates: Record<string, number>;
  subscription_pricing: Record<string, number>;
  transaction_fees: Record<string, number>;
  payment_processing_rates: Record<string, number>;
}

interface UserSettings {
  registration_approval_required: boolean;
  email_verification_required: boolean;
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
  };
  session_timeout_minutes: number;
  two_factor_required: boolean;
}

interface OrderSettings {
  minimum_order_value: number;
  maximum_order_value: number;
  order_cancellation_window_hours: number;
  automatic_refund_enabled: boolean;
  delivery_sla_hours: number;
}

interface PaymentSettings {
  available_payment_methods: string[];
  payment_gateway_config: Record<string, any>;
  escrow_hold_period_days: number;
  auto_capture_enabled: boolean;
  refund_policy: Record<string, any>;
}

interface NotificationSettings {
  email_provider_config: Record<string, any>;
  sms_provider_config: Record<string, any>;
  notification_templates: any[];
  default_notification_preferences: Record<string, any>;
  rate_limits: Record<string, number>;
}

interface IntegrationSettings {
  logistics_integrations: any[];
  payment_gateways: any[];
  mapping_service_config: Record<string, any>;
  analytics_integrations: any[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchPlatformSettings = async (authToken: string, category?: string) => {
  const params = category ? { setting_category: category } : {};
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/settings`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
      params
    }
  );
  return response.data;
};

const updateSettings = async (authToken: string, settingKey: string, settingValue: any, settingCategory: string) => {
  const response = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/settings`,
    {
      setting_key: settingKey,
      setting_value: settingValue,
      setting_category: settingCategory
    },
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data;
};

const testIntegration = async (authToken: string, integrationType: string, config: any) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/integrations/test`,
    {
      integration_type: integrationType,
      config
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

const UV_AdminPlatformSettings: React.FC = () => {
  // ============================================================================
  // HOOKS - URL PARAMS
  // ============================================================================
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const activeSection = searchParams.get('section') || 'general';
  
  // ============================================================================
  // HOOKS - ZUSTAND STATE (CRITICAL: Individual selectors)
  // ============================================================================
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [general_settings, setGeneralSettings] = useState<GeneralSettings>({
    platform_name: 'BuildEasy',
    logo_url: '',
    support_email: '',
    operating_regions: [],
    default_currency: 'USD',
    default_language: 'en'
  });
  
  const [commission_fee_settings, setCommissionFeeSettings] = useState<CommissionSettings>({
    default_commission_rate: 5.0,
    tier_based_rates: {},
    subscription_pricing: {},
    transaction_fees: {},
    payment_processing_rates: {}
  });
  
  const [user_settings, setUserSettings] = useState<UserSettings>({
    registration_approval_required: false,
    email_verification_required: true,
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_special_chars: true
    },
    session_timeout_minutes: 1440,
    two_factor_required: false
  });
  
  const [order_settings, setOrderSettings] = useState<OrderSettings>({
    minimum_order_value: 0,
    maximum_order_value: 100000,
    order_cancellation_window_hours: 24,
    automatic_refund_enabled: true,
    delivery_sla_hours: 72
  });
  
  const [payment_settings, setPaymentSettings] = useState<PaymentSettings>({
    available_payment_methods: [],
    payment_gateway_config: {},
    escrow_hold_period_days: 3,
    auto_capture_enabled: true,
    refund_policy: {}
  });
  
  const [notification_settings, setNotificationSettings] = useState<NotificationSettings>({
    email_provider_config: {},
    sms_provider_config: {},
    notification_templates: [],
    default_notification_preferences: {},
    rate_limits: {}
  });
  
  const [integration_settings, setIntegrationSettings] = useState<IntegrationSettings>({
    logistics_integrations: [],
    payment_gateways: [],
    mapping_service_config: {},
    analytics_integrations: []
  });
  
  const [unsaved_changes, setUnsavedChanges] = useState<{
    has_changes: boolean;
    changed_sections: string[];
  }>({
    has_changes: false,
    changed_sections: []
  });
  
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  
  // ============================================================================
  // QUERY - FETCH SETTINGS
  // ============================================================================
  const { data: settingsData, isLoading: isLoadingSettings, error: settingsError } = useQuery({
    queryKey: ['platform-settings', activeSection],
    queryFn: () => fetchPlatformSettings(authToken!, undefined),
    enabled: !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1
  });
  
  // ============================================================================
  // MUTATION - UPDATE SETTINGS
  // ============================================================================
  const updateSettingsMutation = useMutation({
    mutationFn: ({ key, value, category }: { key: string; value: any; category: string }) => 
      updateSettings(authToken!, key, value, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      setUnsavedChanges({ has_changes: false, changed_sections: [] });
      setSuccessMessage('Settings updated successfully');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    },
    onError: (error: any) => {
      console.error('Failed to update settings:', error);
    }
  });
  
  // ============================================================================
  // EFFECT - TRANSFORM SETTINGS DATA
  // ============================================================================
  useEffect(() => {
    if (!settingsData) return;
    
    // Transform settings array to categorized objects (from dataMapper)
    const transformedSettings = {
      general_settings: settingsData.filter((s: PlatformSetting) => s.setting_category === 'general')
        .reduce((acc: any, setting: PlatformSetting) => ({ ...acc, [setting.setting_key]: setting.setting_value }), {}),
      commission_fee_settings: settingsData.filter((s: PlatformSetting) => s.setting_category === 'commission')
        .reduce((acc: any, setting: PlatformSetting) => ({ ...acc, [setting.setting_key]: setting.setting_value }), {}),
      user_settings: settingsData.filter((s: PlatformSetting) => s.setting_category === 'user_policy')
        .reduce((acc: any, setting: PlatformSetting) => ({ ...acc, [setting.setting_key]: setting.setting_value }), {}),
      order_settings: settingsData.filter((s: PlatformSetting) => s.setting_category === 'order_policy')
        .reduce((acc: any, setting: PlatformSetting) => ({ ...acc, [setting.setting_key]: setting.setting_value }), {}),
      payment_settings: settingsData.filter((s: PlatformSetting) => s.setting_category === 'payment')
        .reduce((acc: any, setting: PlatformSetting) => ({ ...acc, [setting.setting_key]: setting.setting_value }), {}),
      notification_settings: settingsData.filter((s: PlatformSetting) => s.setting_category === 'notifications')
        .reduce((acc: any, setting: PlatformSetting) => ({ ...acc, [setting.setting_key]: setting.setting_value }), {}),
      integration_settings: settingsData.filter((s: PlatformSetting) => s.setting_category === 'integrations')
        .reduce((acc: any, setting: PlatformSetting) => ({ ...acc, [setting.setting_key]: setting.setting_value }), {})
    };
    
    // Update state with fetched values
    if (Object.keys(transformedSettings.general_settings).length > 0) {
      setGeneralSettings(prev => ({ ...prev, ...transformedSettings.general_settings }));
    }
    if (Object.keys(transformedSettings.commission_fee_settings).length > 0) {
      setCommissionFeeSettings(prev => ({ ...prev, ...transformedSettings.commission_fee_settings }));
    }
    if (Object.keys(transformedSettings.user_settings).length > 0) {
      setUserSettings(prev => ({ ...prev, ...transformedSettings.user_settings }));
    }
    if (Object.keys(transformedSettings.order_settings).length > 0) {
      setOrderSettings(prev => ({ ...prev, ...transformedSettings.order_settings }));
    }
    if (Object.keys(transformedSettings.payment_settings).length > 0) {
      setPaymentSettings(prev => ({ ...prev, ...transformedSettings.payment_settings }));
    }
    if (Object.keys(transformedSettings.notification_settings).length > 0) {
      setNotificationSettings(prev => ({ ...prev, ...transformedSettings.notification_settings }));
    }
    if (Object.keys(transformedSettings.integration_settings).length > 0) {
      setIntegrationSettings(prev => ({ ...prev, ...transformedSettings.integration_settings }));
    }
  }, [settingsData]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleSectionChange = (section: string) => {
    if (unsaved_changes.has_changes) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
      setUnsavedChanges({ has_changes: false, changed_sections: [] });
    }
    setSearchParams({ section });
  };
  
  const markSectionChanged = (section: string) => {
    setUnsavedChanges(prev => ({
      has_changes: true,
      changed_sections: prev.changed_sections.includes(section) 
        ? prev.changed_sections 
        : [...prev.changed_sections, section]
    }));
  };
  
  const handleSaveGeneralSettings = async () => {
    const promises = Object.entries(general_settings).map(([key, value]) =>
      updateSettingsMutation.mutateAsync({ key, value, category: 'general' })
    );
    await Promise.all(promises);
  };
  
  const handleSaveCommissionSettings = async () => {
    const promises = Object.entries(commission_fee_settings).map(([key, value]) =>
      updateSettingsMutation.mutateAsync({ key, value, category: 'commission' })
    );
    await Promise.all(promises);
  };
  
  const handleSaveUserSettings = async () => {
    const promises = Object.entries(user_settings).map(([key, value]) =>
      updateSettingsMutation.mutateAsync({ key, value, category: 'user_policy' })
    );
    await Promise.all(promises);
  };
  
  const handleSaveOrderSettings = async () => {
    const promises = Object.entries(order_settings).map(([key, value]) =>
      updateSettingsMutation.mutateAsync({ key, value, category: 'order_policy' })
    );
    await Promise.all(promises);
  };
  
  const handleSavePaymentSettings = async () => {
    const promises = Object.entries(payment_settings).map(([key, value]) =>
      updateSettingsMutation.mutateAsync({ key, value, category: 'payment' })
    );
    await Promise.all(promises);
  };
  
  const handleSaveNotificationSettings = async () => {
    const promises = Object.entries(notification_settings).map(([key, value]) =>
      updateSettingsMutation.mutateAsync({ key, value, category: 'notifications' })
    );
    await Promise.all(promises);
  };
  
  const handleSaveIntegrationSettings = async () => {
    const promises = Object.entries(integration_settings).map(([key, value]) =>
      updateSettingsMutation.mutateAsync({ key, value, category: 'integrations' })
    );
    await Promise.all(promises);
  };
  
  const handleDiscardChanges = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    setUnsavedChanges({ has_changes: false, changed_sections: [] });
  };
  
  // ============================================================================
  // VALIDATION
  // ============================================================================
  if (!authToken) {
    navigate('/login');
    return null;
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'commission', label: 'Commission & Fees', icon: DollarSign },
    { id: 'user_policy', label: 'User Policies', icon: Users },
    { id: 'order_policy', label: 'Order Policies', icon: ShoppingCart },
    { id: 'payment', label: 'Payment Settings', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Zap }
  ];
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Configure system-wide settings and integrations
                </p>
              </div>
              
              {unsaved_changes.has_changes && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                    <span className="text-sm text-amber-700 font-medium">
                      {unsaved_changes.changed_sections.length} unsaved change{unsaved_changes.changed_sections.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleDiscardChanges}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar Navigation */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const hasUnsaved = unsaved_changes.changed_sections.includes(section.id);
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                          : 'text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="flex-1 text-left">{section.label}</span>
                      {hasUnsaved && (
                        <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* Settings Content */}
            <div className="flex-1">
              {isLoadingSettings ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading settings...</p>
                </div>
              ) : settingsError ? (
                <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
                  <div className="flex items-center text-red-700 mb-2">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <h3 className="font-semibold">Error Loading Settings</h3>
                  </div>
                  <p className="text-sm text-red-600">
                    {(settingsError as any)?.message || 'Failed to load platform settings'}
                  </p>
                </div>
              ) : (
                <>
                  {/* General Settings */}
                  {activeSection === 'general' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
                        <p className="mt-1 text-sm text-gray-600">Platform branding and basic configuration</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Platform Name
                          </label>
                          <input
                            type="text"
                            value={general_settings.platform_name}
                            onChange={(e) => {
                              setGeneralSettings(prev => ({ ...prev, platform_name: e.target.value }));
                              markSectionChanged('general');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="BuildEasy"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Logo URL
                          </label>
                          <input
                            type="url"
                            value={general_settings.logo_url}
                            onChange={(e) => {
                              setGeneralSettings(prev => ({ ...prev, logo_url: e.target.value }));
                              markSectionChanged('general');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="https://cdn.example.com/logo.png"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Support Email
                          </label>
                          <input
                            type="email"
                            value={general_settings.support_email}
                            onChange={(e) => {
                              setGeneralSettings(prev => ({ ...prev, support_email: e.target.value }));
                              markSectionChanged('general');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="support@buildeasy.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Currency
                          </label>
                          <select
                            value={general_settings.default_currency}
                            onChange={(e) => {
                              setGeneralSettings(prev => ({ ...prev, default_currency: e.target.value }));
                              markSectionChanged('general');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="CAD">CAD - Canadian Dollar</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Language
                          </label>
                          <select
                            value={general_settings.default_language}
                            onChange={(e) => {
                              setGeneralSettings(prev => ({ ...prev, default_language: e.target.value }));
                              markSectionChanged('general');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                          </select>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleSaveGeneralSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save General Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Commission & Fees Settings */}
                  {activeSection === 'commission' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Commission & Fees</h2>
                        <p className="mt-1 text-sm text-gray-600">Configure platform revenue and supplier fees</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Commission Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={commission_fee_settings.default_commission_rate}
                            onChange={(e) => {
                              setCommissionFeeSettings(prev => ({ 
                                ...prev, 
                                default_commission_rate: parseFloat(e.target.value) || 0 
                              }));
                              markSectionChanged('commission');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="5.0"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Platform commission on each transaction
                          </p>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-blue-900 mb-2">
                            Tier-Based Rates
                          </h3>
                          <p className="text-xs text-blue-700">
                            Advanced commission tiers based on supplier performance (configure in future release)
                          </p>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-blue-900 mb-2">
                            Subscription Pricing
                          </h3>
                          <p className="text-xs text-blue-700">
                            Supplier subscription plan pricing (configure in future release)
                          </p>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleSaveCommissionSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Commission Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* User Policy Settings */}
                  {activeSection === 'user_policy' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">User Policies</h2>
                        <p className="mt-1 text-sm text-gray-600">Registration and account management rules</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              Email Verification Required
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Users must verify email before full access
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setUserSettings(prev => ({ 
                                ...prev, 
                                email_verification_required: !prev.email_verification_required 
                              }));
                              markSectionChanged('user_policy');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              user_settings.email_verification_required ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                user_settings.email_verification_required ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              Registration Approval Required
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Admin must approve new accounts
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setUserSettings(prev => ({ 
                                ...prev, 
                                registration_approval_required: !prev.registration_approval_required 
                              }));
                              markSectionChanged('user_policy');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              user_settings.registration_approval_required ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                user_settings.registration_approval_required ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              Two-Factor Authentication Required
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Require 2FA for all user accounts
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setUserSettings(prev => ({ 
                                ...prev, 
                                two_factor_required: !prev.two_factor_required 
                              }));
                              markSectionChanged('user_policy');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              user_settings.two_factor_required ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                user_settings.two_factor_required ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Timeout (minutes)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="10080"
                            value={user_settings.session_timeout_minutes}
                            onChange={(e) => {
                              setUserSettings(prev => ({ 
                                ...prev, 
                                session_timeout_minutes: parseInt(e.target.value) || 1440 
                              }));
                              markSectionChanged('user_policy');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="1440"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            1440 minutes = 24 hours
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            Password Policy
                          </h3>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Minimum length: {user_settings.password_policy.min_length} characters</span>
                              <input
                                type="number"
                                min="6"
                                max="128"
                                value={user_settings.password_policy.min_length}
                                onChange={(e) => {
                                  setUserSettings(prev => ({
                                    ...prev,
                                    password_policy: {
                                      ...prev.password_policy,
                                      min_length: parseInt(e.target.value) || 8
                                    }
                                  }));
                                  markSectionChanged('user_policy');
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            
                            {['require_uppercase', 'require_lowercase', 'require_numbers', 'require_special_chars'].map(key => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={(user_settings.password_policy as any)[key]}
                                  onChange={(e) => {
                                    setUserSettings(prev => ({
                                      ...prev,
                                      password_policy: {
                                        ...prev.password_policy,
                                        [key]: e.target.checked
                                      }
                                    }));
                                    markSectionChanged('user_policy');
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleSaveUserSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save User Policy Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Order Policy Settings */}
                  {activeSection === 'order_policy' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Order Policies</h2>
                        <p className="mt-1 text-sm text-gray-600">Order processing and fulfillment rules</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Order Value ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={order_settings.minimum_order_value}
                            onChange={(e) => {
                              setOrderSettings(prev => ({ 
                                ...prev, 
                                minimum_order_value: parseFloat(e.target.value) || 0 
                              }));
                              markSectionChanged('order_policy');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="0"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Order Value ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={order_settings.maximum_order_value}
                            onChange={(e) => {
                              setOrderSettings(prev => ({ 
                                ...prev, 
                                maximum_order_value: parseFloat(e.target.value) || 100000 
                              }));
                              markSectionChanged('order_policy');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="100000"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Order Cancellation Window (hours)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="168"
                            value={order_settings.order_cancellation_window_hours}
                            onChange={(e) => {
                              setOrderSettings(prev => ({ 
                                ...prev, 
                                order_cancellation_window_hours: parseInt(e.target.value) || 24 
                              }));
                              markSectionChanged('order_policy');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="24"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Time window for customers to cancel orders
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Delivery SLA (hours)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="720"
                            value={order_settings.delivery_sla_hours}
                            onChange={(e) => {
                              setOrderSettings(prev => ({ 
                                ...prev, 
                                delivery_sla_hours: parseInt(e.target.value) || 72 
                              }));
                              markSectionChanged('order_policy');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="72"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Expected delivery timeframe
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              Automatic Refund Processing
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Process refunds automatically for eligible cancellations
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setOrderSettings(prev => ({ 
                                ...prev, 
                                automatic_refund_enabled: !prev.automatic_refund_enabled 
                              }));
                              markSectionChanged('order_policy');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              order_settings.automatic_refund_enabled ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                order_settings.automatic_refund_enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleSaveOrderSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Order Policy Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Settings */}
                  {activeSection === 'payment' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Payment Settings</h2>
                        <p className="mt-1 text-sm text-gray-600">Payment gateway and processing configuration</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Available Payment Methods
                          </label>
                          <div className="space-y-2">
                            {['credit_card', 'debit_card', 'trade_credit', 'paypal', 'apple_pay', 'google_pay'].map(method => (
                              <div key={method} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={method}
                                  checked={payment_settings.available_payment_methods.includes(method)}
                                  onChange={(e) => {
                                    setPaymentSettings(prev => ({
                                      ...prev,
                                      available_payment_methods: e.target.checked
                                        ? [...prev.available_payment_methods, method]
                                        : prev.available_payment_methods.filter(m => m !== method)
                                    }));
                                    markSectionChanged('payment');
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={method} className="ml-3 text-sm text-gray-700">
                                  {method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Escrow Hold Period (days)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={payment_settings.escrow_hold_period_days}
                            onChange={(e) => {
                              setPaymentSettings(prev => ({ 
                                ...prev, 
                                escrow_hold_period_days: parseInt(e.target.value) || 3 
                              }));
                              markSectionChanged('payment');
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                            placeholder="3"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Hold payment before releasing to supplier
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              Auto-Capture Payments
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                              Automatically capture payment on order placement
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setPaymentSettings(prev => ({ 
                                ...prev, 
                                auto_capture_enabled: !prev.auto_capture_enabled 
                              }));
                              markSectionChanged('payment');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              payment_settings.auto_capture_enabled ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                payment_settings.auto_capture_enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleSavePaymentSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Payment Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Notification Settings */}
                  {activeSection === 'notifications' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
                        <p className="mt-1 text-sm text-gray-600">Email, SMS, and push notification configuration</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-blue-900 mb-2">
                            Email Provider Configuration
                          </h3>
                          <p className="text-xs text-blue-700">
                            Configure SendGrid, Mailgun, or custom SMTP settings (advanced configuration)
                          </p>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-blue-900 mb-2">
                            SMS Provider Configuration
                          </h3>
                          <p className="text-xs text-blue-700">
                            Configure Twilio or custom SMS gateway (advanced configuration)
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            Rate Limits
                          </h3>
                          <p className="text-xs text-gray-600 mb-3">
                            Prevent notification spam by setting rate limits
                          </p>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">Email (per hour)</span>
                              <input
                                type="number"
                                min="1"
                                value={(notification_settings.rate_limits as any)?.email_per_hour || 10}
                                onChange={(e) => {
                                  setNotificationSettings(prev => ({
                                    ...prev,
                                    rate_limits: {
                                      ...prev.rate_limits,
                                      email_per_hour: parseInt(e.target.value) || 10
                                    }
                                  }));
                                  markSectionChanged('notifications');
                                }}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">SMS (per hour)</span>
                              <input
                                type="number"
                                min="1"
                                value={(notification_settings.rate_limits as any)?.sms_per_hour || 5}
                                onChange={(e) => {
                                  setNotificationSettings(prev => ({
                                    ...prev,
                                    rate_limits: {
                                      ...prev.rate_limits,
                                      sms_per_hour: parseInt(e.target.value) || 5
                                    }
                                  }));
                                  markSectionChanged('notifications');
                                }}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleSaveNotificationSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Notification Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Integration Settings */}
                  {activeSection === 'integrations' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Third-Party Integrations</h2>
                        <p className="mt-1 text-sm text-gray-600">Configure external service integrations</p>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Stripe Payment Gateway</h3>
                              <p className="text-sm text-gray-600 mt-1">Payment processing integration</p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Active
                            </span>
                          </div>
                          
                          <button
                            onClick={async () => {
                              setTestingIntegration('stripe');
                              try {
                                await testIntegration(authToken!, 'stripe', {});
                                setSuccessMessage('Stripe integration test successful');
                                setShowSuccessToast(true);
                                setTimeout(() => setShowSuccessToast(false), 3000);
                              } catch (error) {
                                console.error('Integration test failed:', error);
                              } finally {
                                setTestingIntegration(null);
                              }
                            }}
                            disabled={testingIntegration === 'stripe'}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center"
                          >
                            {testingIntegration === 'stripe' ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">Google Maps API</h3>
                              <p className="text-sm text-gray-600 mt-1">Location and geocoding services</p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Active
                            </span>
                          </div>
                          
                          <button
                            onClick={async () => {
                              setTestingIntegration('google_maps');
                              try {
                                await testIntegration(authToken!, 'google_maps', {});
                                setSuccessMessage('Google Maps integration test successful');
                                setShowSuccessToast(true);
                                setTimeout(() => setShowSuccessToast(false), 3000);
                              } catch (error) {
                                console.error('Integration test failed:', error);
                              } finally {
                                setTestingIntegration(null);
                              }
                            }}
                            disabled={testingIntegration === 'google_maps'}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center"
                          >
                            {testingIntegration === 'google_maps' ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">SendGrid Email Service</h3>
                              <p className="text-sm text-gray-600 mt-1">Transactional email delivery</p>
                            </div>
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                              Inactive
                            </span>
                          </div>
                          
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-300 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed flex items-center"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Configure to Test
                          </button>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-200">
                          <button
                            onClick={handleSaveIntegrationSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                          >
                            {updateSettingsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Integration Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3">
              <Check className="h-5 w-5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminPlatformSettings;