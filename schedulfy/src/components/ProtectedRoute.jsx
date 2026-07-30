/* eslint-disable unused-imports/no-unused-imports, unused-imports/no-unused-vars */
import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const DefaultFallbackComponent = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const UserNotRegisteredError = () => (
  <div className="flex items-center justify-center h-full p-6">
    <div className="bg-card rounded-lg p-4 border border-border">
      <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
      <p className="text-sm text-muted-foreground">User not registered for this app.</p>
    </div>
  </div>
);

export default function ProtectedRoute({ 
  fallback = <DefaultFallbackComponent />,
  redirectTo = '/login'
}) {
  const { 
    isAuthenticated, 
    isLoadingAuth, 
    authChecked, 
    authError, 
    checkUserAuth 
  } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  // Still loading
  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  // Check for auth errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // Redirect to login on other auth errors
    return <Navigate to={redirectTo} replace />;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Authenticated - render child routes
  return <Outlet />;
}

