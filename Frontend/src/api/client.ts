// Core API Client for HawkRoute
// Axios instance with request/response interceptors and automatic token refresh

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
  isTokenExpired,
} from './tokenManager';
import { getBaseURL } from './endpoints';

// ============================================
// CREATE AXIOS INSTANCE
// ============================================

const client: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

client.interceptors.request.use(
  (config: any) => {
    const token = getAccessToken();
    
    // Inject access token into Authorization header
    if (token && !config._retry) {
      config.headers.Authorization = `Bearer `;
    }

    // Add API key if configured
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

client.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return successful response
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer `;
            return client(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const response = await axios.post(
          `/auth/refresh-token`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { accessToken } = response.data.data;
        setAccessToken(accessToken);
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer `;
        
        // Process queued requests
        processQueue(null, accessToken);
        isRefreshing = false;

        // Retry the original request
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearTokens();
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

// ============================================
// HELPER METHODS
// ============================================

export const handleApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error
      return error.response.data?.message || error.response.statusText || 'An error occurred';
    } else if (error.request) {
      // Request made but no response
      return 'Network error. Please check your connection.';
    }
  }
  return error.message || 'An unexpected error occurred';
};

export const isNetworkError = (error: any): boolean => {
  return axios.isAxiosError(error) && !error.response;
};

// ============================================
// EXPORT CLIENT
// ============================================

export default client;
