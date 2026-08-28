import axios from 'axios';
import { storage } from './storage';

// Formatter helper to ensure BASE_URL always ends with NestJS global prefix /api/v1
const formatBaseUrl = (rawUrl?: string): string => {
  let url = (rawUrl || '').trim();
  if (!url) return 'http://192.168.88.98:4000/api/v1';
  url = url.replace(/\/+$/, ''); // Strip trailing slashes
  if (!url.endsWith('/api/v1')) {
    if (url.endsWith('/api')) {
      url = `${url}/v1`;
    } else {
      url = `${url}/api/v1`;
    }
  }
  return url;
};

const BASE_URL = formatBaseUrl(process.env.EXPO_PUBLIC_API_URL);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
  },
  timeout: 15000,
});

// Request Interceptor to attach Access Token and Subdomain
apiClient.interceptors.request.use(
  async (config) => {
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    const token = await storage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const subdomain = await storage.getSubdomain();
    if (subdomain) {
      config.headers['x-tenant-subdomain'] = subdomain;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to auto-refresh token or handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await storage.getRefreshToken();
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          if (res.data?.access_token) {
            await storage.setAccessToken(res.data.access_token);
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        await storage.clearAuth();
      }
    }

    // Normalize raw server or route errors (e.g. 404 "Cannot POST ...", HTML errors, network failure)
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Extract server message if available and valid
      if (data?.message) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        if (
          typeof msg === 'string' &&
          !msg.startsWith('Cannot ') &&
          !msg.includes('<!DOCTYPE') &&
          !msg.includes('<html')
        ) {
          error.message = msg;
        }
      }

      // Handle raw string responses, HTML errors, or default Express/Nest 404/500 string messages
      if (
        typeof data === 'string' ||
        !data ||
        (typeof data?.message === 'string' &&
          (data.message.startsWith('Cannot ') ||
            data.message.includes('<!DOCTYPE') ||
            data.message.includes('<html')))
      ) {
        if (status === 404) {
          const msg = 'The requested service is currently unavailable. Please try again later.';
          error.response.data = { message: msg };
          error.message = msg;
        } else if (status >= 500) {
          const msg = 'Server is temporarily unavailable. Please try again shortly.';
          error.response.data = { message: msg };
          error.message = msg;
        } else {
          const msg = 'An unexpected request error occurred. Please try again.';
          error.response.data = { message: msg };
          error.message = msg;
        }
      }
    } else if (error.request && !error.response) {
      error.message = 'Unable to connect to the server. Please check your internet connection.';
    }

    return Promise.reject(error);
  }
);
