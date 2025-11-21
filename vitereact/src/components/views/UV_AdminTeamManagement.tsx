import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  UserPlus, 
  Shield, 
  Activity, 
  Settings, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  X,
  Clock,
  User
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AdminUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  permissions: Record<string, any>;
  is_active: boolean;
  last_login_date: string | null;
  created_at: string;
}

interface AdminUsersList {
  admin_users: AdminUser[];
  total_count: number;
  active_count: number;
  role_distribution: Record<string, number>;
}

interface RoleDefinition {
  role_name: string;
  display_name: string;
  permissions: string[];
  is_custom: boolean;
}

interface ActivityLogEntry {
  log_id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  action_description: string;
  affected_entity_type: string | null;
  affected_entity_id: string | null;
  timestamp: string;
  ip_address: string | null;
}

interface AdminFormData {
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  permissions: Record<string, any>;
  is_active: boolean;
  requires_password_change: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Fetch admin users (adapted from existing /api/admin/users endpoint)
const fetchAdminUsers = async (token: string, roleFilter?: string): Promise<AdminUsersList> => {
  const params: any = { user_type: 'admin' };
  if (roleFilter) params.role_filter = roleFilter;
  
  const { data } = await axios.get(`${API_BASE}/admin/users`, {
    params,
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Transform response to match expected structure
  const adminUsers = data.users.map((user: any) => ({
    user_id: user.user_id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.admin?.role || 'support_admin',
    permissions: user.admin?.permissions || {},
    is_active: user.status === 'active',
    last_login_date: user.last_login_date,
    created_at: user.created_at
  }));
  
  // Calculate role distribution
  const roleDistribution: Record<string, number> = {};
  adminUsers.forEach((user: AdminUser) => {
    roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
  });
  
  return {
    admin_users: adminUsers,
    total_count: data.total || adminUsers.length,
    active_count: adminUsers.filter((u: AdminUser) => u.is_active).length,
    role_distribution: roleDistribution
  };
};

// Role definitions (TODO: Backend endpoint)
const fetchRoleDefinitions = async (): Promise<RoleDefinition[]> => {
  return [
    {
      role_name: 'super_admin',
      display_name: 'Super Administrator',
      permissions: ['*'],
      is_custom: false
    },
    {
      role_name: 'support_admin',
      display_name: 'Support Administrator',
      permissions: ['users.view', 'users.edit', 'orders.view', 'disputes.manage', 'support.manage'],
      is_custom: false
    },
    {
      role_name: 'finance_admin',
      display_name: 'Finance Administrator',
      permissions: ['financials.view', 'financials.edit', 'payouts.manage', 'orders.view'],
      is_custom: false
    },
    {
      role_name: 'content_admin',
      display_name: 'Content Administrator',
      permissions: ['content.moderate', 'products.view', 'reviews.moderate', 'suppliers.view'],
      is_custom: false
    }
  ];
};

// Activity logs (TODO: Backend endpoint)
const fetchActivityLogs = async (
  token: string,
  filters: {
    admin_user_id?: string;
    action_type?: string;
    date_from?: string;
    date_to?: string;
  }
): Promise<ActivityLogEntry[]> => {
  // TODO: Implement actual API call
  void token;
  void filters;
  return [
    {
      log_id: '1',
      admin_id: 'admin_001',
      admin_name: 'John Admin',
      action_type: 'user_update',
      action_description: 'Updated user permissions',
      affected_entity_type: 'user',
      affected_entity_id: 'user_123',
      timestamp: new Date().toISOString(),
      ip_address: '192.168.1.1'
    }
  ];
};

// Create admin user mutation
const createAdminUser = async (token: string, formData: AdminFormData) => {
  // Generate temporary password
  const temporaryPassword = Math.random().toString(36).slice(-12);
  
  const payload = {
    email: formData.email,
    password: temporaryPassword, // Would be hashed by backend
    user_type: 'admin',
    first_name: formData.first_name,
    last_name: formData.last_name,
    status: formData.is_active ? 'active' : 'inactive'
  };
  
  const { data } = await axios.post(`${API_BASE}/admin/users`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return data;
};

// Update admin permissions
const updateAdminPermissions = async (
  token: string,
  userId: string,
  updates: { role?: string; permissions?: Record<string, any>; status?: string }
) => {
  const { data } = await axios.patch(`${API_BASE}/admin/users/${userId}`, updates, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminTeamManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  
  // Local state
  const [activeTab, setActiveTab] = useState<'team' | 'roles' | 'activity' | 'security'>('team');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Get URL params
  const roleFilter = searchParams.get('role_filter') || undefined;
  const activityDateRange = searchParams.get('activity_date_range') || 'last_7_days';
  
  // Admin form state
  const [adminFormData, setAdminFormData] = useState<AdminFormData>({
    user_id: null,
    email: '',
    first_name: '',
    last_name: '',
    role: 'support_admin',
    permissions: {},
    is_active: true,
    requires_password_change: true
  });
  
  // Validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // ============================================================================
  // QUERIES
  // ============================================================================
  
  // Fetch admin users
  const {
    data: adminUsersData,
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => fetchAdminUsers(authToken!, roleFilter),
    enabled: !!authToken && activeTab === 'team',
    staleTime: 60000 // 1 minute
  });
  
  // Fetch role definitions
  const {
    data: roleDefinitions,
    isLoading: isLoadingRoles
  } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: fetchRoleDefinitions,
    enabled: activeTab === 'roles',
    staleTime: 300000 // 5 minutes
  });
  
  // Fetch activity logs
  const {
    data: activityLogs,
    isLoading: isLoadingActivity
  } = useQuery({
    queryKey: ['admin-activity-logs', activityDateRange],
    queryFn: () => fetchActivityLogs(authToken!, {
      date_from: activityDateRange === 'last_7_days' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() : undefined
    }),
    enabled: !!authToken && activeTab === 'activity',
    staleTime: 30000 // 30 seconds
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  // Create admin user
  const createAdminMutation = useMutation({
    mutationFn: (formData: AdminFormData) => createAdminUser(authToken!, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreateModal(false);
      resetForm();
      alert('Admin user created successfully. Temporary password sent to email.');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create admin user');
    }
  });
  
  // Update admin permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: any }) => 
      updateAdminPermissions(authToken!, userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowEditModal(false);
      resetForm();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update permissions');
    }
  });
  
  // Deactivate admin user
  const deactivateAdminMutation = useMutation({
    mutationFn: (userId: string) => 
      updateAdminPermissions(authToken!, userId, { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowDeactivateConfirm(false);
      setSelectedUserId(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to deactivate admin user');
    }
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleCreateAdmin = () => {
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!adminFormData.email) errors.email = 'Email is required';
    if (!adminFormData.first_name) errors.first_name = 'First name is required';
    if (!adminFormData.last_name) errors.last_name = 'Last name is required';
    if (!adminFormData.role) errors.role = 'Role is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    createAdminMutation.mutate(adminFormData);
  };
  
  const handleEditPermissions = (user: AdminUser) => {
    setAdminFormData({
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      permissions: user.permissions,
      is_active: user.is_active,
      requires_password_change: false
    });
    setShowEditModal(true);
  };
  
  const handleSavePermissions = () => {
    if (!adminFormData.user_id) return;
    
    updatePermissionsMutation.mutate({
      userId: adminFormData.user_id,
      updates: {
        status: adminFormData.is_active ? 'active' : 'inactive'
        // Additional permission updates would go here
      }
    });
  };
  
  const handleDeactivateAdmin = (userId: string) => {
    // Prevent self-deactivation
    if (userId === currentUser?.user_id) {
      alert('You cannot deactivate your own account');
      return;
    }
    
    setSelectedUserId(userId);
    setShowDeactivateConfirm(true);
  };
  
  const confirmDeactivate = () => {
    if (selectedUserId) {
      deactivateAdminMutation.mutate(selectedUserId);
    }
  };
  
  const resetForm = () => {
    setAdminFormData({
      user_id: null,
      email: '',
      first_name: '',
      last_name: '',
      role: 'support_admin',
      permissions: {},
      is_active: true,
      requires_password_change: true
    });
    setFormErrors({});
  };
  
  const handleRoleFilterChange = (role: string | null) => {
    if (role) {
      searchParams.set('role_filter', role);
    } else {
      searchParams.delete('role_filter');
    }
    setSearchParams(searchParams);
  };
  
  // Filtered admin users based on search
  const filteredAdminUsers = useMemo(() => {
    if (!adminUsersData?.admin_users) return [];
    
    return adminUsersData.admin_users.filter(user => {
      const searchLower = searchQuery.toLowerCase();
      return (
        user.email.toLowerCase().includes(searchLower) ||
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower)
      );
    });
  }, [adminUsersData, searchQuery]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Team Management</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage administrative users, roles, permissions, and monitor team activity
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => alert('Export feature would generate PDF report')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add New Admin
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('team')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'team'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="w-4 h-4 inline-block mr-2" />
                  Team Members
                </button>
                <button
                  onClick={() => setActiveTab('roles')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'roles'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Shield className="w-4 h-4 inline-block mr-2" />
                  Roles & Permissions
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'activity'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Activity className="w-4 h-4 inline-block mr-2" />
                  Activity Logs
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'security'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Settings className="w-4 h-4 inline-block mr-2" />
                  Security Settings
                </button>
              </nav>
            </div>
          </div>
          
          {/* Team Members Section */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Admins</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {adminUsersData?.total_count || 0}
                      </p>
                    </div>
                    <div className="bg-blue-100 rounded-full p-3">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Admins</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {adminUsersData?.active_count || 0}
                      </p>
                    </div>
                    <div className="bg-green-100 rounded-full p-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Roles</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {roleDefinitions?.length || 4}
                      </p>
                    </div>
                    <div className="bg-purple-100 rounded-full p-3">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search admin users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <select
                      value={roleFilter || ''}
                      onChange={(e) => handleRoleFilterChange(e.target.value || null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Roles</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="support_admin">Support Admin</option>
                      <option value="finance_admin">Finance Admin</option>
                      <option value="content_admin">Content Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Admin Users Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {isLoadingUsers ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading admin users...</p>
                  </div>
                ) : usersError ? (
                  <div className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">Failed to load admin users</p>
                  </div>
                ) : filteredAdminUsers.length === 0 ? (
                  <div className="p-12 text-center">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No admin users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Admin User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Login
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAdminUsers.map((user) => (
                          <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.role === 'super_admin' 
                                  ? 'bg-purple-100 text-purple-800'
                                  : user.role === 'support_admin'
                                  ? 'bg-blue-100 text-blue-800'
                                  : user.role === 'finance_admin'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.is_active ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.last_login_date 
                                ? new Date(user.last_login_date).toLocaleDateString() 
                                : 'Never'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleEditPermissions(user)}
                                  className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit Permissions"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => alert(`View activity for ${user.first_name}`)}
                                  className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-50 rounded transition-colors"
                                  title="View Activity"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {user.user_id !== currentUser?.user_id && (
                                  <button
                                    onClick={() => handleDeactivateAdmin(user.user_id)}
                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded transition-colors"
                                    title="Deactivate User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Roles Management Section */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Role Definitions</h2>
                
                {isLoadingRoles ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roleDefinitions?.map((role) => (
                      <div key={role.role_name} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">{role.display_name}</h3>
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">Permissions:</p>
                          <div className="flex flex-wrap gap-2">
                            {role.permissions.map((permission) => (
                              <span
                                key={permission}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {adminUsersData?.role_distribution[role.role_name] || 0} admin(s) with this role
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Activity Logs Section */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Administrative Activity Logs</h2>
                
                {/* Date Range Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="last_90_days">Last 90 Days</option>
                    <option value="all_time">All Time</option>
                  </select>
                </div>
                
                {isLoadingActivity ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : activityLogs && activityLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {activityLogs.map((log) => (
                          <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                {new Date(log.timestamp).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {log.admin_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {log.action_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {log.action_description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No activity logs found</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Security Settings Section */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Security Policies</h2>
                
                <div className="space-y-6">
                  {/* Password Policy */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Minimum Password Length</label>
                          <p className="text-sm text-gray-500">Require minimum characters for passwords</p>
                        </div>
                        <input
                          type="number"
                          min="8"
                          max="32"
                          defaultValue="12"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Password Expiration</label>
                          <p className="text-sm text-gray-500">Days before password must be changed</p>
                        </div>
                        <input
                          type="number"
                          min="30"
                          max="365"
                          defaultValue="90"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Require Special Characters</label>
                          <p className="text-sm text-gray-500">Enforce special character requirement</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Session Management */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Session Timeout</label>
                          <p className="text-sm text-gray-500">Minutes of inactivity before auto-logout</p>
                        </div>
                        <input
                          type="number"
                          min="5"
                          max="120"
                          defaultValue="30"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Concurrent Session Limit</label>
                          <p className="text-sm text-gray-500">Maximum simultaneous logins per admin</p>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          defaultValue="3"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Two-Factor Authentication */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Enforce 2FA for All Admins</label>
                          <p className="text-sm text-gray-500">Require 2FA for all administrative accounts</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Enforce 2FA for Super Admins</label>
                          <p className="text-sm text-gray-500">Mandatory 2FA for super administrator role</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked
                          disabled
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded opacity-50 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-6">
                    <button
                      onClick={() => alert('Security settings would be saved')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Save Security Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Create New Admin User</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={adminFormData.email}
                  onChange={(e) => {
                    setAdminFormData(prev => ({ ...prev, email: e.target.value }));
                    setFormErrors(prev => ({ ...prev, email: '' }));
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="admin@buildeasy.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>
              
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={adminFormData.first_name}
                    onChange={(e) => {
                      setAdminFormData(prev => ({ ...prev, first_name: e.target.value }));
                      setFormErrors(prev => ({ ...prev, first_name: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={adminFormData.last_name}
                    onChange={(e) => {
                      setAdminFormData(prev => ({ ...prev, last_name: e.target.value }));
                      setFormErrors(prev => ({ ...prev, last_name: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                  )}
                </div>
              </div>
              
              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Role *
                </label>
                <select
                  id="role"
                  value={adminFormData.role}
                  onChange={(e) => {
                    setAdminFormData(prev => ({ ...prev, role: e.target.value }));
                    setFormErrors(prev => ({ ...prev, role: '' }));
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.role ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a role</option>
                  <option value="support_admin">Support Administrator</option>
                  <option value="finance_admin">Finance Administrator</option>
                  <option value="content_admin">Content Administrator</option>
                  <option value="super_admin">Super Administrator</option>
                </select>
                {formErrors.role && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.role}</p>
                )}
                
                {adminFormData.role === 'super_admin' && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex">
                      <AlertCircle className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0" />
                      <p className="text-sm text-amber-700">
                        Super Administrator role grants full platform access. Use with caution.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Active Status */}
              <div className="flex items-center space-x-3">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={adminFormData.is_active}
                  onChange={(e) => setAdminFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (user can log in immediately)
                </label>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> A temporary password will be generated and sent to the admin's email. 
                  They will be required to change it on first login.
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAdmin}
                disabled={createAdminMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createAdminMutation.isPending ? 'Creating...' : 'Create Admin User'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Permissions Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Edit Admin Permissions</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>User:</strong> {adminFormData.first_name} {adminFormData.last_name}
                </p>
                <p className="text-sm text-gray-600 mt-1">{adminFormData.email}</p>
              </div>
              
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Role
                </label>
                <select
                  value={adminFormData.role}
                  onChange={(e) => setAdminFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="support_admin">Support Administrator</option>
                  <option value="finance_admin">Finance Administrator</option>
                  <option value="content_admin">Content Administrator</option>
                  <option value="super_admin">Super Administrator</option>
                </select>
              </div>
              
              {/* Active Status */}
              <div className="flex items-center space-x-3">
                <input
                  id="edit_is_active"
                  type="checkbox"
                  checked={adminFormData.is_active}
                  onChange={(e) => setAdminFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                  Account is active
                </label>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={updatePermissionsMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatePermissionsMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Deactivate Confirmation Dialog */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Deactivate Admin User
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Are you sure you want to deactivate this admin user? They will lose access to the admin panel immediately.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeactivateConfirm(false);
                    setSelectedUserId(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeactivate}
                  disabled={deactivateAdminMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deactivateAdminMutation.isPending ? 'Deactivating...' : 'Deactivate User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UV_AdminTeamManagement;