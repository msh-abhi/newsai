import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { useAuthStore } from '../../stores/authStore'; // Correct: Import the Zustand store
import { AlertTriangle } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isSupabaseConnected } = useAuth();
  const { currentOrganization, isOrgResolved } = useAuthStore();

  // Add debug logging to understand the state (only log when actually changed)
  const prevStateRef = React.useRef('');
  React.useEffect(() => {
    const stateKey = `${loading}_${user?.email}_${currentOrganization?.name}_${isSupabaseConnected}_${isOrgResolved}`;
    if (prevStateRef.current !== stateKey) {
      console.log('🛡️ ProtectedRoute: State check', {
        loading,
        user: user?.email,
        currentOrganization: currentOrganization?.name,
        isSupabaseConnected,
        isOrgResolved,
      });
      prevStateRef.current = stateKey;
    }
  }, [loading, user, currentOrganization, isSupabaseConnected, isOrgResolved]);

  // Show loading spinner while AuthProvider initializes the user and org data
  if (loading || !isOrgResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="text-gray-600 dark:text-gray-300 mt-4">
            {!isSupabaseConnected
              ? 'Checking database connection...'
              : !user
                ? 'Authenticating...'
                : 'Loading your organization...'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            If this takes too long, try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // Handle a user who has no organization after successful login.
  // This is the correct place to handle the "create new org" flow.
  if (user && !currentOrganization && isSupabaseConnected && !loading && isOrgResolved) {
    // This will allow the main app (e.g., Dashboard) to render a CreateOrganizationForm.
    console.log('🚪 ProtectedRoute: User found but no organization. Proceeding to org creation.');
    return <>{children}</>;
  }

  // If Supabase is not connected, show the connection prompt
  if (!isSupabaseConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        <Card className="max-w-md mx-auto text-center" padding="lg">
          <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Database Not Connected
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            To use this application, you need to connect to Supabase. Please ensure your `.env` file is configured and restart your development server.
          </p>
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Refresh Page
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If there is no authenticated user, redirect to the login page
  if (!user) {
    console.log('🚪 ProtectedRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ ProtectedRoute: User and organization found, rendering protected content.');
  // If the user is authenticated and has a current organization, render the protected content.
  return <>{children}</>;
};

export default ProtectedRoute;