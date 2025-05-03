
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

  // Check if user can create more invitations
  const canCreateInvitation = (currentCount: number) => {
    // Anonymous users can create up to 2 invitations per session
    if (!user) {
      return currentCount < 2;
    }
    
    // For authenticated users, check their subscription plan
    return checkLimit('invitations', currentCount);
  };

  // Check if user can add more guests to an invitation
  const canAddGuest = (currentGuestCount: number) => {
    // Anonymous users can add up to 2 guests
    if (!user) {
      return currentGuestCount < 2;
    }
    
    // For authenticated users, check their subscription plan
    return checkLimit('guests', currentGuestCount);
  };

  // Check if user can access premium templates
  const canAccessPremiumTemplate = () => {
    if (!user) return false;
    
    const { hasAccess } = checkAccess('premiumTemplates');
    return hasAccess;
  };

  // Check if user can insert QR codes in their invitations
  const canUseQrCodes = () => {
    if (!user) return false;
    
    const { hasAccess } = checkAccess('qrCodes');
    return hasAccess;
  };

  // Get the maximum number of guests allowed per invitation
  const getGuestLimit = () => {
    if (!user) return 2; // Anonymous users
    
    const { limit } = checkAccess('guests');
    return limit || 5; // Default to 5 if not specified (Free tier)
  };

  return {
    checkAccess,
    checkLimit,
    canCreateInvitation,
    canAddGuest,
    canAccessPremiumTemplate,
    canUseQrCodes,
    getGuestLimit
  };
}
