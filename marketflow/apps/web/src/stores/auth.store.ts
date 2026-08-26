import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isMasterAdmin?: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, isMasterAdmin?: boolean) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      login: async (email: string, password: string, isMasterAdmin = false) => {
        try {
          const response = await api.post('/auth/login', {
            email,
            password,
            isMasterAdmin,
          });

          const { user, tenant, accessToken, refreshToken } = response.data.data;

          get().setTokens(accessToken, refreshToken);

          set({
            user,
            tenant,
            isAuthenticated: true,
          });
        } catch (error: any) {
          throw new Error(error.response?.data?.error?.message || 'Login failed');
        }
      },

      register: async (data: any) => {
        try {
          const response = await api.post('/auth/register', data);

          const { user, tenant, accessToken, refreshToken } = response.data.data;

          get().setTokens(accessToken, refreshToken);

          set({
            user,
            tenant,
            isAuthenticated: true,
          });
        } catch (error: any) {
          throw new Error(error.response?.data?.error?.message || 'Registration failed');
        }
      },

      logout: async () => {
        try {
          const refreshToken = get().refreshToken;
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            tenant: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          delete api.defaults.headers.common['Authorization'];
        }
      },

      checkAuth: async () => {
        const accessToken = get().accessToken;

        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          const response = await api.get('/auth/me');

          set({
            user: response.data.data.user,
            tenant: response.data.data.tenant,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Try refresh token
          const refreshToken = get().refreshToken;
          if (refreshToken) {
            try {
              const response = await api.post('/auth/refresh', { refreshToken });
              // Refresh tokens rotate on every use — the old one is invalidated
              // server-side, so we must persist the new one it returns.
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

              get().setTokens(newAccessToken, newRefreshToken);

              // Retry checkAuth
              await get().checkAuth();
              return;
            } catch (refreshError) {
              // Refresh failed, logout
              get().logout();
            }
          }

          set({
            user: null,
            tenant: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
