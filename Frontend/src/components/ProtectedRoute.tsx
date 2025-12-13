'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
  requiredPermissions,
  redirectTo = '/login',
}) => {
  const { user, loading, isAuthenticated, hasRole, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check authentication
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check roles
    if (allowedRoles && !hasRole(allowedRoles)) {
      router.push('/unauthorized');
      return;
    }

    // Check permissions
    if (requiredPermissions && !hasPermission(requiredPermissions)) {
      router.push('/unauthorized');
      return;
    }
  }, [
    loading,
    isAuthenticated,
    requireAuth,
    allowedRoles,
    requiredPermissions,
    hasRole,
    hasPermission,
    router,
    redirectTo,
  ]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slateDepth">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amberCommand border-t-transparent mx-auto mb-4" />
          <p className="text-textNeutral/60">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or authorized
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return null;
  }

  if (requiredPermissions && !hasPermission(requiredPermissions)) {
    return null;
  }

  return <>{children}</>;
};

// Role-specific protected route
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      {children}
    </ProtectedRoute>
  );
};

export const OperatorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'OPERATOR']}>
      {children}
    </ProtectedRoute>
  );
};

export const FieldOfficerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'OPERATOR', 'FIELD_OFFICER']}>
      {children}
    </ProtectedRoute>
  );
};