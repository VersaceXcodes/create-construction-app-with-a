import { create } from 'zustand';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface AuthenticationStatus {
  is_authenticated: boolean;
  is_loading: boolean;
}

interface AuthenticationState {
  auth_token: string | null;
  authentication_status: AuthenticationStatus;
  error_message: string | null;
}

interface AppState {
  authentication_state: AuthenticationState;
  current_workspace: string | null;
}

interface AppActions {
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set) => ({
  authentication_state: {
    auth_token: null,
    authentication_status: {
      is_authenticated: false,
      is_loading: false,
    },
    error_message: null,
  },
  current_workspace: null,

  register: async (email: string, password: string, name: string) => {
    set((state) => ({
      authentication_state: {
        ...state.authentication_state,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();

      set({
        authentication_state: {
          auth_token: data.token,
          authentication_status: {
            is_authenticated: true,
            is_loading: false,
          },
          error_message: null,
        },
        current_workspace: null,
      });
    } catch (error) {
      set((state) => ({
        authentication_state: {
          ...state.authentication_state,
          authentication_status: {
            is_authenticated: false,
            is_loading: false,
          },
          error_message: error instanceof Error ? error.message : 'Registration failed',
        },
      }));
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    set((state) => ({
      authentication_state: {
        ...state.authentication_state,
        authentication_status: {
          is_authenticated: false,
          is_loading: true,
        },
        error_message: null,
      },
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

      set({
        authentication_state: {
          auth_token: data.token,
          authentication_status: {
            is_authenticated: true,
            is_loading: false,
          },
          error_message: null,
        },
        current_workspace: null,
      });
    } catch (error) {
      set((state) => ({
        authentication_state: {
          ...state.authentication_state,
          authentication_status: {
            is_authenticated: false,
            is_loading: false,
          },
          error_message: error instanceof Error ? error.message : 'Login failed',
        },
      }));
      throw error;
    }
  },

  logout: () => {
    set({
      authentication_state: {
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: false,
        },
        error_message: null,
      },
      current_workspace: null,
    });
  },

  clearError: () => {
    set((state) => ({
      authentication_state: {
        ...state.authentication_state,
        error_message: null,
      },
    }));
  },
}));
