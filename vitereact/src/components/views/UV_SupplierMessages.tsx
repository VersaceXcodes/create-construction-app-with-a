import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Search, 
  Clock,
  CheckCheck,
  User,
  Package,
  ShoppingCart,
  MoreVertical
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface Conversation {
  conversation_id: string;
  customer_id: string;
  customer_name: string;
  conversation_type: string;
  status: string;
  last_message_at: string | null;
  unread_count: number;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: string;
  message_text: string;
  attachments: string[] | null;
  is_read: boolean;
  timestamp: string;
}

// interface MessageTemplate {
//   template_id: string;
//   template_name: string;
//   template_text: string;
//   category: string;
// }

// interface ResponseMetrics {
//   avg_response_time_hours: number;
//   total_conversations: number;
//   resolved_conversations: number;
//   customer_satisfaction: number;
// }

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchConversations = async (filterType: string, unreadOnly: boolean, token: string): Promise<Conversation[]> => {
  const params = new URLSearchParams();
  params.append('conversation_type', 'customer_supplier');
  
  if (filterType && filterType !== 'all') {
    params.append('status', filterType);
  }
  
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/chat/conversations?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // Map response to include calculated fields
  const conversations: Conversation[] = response.data.map((conv: any) => ({
    conversation_id: conv.conversation_id,
    customer_id: conv.customer_id,
    customer_name: conv.customer_name || 'Unknown Customer',
    conversation_type: conv.conversation_type,
    status: conv.status,
    last_message_at: conv.last_message_at,
    unread_count: conv.unread_messages_count || 0,
    related_entity_type: conv.related_entity_type,
    related_entity_id: conv.related_entity_id
  }));
  
  // Filter unread if needed (client-side)
  if (unreadOnly) {
    return conversations.filter(c => c.unread_count > 0);
  }
  
  return conversations;
};

const fetchConversationMessages = async (conversationId: string, token: string): Promise<Message[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/chat/conversations/${conversationId}/messages?limit=50&offset=0`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

const sendMessage = async (conversationId: string, messageText: string, attachments: string[], token: string): Promise<Message> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/chat/conversations/${conversationId}/messages`,
    {
      message_text: messageText,
      attachments: attachments.length > 0 ? attachments : null
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_SupplierMessages: React.FC = () => {
  // ============================================================================
  // HOOKS & STATE - Individual Zustand selectors (CRITICAL: no object destructuring)
  // ============================================================================
  
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  // const currentUser = useAppStore(state => state.authentication_state.current_user);
  const supplierProfile = useAppStore(state => state.authentication_state.supplier_profile);
  const websocketConnection = useAppStore(state => state.websocket_connection);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Local state
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [composeState, setComposeState] = useState({
    message_text: '',
    attachments: [] as string[],
    is_sending: false
  });
  const [filterState, setFilterState] = useState({
    filter_type: searchParams.get('conversation_filter') || 'all',
    search_query: '',
    date_range: null as string | null
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get unread_only from URL params
  const unreadOnly = searchParams.get('unread_only') === 'true';
  
  // ============================================================================
  // REACT QUERY - Data Fetching
  // ============================================================================
  
  // Fetch conversations list
  const { 
    data: conversationsList = [], 
    isLoading: conversationsLoading, 
    error: conversationsError,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['supplier-conversations', filterState.filter_type, unreadOnly],
    queryFn: () => fetchConversations(filterState.filter_type, unreadOnly, authToken!),
    enabled: !!authToken,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true
  });
  
  // Fetch messages for active conversation
  const { 
    data: messagesList = [], 
    isLoading: messagesLoading,
    error: messagesError
  } = useQuery({
    queryKey: ['conversation-messages', activeConversation?.conversation_id],
    queryFn: () => fetchConversationMessages(activeConversation!.conversation_id, authToken!),
    enabled: !!authToken && !!activeConversation,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000 // Poll every 30 seconds as fallback to WebSocket
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageText, attachments }: { conversationId: string; messageText: string; attachments: string[] }) => 
      sendMessage(conversationId, messageText, attachments, authToken!),
    onMutate: () => {
      setComposeState(prev => ({ ...prev, is_sending: true }));
    },
    onSuccess: (newMessage) => {
      // Optimistically update messages list
      queryClient.setQueryData(
        ['conversation-messages', activeConversation?.conversation_id],
        (old: Message[] = []) => [...old, newMessage]
      );
      
      // Clear compose state
      setComposeState({
        message_text: '',
        attachments: [],
        is_sending: false
      });
      
      // Refetch conversations to update last_message_at
      refetchConversations();
      
      // Scroll to bottom
      scrollToBottom();
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      setComposeState(prev => ({ ...prev, is_sending: false }));
      alert('Failed to send message. Please try again.');
    }
  });
  
  // ============================================================================
  // WEBSOCKET INTEGRATION
  // ============================================================================
  
  useEffect(() => {
    if (!websocketConnection || !activeConversation) return;
    
    const socket = websocketConnection;
    
    // Join conversation room
    socket.emit('join_conversation', { conversation_id: activeConversation.conversation_id });
    
    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.conversation_id === activeConversation.conversation_id) {
        // Update messages list
        queryClient.setQueryData(
          ['conversation-messages', activeConversation.conversation_id],
          (old: Message[] = []) => {
            // Check if message already exists (prevent duplicates)
            if (old.some(m => m.message_id === data.message_id)) {
              return old;
            }
            return [...old, {
              message_id: data.message_id,
              conversation_id: data.conversation_id,
              sender_id: data.sender_id,
              sender_type: data.sender_type,
              message_text: data.message_text,
              attachments: data.attachments || null,
              is_read: data.is_read,
              timestamp: data.timestamp
            }];
          }
        );
        
        // Scroll to bottom
        setTimeout(scrollToBottom, 100);
      }
      
      // Update conversations list unread count
      refetchConversations();
    };
    
    socket.on('chat_message_received', handleNewMessage);
    
    // Cleanup
    return () => {
      socket.off('chat_message_received', handleNewMessage);
      socket.emit('leave_conversation', { conversation_id: activeConversation.conversation_id });
    };
  }, [websocketConnection, activeConversation, queryClient, refetchConversations]);
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleConversationSelect = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
    
    // Mark conversation as viewed (implicit read)
    // Since PATCH /chat/messages/{message_id}/read is missing, we'll rely on backend
    // to mark messages as read when fetched
  }, []);
  
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeConversation || !composeState.message_text.trim()) {
      return;
    }
    
    sendMessageMutation.mutate({
      conversationId: activeConversation.conversation_id,
      messageText: composeState.message_text.trim(),
      attachments: composeState.attachments
    });
  }, [activeConversation, composeState, sendMessageMutation]);
  
  const handleFilterChange = (newFilterType: string) => {
    setFilterState(prev => ({ ...prev, filter_type: newFilterType }));
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (newFilterType !== 'all') {
      params.set('conversation_filter', newFilterType);
    } else {
      params.delete('conversation_filter');
    }
    setSearchParams(params);
  };
  
  const toggleUnreadOnly = () => {
    const params = new URLSearchParams(searchParams);
    if (unreadOnly) {
      params.delete('unread_only');
    } else {
      params.set('unread_only', 'true');
    }
    setSearchParams(params);
  };
  
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const getRelatedEntityBadge = (type: string | null, id: string | null) => {
    if (!type || !id) return null;
    
    if (type === 'order') {
      return (
        <Link 
          to={`/supplier/orders/${id}`}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs hover:bg-blue-100 transition-colors"
        >
          <ShoppingCart className="w-3 h-3" />
          Order
        </Link>
      );
    }
    
    if (type === 'product') {
      return (
        <Link 
          to={`/product/${id}`}
          className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs hover:bg-green-100 transition-colors"
        >
          <Package className="w-3 h-3" />
          Product
        </Link>
      );
    }
    
    return null;
  };
  
  // Auto-scroll to bottom when messages load
  useEffect(() => {
    if (messagesList.length > 0) {
      scrollToBottom();
    }
  }, [messagesList]);
  
  // ============================================================================
  // RENDER - ONE BIG COMPONENT (no split functions)
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Customer Messages</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage customer inquiries and communications
                </p>
              </div>
              
              {/* Metrics Summary - Client-side calculated since endpoint missing */}
              {conversationsList.length > 0 && (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {conversationsList.length}
                    </div>
                    <div className="text-xs text-gray-600">Total Conversations</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {conversationsList.filter(c => c.unread_count > 0).length}
                    </div>
                    <div className="text-xs text-gray-600">Unread</div>
                  </div>
                  
                  {(supplierProfile as any)?.response_time_average && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Number((supplierProfile as any)?.response_time_average).toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-600">Avg Response Time</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Main Content - Two Column Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            
            {/* LEFT COLUMN - Conversations List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
              {/* Search & Filters */}
              <div className="p-4 border-b border-gray-200 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={filterState.search_query}
                    onChange={(e) => setFilterState(prev => ({ ...prev, search_query: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Filter Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterState.filter_type === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  
                  <button
                    onClick={() => handleFilterChange('active')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterState.filter_type === 'active'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Active
                  </button>
                  
                  <button
                    onClick={() => handleFilterChange('archived')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterState.filter_type === 'archived'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Archived
                  </button>
                  
                  <button
                    onClick={toggleUnreadOnly}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      unreadOnly
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Unread Only
                  </button>
                </div>
              </div>
              
              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto">
                {conversationsLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
                
                {conversationsError && (
                  <div className="p-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-700">Failed to load conversations</p>
                    </div>
                  </div>
                )}
                
                {!conversationsLoading && !conversationsError && conversationsList.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-600 font-medium mb-2">No conversations yet</p>
                    <p className="text-sm text-gray-500 text-center">
                      Customer messages will appear here
                    </p>
                  </div>
                )}
                
                {!conversationsLoading && !conversationsError && conversationsList.length > 0 && (
                  <div className="divide-y divide-gray-200">
                    {conversationsList
                      .filter(conv => 
                        filterState.search_query === '' || 
                        conv.customer_name.toLowerCase().includes(filterState.search_query.toLowerCase())
                      )
                      .map((conversation) => (
                        <button
                          key={conversation.conversation_id}
                          onClick={() => handleConversationSelect(conversation)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            activeConversation?.conversation_id === conversation.conversation_id
                              ? 'bg-blue-50 border-l-4 border-blue-600'
                              : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Customer Avatar */}
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>
                            
                            {/* Conversation Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className={`text-sm font-medium truncate ${
                                  conversation.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {conversation.customer_name}
                                </p>
                                
                                {conversation.unread_count > 0 && (
                                  <span className="flex-shrink-0 inline-flex items-center justify-center px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs font-medium">
                                    {conversation.unread_count}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                {getRelatedEntityBadge(conversation.related_entity_type, conversation.related_entity_id)}
                                
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(conversation.last_message_at)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  conversation.status === 'active'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {conversation.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* RIGHT COLUMN - Active Conversation */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden">
              {!activeConversation ? (
                /* No Conversation Selected */
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <MessageCircle className="w-20 h-20 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600 text-center max-w-md">
                    Choose a customer conversation from the list to view messages and respond
                  </p>
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {activeConversation.customer_name}
                          </h3>
                          
                          <div className="flex items-center gap-2 mt-1">
                            {getRelatedEntityBadge(
                              activeConversation.related_entity_type, 
                              activeConversation.related_entity_id
                            )}
                            
                            <span className="text-xs text-gray-500">
                              •
                            </span>
                            
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              activeConversation.status === 'active'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {activeConversation.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {messagesLoading && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    
                    {messagesError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700">Failed to load messages</p>
                      </div>
                    )}
                    
                    {!messagesLoading && !messagesError && messagesList.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No messages yet</p>
                        <p className="text-sm text-gray-500 mt-1">Start the conversation below</p>
                      </div>
                    )}
                    
                    {!messagesLoading && !messagesError && messagesList.length > 0 && (
                      <>
                        {messagesList.map((message) => {
                          const isSupplierMessage = message.sender_type === 'supplier';
                          
                          return (
                            <div
                              key={message.message_id}
                              className={`flex ${isSupplierMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[75%] ${isSupplierMessage ? 'order-2' : 'order-1'}`}>
                                {/* Sender Label */}
                                <div className={`text-xs text-gray-600 mb-1 ${isSupplierMessage ? 'text-right' : 'text-left'}`}>
                                  {isSupplierMessage ? 'You' : activeConversation.customer_name}
                                </div>
                                
                                {/* Message Bubble */}
                                <div className={`rounded-2xl px-4 py-3 ${
                                  isSupplierMessage
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-900 border border-gray-200'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.message_text}
                                  </p>
                                  
                                  {/* Attachments */}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {message.attachments.map((attachment, idx) => (
                                        <a
                                          key={idx}
                                          href={attachment}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-2 text-xs underline ${
                                            isSupplierMessage ? 'text-blue-100' : 'text-blue-600'
                                          }`}
                                        >
                                          <Paperclip className="w-3 h-3" />
                                          Attachment {idx + 1}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Timestamp & Read Status */}
                                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${
                                  isSupplierMessage ? 'justify-end' : 'justify-start'
                                }`}>
                                  <span>{formatTimestamp(message.timestamp)}</span>
                                  
                                  {isSupplierMessage && message.is_read && (
                                    <CheckCheck className="w-3 h-3 text-blue-600" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                  
                  {/* Compose Area */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <form onSubmit={handleSendMessage} className="space-y-3">
                      {/* Message Input */}
                      <div className="relative">
                        <textarea
                          value={composeState.message_text}
                          onChange={(e) => {
                            setComposeState(prev => ({ ...prev, message_text: e.target.value }));
                          }}
                          placeholder="Type your message..."
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={composeState.is_sending}
                          onKeyDown={(e) => {
                            // Send on Ctrl+Enter or Cmd+Enter
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                        />
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Attachment Button - Placeholder (upload not implemented in backend) */}
                          <button
                            type="button"
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Attach file (coming soon)"
                            disabled
                          >
                            <Paperclip className="w-5 h-5" />
                          </button>
                          
                          <span className="text-xs text-gray-500">
                            Press Ctrl+Enter to send
                          </span>
                        </div>
                        
                        <button
                          type="submit"
                          disabled={composeState.is_sending || !composeState.message_text.trim()}
                          className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {composeState.is_sending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send Message
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Help Text - Bottom */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Response Time Best Practices
                </h4>
                <p className="text-sm text-blue-700">
                  Quick responses improve customer satisfaction. Aim to reply within 2 hours during business hours.
                  {(supplierProfile as any)?.response_time_average && (
                    <> Your current average response time is <strong>{Number((supplierProfile as any)?.response_time_average).toFixed(1)} hours</strong>.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SupplierMessages;