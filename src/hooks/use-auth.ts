import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { storage } from '@/lib/storage';
import { SkolaUser, UserRole } from '@/types/skolacloud';

export type User = SkolaUser;

interface AuthState {
  user: SkolaUser | null;
  subdomain: string;
  savedSubdomain: string;
  savedEmail: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSubdomain: (subdomain: string) => void;
  verifyStep1: (subdomain: string, email: string) => Promise<boolean>;
  clearSavedStep1: () => Promise<void>;
  login: (email: string, pass: string, subdomain?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  subdomain: '',
  savedSubdomain: '',
  savedEmail: '',
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setSubdomain: (subdomain: string) => {
    set({ subdomain });
    storage.setSubdomain(subdomain);
  },

  clearError: () => set({ error: null }),

  verifyStep1: async (subdomain: string, email: string) => {
    set({ isLoading: true, error: null });
    try {
      const cleanSubdomain = subdomain.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanSubdomain) {
        throw new Error('Please enter your School Code / Subdomain.');
      }
      if (!cleanEmail) {
        throw new Error('Please enter your email address or username.');
      }

      // Verify School Subdomain & Account against API endpoint
      const response = await apiClient.post('/auth/verify-account', {
        subdomain: cleanSubdomain,
        email: cleanEmail,
      });

      if (response.data?.valid) {
        // Save permanently on device storage
        await storage.setSavedAccount(cleanSubdomain, cleanEmail);

        set({
          savedSubdomain: cleanSubdomain,
          savedEmail: cleanEmail,
          subdomain: cleanSubdomain,
          isLoading: false,
          error: null,
        });
        return true;
      }

      throw new Error('Verification failed. School or user record not found.');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'School Code or user verification failed.';
      set({ isLoading: false, error: errorMessage });
      return false;
    }
  },

  clearSavedStep1: async () => {
    await storage.clearSavedAccount();
    set({ savedSubdomain: '', savedEmail: '', error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const savedUser = await storage.getUser<SkolaUser>();
      const token = await storage.getAccessToken();
      const { subdomain: savedSubdomain, email: savedEmail } = await storage.getSavedAccount();

      set({
        savedSubdomain: savedSubdomain || '',
        savedEmail: savedEmail || '',
        subdomain: savedSubdomain || '',
      });

      if (token && savedUser) {
        // Fetch fresh profile from API
        try {
          const res = await apiClient.get('/auth/profile');
          if (res.data) {
            const updatedUser = res.data;
            await storage.setUser(updatedUser);
            set({ user: updatedUser, isAuthenticated: true, isLoading: false });
            return true;
          }
        } catch {
          // If offline or network error, fallback to savedUser
          set({ user: savedUser, isAuthenticated: true, isLoading: false });
          return true;
        }
      }
      
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  login: async (email: string, pass: string, subdomainInput?: string) => {
    set({ isLoading: true, error: null });
    try {
      const activeSubdomain = (subdomainInput || get().savedSubdomain || get().subdomain || '').trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      const response = await apiClient.post('/auth/login', {
        email: cleanEmail,
        password: pass,
        subdomain: activeSubdomain,
      });

      const { user, token, access_token, refreshToken } = response.data || {};
      const authToken = token || access_token;

      if (!user) {
        throw new Error('Invalid response from authentication server.');
      }

      await storage.setUser(user);
      if (authToken) {
        await storage.setAccessToken(authToken);
      }
      if (refreshToken) {
        await storage.setRefreshToken(refreshToken);
      }
      // Ensure permanent Stage 1 device storage is maintained on successful login
      await storage.setSavedAccount(activeSubdomain, cleanEmail);

      set({
        user,
        subdomain: activeSubdomain,
        savedSubdomain: activeSubdomain,
        savedEmail: cleanEmail,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to log in. Incorrect password or credentials.';
      set({ isLoading: false, error: errorMessage, isAuthenticated: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore API logout error
    } finally {
      // Fully clear active tokens AND saved Org ID & Email from device storage
      await storage.clearAuth();
      set({
        user: null,
        savedSubdomain: '',
        savedEmail: '',
        subdomain: '',
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },
}));

