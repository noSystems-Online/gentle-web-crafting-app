
import { useSubscription } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";

export function useFeatureAccess() {
  const { getFeatureAccess } = useSubscription();
  const { user } = useAuth();

  const checkAccess = (featureName: string) => {
    // No access if not logged in
    if (!user) return { hasAccess: false };
    
    const { access, limit } = getFeatureAccess(featureName);
    
    return { 
      hasAccess: access,
      limit,
      isAuthenticated: !!user
    };
  };

  // Helper for checking if user can create more of something based on their limit
  const checkLimit = (featureName: string, currentCount: number) => {
    const { hasAccess, limit } = checkAccess(featureName);
    
    if (!hasAccess) return false;
    if (limit === undefined) return true; // If no limit is defined, assume unlimited
    
    return currentCount < limit;
  };

  return {
    checkAccess,
    checkLimit
  };
}
