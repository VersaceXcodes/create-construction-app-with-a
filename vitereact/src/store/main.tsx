import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// User Types from backend schemas
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

// Cart Types
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
}

// Notification Types
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

// State Interfaces
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

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AppStore {
  // State
  authentication_state: AuthenticationState;
  cart_state: CartState;
  notification_state: NotificationState;
  search_state: SearchState;
  chat_state: ChatState;
  ui_state: UIState;
  websocket_connection: Socket | null;

  // Authentication Actions
  login_user: (email: string, password: string) => Promise<void>;
  logout_user: () => Promise<void>;
  register_customer: (data: any) => Promise<void>;
  register_supplier: (data: any) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;

  // Cart Actions
  fetch_cart: () => Promise<void>;
  add_to_cart: (product_id: string, quantity: number) => Promise<void>;
  update_cart_item: (cart_item_id: string, quantity: number) => Promise<void>;
  remove_from_cart: (cart_item_id: string) => Promise<void>;
  clear_cart: () => Promise<void>;

  // Notification Actions
  fetch_notifications: () => Promise<void>;
  mark_notification_read: (notification_id: string) => Promise<void>;
  mark_all_notifications_read: () => Promise<void>;

  // Search Actions
  set_search_query: (query: string) => void;
  add_to_recent_searches: (query: string) => void;
  add_to_comparison: (product_id: string) => void;
  remove_from_comparison: (product_id: string) => void;
  clear_comparison: () => void;

  // UI Actions
  toggle_sidebar: () => void;
  open_modal: (modal_name: string) => void;
  close_modal: () => void;
  set_loading_state: (key: string, value: boolean) => void;

  // WebSocket Actions
  connect_websocket: () => void;
  disconnect_websocket: () => void;
  subscribe_to_channel: (channel: string, handler: (data: any) => void) => void;
  unsubscribe_from_channel: (channel: string) => void;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

The store implementation will:

1. **Use Zustand's create() with persist middleware** for auth and cart state
2. **Initialize WebSocket connection** when user authenticates
3. **Handle JWT token in axios headers** for authenticated requests
4. **Subscribe to real-time events** based on user type and active sessions
5. **Provide clean state getters/setters** for all global variables
6. **Persist critical data** (auth, cart, searches) to localStorage
7. **Auto-reconnect WebSocket** on connection loss
8. **Match exact backend field names** using snake_case throughout

The store will NOT:
- Make view-specific API calls (those are handled by components)
- Include business logic beyond state management
- Persist temporary UI states like loading indicators
- Include hard-coded API URLs (will use VITE_API_BASE_URL env variable)