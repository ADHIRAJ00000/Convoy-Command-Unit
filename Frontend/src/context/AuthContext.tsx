'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Types
export interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'OPERATOR' | 'FIELD_OFFICER';
  permissions: string[];
  rank?: string;
  unit?: string;
  active: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (roles: string | string[]) => boolean;
  hasPermission: (permissions: string | string[]) => boolean;
}

interface RegisterData {
  name: string;
  email: string;
  username: string;
  password: string;
  role?: string;
  rank?: string;
  unit?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Get access token from localStorage
  const getAccessToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  };

  // Set access token in localStorage
  const setAccessToken = (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  };

  // Remove access token from localStorage
  const removeAccessToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  };

  // Refresh access token (defined before fetchUser to avoid circular dependency)
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAccessToken(data.data.accessToken);
        
        // Fetch user with new token
        const token = data.data.accessToken;
        const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData.data);
        }
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      removeAccessToken();
      setUser(null);
      if (typeof window !== 'undefined') {
        router.push('/login');
      }
    }
  }, [router]);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else if (response.status === 401) {
        // Token expired, try to refresh
        await refreshToken();
      } else {
        // Other error, clear auth
        removeAccessToken();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      removeAccessToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: receives cookies
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store access token
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Register
  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store access token
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      const token = getAccessToken();
      
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeAccessToken();
      setUser(null);
      router.push('/login');
    }
  };

  // Check if user has specific role(s)
  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  // Check if user has specific permission(s)
  const hasPermission = (permissions: string | string[]): boolean => {
    if (!user) return false;
    const permArray = Array.isArray(permissions) ? permissions : [permissions];
    
    // Admin has all permissions
    if (user.permissions.includes('ADMIN')) return true;
    
    return permArray.every(perm => user.permissions.includes(perm));
  };

  // Initialize auth on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Setup token refresh interval (refresh before expiry)
  useEffect(() => {
    if (!user) return;

    // Refresh token every 14 minutes (access token expires in 15 minutes)
    const intervalId = setInterval(() => {
      refreshToken();
    }, 14 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, refreshToken]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshToken,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};