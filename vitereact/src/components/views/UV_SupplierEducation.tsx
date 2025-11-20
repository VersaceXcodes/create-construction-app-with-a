import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  BookOpen, 
  Video, 
  Users, 
  Bell, 
  Search, 
  Filter, 
  Play, 
  Clock, 
  TrendingUp, 
  Award,
  CheckCircle,
  Calendar,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Download,
  ExternalLink,
  Star
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EducationalResource {
  resource_id: string;
  title: string;
  description: string;
  resource_type: 'article' | 'video' | 'guide' | 'tutorial';
  content_url: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  created_date: string;
  view_count: number;
  rating: number;
}

interface Webinar {
  webinar_id: string;
  title: string;
  description: string;
  scheduled_date?: string;
  recorded_date?: string;
  duration_minutes: number;
  presenter_name: string;
  registration_required?: boolean;
  max_attendees?: number | null;
  registration_count?: number;
  webinar_url?: string | null;
  video_url?: string;
  view_count?: number;
  rating?: number;
}

interface CommunityPost {
  post_id: string;
  title: string;
  content: string;
  author_name: string;
  author_type: 'supplier' | 'admin';
  created_date: string;
  reply_count: number;
  like_count: number;
  category: string;
}

interface PlatformUpdate {
  update_id: string;
  title: string;
  description: string;
  update_type: 'feature' | 'policy' | 'maintenance' | 'announcement';
  published_date: string;
  importance: 'info' | 'warning' | 'critical';
  acknowledgment_required: boolean;
  acknowledged: boolean;
}

interface ProgressTracking {
  resource_id: string;
  completion_status: 'not_started' | 'in_progress' | 'completed';
  completed_date: string | null;
  progress_percentage: number;
  quiz_score: number | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchEducationalResources = async (authToken: string, resource_type?: string, search_query?: string) => {
  const params = new URLSearchParams();
  if (resource_type) params.append('resource_type', resource_type);
  if (search_query) params.append('search_query', search_query);
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/resources?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data as EducationalResource[];
};

const fetchWebinarSchedule = async (authToken: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/webinars?status=upcoming`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data as Webinar[];
};

const fetchRecordedWebinars = async (authToken: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/webinars/recorded`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data as Webinar[];
};

const fetchCommunityContent = async (authToken: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/community`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data as CommunityPost[];
};

const fetchPlatformUpdates = async (authToken: string) => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/updates`,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data as PlatformUpdate[];
};

const trackResourceProgress = async (authToken: string, data: {
  resource_id: string;
  completion_status: string;
  progress_percentage: number;
}) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/progress`,
    data,
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data;
};

const registerForWebinar = async (authToken: string, webinar_id: string) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/webinars/${webinar_id}/register`,
    {},
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data;
};

const acknowledgeUpdate = async (authToken: string, update_id: string) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/education/updates/${update_id}/acknowledge`,
    {},
    {
      headers: { Authorization: `Bearer ${authToken}` }
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierEducation: React.FC = () => {
  // Get auth token from global state (CRITICAL: Individual selector)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const urlResourceType = searchParams.get('resource_type');
  const urlSearchQuery = searchParams.get('search_query');
  
  // Local state
  const [activeTab, setActiveTab] = useState<'resources' | 'live' | 'recorded' | 'community' | 'updates'>('resources');
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || '');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>(urlResourceType || 'all');
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  // React Query - Fetch educational resources
  const { data: educational_resources = [], isLoading: loadingResources } = useQuery({
    queryKey: ['education-resources', resourceTypeFilter, searchQuery],
    queryFn: () => fetchEducationalResources(
      authToken!,
      resourceTypeFilter !== 'all' ? resourceTypeFilter : undefined,
      searchQuery || undefined
    ),
    enabled: !!authToken && activeTab === 'resources',
    staleTime: 5 * 60 * 1000,
  });
  
  // React Query - Fetch upcoming webinars
  const { data: webinar_schedule = [], isLoading: loadingWebinars } = useQuery({
    queryKey: ['webinar-schedule'],
    queryFn: () => fetchWebinarSchedule(authToken!),
    enabled: !!authToken && activeTab === 'live',
    staleTime: 2 * 60 * 1000,
  });
  
  // React Query - Fetch recorded webinars
  const { data: recorded_webinars = [], isLoading: loadingRecorded } = useQuery({
    queryKey: ['recorded-webinars'],
    queryFn: () => fetchRecordedWebinars(authToken!),
    enabled: !!authToken && activeTab === 'recorded',
    staleTime: 5 * 60 * 1000,
  });
  
  // React Query - Fetch community posts
  const { data: community_posts = [], isLoading: loadingCommunity } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => fetchCommunityContent(authToken!),
    enabled: !!authToken && activeTab === 'community',
    staleTime: 2 * 60 * 1000,
  });
  
  // React Query - Fetch platform updates
  const { data: platform_updates = [], isLoading: loadingUpdates } = useQuery({
    queryKey: ['platform-updates'],
    queryFn: () => fetchPlatformUpdates(authToken!),
    enabled: !!authToken && activeTab === 'updates',
    staleTime: 5 * 60 * 1000,
  });
  
  // Mutations
  const trackProgressMutation = useMutation({
    mutationFn: (data: { resource_id: string; completion_status: string; progress_percentage: number }) =>
      trackResourceProgress(authToken!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-resources'] });
    },
  });
  
  const registerWebinarMutation = useMutation({
    mutationFn: (webinar_id: string) => registerForWebinar(authToken!, webinar_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webinar-schedule'] });
    },
  });
  
  const acknowledgeUpdateMutation = useMutation({
    mutationFn: (update_id: string) => acknowledgeUpdate(authToken!, update_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-updates'] });
    },
  });
  
  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (resourceTypeFilter !== 'all') params.set('resource_type', resourceTypeFilter);
    if (searchQuery) params.set('search_query', searchQuery);
    setSearchParams(params);
  }, [resourceTypeFilter, searchQuery, setSearchParams]);
  
  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is reactive via useEffect
  };
  
  const handleMarkComplete = (resource_id: string) => {
    trackProgressMutation.mutate({
      resource_id,
      completion_status: 'completed',
      progress_percentage: 100,
    });
  };
  
  const handleRegisterWebinar = (webinar_id: string) => {
    registerWebinarMutation.mutate(webinar_id);
  };
  
  const handleAcknowledgeUpdate = (update_id: string) => {
    acknowledgeUpdateMutation.mutate(update_id);
  };
  
  // Get difficulty level badge color
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get importance badge color
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  // Calculate overall progress (mock - would come from backend)
  const overallProgress = 45; // Percentage
  const completedResources = 12;
  const totalResources = 27;
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Training & Resource Center</h1>
                <p className="text-blue-100 text-lg">Expand your skills and grow your business on BuildEasy</p>
              </div>
              
              {/* Progress Dashboard */}
              <div className="hidden lg:block bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-center mb-3">
                  <div className="text-3xl font-bold">{overallProgress}%</div>
                  <div className="text-sm text-blue-100">Training Complete</div>
                </div>
                <div className="w-48 bg-white/20 rounded-full h-2 mb-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <div className="text-xs text-blue-100 text-center">
                  {completedResources} of {totalResources} resources completed
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Bar */}
          <div className="mb-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search training materials, webinars, articles..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
              />
            </form>
          </div>
          
          {/* Tab Navigation */}
          <div className="mb-8 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('resources')}
                className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'resources'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>Resources</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('live')}
                className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'live'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Video className="w-5 h-5" />
                  <span>Live Training</span>
                  {webinar_schedule.length > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {webinar_schedule.length}
                    </span>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('recorded')}
                className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'recorded'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Play className="w-5 h-5" />
                  <span>Recorded Sessions</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('community')}
                className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'community'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Community</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('updates')}
                className={`pb-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === 'updates'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Updates</span>
                  {platform_updates.filter(u => !u.acknowledged && u.acknowledgment_required).length > 0 && (
                    <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {platform_updates.filter(u => !u.acknowledged && u.acknowledgment_required).length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
          
          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div>
              {/* Filters */}
              <div className="mb-6 flex items-center space-x-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <div className="flex space-x-2">
                  {['all', 'article', 'video', 'guide', 'tutorial'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setResourceTypeFilter(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        resourceTypeFilter === type
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Loading State */}
              {loadingResources ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded mb-4 w-5/6"></div>
                      <div className="flex space-x-2">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : educational_resources.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No resources found</h3>
                  <p className="text-gray-600 mb-6">Try adjusting your filters or search terms</p>
                  <button
                    onClick={() => {
                      setResourceTypeFilter('all');
                      setSearchQuery('');
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                /* Resource Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {educational_resources.map((resource) => (
                    <div
                      key={resource.resource_id}
                      className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                      onClick={() => setSelectedResource(resource.resource_id)}
                    >
                      {/* Resource Type Badge */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {resource.resource_type === 'video' ? (
                              <Video className="w-5 h-5 text-blue-600" />
                            ) : resource.resource_type === 'article' ? (
                              <BookOpen className="w-5 h-5 text-blue-600" />
                            ) : (
                              <BookOpen className="w-5 h-5 text-blue-600" />
                            )}
                            <span className="text-xs font-semibold text-blue-600 uppercase">
                              {resource.resource_type}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(resource.difficulty_level)}`}>
                            {resource.difficulty_level}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {resource.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {resource.description}
                        </p>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          {resource.duration_minutes && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{resource.duration_minutes} min</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4" />
                            <span>{resource.view_count} views</span>
                          </div>
                          {resource.rating > 0 && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{resource.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {resource.content_url && (
                            <a
                              href={resource.content_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center text-sm"
                            >
                              View Resource
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkComplete(resource.resource_id);
                            }}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Mark as complete"
                          >
                            <CheckCircle className="w-5 h-5 text-gray-400 hover:text-green-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Live Training Tab */}
          {activeTab === 'live' && (
            <div>
              {loadingWebinars ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-8 border border-gray-100 animate-pulse">
                      <div className="h-8 bg-gray-200 rounded mb-4 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded mb-6 w-5/6"></div>
                      <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : webinar_schedule.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming webinars</h3>
                  <p className="text-gray-600">Check back soon for new training sessions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {webinar_schedule.map((webinar) => (
                    <div
                      key={webinar.webinar_id}
                      className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-200"
                    >
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white">
                        <div className="flex items-start justify-between mb-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                            <div className="text-xs font-semibold uppercase">Live Session</div>
                          </div>
                          {webinar.registration_required && (
                            <div className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-semibold">
                              Registration Required
                            </div>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{webinar.title}</h3>
                        <p className="text-indigo-100">{webinar.description}</p>
                      </div>
                      
                      <div className="p-6">
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center text-gray-700">
                            <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                            <span className="font-medium">
                              {new Date(webinar.scheduled_date!).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-gray-700">
                            <Clock className="w-5 h-5 mr-3 text-gray-400" />
                            <span>{webinar.duration_minutes} minutes</span>
                          </div>
                          
                          <div className="flex items-center text-gray-700">
                            <Award className="w-5 h-5 mr-3 text-gray-400" />
                            <span>Presenter: {webinar.presenter_name}</span>
                          </div>
                          
                          {webinar.max_attendees && (
                            <div className="flex items-center text-gray-700">
                              <Users className="w-5 h-5 mr-3 text-gray-400" />
                              <span>
                                {webinar.registration_count || 0} / {webinar.max_attendees} registered
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleRegisterWebinar(webinar.webinar_id)}
                          disabled={registerWebinarMutation.isPending}
                          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {registerWebinarMutation.isPending ? 'Registering...' : 'Register for Webinar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Recorded Sessions Tab */}
          {activeTab === 'recorded' && (
            <div>
              {loadingRecorded ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse">
                      <div className="aspect-video bg-gray-200"></div>
                      <div className="p-6">
                        <div className="h-6 bg-gray-200 rounded mb-3 w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recorded_webinars.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No recorded sessions yet</h3>
                  <p className="text-gray-600">Recorded webinars will appear here after live sessions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recorded_webinars.map((webinar) => (
                    <div
                      key={webinar.webinar_id}
                      className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-200 group"
                    >
                      {/* Video Thumbnail */}
                      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-blue-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {webinar.duration_minutes} min
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                          {webinar.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {webinar.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <div className="flex items-center space-x-1">
                            <Award className="w-4 h-4" />
                            <span>{webinar.presenter_name}</span>
                          </div>
                          {webinar.rating && webinar.rating > 0 && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{webinar.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-4">
                          Recorded: {new Date(webinar.recorded_date!).toLocaleDateString()}
                        </div>
                        
                        {webinar.video_url ? (
                          <a
                            href={webinar.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
                          >
                            Watch Recording
                          </a>
                        ) : (
                          <button
                            disabled
                            className="w-full bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                          >
                            Video Processing...
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Community Tab */}
          {activeTab === 'community' && (
            <div>
              {loadingCommunity ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded mb-3 w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              ) : community_posts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No community posts yet</h3>
                  <p className="text-gray-600 mb-6">Be the first to start a discussion!</p>
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    Start Discussion
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {community_posts.map((post) => (
                    <div
                      key={post.post_id}
                      className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">
                              {post.title}
                            </h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                              {post.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {post.content}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="font-medium text-gray-700">{post.author_name}</span>
                            {post.author_type === 'admin' && (
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-semibold">
                                BuildEasy Team
                              </span>
                            )}
                            <span>{new Date(post.created_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">{post.reply_count} replies</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm">{post.like_count} likes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Updates Tab */}
          {activeTab === 'updates' && (
            <div>
              {loadingUpdates ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 animate-pulse">
                      <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  ))}
                </div>
              ) : platform_updates.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">You're all caught up!</h3>
                  <p className="text-gray-600">No new platform updates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Unacknowledged updates first */}
                  {platform_updates
                    .filter(update => !update.acknowledged && update.acknowledgment_required)
                    .map((update) => (
                      <div
                        key={update.update_id}
                        className={`bg-white rounded-xl p-6 border-2 ${getImportanceColor(update.importance)}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-900">{update.title}</h3>
                              <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase ${
                                update.importance === 'critical' ? 'bg-red-600 text-white' :
                                update.importance === 'warning' ? 'bg-yellow-500 text-white' :
                                'bg-blue-500 text-white'
                              }`}>
                                {update.importance}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                                {update.update_type}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-3">
                              {update.description}
                            </p>
                            <div className="text-sm text-gray-500">
                              Published: {new Date(update.published_date).toLocaleDateString()}
                            </div>
                          </div>
                          <AlertCircle className={`w-6 h-6 flex-shrink-0 ml-4 ${
                            update.importance === 'critical' ? 'text-red-600' :
                            update.importance === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                        </div>
                        
                        {update.acknowledgment_required && !update.acknowledged && (
                          <button
                            onClick={() => handleAcknowledgeUpdate(update.update_id)}
                            disabled={acknowledgeUpdateMutation.isPending}
                            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {acknowledgeUpdateMutation.isPending ? 'Acknowledging...' : 'I Understand - Acknowledge Update'}
                          </button>
                        )}
                      </div>
                    ))}
                  
                  {/* Acknowledged updates */}
                  {platform_updates
                    .filter(update => update.acknowledged || !update.acknowledgment_required)
                    .map((update) => (
                      <div
                        key={update.update_id}
                        className="bg-white rounded-xl p-6 border border-gray-100 opacity-75"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{update.title}</h3>
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                                {update.update_type}
                              </span>
                              {update.acknowledged && (
                                <div className="flex items-center space-x-1 text-green-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">Acknowledged</span>
                                </div>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-2">
                              {update.description}
                            </p>
                            <div className="text-xs text-gray-500">
                              {new Date(update.published_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Quick Stats Banner */}
        <div className="bg-white border-t border-gray-200 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{completedResources}</div>
                <div className="text-sm text-gray-600">Resources Completed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{webinar_schedule.length}</div>
                <div className="text-sm text-gray-600">Upcoming Webinars</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{recorded_webinars.length}</div>
                <div className="text-sm text-gray-600">Recorded Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{overallProgress}%</div>
                <div className="text-sm text-gray-600">Training Progress</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SupplierEducation;