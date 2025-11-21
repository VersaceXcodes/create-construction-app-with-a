import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface User {
  user_id: string;
  email: string;
  user_type: 'customer' | 'supplier' | 'admin';
  first_name: string;
  last_name: string;
  phone_number: string;
  profile_photo_url: string | null;
  registration_date: string;
  last_login_date: string | null;
  status: string;
  email_verified: boolean;
}

interface Customer {
  customer_id: string;
  user_id: string;
  account_type: 'retail' | 'trade';
  default_delivery_address_id: string | null;
  trade_credit_limit: number;
  trade_credit_balance: number;
  trade_credit_used: number;
  trade_credit_terms: string | null;
  trade_credit_status: 'approved' | 'pending' | 'rejected' | 'suspended' | null;
  preferred_brands: string[];
  preferred_suppliers: string[];
  preferred_categories: string[];
  notification_preferences: Record<string, any>;
  onboarding_completed: boolean;
}

interface Supplier {
  supplier_id: string;
  user_id: string;
  business_name: string;
  business_registration_number: string;
  business_type: string;
  business_description: string;
  logo_url: string | null;
  verification_status: string;
  rating_average: number;
  total_reviews: number;
  total_sales: number;
  total_orders: number;
  fulfillment_rate: number;
  onboarding_completed: boolean;
}

interface Admin {
  admin_id: string;
  user_id: string;
  role: string;
  permissions: Record<string, any>;
}

interface CartItem {
  cart_item_id: string;
  cart_id: string;
  product_id: string;
  supplier_id: string;
  quantity: number;
  price_per_unit: number;
  added_date: string;
  product_name?: string;
  primary_image_url?: string;
  supplier_name?: string;
  stock_quantity?: number;
  product_status?: string;
}

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
}

interface AuthenticationState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: {
    is_authenticated: boolean;
    is_loading: boolean;
    user_type: string | null;
  };
  error_message: string | null;
  customer_profile: Customer | null;
  supplier_profile: Supplier | null;
  admin_profile: Admin | null;
}

interface CartState {
  items: CartItem[];
  total_items: number;
  subtotal: number;
  is_loading: boolean;
  last_updated: string | null;
}

interface NotificationState {
  unread_count: number;
  notifications: Notification[];
  is_loading: boolean;
}

interface SearchState {
  current_query: string | null;
  recent_searches: string[];
  active_filters: Record<string, any>;
  comparison_products: string[];
  is_loading: boolean;
}

interface ChatState {
  active_session_id: string | null;
  is_open: boolean;
  unread_messages: number;
  is_connected: boolean;
}

interface UIState {
  sidebar_collapsed: boolean;
  active_modal: string | null;
  loading_states: Record<string, boolean>;
}

interface AppStore {
  authentication_state: AuthenticationState;
  cart_state: CartState;
  notification_state: NotificationState;
  search_state: SearchState;
  chat_state: ChatState;
  ui_state: UIState;
  websocket_connection: Socket | null;

  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => Promise<void>;
  register_customer: (data: any) => Promise<void>;
  register_supplier: (data: any) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;

  fetch_cart: () => Promise<void>;
  add_to_cart: (product_id: string, quantity: number) => Promise<void>;
  update_cart_item: (cart_item_id: string, quantity: number) => Promise<void>;
  remove_from_cart: (cart_item_id: string) => Promise<void>;
  clear_cart: () => Promise<void>;

  fetch_notifications: () => Promise<void>;
  mark_notification_read: (notification_id: string) => Promise<void>;
  mark_all_notifications_read: () => Promise<void>;

  set_search_query: (query: string) => void;
  add_to_recent_searches: (query: string) => void;
  add_to_comparison: (product_id: string) => void;
  remove_from_comparison: (product_id: string) => void;
  clear_comparison: () => void;

  toggle_sidebar: () => void;
  open_modal: (modal_name: string) => void;
  close_modal: () => void;
  set_loading_state: (key: string, value: boolean) => void;

  connect_websocket: () => void;
  disconnect_websocket: () => void;
}

// ============================================================================
// API BASE URL
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ============================================================================
// AXIOS SETUP
// ============================================================================

// Set axios baseURL to include /api suffix for all API requests
axios.defaults.baseURL = `${API_BASE_URL}/api`;

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || 'An error occurred';
      
      if (status === 401) {
        // Unauthorized - clear auth state
        console.error('Authentication error - clearing session');
        // Will be handled by logout_user action
      } else if (status === 403) {
        console.error('Access forbidden:', message);
      } else if (status === 404) {
        console.error('Resource not found:', error.config?.url);
      } else if (status >= 500) {
        console.error('Server error:', message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - no response received');
    } else {
      // Error setting up the request
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // INITIAL STATE
      // ============================================================================

      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: false,
          user_type: null,
        },
        error_message: null,
        customer_profile: null,
        supplier_profile: null,
        admin_profile: null,
      },

      cart_state: {
        items: [],
        total_items: 0,
        subtotal: 0,
        is_loading: false,
        last_updated: null,
      },

      notification_state: {
        unread_count: 0,
        notifications: [],
        is_loading: false,
      },

      search_state: {
        current_query: null,
        recent_searches: [],
        active_filters: {},
        comparison_products: [],
        is_loading: false,
      },

      chat_state: {
        active_session_id: null,
        is_open: false,
        unread_messages: 0,
        is_connected: false,
      },

      ui_state: {
        sidebar_collapsed: false,
        active_modal: null,
        loading_states: {},
      },

      websocket_connection: null,

      // ============================================================================
      // AUTHENTICATION ACTIONS
      // ============================================================================

      login_user: async (email: string, password: string) => {
        set({
          authentication_state: {
            ...get().authentication_state,
            authentication_status: {
              ...get().authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        });

        try {
          const response = await axios.post('/auth/login', { email, password });
          const { token, user, customer, supplier, admin } = response.data;

          // Set token in axios defaults
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
                user_type: user.user_type,
              },
              error_message: null,
              customer_profile: customer || null,
              supplier_profile: supplier || null,
              admin_profile: admin || null,
            },
          });

          // Initialize websocket and fetch data
          get().connect_websocket();
          if (user.user_type === 'customer') {
            get().fetch_cart();
          }
          get().fetch_notifications();
        } catch (error: any) {
          set({
            authentication_state: {
              ...get().authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
                user_type: null,
              },
              error_message: error.response?.data?.message || 'Login failed',
            },
          });
          throw error;
        }
      },

      logout_user: async () => {
        const token = get().authentication_state.auth_token;
        
        try {
          if (token) {
            await axios.post('/auth/logout');
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear axios auth header
          delete axios.defaults.headers.common['Authorization'];
          
          // Disconnect websocket
          get().disconnect_websocket();

          // Reset all state
          set({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
                user_type: null,
              },
              error_message: null,
              customer_profile: null,
              supplier_profile: null,
              admin_profile: null,
            },
            cart_state: {
              items: [],
              total_items: 0,
              subtotal: 0,
              is_loading: false,
              last_updated: null,
            },
            notification_state: {
              unread_count: 0,
              notifications: [],
              is_loading: false,
            },
          });
        }
      },

      register_customer: async (data: any) => {
        set({
          authentication_state: {
            ...get().authentication_state,
            authentication_status: {
              ...get().authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        });

        try {
          const response = await axios.post('/auth/register/customer', data);
          const { token, user, customer } = response.data;

          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
                user_type: 'customer',
              },
              error_message: null,
              customer_profile: customer,
              supplier_profile: null,
              admin_profile: null,
            },
          });

          get().connect_websocket();
          get().fetch_cart();
        } catch (error: any) {
          set({
            authentication_state: {
              ...get().authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
                user_type: null,
              },
              error_message: error.response?.data?.message || 'Registration failed',
            },
          });
          throw error;
        }
      },

      register_supplier: async (data: any) => {
        set({
          authentication_state: {
            ...get().authentication_state,
            authentication_status: {
              ...get().authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        });

        try {
          await axios.post('/auth/register/supplier', data);
          
          set({
            authentication_state: {
              ...get().authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
                user_type: null,
              },
              error_message: null,
            },
          });
        } catch (error: any) {
          set({
            authentication_state: {
              ...get().authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
                user_type: null,
              },
              error_message: error.response?.data?.message || 'Registration failed',
            },
          });
          throw error;
        }
      },

      initialize_auth: async () => {
        const token = get().authentication_state.auth_token;
        
        if (!token) {
          set({
            authentication_state: {
              ...get().authentication_state,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
                user_type: null,
              },
            },
          });
          return;
        }

        set({
          authentication_state: {
            ...get().authentication_state,
            authentication_status: {
              ...get().authentication_state.authentication_status,
              is_loading: true,
            },
          },
        });

        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/users/me');
          
          // Fetch role-specific profile data
          let customer_profile = null;
          let supplier_profile = null;
          let admin_profile = null;
          
          if (response.data.user_type === 'customer') {
            try {
              const customerResponse = await axios.get('/customers/me');
              customer_profile = customerResponse.data;
            } catch (error) {
              console.error('Failed to fetch customer profile:', error);
              // Don't fail initialization if profile fetch fails
            }
          } else if (response.data.user_type === 'supplier') {
            try {
              const supplierResponse = await axios.get('/suppliers/me');
              supplier_profile = supplierResponse.data;
              console.log('Supplier profile loaded:', supplier_profile);
            } catch (error: any) {
              console.error('Failed to fetch supplier profile:', error);
              console.error('Error details:', error.response?.data);
              // Don't fail initialization if profile fetch fails - user can still access app
            }
          } else if (response.data.user_type === 'admin') {
            try {
              const adminResponse = await axios.get('/admins/me');
              admin_profile = adminResponse.data;
            } catch (error) {
              console.error('Failed to fetch admin profile:', error);
              // Don't fail initialization if profile fetch fails
            }
          }
          
          set({
            authentication_state: {
              ...get().authentication_state,
              current_user: response.data,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
                user_type: response.data.user_type,
              },
              customer_profile,
              supplier_profile,
              admin_profile,
            },
          });

          get().connect_websocket();
          if (response.data.user_type === 'customer') {
            get().fetch_cart();
          }
          get().fetch_notifications();
        } catch (error) {
          console.error('Initialize auth failed:', error);
          delete axios.defaults.headers.common['Authorization'];
          set({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
                user_type: null,
              },
              error_message: null,
              customer_profile: null,
              supplier_profile: null,
              admin_profile: null,
            },
          });
        }
      },

      clear_auth_error: () => {
        set({
          authentication_state: {
            ...get().authentication_state,
            error_message: null,
          },
        });
      },

      // ============================================================================
      // CART ACTIONS
      // ============================================================================

      fetch_cart: async () => {
        const { is_authenticated, user_type } = get().authentication_state.authentication_status;
        
        if (!is_authenticated || user_type !== 'customer') {
          return;
        }

        set({
          cart_state: {
            ...get().cart_state,
            is_loading: true,
          },
        });

        try {
          const response = await axios.get('/cart');
          const { items = [], subtotal = 0 } = response.data;

          set({
            cart_state: {
              items,
              total_items: items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
              subtotal,
              is_loading: false,
              last_updated: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('Fetch cart error:', error);
          set({
            cart_state: {
              ...get().cart_state,
              is_loading: false,
            },
          });
        }
      },

      add_to_cart: async (product_id: string, quantity: number) => {
        try {
          await axios.post('/cart/items', { product_id, quantity });
          await get().fetch_cart();
        } catch (error) {
          console.error('Add to cart error:', error);
          throw error;
        }
      },

      update_cart_item: async (cart_item_id: string, quantity: number) => {
        try {
          await axios.patch(`/api/cart/items/${cart_item_id}`, { quantity });
          await get().fetch_cart();
        } catch (error) {
          console.error('Update cart item error:', error);
          throw error;
        }
      },

      remove_from_cart: async (cart_item_id: string) => {
        try {
          await axios.delete(`/api/cart/items/${cart_item_id}`);
          await get().fetch_cart();
        } catch (error) {
          console.error('Remove from cart error:', error);
          throw error;
        }
      },

      clear_cart: async () => {
        try {
          await axios.delete('/cart');
          set({
            cart_state: {
              items: [],
              total_items: 0,
              subtotal: 0,
              is_loading: false,
              last_updated: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('Clear cart error:', error);
          throw error;
        }
      },

      // ============================================================================
      // NOTIFICATION ACTIONS
      // ============================================================================

      fetch_notifications: async () => {
        const { is_authenticated } = get().authentication_state.authentication_status;
        
        if (!is_authenticated) {
          return;
        }

        set({
          notification_state: {
            ...get().notification_state,
            is_loading: true,
          },
        });

        try {
          const response = await axios.get('/notifications', {
            params: { limit: 20, offset: 0 },
          });
          const { notifications = [], unread_count = 0 } = response.data;

          set({
            notification_state: {
              notifications,
              unread_count,
              is_loading: false,
            },
          });
        } catch (error) {
          console.error('Fetch notifications error:', error);
          set({
            notification_state: {
              ...get().notification_state,
              is_loading: false,
            },
          });
        }
      },

      mark_notification_read: async (notification_id: string) => {
        try {
          await axios.patch(`/api/notifications/${notification_id}/read`);
          await get().fetch_notifications();
        } catch (error) {
          console.error('Mark notification read error:', error);
        }
      },

      mark_all_notifications_read: async () => {
        try {
          await axios.post('/notifications/read-all');
          await get().fetch_notifications();
        } catch (error) {
          console.error('Mark all notifications read error:', error);
        }
      },

      // ============================================================================
      // SEARCH ACTIONS
      // ============================================================================

      set_search_query: (query: string) => {
        set({
          search_state: {
            ...get().search_state,
            current_query: query,
          },
        });
      },

      add_to_recent_searches: (query: string) => {
        const recent = get().search_state.recent_searches;
        const updated = [query, ...recent.filter(q => q !== query)].slice(0, 10);
        
        set({
          search_state: {
            ...get().search_state,
            recent_searches: updated,
          },
        });
      },

      add_to_comparison: (product_id: string) => {
        const current = get().search_state.comparison_products;
        if (current.length >= 5) return;
        if (current.includes(product_id)) return;

        set({
          search_state: {
            ...get().search_state,
            comparison_products: [...current, product_id],
          },
        });
      },

      remove_from_comparison: (product_id: string) => {
        set({
          search_state: {
            ...get().search_state,
            comparison_products: get().search_state.comparison_products.filter(id => id !== product_id),
          },
        });
      },

      clear_comparison: () => {
        set({
          search_state: {
            ...get().search_state,
            comparison_products: [],
          },
        });
      },

      // ============================================================================
      // UI ACTIONS
      // ============================================================================

      toggle_sidebar: () => {
        set({
          ui_state: {
            ...get().ui_state,
            sidebar_collapsed: !get().ui_state.sidebar_collapsed,
          },
        });
      },

      open_modal: (modal_name: string) => {
        set({
          ui_state: {
            ...get().ui_state,
            active_modal: modal_name,
          },
        });
      },

      close_modal: () => {
        set({
          ui_state: {
            ...get().ui_state,
            active_modal: null,
          },
        });
      },

      set_loading_state: (key: string, value: boolean) => {
        set({
          ui_state: {
            ...get().ui_state,
            loading_states: {
              ...get().ui_state.loading_states,
              [key]: value,
            },
          },
        });
      },

      // ============================================================================
      // WEBSOCKET ACTIONS
      // ============================================================================

      connect_websocket: () => {
        const token = get().authentication_state.auth_token;
        if (!token || get().websocket_connection) return;

        const socket = io(API_BASE_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          set({
            chat_state: {
              ...get().chat_state,
              is_connected: true,
            },
          });
        });

        socket.on('disconnect', () => {
          set({
            chat_state: {
              ...get().chat_state,
              is_connected: false,
            },
          });
        });

        // Listen for real-time events
        socket.on('order_status_changed', () => {
          // Trigger re-fetch in components
        });

        socket.on('inventory_update', () => {
          // Trigger re-fetch in components
        });

        socket.on('chat_message_received', () => {
          set({
            chat_state: {
              ...get().chat_state,
              unread_messages: get().chat_state.unread_messages + 1,
            },
          });
        });

        set({ websocket_connection: socket });
      },

      disconnect_websocket: () => {
        const socket = get().websocket_connection;
        if (socket) {
          socket.disconnect();
          set({
            websocket_connection: null,
            chat_state: {
              active_session_id: null,
              is_open: false,
              unread_messages: 0,
              is_connected: false,
            },
          });
        }
      },
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        authentication_state: {
          ...state.authentication_state,
          authentication_status: {
            ...state.authentication_state.authentication_status,
            is_loading: false,
          },
        },
        search_state: {
          ...state.search_state,
          is_loading: false,
        },
      }),
    }
  )
);
