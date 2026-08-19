import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'rimotehr_access_token';
const REFRESH_TOKEN_KEY = 'rimotehr_refresh_token';
const USER_KEY = 'rimotehr_user_data';
const SUBDOMAIN_KEY = 'rimotehr_subdomain';
const SAVED_SUBDOMAIN_KEY = 'rimotehr_saved_subdomain';
const SAVED_EMAIL_KEY = 'rimotehr_saved_email';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error('LocalStorage write error', e);
      }
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('LocalStorage delete error', e);
      }
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },

  // Token helper shortcuts
  async getAccessToken(): Promise<string | null> {
    return this.getItem(ACCESS_TOKEN_KEY);
  },
  async setAccessToken(token: string): Promise<void> {
    return this.setItem(ACCESS_TOKEN_KEY, token);
  },
  async deleteAccessToken(): Promise<void> {
    return this.deleteItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return this.getItem(REFRESH_TOKEN_KEY);
  },
  async setRefreshToken(token: string): Promise<void> {
    return this.setItem(REFRESH_TOKEN_KEY, token);
  },
  async deleteRefreshToken(): Promise<void> {
    return this.deleteItem(REFRESH_TOKEN_KEY);
  },

  async getSubdomain(): Promise<string | null> {
    return this.getItem(SUBDOMAIN_KEY);
  },
  async setSubdomain(subdomain: string): Promise<void> {
    return this.setItem(SUBDOMAIN_KEY, subdomain);
  },

  // Permanent Stage 1 Saved Account Credentials
  async getSavedAccount(): Promise<{ subdomain: string | null; email: string | null }> {
    const [subdomain, email] = await Promise.all([
      this.getItem(SAVED_SUBDOMAIN_KEY),
      this.getItem(SAVED_EMAIL_KEY),
    ]);
    return { subdomain, email };
  },

  async setSavedAccount(subdomain: string, email: string): Promise<void> {
    await Promise.all([
      this.setItem(SAVED_SUBDOMAIN_KEY, subdomain),
      this.setItem(SAVED_EMAIL_KEY, email),
      this.setSubdomain(subdomain),
    ]);
  },

  async clearSavedAccount(): Promise<void> {
    await Promise.all([
      this.deleteItem(SAVED_SUBDOMAIN_KEY),
      this.deleteItem(SAVED_EMAIL_KEY),
    ]);
  },

  async getUser<T>(): Promise<T | null> {
    const data = await this.getItem(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },
  async setUser<T>(user: T): Promise<void> {
    return this.setItem(USER_KEY, JSON.stringify(user));
  },
  async deleteUser(): Promise<void> {
    return this.deleteItem(USER_KEY);
  },

  async clearAuth(): Promise<void> {
    await Promise.all([
      this.deleteAccessToken(),
      this.deleteRefreshToken(),
      this.deleteUser(),
      this.clearSavedAccount(),
    ]);
  },
};
