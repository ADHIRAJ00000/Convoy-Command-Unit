// Authentication Service for HawkRoute
// Handles login, registration, logout, and profile management

import client, { handleApiError } from '../client';
import { AUTH_ENDPOINTS } from '../endpoints';
import {
  setAccessToken,
  setRefreshToken,
  setUser,
  clearTokens,
} from '../tokenManager';
import type {
  LoginDTO,
  RegisterDTO,
  AuthResponse,
  User,
  ApiResponse,
} from '../types';

// ============================================
// AUTHENTICATION SERVICE
// ============================================

export const authService = {
  /**
   * Register a new user
   */
  register: async (payload: RegisterDTO): Promise<AuthResponse> => {
    try {
      const response = await client.post<AuthResponse>(
        AUTH_ENDPOINTS.REGISTER,
        payload
      );
      
      // Store tokens and user data
      const { accessToken, refreshToken, user } = response.data.data;
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(user);
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Login user
   */
  login: async (payload: LoginDTO): Promise<AuthResponse> => {
    try {
      const response = await client.post<AuthResponse>(
        AUTH_ENDPOINTS.LOGIN,
        payload
      );
      
      // Store tokens and user data
      const { accessToken, refreshToken, user } = response.data.data;
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      setUser(user);
      
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      await client.post(AUTH_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  /**
   * Get current user profile
   */
  me: async (): Promise<User> => {
    try {
      const response = await client.get<ApiResponse<User>>(AUTH_ENDPOINTS.ME);
      return response.data.data!;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (payload: Partial<User>): Promise<User> => {
    try {
      const response = await client.put<ApiResponse<User>>(
        AUTH_ENDPOINTS.UPDATE_PROFILE,
        payload
      );
      
      // Update stored user data
      const updatedUser = response.data.data!;
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<string> => {
    try {
      const response = await client.post(AUTH_ENDPOINTS.REFRESH_TOKEN, {
        refreshToken,
      });
      
      const { accessToken } = response.data.data;
      setAccessToken(accessToken);
      
      return accessToken;
    } catch (error) {
      clearTokens();
      throw new Error(handleApiError(error));
    }
  },
};

export default authService;
