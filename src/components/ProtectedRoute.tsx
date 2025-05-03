
import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiresAuth?: boolean;
  requiresSubscription?: boolean;
  requiresAdmin?: boolean;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresAuth = true,
  requiresSubscription = false,
  requiresAdmin = false,
}) => {
  const { user, loading, subscription } = useAuth();
  const location = useLocation();

  // Check if the user is an admin
  const checkIsAdmin = async () => {
    // In a real app, you would check the user's role in your database
    // This is just a placeholder implementation
    return user?.email === "admin@example.com";
  };
  
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  
  useEffect(() => {
    if (user && requiresAdmin) {
      checkIsAdmin().then(setIsAdmin);
    }
  }, [user, requiresAdmin]);

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated but authentication is required
  if (requiresAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but access to this route is not allowed for authenticated users
  if (!requiresAuth && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Subscription is required but user doesn't have an active subscription
  if (requiresSubscription && (!subscription || !subscription.subscribed)) {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  // Admin access required but user is not an admin
  if (requiresAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
