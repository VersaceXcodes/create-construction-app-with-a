import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { 
  Bell, 
  Users, 
  Mail, 
  MessageSquare, 
  AlertTriangle, 
  BarChart3,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  TrendingUp,
  Target,
  FileText,
  Filter,
  Plus,
  X
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Announcement {
  announcement_id: string;
  title: string;
  content: string;
  target_segments: string[];
  delivery_channels: string[];
  status: 'draft' | 'scheduled' | 'active' | 'expired';
  schedule_date: string | null;
  created_at: string;
  created_by: string;
  views_count?: number;
  click_count?: number;
  delivery_rate?: number;
}

interface UserSegment {
  segment_id: string;
  name: string;
  description: string;
  user_count: number;
  criteria: Record<string, any>;
}

interface NotificationTemplate {
  template_id: string;
  template_type: 'email' | 'sms';
  template_name: string;
  template_content: string;
  template_variables: string[];
  last_modified: string;
  usage_count: number;
}

interface AnnouncementFormData {
  subject: string;
  content: string;
  target_segments: string[];
  delivery_channels: string[];
  schedule_date: string | null;
  is_draft: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchAnnouncements = async (token: string) => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/communications/announcements?include_analytics=true&status=active,scheduled,draft`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return data;
};

const createAnnouncement = async (token: string, formData: AnnouncementFormData) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/communications/announcements`,
    {
      title: formData.subject,
      content: formData.content,
      target_segments: formData.target_segments,
      delivery_channels: formData.delivery_channels,
      schedule_date: formData.schedule_date
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return data;
};

const fetchUserSegments = async (token: string) => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/users/segments`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return data;
};

const fetchNotificationTemplates = async (token: string) => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/notifications/templates?template_type=email,sms`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return data;
};

const updateTemplate = async (token: string, template_id: string, updates: { template_content: string; template_variables: string[] }) => {
  const { data } = await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/notifications/templates/${template_id}`,
    updates,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return data;
};

// fetchCampaignAnalytics removed - not currently used

const sendEmergencyBroadcast = async (token: string, message: string, severity: string) => {
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/admin/communications/emergency-broadcast`,
    {
      message,
      severity,
      channels: ['email', 'sms', 'in_app'],
      target_all_users: true
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_AdminCommunication: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // currentUser removed - unused
  
  // Local State
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('communication_type') || 'announcements');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  // selectedCampaign removed - not currently used
  
  // Announcement Form State
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormData>({
    subject: '',
    content: '',
    target_segments: [],
    delivery_channels: ['in_app'],
    schedule_date: null,
    is_draft: false
  });
  
  // Emergency Broadcast State
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [emergencySeverity, setEmergencySeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  
  // Template Editor State
  const [templateContent, setTemplateContent] = useState('');
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);
  
  // Search/Filter State
  const [announcementFilter, setAnnouncementFilter] = useState<'all' | 'active' | 'scheduled' | 'draft'>('all');
  
  // React Query Hooks
  const { data: announcements, isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['admin-announcements', announcementFilter],
    queryFn: () => fetchAnnouncements(authToken!),
    enabled: !!authToken && activeTab === 'announcements',
    staleTime: 60000,
    refetchOnWindowFocus: false
  });
  
  const { data: userSegments, isLoading: loadingSegments } = useQuery({
    queryKey: ['admin-user-segments'],
    queryFn: () => fetchUserSegments(authToken!),
    enabled: !!authToken,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false
  });
  
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['admin-notification-templates'],
    queryFn: () => fetchNotificationTemplates(authToken!),
    enabled: !!authToken && activeTab === 'templates',
    staleTime: 60000,
    refetchOnWindowFocus: false
  });
  
  // const { data: campaignAnalytics, isLoading: loadingCampaign } = useQuery({
  //   queryKey: ['admin-campaign-analytics', selectedCampaign?.campaign_id],
  //   queryFn: () => fetchCampaignAnalytics(authToken!, selectedCampaign!.campaign_id),
  //   enabled: !!authToken && !!selectedCampaign && activeTab === 'campaigns',
  //   staleTime: 60000,
  //   refetchOnWindowFocus: false
  // });
  
  // Mutations
  const createAnnouncementMutation = useMutation({
    mutationFn: (formData: AnnouncementFormData) => createAnnouncement(authToken!, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setShowAnnouncementForm(false);
      setAnnouncementForm({
        subject: '',
        content: '',
        target_segments: [],
        delivery_channels: ['in_app'],
        schedule_date: null,
        is_draft: false
      });
    }
  });
  
  const updateTemplateMutation = useMutation({
    mutationFn: ({ template_id, updates }: { template_id: string; updates: { template_content: string; template_variables: string[] } }) =>
      updateTemplate(authToken!, template_id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-templates'] });
      setSelectedTemplate(null);
    }
  });
  
  const emergencyBroadcastMutation = useMutation({
    mutationFn: ({ message, severity }: { message: string; severity: string }) =>
      sendEmergencyBroadcast(authToken!, message, severity),
    onSuccess: () => {
      setEmergencyMessage('');
      setEmergencySeverity('high');
      setShowEmergencyConfirm(false);
    }
  });
  
  // Handlers
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ communication_type: tab });
  };
  
  const handleCreateAnnouncement = () => {
    createAnnouncementMutation.mutate(announcementForm);
  };
  
  const handleUpdateTemplate = () => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        template_id: selectedTemplate.template_id,
        updates: {
          template_content: templateContent,
          template_variables: templateVariables
        }
      });
    }
  };
  
  const handleEmergencyBroadcast = () => {
    emergencyBroadcastMutation.mutate({
      message: emergencyMessage,
      severity: emergencySeverity
    });
  };
  
  const toggleSegment = (segment_id: string) => {
    setAnnouncementForm(prev => ({
      ...prev,
      target_segments: prev.target_segments.includes(segment_id)
        ? prev.target_segments.filter(s => s !== segment_id)
        : [...prev.target_segments, segment_id]
    }));
  };
  
  const toggleChannel = (channel: string) => {
    setAnnouncementForm(prev => ({
      ...prev,
      delivery_channels: prev.delivery_channels.includes(channel)
        ? prev.delivery_channels.filter(c => c !== channel)
        : [...prev.delivery_channels, channel]
    }));
  };
  
  // Derived Data
  const filteredAnnouncements = announcements?.filter((a: Announcement) => {
    if (announcementFilter === 'all') return true;
    return a.status === announcementFilter;
  }) || [];
  
  const totalTargetUsers = announcementForm.target_segments.reduce((sum, seg_id) => {
    const segment = userSegments?.segments?.find((s: UserSegment) => s.segment_id === seg_id);
    return sum + (segment?.user_count || 0);
  }, 0);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Communication</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage announcements, templates, campaigns, and emergency broadcasts
                </p>
              </div>
              
              {activeTab === 'announcements' && (
                <button
                  onClick={() => setShowAnnouncementForm(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  New Announcement
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => handleTabChange('announcements')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'announcements'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Announcements</span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('templates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'templates'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Templates</span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('campaigns')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'campaigns'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Campaigns</span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('segments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'segments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>User Segments</span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('emergency')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'emergency'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Emergency</span>
                </div>
              </button>
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <div className="flex space-x-2">
                      {['all', 'active', 'scheduled', 'draft'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setAnnouncementFilter(filter as any)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            announcementFilter === filter
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Announcement List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Target
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Channels
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingAnnouncements ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          </td>
                        </tr>
                      ) : filteredAnnouncements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No announcements found</p>
                            <p className="text-gray-400 text-sm mt-1">Create your first announcement to get started</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAnnouncements.map((announcement: Announcement) => (
                          <tr key={announcement.announcement_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{announcement.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-md">{announcement.content}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {announcement.status === 'active' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </span>
                              )}
                              {announcement.status === 'scheduled' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Scheduled
                                </span>
                              )}
                              {announcement.status === 'draft' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Draft
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {announcement.target_segments.length} segment{announcement.target_segments.length !== 1 ? 's' : ''}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-1">
                                {announcement.delivery_channels.map((channel) => (
                                  <span key={channel} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                    {channel}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <Eye className="w-4 h-4 text-gray-400 mr-1" />
                                  <span className="text-gray-900">{announcement.views_count || 0}</span>
                                </div>
                                <div className="flex items-center">
                                  <TrendingUp className="w-4 h-4 text-gray-400 mr-1" />
                                  <span className="text-gray-900">{announcement.delivery_rate || 0}%</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button className="text-blue-600 hover:text-blue-900">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="text-red-600 hover:text-red-900">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Templates</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {loadingTemplates ? (
                    <div className="p-6 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    templates?.map((template: NotificationTemplate) => (
                      <button
                        key={template.template_id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setTemplateContent(template.template_content);
                          setTemplateVariables(template.template_variables);
                        }}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selectedTemplate?.template_id === template.template_id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{template.template_name}</span>
                          {template.template_type === 'email' ? (
                            <Mail className="w-4 h-4 text-gray-400" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">Used {template.usage_count} times</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              {/* Template Editor */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {selectedTemplate ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Edit Template</h2>
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate.template_name}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content
                      </label>
                      <textarea
                        value={templateContent}
                        onChange={(e) => setTemplateContent(e.target.value)}
                        rows={10}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                        placeholder="Enter template content..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variables
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {templateVariables.map((variable, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-md bg-blue-100 text-blue-800 text-sm font-medium"
                          >
                            {`{{${variable}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setSelectedTemplate(null)}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateTemplate}
                        disabled={updateTemplateMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {updateTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Select a template to edit</p>
                    <p className="text-gray-400 text-sm mt-1">Choose a template from the list to view and edit its content</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* CAMPAIGNS TAB */}
          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h2>
                
                {/* Mock Campaign Data */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Delivery Rate</span>
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">98.5%</p>
                    <p className="text-xs text-gray-600 mt-1">+2.3% from last month</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Open Rate</span>
                      <Mail className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">42.8%</p>
                    <p className="text-xs text-gray-600 mt-1">+5.1% from last month</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Click Rate</span>
                      <Target className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">12.4%</p>
                    <p className="text-xs text-gray-600 mt-1">+1.8% from last month</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* SEGMENTS TAB */}
          {activeTab === 'segments' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">User Segments</h2>
                <p className="text-sm text-gray-600 mt-1">Available audience segments for targeted communications</p>
              </div>
              
              <div className="p-6">
                {loadingSegments ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userSegments?.segments?.map((segment: UserSegment) => (
                      <div key={segment.segment_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{segment.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-blue-600">{segment.user_count.toLocaleString()}</span>
                          <span className="text-xs text-gray-500">users</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* EMERGENCY TAB */}
          {activeTab === 'emergency' && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-red-50 to-orange-100 rounded-xl border-2 border-red-300 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-red-600 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Emergency Broadcast</h2>
                    <p className="text-sm text-gray-700 mt-1">Send critical platform-wide notifications to all users</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Severity Level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['low', 'medium', 'high', 'critical'].map((level) => (
                        <button
                          key={level}
                          onClick={() => setEmergencySeverity(level as any)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            emergencySeverity === level
                              ? level === 'critical' ? 'bg-red-600 text-white shadow-lg'
                                : level === 'high' ? 'bg-orange-600 text-white shadow-lg'
                                : level === 'medium' ? 'bg-yellow-600 text-white shadow-lg'
                                : 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Emergency Message
                    </label>
                    <textarea
                      value={emergencyMessage}
                      onChange={(e) => setEmergencyMessage(e.target.value)}
                      rows={6}
                      placeholder="Enter emergency message to broadcast to all users..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-100 transition-all"
                    />
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-300 p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">Warning</h4>
                        <p className="text-sm text-gray-700">
                          This will send an immediate notification via email, SMS, and in-app to all platform users. 
                          This action cannot be undone. Please ensure the message is accurate before sending.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setEmergencyMessage('');
                        setEmergencySeverity('high');
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowEmergencyConfirm(true)}
                      disabled={!emergencyMessage.trim() || emergencyBroadcastMutation.isPending}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
                    >
                      {emergencyBroadcastMutation.isPending ? 'Sending...' : 'Send Emergency Broadcast'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Announcement Modal */}
      {showAnnouncementForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Create Announcement</h2>
              <button
                onClick={() => setShowAnnouncementForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={announcementForm.subject}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter announcement title..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content
                </label>
                <textarea
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  placeholder="Enter announcement message..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              
              {/* Target Segments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Target Audience
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {userSegments?.segments?.map((segment: UserSegment) => (
                    <label
                      key={segment.segment_id}
                      className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={announcementForm.target_segments.includes(segment.segment_id)}
                        onChange={() => toggleSegment(segment.segment_id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">{segment.name}</div>
                        <div className="text-xs text-gray-500">{segment.user_count.toLocaleString()} users</div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    Total target audience: {totalTargetUsers.toLocaleString()} users
                  </p>
                </div>
              </div>
              
              {/* Delivery Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Delivery Channels
                </label>
                <div className="flex flex-wrap gap-3">
                  {['in_app', 'email', 'sms'].map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={announcementForm.delivery_channels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {channel === 'in_app' ? 'In-App' : channel.toUpperCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Schedule Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={announcementForm.schedule_date || ''}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, schedule_date: e.target.value || null }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to send immediately</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowAnnouncementForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setAnnouncementForm(prev => ({ ...prev, is_draft: true }));
                  handleCreateAnnouncement();
                }}
                disabled={createAnnouncementMutation.isPending}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => {
                  setAnnouncementForm(prev => ({ ...prev, is_draft: false }));
                  handleCreateAnnouncement();
                }}
                disabled={!announcementForm.subject.trim() || !announcementForm.content.trim() || announcementForm.target_segments.length === 0 || createAnnouncementMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
              >
                {createAnnouncementMutation.isPending ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Emergency Broadcast Confirmation */}
      {showEmergencyConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Confirm Emergency Broadcast</h2>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 font-medium mb-2">You are about to send:</p>
                <p className="text-sm text-gray-700 italic">"{emergencyMessage}"</p>
                <p className="text-xs text-red-700 mt-3">
                  Severity: <span className="font-bold uppercase">{emergencySeverity}</span>
                </p>
              </div>
              
              <p className="text-sm text-gray-700 mb-6">
                This will immediately notify all users via email, SMS, and in-app notifications. 
                This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEmergencyConfirm(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmergencyBroadcast}
                  disabled={emergencyBroadcastMutation.isPending}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium shadow-lg"
                >
                  {emergencyBroadcastMutation.isPending ? 'Sending...' : 'Confirm & Send Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Toast for Mutations */}
      {createAnnouncementMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Announcement created successfully!</span>
        </div>
      )}
      
      {updateTemplateMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Template updated successfully!</span>
        </div>
      )}
      
      {emergencyBroadcastMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center space-x-2 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Emergency broadcast sent!</span>
        </div>
      )}
    </>
  );
};

export default UV_AdminCommunication;