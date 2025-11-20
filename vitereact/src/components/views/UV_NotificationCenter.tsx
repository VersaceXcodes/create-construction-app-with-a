import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import {
  Bell,
  Package,
  Tag,
  TrendingDown,
  CheckCircle,
  Info,
  MessageSquare,
  Check,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Filter,
  Loader2,
  AlertCircle,
  Inbox,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Notification {
  notification_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  created_date: string;
  is_read: boolean;
  read_at: string | null;
  delivered_via: string[] | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

interface MarkReadResponse {
  notification_id: string;
  is_read: boolean;
  read_at: string;
}

interface MarkAllReadResponse {
  message: string;
  updated_count: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchNotifications = async (
  authToken: string,
  filters: {
    notification_type?: string;
    is_read?: boolean;
    limit: number;
    offset: number;
  }
): Promise<NotificationsResponse> => {
  const params = new URLSearchParams();
  
  if (filters.notification_type && filters.notification_type !== 'all') {
    params.append('notification_type', filters.notification_type);
  }
  
  if (filters.is_read !== undefined) {
    params.append('is_read', String(filters.is_read));
  }
  
  params.append('limit', String(filters.limit));
  params.append('offset', String(filters.offset));

  const response = await axios.get<NotificationsResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  return response.data;
};

const markNotificationAsRead = async (
  authToken: string,
  notificationId: string
): Promise<MarkReadResponse> => {
  const response = await axios.patch<MarkReadResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/${notificationId}/read`,
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  return response.data;
};

const markAllNotificationsAsRead = async (
  authToken: string
): Promise<MarkAllReadResponse> => {
  const response = await axios.post<MarkAllReadResponse>(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/notifications/read-all`,
    {},
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  return response.data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'order_update':
      return Package;
    case 'promotion':
      return Tag;
    case 'price_drop':
      return TrendingDown;
    case 'back_in_stock':
      return CheckCircle;
    case 'message':
      return MessageSquare;
    case 'system':
    default:
      return Info;
  }
};

const getNotificationIconColor = (type: string) => {
  switch (type) {
    case 'order_update':
      return 'text-blue-600 bg-blue-100';
    case 'promotion':
      return 'text-purple-600 bg-purple-100';
    case 'price_drop':
      return 'text-green-600 bg-green-100';
    case 'back_in_stock':
      return 'text-emerald-600 bg-emerald-100';
    case 'message':
      return 'text-amber-600 bg-amber-100';
    case 'system':
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getFilterLabel = (filter: string): string => {
  switch (filter) {
    case 'all':
      return 'All';
    case 'order_update':
      return 'Orders';
    case 'promotion':
    case 'price_drop':
    case 'back_in_stock':
      return 'Alerts';
    default:
      return 'All';
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // CRITICAL: Individual selectors to prevent infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const globalNotificationState = useAppStore(state => state.notification_state);

  // Local state
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<string[]>([]);

  // URL param state (derived from searchParams)
  const activeFilter = searchParams.get('filter_type') || 'all';
  const showUnreadOnly = searchParams.get('unread_only') === 'true';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const notificationsPerPage = 20;

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const {
    data: notificationsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'notifications',
      activeFilter,
      showUnreadOnly,
      currentPage,
      notificationsPerPage,
    ],
    queryFn: () => {
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const notification_type =
        activeFilter === 'orders'
          ? 'order_update'
          : activeFilter === 'alerts'
          ? undefined // Will show promotions, price_drop, back_in_stock
          : activeFilter !== 'all'
          ? activeFilter
          : undefined;

      return fetchNotifications(authToken, {
        notification_type,
        is_read: showUnreadOnly ? false : undefined,
        limit: notificationsPerPage,
        offset: (currentPage - 1) * notificationsPerPage,
      });
    },
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!authToken) {
        throw new Error('Authentication required');
      }
      return markNotificationAsRead(authToken, notificationId);
    },
    onSuccess: () => {
      // Invalidate and refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Update global unread count (optimistically)
      if (notificationsData && notificationsData.unread_count > 0) {
        // Note: The backend will return updated unread_count on refetch
      }
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => {
      if (!authToken) {
        throw new Error('Authentication required');
      }
      return markAllNotificationsAsRead(authToken);
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Clear selections
      setSelectedNotificationIds([]);
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFilterChange = (filter: string) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (filter === 'all') {
      newParams.delete('filter_type');
    } else {
      newParams.set('filter_type', filter);
    }
    
    // Reset to page 1 when filter changes
    newParams.delete('page');
    
    setSearchParams(newParams);
    setSelectedNotificationIds([]); // Clear selections on filter change
  };

  const handleUnreadToggle = () => {
    const newParams = new URLSearchParams(searchParams);
    
    if (showUnreadOnly) {
      newParams.delete('unread_only');
    } else {
      newParams.set('unread_only', 'true');
    }
    
    // Reset to page 1
    newParams.delete('page');
    
    setSearchParams(newParams);
    setSelectedNotificationIds([]);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (page === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', String(page));
    }
    
    setSearchParams(newParams);
    setSelectedNotificationIds([]);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await markReadMutation.mutateAsync(notification.notification_id);
    }

    // Navigate to related content if action_url exists
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotificationIds(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const handleSelectAll = () => {
    if (!notificationsData) return;

    if (selectedNotificationIds.length === notificationsData.notifications.length) {
      setSelectedNotificationIds([]);
    } else {
      setSelectedNotificationIds(
        notificationsData.notifications.map(n => n.notification_id)
      );
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedNotificationIds.length === 0) return;

    try {
      // Mark each selected notification as read
      await Promise.all(
        selectedNotificationIds.map(id => markReadMutation.mutateAsync(id))
      );

      // Clear selections after success
      setSelectedNotificationIds([]);
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const notifications = notificationsData?.notifications || [];
  const totalCount = notificationsData?.total || 0;
  const unreadCount = notificationsData?.unread_count || 0;
  const totalPages = Math.ceil(totalCount / notificationsPerPage);

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'orders', label: 'Orders' }, // Maps to order_update type
    { value: 'alerts', label: 'Alerts' }, // Maps to promotion, price_drop, back_in_stock
  ];

  const hasSelections = selectedNotificationIds.length > 0;
  const allSelected = notifications.length > 0 && selectedNotificationIds.length === notifications.length;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markAllReadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Mark All as Read</span>
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 mt-6 border-b border-gray-200">
              {filterTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => handleFilterChange(tab.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeFilter === tab.value
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                {/* Unread Only Toggle */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={handleUnreadToggle}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">Unread only</span>
                </label>

                {/* Select All Checkbox */}
                {notifications.length > 0 && (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">Select all</span>
                  </label>
                )}
              </div>

              {/* Bulk Actions */}
              {hasSelections && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {selectedNotificationIds.length} selected
                  </span>
                  <button
                    onClick={handleMarkSelectedAsRead}
                    disabled={markReadMutation.isPending}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {markReadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Mark as Read</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-gray-600">Loading notifications...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 mb-1">
                    Failed to load notifications
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    {error instanceof Error ? error.message : 'An error occurred'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          {!isLoading && !isError && (
            <>
              {notifications.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="p-4 bg-gray-100 rounded-full">
                      <Inbox className="w-12 h-12 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {showUnreadOnly
                          ? 'No unread notifications'
                          : activeFilter !== 'all'
                          ? `No ${getFilterLabel(activeFilter).toLowerCase()} notifications`
                          : 'No notifications yet'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {showUnreadOnly
                          ? "You're all caught up!"
                          : "We'll notify you when there's something new"}
                      </p>
                    </div>
                    {(showUnreadOnly || activeFilter !== 'all') && (
                      <button
                        onClick={() => {
                          const newParams = new URLSearchParams();
                          setSearchParams(newParams);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all notifications
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notification => {
                    const NotificationIcon = getNotificationIcon(notification.notification_type);
                    const iconColorClass = getNotificationIconColor(notification.notification_type);
                    const isSelected = selectedNotificationIds.includes(notification.notification_id);

                    return (
                      <div
                        key={notification.notification_id}
                        className={`bg-white rounded-lg shadow-sm border transition-all ${
                          notification.is_read
                            ? 'border-gray-200 hover:border-gray-300'
                            : 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
                        } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className="p-4 flex items-start space-x-4">
                          {/* Select Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectNotification(notification.notification_id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>

                          {/* Notification Icon */}
                          <div className="flex-shrink-0">
                            <div className={`p-2 rounded-lg ${iconColorClass}`}>
                              <NotificationIcon className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Notification Content */}
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h3
                                    className={`text-sm font-semibold ${
                                      notification.is_read ? 'text-gray-700' : 'text-gray-900'
                                    }`}
                                  >
                                    {notification.title}
                                  </h3>
                                  {!notification.is_read && (
                                    <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                                  )}
                                </div>
                                <p
                                  className={`text-sm ${
                                    notification.is_read ? 'text-gray-500' : 'text-gray-700'
                                  } line-clamp-2`}
                                >
                                  {notification.message}
                                </p>
                              </div>

                              <div className="flex-shrink-0 text-right">
                                <span className="text-xs text-gray-500">
                                  {getRelativeTime(notification.created_date)}
                                </span>
                              </div>
                            </div>

                            {/* Related Entity Badge */}
                            {notification.related_entity_type && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600">
                                  {notification.related_entity_type === 'order' && 'Order'}
                                  {notification.related_entity_type === 'product' && 'Product'}
                                  {notification.related_entity_type === 'delivery' && 'Delivery'}
                                  {!['order', 'product', 'delivery'].includes(notification.related_entity_type) &&
                                    notification.related_entity_type}
                                </span>
                              </div>
                            )}
                          </button>

                          {/* Mark as Read Button (for unread notifications) */}
                          {!notification.is_read && (
                            <div className="flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markReadMutation.mutate(notification.notification_id);
                                }}
                                disabled={markReadMutation.isPending}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                                title="Mark as read"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && notifications.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * notificationsPerPage + 1} to{' '}
                      {Math.min(currentPage * notificationsPerPage, totalCount)} of {totalCount}{' '}
                      notifications
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_NotificationCenter;