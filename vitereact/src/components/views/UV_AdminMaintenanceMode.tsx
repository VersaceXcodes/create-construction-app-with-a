import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { AlertTriangle, Power, Shield, GitBranch, Settings, Calendar, Zap } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface MaintenanceStatus {
  is_maintenance_active: boolean;
  maintenance_message: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  affected_services: string[];
  last_activated_by: string | null;
  last_activated_at: string | null;
}

interface FeatureFlag {
  flag_id: string;
  flag_name: string;
  description: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_user_types: string[];
  updated_by: string;
  updated_at: string;
}

interface VersionInfo {
  current_version: string;
  deployment_date: string;
  build_number: string;
  commit_hash: string;
  environment: string;
  rollback_available: boolean;
  previous_version: string | null;
}

interface MaintenanceWindow {
  maintenance_id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  maintenance_type: string;
  affected_services: string[];
  status: string;
  created_by: string;
}

interface ToggleMaintenancePayload {
  maintenance_active: boolean;
  maintenance_message: string;
  affected_services: string[];
}

interface ScheduleMaintenancePayload {
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  affected_services: string[];
  notify_users: boolean;
  warning_duration_minutes: number;
}

interface EmergencyMaintenancePayload {
  reason: string;
  estimated_duration_minutes: number;
  maintenance_message: string;
}

interface UpdateFeatureFlagPayload {
  is_enabled: boolean;
  rollout_percentage: number;
  target_user_types: string[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;

const fetchMaintenanceStatus = async (token: string): Promise<MaintenanceStatus> => {
  const response = await axios.get(`${API_BASE_URL}/admin/maintenance/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return {
    is_maintenance_active: response.data.maintenance_mode_active,
    maintenance_message: response.data.maintenance_message,
    scheduled_start: response.data.scheduled_start_time,
    scheduled_end: response.data.scheduled_end_time,
    affected_services: response.data.affected_services || [],
    last_activated_by: response.data.last_activated_by,
    last_activated_at: response.data.last_activated_timestamp
  };
};

const toggleMaintenance = async (token: string, payload: ToggleMaintenancePayload): Promise<MaintenanceStatus> => {
  const response = await axios.put(`${API_BASE_URL}/admin/maintenance/toggle`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return {
    is_maintenance_active: response.data.maintenance_mode_active,
    maintenance_message: response.data.maintenance_message,
    scheduled_start: null,
    scheduled_end: null,
    affected_services: response.data.affected_services || [],
    last_activated_by: response.data.activated_by,
    last_activated_at: response.data.activated_at
  };
};

const fetchFeatureFlags = async (token: string): Promise<FeatureFlag[]> => {
  const response = await axios.get(`${API_BASE_URL}/admin/features/flags`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.feature_flags.map((flag: any) => ({
    flag_id: flag.flag_id,
    flag_name: flag.flag_name,
    description: flag.description,
    is_enabled: flag.is_enabled,
    rollout_percentage: flag.rollout_percentage,
    target_user_types: flag.target_user_types || [],
    updated_by: flag.updated_by,
    updated_at: flag.updated_at
  }));
};

const updateFeatureFlag = async (token: string, flagId: string, payload: UpdateFeatureFlagPayload): Promise<void> => {
  await axios.put(`${API_BASE_URL}/admin/features/flags/${flagId}`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

const fetchVersionInfo = async (token: string): Promise<VersionInfo> => {
  const response = await axios.get(`${API_BASE_URL}/admin/platform/version`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return {
    current_version: response.data.version_number,
    deployment_date: response.data.deployment_timestamp,
    build_number: response.data.build_id,
    commit_hash: response.data.git_commit_hash,
    environment: response.data.environment_name,
    rollback_available: response.data.rollback_available,
    previous_version: response.data.previous_version
  };
};

const fetchScheduledMaintenance = async (token: string): Promise<MaintenanceWindow[]> => {
  const response = await axios.get(`${API_BASE_URL}/admin/maintenance/scheduled`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.scheduled_windows.map((window: any) => ({
    maintenance_id: window.maintenance_id,
    title: window.title,
    description: window.description,
    scheduled_start: window.scheduled_start_time,
    scheduled_end: window.scheduled_end_time,
    maintenance_type: window.maintenance_type,
    affected_services: window.affected_services || [],
    status: window.status,
    created_by: window.created_by
  }));
};

const scheduleMaintenanceWindow = async (token: string, payload: ScheduleMaintenancePayload): Promise<void> => {
  await axios.post(`${API_BASE_URL}/admin/maintenance/schedule`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

const emergencyMaintenance = async (token: string, payload: EmergencyMaintenancePayload): Promise<void> => {
  await axios.post(`${API_BASE_URL}/admin/maintenance/emergency`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminMaintenanceMode: React.FC = () => {
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  const queryClient = useQueryClient();
  
  // Local UI state
  const [activeTab, setActiveTab] = useState<'maintenance' | 'features' | 'version' | 'scheduled'>('maintenance');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Maintenance form state
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [affectedServices, setAffectedServices] = useState<string[]>([]);
  
  // Schedule form state
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleAffectedServices, setScheduleAffectedServices] = useState<string[]>([]);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [warningDuration, setWarningDuration] = useState(30);
  
  // Emergency form state
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyDuration, setEmergencyDuration] = useState(60);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  
  // Feature flag edit state
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [flagRolloutPercentage, setFlagRolloutPercentage] = useState(0);
  const [flagTargetUserTypes, setFlagTargetUserTypes] = useState<string[]>([]);
  
  // Available services (hardcoded for MVP)
  const AVAILABLE_SERVICES = [
    'api',
    'web_app',
    'mobile_app',
    'search',
    'payments',
    'notifications',
    'chat',
    'analytics'
  ];
  
  const USER_TYPES = ['customer', 'supplier', 'admin'];
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  const { data: maintenanceStatus, isLoading: isLoadingStatus, error: statusError } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => fetchMaintenanceStatus(authToken!),
    enabled: !!authToken,
    staleTime: 30000,
    refetchInterval: 60000 // Refresh every minute
  });
  
  const { data: featureFlags, isLoading: isLoadingFlags } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => fetchFeatureFlags(authToken!),
    enabled: !!authToken && activeTab === 'features',
    staleTime: 30000
  });
  
  const { data: versionInfo, isLoading: isLoadingVersion } = useQuery({
    queryKey: ['version-info'],
    queryFn: () => fetchVersionInfo(authToken!),
    enabled: !!authToken && activeTab === 'version',
    staleTime: 300000 // 5 minutes
  });
  
  const { data: scheduledMaintenance, isLoading: isLoadingScheduled } = useQuery({
    queryKey: ['scheduled-maintenance'],
    queryFn: () => fetchScheduledMaintenance(authToken!),
    enabled: !!authToken && activeTab === 'scheduled',
    staleTime: 60000
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const toggleMaintenanceMutation = useMutation({
    mutationFn: (payload: ToggleMaintenancePayload) => toggleMaintenance(authToken!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
      setShowConfirmDialog(false);
      setMaintenanceMessage('');
      setAffectedServices([]);
    }
  });
  
  const emergencyMaintenanceMutation = useMutation({
    mutationFn: (payload: EmergencyMaintenancePayload) => emergencyMaintenance(authToken!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] });
      setShowEmergencyDialog(false);
      setEmergencyReason('');
      setEmergencyDuration(60);
      setEmergencyMessage('');
    }
  });
  
  const scheduleMaintenanceMutation = useMutation({
    mutationFn: (payload: ScheduleMaintenancePayload) => scheduleMaintenanceWindow(authToken!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
      setShowScheduleDialog(false);
      setScheduleTitle('');
      setScheduleDescription('');
      setScheduleStart('');
      setScheduleEnd('');
      setScheduleAffectedServices([]);
      setNotifyUsers(true);
      setWarningDuration(30);
    }
  });
  
  const updateFeatureFlagMutation = useMutation({
    mutationFn: ({ flagId, payload }: { flagId: string; payload: UpdateFeatureFlagPayload }) => 
      updateFeatureFlag(authToken!, flagId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      setEditingFlag(null);
    }
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleToggleMaintenance = () => {
    if (maintenanceStatus?.is_maintenance_active) {
      // Deactivating - require confirmation
      setShowConfirmDialog(true);
    } else {
      // Activating - open form
      setShowConfirmDialog(true);
    }
  };
  
  const confirmToggleMaintenance = () => {
    toggleMaintenanceMutation.mutate({
      maintenance_active: !maintenanceStatus?.is_maintenance_active,
      maintenance_message: maintenanceMessage || 'Platform is currently under maintenance. We will be back soon.',
      affected_services: affectedServices.length > 0 ? affectedServices : AVAILABLE_SERVICES
    });
  };
  
  const handleEmergencyMaintenance = () => {
    if (!emergencyReason || !emergencyMessage) {
      return;
    }
    
    emergencyMaintenanceMutation.mutate({
      reason: emergencyReason,
      estimated_duration_minutes: emergencyDuration,
      maintenance_message: emergencyMessage
    });
  };
  
  const handleScheduleMaintenance = () => {
    if (!scheduleTitle || !scheduleStart || !scheduleEnd) {
      return;
    }
    
    scheduleMaintenanceMutation.mutate({
      title: scheduleTitle,
      description: scheduleDescription,
      scheduled_start: scheduleStart,
      scheduled_end: scheduleEnd,
      affected_services: scheduleAffectedServices.length > 0 ? scheduleAffectedServices : AVAILABLE_SERVICES,
      notify_users: notifyUsers,
      warning_duration_minutes: warningDuration
    });
  };
  
  const handleToggleFeatureFlag = (flag: FeatureFlag) => {
    updateFeatureFlagMutation.mutate({
      flagId: flag.flag_id,
      payload: {
        is_enabled: !flag.is_enabled,
        rollout_percentage: flag.rollout_percentage,
        target_user_types: flag.target_user_types
      }
    });
  };
  
  const handleUpdateFeatureFlagRollout = (flagId: string) => {
    updateFeatureFlagMutation.mutate({
      flagId,
      payload: {
        is_enabled: featureFlags?.find(f => f.flag_id === flagId)?.is_enabled || false,
        rollout_percentage: flagRolloutPercentage,
        target_user_types: flagTargetUserTypes
      }
    });
  };
  
  const toggleServiceSelection = (service: string, currentList: string[], setter: (list: string[]) => void) => {
    if (currentList.includes(service)) {
      setter(currentList.filter(s => s !== service));
    } else {
      setter([...currentList, service]);
    }
  };
  
  const toggleUserTypeSelection = (userType: string) => {
    if (flagTargetUserTypes.includes(userType)) {
      setFlagTargetUserTypes(flagTargetUserTypes.filter(t => t !== userType));
    } else {
      setFlagTargetUserTypes([...flagTargetUserTypes, userType]);
    }
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Maintenance</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Control system maintenance, feature flags, and platform updates
                </p>
              </div>
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-3">
                {maintenanceStatus?.is_maintenance_active ? (
                  <div className="flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Maintenance Mode Active</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                    <Shield className="h-5 w-5" />
                    <span className="font-semibold">System Operational</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'maintenance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Power className="h-5 w-5" />
                  <span>Maintenance Control</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('features')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'features'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Feature Flags</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('version')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'version'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <GitBranch className="h-5 w-5" />
                  <span>Version Info</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'scheduled'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Scheduled Maintenance</span>
                </div>
              </button>
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Maintenance Control Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              {/* Current Status Card */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Current Maintenance Status</h3>
                </div>
                
                <div className="p-6">
                  {isLoadingStatus ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    </div>
                  ) : statusError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-700">Failed to load maintenance status</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            {maintenanceStatus?.is_maintenance_active ? (
                              <>
                                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-lg font-semibold text-gray-900">Maintenance Mode: ACTIVE</span>
                              </>
                            ) : (
                              <>
                                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                                <span className="text-lg font-semibold text-gray-900">Maintenance Mode: INACTIVE</span>
                              </>
                            )}
                          </div>
                          
                          {maintenanceStatus?.maintenance_message && (
                            <p className="mt-2 text-gray-600">
                              <strong>Message:</strong> {maintenanceStatus.maintenance_message}
                            </p>
                          )}
                          
                          {maintenanceStatus?.affected_services && maintenanceStatus.affected_services.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">Affected Services:</p>
                              <div className="flex flex-wrap gap-2">
                                {maintenanceStatus.affected_services.map(service => (
                                  <span
                                    key={service}
                                    className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full"
                                  >
                                    {service}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {maintenanceStatus?.last_activated_at && (
                            <p className="mt-3 text-sm text-gray-500">
                              Last updated: {new Date(maintenanceStatus.last_activated_at).toLocaleString()}
                              {maintenanceStatus.last_activated_by && ` by ${maintenanceStatus.last_activated_by}`}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col space-y-3">
                          <button
                            onClick={handleToggleMaintenance}
                            disabled={toggleMaintenanceMutation.isPending}
                            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg flex items-center space-x-2 ${
                              maintenanceStatus?.is_maintenance_active
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <Power className="h-5 w-5" />
                            <span>
                              {maintenanceStatus?.is_maintenance_active ? 'Deactivate' : 'Activate'} Maintenance
                            </span>
                          </button>
                          
                          <button
                            onClick={() => setShowEmergencyDialog(true)}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg flex items-center space-x-2"
                          >
                            <Zap className="h-5 w-5" />
                            <span>Emergency Mode</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Schedule Maintenance</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Plan maintenance windows with user notifications
                  </p>
                  <button
                    onClick={() => setShowScheduleDialog(true)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Schedule Window
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Settings className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Feature Flags</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    Control feature rollout and availability
                  </p>
                  <button
                    onClick={() => setActiveTab('features')}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Manage Flags
                  </button>
                </div>
                
                <div className="bg-white rounded-lg shadow border border-gray-100 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <GitBranch className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Version Info</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    View deployment details and rollback options
                  </p>
                  <button
                    onClick={() => setActiveTab('version')}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    View Version
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Feature Flags Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Feature Flag Management</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Control feature availability and gradual rollout across user types
                  </p>
                </div>
                
                <div className="p-6">
                  {isLoadingFlags ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
                    </div>
                  ) : !featureFlags || featureFlags.length === 0 ? (
                    <div className="text-center py-12">
                      <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No feature flags configured</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {featureFlags.map(flag => (
                        <div
                          key={flag.flag_id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-base font-semibold text-gray-900">{flag.flag_name}</h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  flag.is_enabled 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {flag.is_enabled ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-3">{flag.description}</p>
                              
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Rollout:</span>
                                  <span className="ml-2 font-medium text-gray-900">{flag.rollout_percentage}%</span>
                                </div>
                                
                                {flag.target_user_types.length > 0 && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-500">Target:</span>
                                    <div className="flex space-x-1">
                                      {flag.target_user_types.map(type => (
                                        <span
                                          key={type}
                                          className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                                        >
                                          {type}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div>
                                  <span className="text-gray-500">Updated:</span>
                                  <span className="ml-2 text-gray-700">{new Date(flag.updated_at).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col space-y-2 ml-4">
                              <button
                                onClick={() => handleToggleFeatureFlag(flag)}
                                disabled={updateFeatureFlagMutation.isPending}
                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                                  flag.is_enabled
                                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                    : 'bg-green-100 hover:bg-green-200 text-green-700'
                                } disabled:opacity-50`}
                              >
                                {flag.is_enabled ? 'Disable' : 'Enable'}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setEditingFlag(flag.flag_id);
                                  setFlagRolloutPercentage(flag.rollout_percentage);
                                  setFlagTargetUserTypes(flag.target_user_types);
                                }}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors"
                              >
                                Configure
                              </button>
                            </div>
                          </div>
                          
                          {/* Rollout Configuration (when editing) */}
                          {editingFlag === flag.flag_id && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Rollout Percentage: {flagRolloutPercentage}%
                                </label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={flagRolloutPercentage}
                                  onChange={(e) => setFlagRolloutPercentage(Number(e.target.value))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>0%</span>
                                  <span>50%</span>
                                  <span>100%</span>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Target User Types
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {USER_TYPES.map(userType => (
                                    <button
                                      key={userType}
                                      type="button"
                                      onClick={() => toggleUserTypeSelection(userType)}
                                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                        flagTargetUserTypes.includes(userType)
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      {userType}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex space-x-3">
                                <button
                                  onClick={() => handleUpdateFeatureFlagRollout(flag.flag_id)}
                                  disabled={updateFeatureFlagMutation.isPending}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                  Save Configuration
                                </button>
                                <button
                                  onClick={() => setEditingFlag(null)}
                                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Version Info Tab */}
          {activeTab === 'version' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Platform Version Information</h3>
                </div>
                
                <div className="p-6">
                  {isLoadingVersion ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600"></div>
                    </div>
                  ) : versionInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Current Version</p>
                          <p className="text-2xl font-bold text-gray-900">{versionInfo.current_version}</p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Environment</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            versionInfo.environment === 'production'
                              ? 'bg-green-100 text-green-800'
                              : versionInfo.environment === 'staging'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {versionInfo.environment}
                          </span>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Build Number</p>
                          <p className="text-lg font-semibold text-gray-900">{versionInfo.build_number}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Deployment Date</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {new Date(versionInfo.deployment_date).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Commit Hash</p>
                          <code className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                            {versionInfo.commit_hash}
                          </code>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-500 mb-1">Rollback Available</p>
                          <div className="flex items-center space-x-2">
                            {versionInfo.rollback_available ? (
                              <>
                                <span className="text-green-600 font-semibold">Yes</span>
                                {versionInfo.previous_version && (
                                  <span className="text-gray-600 text-sm">
                                    (to {versionInfo.previous_version})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-600 font-semibold">No</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No version information available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Scheduled Maintenance Tab */}
          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Scheduled Maintenance Windows</h3>
                    <p className="text-sm text-gray-600 mt-1">Plan and manage future maintenance periods</p>
                  </div>
                  <button
                    onClick={() => setShowScheduleDialog(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    + Schedule New
                  </button>
                </div>
                
                <div className="p-6">
                  {isLoadingScheduled ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                    </div>
                  ) : !scheduledMaintenance || scheduledMaintenance.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No scheduled maintenance windows</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scheduledMaintenance.map(window => (
                        <div
                          key={window.maintenance_id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-base font-semibold text-gray-900 mb-1">{window.title}</h4>
                              <p className="text-sm text-gray-600">{window.description}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              window.status === 'scheduled'
                                ? 'bg-blue-100 text-blue-800'
                                : window.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {window.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Start Time</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(window.scheduled_start).toLocaleString()}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-gray-500 mb-1">End Time</p>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(window.scheduled_end).toLocaleString()}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Type</p>
                              <p className="text-sm font-medium text-gray-900">{window.maintenance_type}</p>
                            </div>
                          </div>
                          
                          {window.affected_services.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-2">Affected Services</p>
                              <div className="flex flex-wrap gap-2">
                                {window.affected_services.map(service => (
                                  <span
                                    key={service}
                                    className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded"
                                  >
                                    {service}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Toggle Maintenance Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg ${
                  maintenanceStatus?.is_maintenance_active ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <Power className={`h-6 w-6 ${
                    maintenanceStatus?.is_maintenance_active ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {maintenanceStatus?.is_maintenance_active ? 'Deactivate' : 'Activate'} Maintenance Mode
                </h3>
              </div>
              
              {!maintenanceStatus?.is_maintenance_active && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maintenance Message
                    </label>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="Platform is currently under maintenance..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Affected Services
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_SERVICES.map(service => (
                        <button
                          key={service}
                          type="button"
                          onClick={() => toggleServiceSelection(service, affectedServices, setAffectedServices)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            affectedServices.includes(service)
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {service}
                        </button>
                      ))}
                    </div>
                    {affectedServices.length === 0 && (
                      <p className="text-xs text-gray-500 mt-2">All services will be affected</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className={`p-4 rounded-lg mb-6 ${
                maintenanceStatus?.is_maintenance_active 
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  maintenanceStatus?.is_maintenance_active ? 'text-green-800' : 'text-red-800'
                }`}>
                  {maintenanceStatus?.is_maintenance_active
                    ? 'This will restore platform access to all users immediately.'
                    : 'This will prevent users from accessing the platform. Use only when necessary.'}
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={confirmToggleMaintenance}
                  disabled={toggleMaintenanceMutation.isPending}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg disabled:opacity-50 ${
                    maintenanceStatus?.is_maintenance_active
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {toggleMaintenanceMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Confirm ${maintenanceStatus?.is_maintenance_active ? 'Deactivation' : 'Activation'}`
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setMaintenanceMessage('');
                    setAffectedServices([]);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Emergency Maintenance Dialog */}
        {showEmergencyDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Zap className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Emergency Maintenance</h3>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>WARNING:</strong> This will immediately activate maintenance mode with minimal notice to users.
                  Use only for critical system issues.
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Reason *
                  </label>
                  <input
                    type="text"
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    placeholder="Critical database issue requiring immediate attention"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={emergencyDuration}
                    onChange={(e) => setEmergencyDuration(Number(e.target.value))}
                    min="5"
                    max="480"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Message *
                  </label>
                  <textarea
                    value={emergencyMessage}
                    onChange={(e) => setEmergencyMessage(e.target.value)}
                    placeholder="We are performing emergency maintenance. Service will be restored shortly."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleEmergencyMaintenance}
                  disabled={emergencyMaintenanceMutation.isPending || !emergencyReason || !emergencyMessage}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emergencyMaintenanceMutation.isPending ? 'Activating...' : 'Activate Emergency Mode'}
                </button>
                
                <button
                  onClick={() => {
                    setShowEmergencyDialog(false);
                    setEmergencyReason('');
                    setEmergencyDuration(60);
                    setEmergencyMessage('');
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Schedule Maintenance Dialog */}
        {showScheduleDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Schedule Maintenance Window</h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Title *
                  </label>
                  <input
                    type="text"
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                    placeholder="Scheduled System Upgrade"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={scheduleDescription}
                    onChange={(e) => setScheduleDescription(e.target.value)}
                    placeholder="Database migration and performance improvements"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleStart}
                      onChange={(e) => setScheduleStart(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleEnd}
                      onChange={(e) => setScheduleEnd(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Affected Services
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_SERVICES.map(service => (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleServiceSelection(service, scheduleAffectedServices, setScheduleAffectedServices)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          scheduleAffectedServices.includes(service)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="notify-users"
                      checked={notifyUsers}
                      onChange={(e) => setNotifyUsers(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="notify-users" className="text-sm font-medium text-gray-700">
                      Notify All Users
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Warning Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={warningDuration}
                      onChange={(e) => setWarningDuration(Number(e.target.value))}
                      min="5"
                      max="1440"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={maintenanceStatus?.is_maintenance_active ? confirmToggleMaintenance : handleScheduleMaintenance}
                  disabled={
                    (maintenanceStatus?.is_maintenance_active ? toggleMaintenanceMutation.isPending : scheduleMaintenanceMutation.isPending) ||
                    (!maintenanceStatus?.is_maintenance_active && (!scheduleTitle || !scheduleStart || !scheduleEnd))
                  }
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(maintenanceStatus?.is_maintenance_active ? toggleMaintenanceMutation.isPending : scheduleMaintenanceMutation.isPending) 
                    ? 'Processing...' 
                    : maintenanceStatus?.is_maintenance_active 
                    ? 'Confirm Deactivation'
                    : 'Schedule Maintenance'}
                </button>
                
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setShowScheduleDialog(false);
                    setMaintenanceMessage('');
                    setAffectedServices([]);
                    setScheduleTitle('');
                    setScheduleDescription('');
                    setScheduleStart('');
                    setScheduleEnd('');
                    setScheduleAffectedServices([]);
                  }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_AdminMaintenanceMode;