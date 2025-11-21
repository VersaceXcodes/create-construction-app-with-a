import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { MessageCircle, X, Minus, Send, Paperclip, User } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChatMessage {
  message_id: string;
  sender_id: string;
  sender_type: 'customer' | 'supplier' | 'admin' | 'system';
  sender_name: string;
  message_text: string;
  attachments: string[] | null;
  timestamp: string;
  is_read: boolean;
}

interface ConversationResponse {
  conversation_id: string;
  conversation_type: 'customer_supplier' | 'customer_support' | 'supplier_support';
  customer_id: string | null;
  supplier_id: string | null;
  admin_id: string | null;
  status: 'active' | 'archived' | 'closed';
  created_at: string;
}

interface SendMessageRequest {
  message_text: string;
  attachments?: string[];
}

interface SendMessageResponse {
  message_id: string;
  sender_id: string;
  sender_type: string;
  message_text: string;
  timestamp: string;
  is_read: boolean;
}

interface AgentInfo {
  user_id: string;
  name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away';
}

// ============================================================================
// COMPONENT
// ============================================================================

const GV_ChatWidget: React.FC = () => {
  // ============================================================================
  // ZUSTAND STATE (CRITICAL: Individual selectors)
  // ============================================================================
  
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const websocketConnection = useAppStore(state => state.websocket_connection);
  
  const queryClient = useQueryClient();
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [conversation_id, setConversationId] = useState<string | null>(null);
  const [conversation_type, setConversationType] = useState<'customer_supplier' | 'customer_support' | 'supplier_support' | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [is_widget_open, setIsWidgetOpen] = useState(false);
  const [is_minimized, setIsMinimized] = useState(false);
  const [current_message_input, setCurrentMessageInput] = useState('');
  const [is_typing, setIsTyping] = useState(false);
  const [other_user_typing, setOtherUserTyping] = useState<{ user_id: string; user_name: string } | null>(null);
  const [connection_status, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [unread_count, setUnreadCount] = useState(0);
  const [agent_info] = useState<AgentInfo | null>(null);
  const [show_conversation_selector, setShowConversationSelector] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  
  // ============================================================================
  // HELPER: Scroll to Bottom
  // ============================================================================
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    if (is_widget_open && !is_minimized && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, is_widget_open, is_minimized, scrollToBottom]);
  
  // ============================================================================
  // WEBSOCKET SETUP
  // ============================================================================
  
  useEffect(() => {
    if (!websocketConnection || !conversation_id) return;
    
    // Update connection status
    setConnectionStatus(websocketConnection.connected ? 'connected' : 'connecting');
    
    // Join conversation room
    websocketConnection.emit('join_conversation', { conversation_id });
    
    // Listen for new messages
    const handleMessageReceived = (data: any) => {
      const newMessage: ChatMessage = {
        message_id: data.message_id,
        sender_id: data.sender_id,
        sender_type: data.sender_type,
        sender_name: data.sender_name,
        message_text: data.message_text,
        attachments: data.attachments,
        timestamp: data.timestamp,
        is_read: data.is_read
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // If message not from current user and widget closed, increment unread
      if (data.sender_id !== currentUser?.user_id && (!is_widget_open || is_minimized)) {
        setUnreadCount(prev => prev + 1);
      }
      
      // Auto-mark as read if widget is open
      if (is_widget_open && !is_minimized && websocketConnection) {
        websocketConnection.emit('mark_message_read', { message_id: data.message_id });
      }
    };
    
    // Listen for typing indicators
    const handleUserTyping = (data: any) => {
      if (data.user_id !== currentUser?.user_id) {
        if (data.is_typing) {
          setOtherUserTyping({ user_id: data.user_id, user_name: data.user_name || 'Agent' });
        } else {
          setOtherUserTyping(null);
        }
      }
    };
    
    // Listen for message read receipts
    const handleMessageRead = (data: any) => {
      setMessages(prev => prev.map(msg => 
        msg.message_id === data.message_id 
          ? { ...msg, is_read: true }
          : msg
      ));
    };
    
    websocketConnection.on('chat_message_received', handleMessageReceived);
    websocketConnection.on('user_typing', handleUserTyping);
    websocketConnection.on('chat_message_read', handleMessageRead);
    
    websocketConnection.on('connect', () => {
      setConnectionStatus('connected');
    });
    
    websocketConnection.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });
    
    return () => {
      if (websocketConnection) {
        websocketConnection.off('chat_message_received', handleMessageReceived);
        websocketConnection.off('user_typing', handleUserTyping);
        websocketConnection.off('chat_message_read', handleMessageRead);
        websocketConnection.emit('leave_conversation', { conversation_id });
      }
    };
  }, [websocketConnection, conversation_id, currentUser, is_widget_open, is_minimized]);
  
  // ============================================================================
  // API QUERIES
  // ============================================================================
  
  // Fetch conversation messages
  const { data: conversationMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat-messages', conversation_id],
    queryFn: async () => {
      if (!conversation_id || !authToken) return [];
      
      const response = await axios.get(
        `${API_BASE_URL}/chat/conversations/${conversation_id}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          params: {
            limit: 50,
            offset: 0
          }
        }
      );
      
      return response.data as ChatMessage[];
    },
    enabled: !!conversation_id && !!authToken && is_widget_open,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    if (conversationMessages && conversationMessages.length > 0) {
      setMessages(conversationMessages);
    }
  }, [conversationMessages]);
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  // Start new conversation
  const startConversationMutation = useMutation({
    mutationFn: async (params: {
      conversation_type: 'customer_support' | 'customer_supplier' | 'supplier_support';
      supplier_id?: string;
      related_entity_type?: string;
      related_entity_id?: string;
    }) => {
      const response = await axios.post(
        `${API_BASE_URL}/chat/conversations`,
        params,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data as ConversationResponse;
    },
    onSuccess: (data) => {
      setConversationId(data.conversation_id);
      setConversationType(data.conversation_type);
      setShowConversationSelector(false);
      setMessages([]);
      setLocalError(null);
      
      // Join WebSocket room
      if (websocketConnection) {
        websocketConnection.emit('join_conversation', { conversation_id: data.conversation_id });
      }
    },
    onError: (error: any) => {
      console.error('Failed to start conversation:', error);
      setLocalError('Failed to start conversation. Please try again.');
    }
  });
  
  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageRequest) => {
      if (!conversation_id) throw new Error('No active conversation');
      
      const response = await axios.post(
        `${API_BASE_URL}/chat/conversations/${conversation_id}/messages`,
        params,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data as SendMessageResponse;
    },
    onMutate: async (params) => {
      // Optimistic update
      const optimisticMessage: ChatMessage = {
        message_id: `temp-${Date.now()}`,
        sender_id: currentUser?.user_id || '',
        sender_type: currentUser?.user_type || 'customer',
        sender_name: `${currentUser?.first_name} ${currentUser?.last_name}`,
        message_text: params.message_text,
        attachments: params.attachments || null,
        timestamp: new Date().toISOString(),
        is_read: false
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setCurrentMessageInput('');
      
      return { optimisticMessage };
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update
      if (context?.optimisticMessage) {
        setMessages(prev => prev.filter(msg => msg.message_id !== context.optimisticMessage.message_id));
      }
      
      console.error('Failed to send message:', error);
      setLocalError('Failed to send message. Please try again.');
      
      // Restore input
      setCurrentMessageInput(variables.message_text);
    },
    onSuccess: () => {
      setLocalError(null);
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversation_id] });
    }
  });
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleOpenWidget = useCallback(() => {
    setIsWidgetOpen(true);
    setIsMinimized(false);
    
    // If no active conversation, show selector
    if (!conversation_id) {
      setShowConversationSelector(true);
    } else {
      // Mark messages as read
      if (unread_count > 0) {
        setUnreadCount(0);
        
        // Mark via WebSocket (since PATCH endpoint missing)
        messages.forEach(msg => {
          if (!msg.is_read && msg.sender_id !== currentUser?.user_id && websocketConnection) {
            websocketConnection.emit('mark_message_read', { message_id: msg.message_id });
          }
        });
      }
    }
    
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [conversation_id, messages, currentUser, unread_count, websocketConnection]);
  
  const handleCloseWidget = useCallback(() => {
    setIsWidgetOpen(false);
    setIsMinimized(false);
    setShowConversationSelector(false);
  }, []);
  
  const handleMinimizeWidget = useCallback(() => {
    setIsMinimized(true);
  }, []);
  
  const handleRestoreWidget = useCallback(() => {
    setIsMinimized(false);
    
    // Mark messages as read
    if (unread_count > 0) {
      setUnreadCount(0);
      messages.forEach(msg => {
        if (!msg.is_read && msg.sender_id !== currentUser?.user_id && websocketConnection) {
          websocketConnection.emit('mark_message_read', { message_id: msg.message_id });
        }
      });
    }
  }, [unread_count, messages, currentUser, websocketConnection]);
  
  const handleStartConversation = useCallback((type: 'customer_support' | 'customer_supplier') => {
    if (!isAuthenticated) {
      setLocalError('Please sign in to start a conversation');
      return;
    }
    
    startConversationMutation.mutate({
      conversation_type: type,
      // Include context if available (from URL params or page context)
      related_entity_type: undefined, // Can be enriched from page context
      related_entity_id: undefined
    });
  }, [isAuthenticated, startConversationMutation]);
  
  const handleSendMessage = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedMessage = current_message_input.trim();
    
    if (!trimmedMessage || !conversation_id) return;
    
    // Stop typing indicator
    if (websocketConnection && is_typing) {
      websocketConnection.emit('user_stopped_typing', { conversation_id });
      setIsTyping(false);
    }
    
    sendMessageMutation.mutate({
      message_text: trimmedMessage,
      attachments: undefined // File upload not implemented (missing endpoint)
    });
  }, [current_message_input, conversation_id, websocketConnection, is_typing, sendMessageMutation]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCurrentMessageInput(value);
    setLocalError(null);
    
    // Emit typing indicator (debounced)
    if (websocketConnection && conversation_id && value.trim()) {
      if (!is_typing) {
        setIsTyping(true);
        websocketConnection.emit('user_typing', { conversation_id });
      }
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 3s of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (websocketConnection) {
          websocketConnection.emit('user_stopped_typing', { conversation_id });
        }
      }, 3000);
    } else if (!value.trim() && is_typing) {
      // User cleared input, stop typing
      setIsTyping(false);
      if (websocketConnection) {
        websocketConnection.emit('user_stopped_typing', { conversation_id });
      }
    }
  }, [websocketConnection, conversation_id, is_typing]);
  
  const handleInputKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  const handleFileAttachment = useCallback(() => {
    // MISSING ENDPOINT: POST /api/chat/upload
    setLocalError('File upload feature coming soon');
  }, []);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Don't render widget if user not authenticated
  if (!isAuthenticated) {
    return null;
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      {/* Floating Chat Button */}
      {!is_widget_open && (
        <button
          onClick={handleOpenWidget}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-blue-100"
          aria-label="Open chat widget"
        >
          <MessageCircle className="w-7 h-7" />
          
          {/* Unread Badge */}
          {unread_count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
              {unread_count > 9 ? '9+' : unread_count}
            </span>
          )}
          
          {/* Pulse animation for new messages */}
          {unread_count > 0 && (
            <span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20"></span>
          )}
        </button>
      )}
      
      {/* Chat Window */}
      {is_widget_open && (
        <div className={`fixed z-50 shadow-2xl border border-gray-200 bg-white transition-all duration-300 ${
          is_minimized 
            ? 'bottom-6 right-6 w-80 h-14' 
            : 'bottom-6 right-6 w-full sm:w-96 h-[32rem] sm:h-[600px] max-h-[90vh]'
        } rounded-xl overflow-hidden flex flex-col sm:max-w-md`}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {agent_info ? (
                <>
                  {/* Agent Avatar */}
                  <div className="relative flex-shrink-0">
                    {agent_info.avatar_url ? (
                      <img 
                        src={agent_info.avatar_url} 
                        alt={agent_info.name}
                        className="w-10 h-10 rounded-full border-2 border-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    
                    {/* Status Indicator */}
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      agent_info.status === 'online' ? 'bg-green-500' : 
                      agent_info.status === 'away' ? 'bg-yellow-500' : 
                      'bg-gray-400'
                    }`}></span>
                  </div>
                  
                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{agent_info.name}</h3>
                    <p className="text-xs text-blue-100 truncate">
                      {agent_info.status === 'online' ? 'Online now' : 
                       agent_info.status === 'away' ? 'Away' : 
                       'Offline'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <MessageCircle className="w-8 h-8 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">Live Chat</h3>
                    <p className="text-xs text-blue-100">
                      {conversation_type === 'customer_support' ? 'Support Team' : 
                       conversation_type === 'customer_supplier' ? 'Supplier Chat' : 
                       'Chat Support'}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${
                  connection_status === 'connected' ? 'bg-green-400' : 
                  connection_status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                  'bg-red-400'
                }`}></span>
              </div>
              
              {/* Minimize Button */}
              {!is_minimized && (
                <button
                  onClick={handleMinimizeWidget}
                  className="p-1 hover:bg-blue-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Minimize chat"
                >
                  <Minus className="w-5 h-5" />
                </button>
              )}
              
              {/* Close Button */}
              <button
                onClick={handleCloseWidget}
                className="p-1 hover:bg-blue-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Minimized State - Click to Restore */}
          {is_minimized && (
            <button
              onClick={handleRestoreWidget}
              className="flex-1 flex items-center justify-between px-4 bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">Click to restore chat</span>
              {unread_count > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unread_count}
                </span>
              )}
            </button>
          )}
          
          {/* Chat Content - Only show when not minimized */}
          {!is_minimized && (
            <>
              {/* Conversation Selector (if no active conversation) */}
              {show_conversation_selector && !conversation_id && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
                  <MessageCircle className="w-16 h-16 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">How can we help?</h3>
                  <p className="text-sm text-gray-600 mb-6 text-center">Choose who you'd like to chat with</p>
                  
                  <div className="space-y-3 w-full">
                    <button
                      onClick={() => handleStartConversation('customer_support')}
                      disabled={startConversationMutation.isPending}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg text-left transition-all duration-200 group disabled:opacity-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Customer Support</p>
                          <p className="text-xs text-gray-500">Get help with your order or account</p>
                        </div>
                      </div>
                    </button>
                    
                    {currentUser?.user_type === 'customer' && (
                      <button
                        onClick={() => handleStartConversation('customer_supplier')}
                        disabled={startConversationMutation.isPending}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg text-left transition-all duration-200 group disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                            <MessageCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Contact Supplier</p>
                            <p className="text-xs text-gray-500">Ask about products or orders</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                  
                  {startConversationMutation.isPending && (
                    <p className="text-sm text-gray-500 mt-4">Starting conversation...</p>
                  )}
                </div>
              )}
              
              {/* Messages Area */}
              {conversation_id && (
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-gray-500 text-sm">No messages yet</p>
                      <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => {
                        const isOwnMessage = message.sender_id === currentUser?.user_id;
                        const showAvatar = !isOwnMessage;
                        
                        return (
                          <div
                            key={message.message_id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                          >
                            {/* Agent Avatar (left side) */}
                            {showAvatar && (
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">
                                {getInitials(message.sender_name)}
                              </div>
                            )}
                            
                            {/* Message Bubble */}
                            <div className={`max-w-[75%] ${isOwnMessage ? 'order-first' : ''}`}>
                              {/* Sender Name (for agent messages) */}
                              {!isOwnMessage && (
                                <p className="text-xs text-gray-500 mb-1 ml-1">{message.sender_name}</p>
                              )}
                              
                              {/* Message Content */}
                              <div className={`px-4 py-2 rounded-lg ${
                                isOwnMessage 
                                  ? 'bg-blue-600 text-white rounded-br-none' 
                                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                                
                                {/* Attachments */}
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((attachment, idx) => (
                                      <a
                                        key={idx}
                                        href={attachment}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center space-x-2 text-xs ${
                                          isOwnMessage ? 'text-blue-100' : 'text-blue-600'
                                        } hover:underline`}
                                      >
                                        <Paperclip className="w-3 h-3" />
                                        <span>Attachment {idx + 1}</span>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Timestamp & Read Status */}
                              <div className={`flex items-center space-x-2 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'} ml-1`}>
                                <p className="text-xs text-gray-400">{formatTimestamp(message.timestamp)}</p>
                                {isOwnMessage && message.is_read && (
                                  <span className="text-xs text-gray-400">✓✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Typing Indicator */}
                      {other_user_typing && (
                        <div className="flex items-end space-x-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-700">
                            {getInitials(other_user_typing.user_name)}
                          </div>
                          <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg rounded-bl-none">
                            <div className="flex space-x-1">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Scroll anchor */}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              )}
              
              {/* Error Message */}
              {localError && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                  <p className="text-xs text-red-700">{localError}</p>
                </div>
              )}
              
              {/* Connection Status Warning */}
              {connection_status === 'disconnected' && conversation_id && (
                <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
                  <p className="text-xs text-yellow-700">⚠️ Disconnected - Reconnecting...</p>
                </div>
              )}
              
              {/* Input Area */}
              {conversation_id && (
                <div className="border-t border-gray-200 bg-white p-4">
                  <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                    {/* File Attachment Button */}
                    <button
                      type="button"
                      onClick={handleFileAttachment}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Attach file"
                      title="Attach file (coming soon)"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    
                    {/* Text Input */}
                    <textarea
                      ref={inputRef}
                      value={current_message_input}
                      onChange={handleInputChange}
                      onKeyPress={handleInputKeyPress}
                      placeholder="Type your message..."
                      rows={1}
                      className="flex-1 resize-none px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-sm"
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                    />
                    
                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={!current_message_input.trim() || sendMessageMutation.isPending}
                      className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Send message"
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </form>
                  
                  {/* Character Count / Helper Text */}
                  <p className="text-xs text-gray-400 mt-2">Press Enter to send, Shift+Enter for new line</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default GV_ChatWidget;