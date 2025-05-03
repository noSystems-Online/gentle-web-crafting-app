import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Types for our subscription plans
export type Feature = {
  name: string;
  included: boolean;
  limit?: number;
};

export type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  featureDetails: Record<string, Feature>;
  recommended?: boolean;
  interval: 'monthly' | 'yearly';
  colorAccent?: string;
};

interface SubscriptionContextType {
  plans: Plan[];
  subscribeToPlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  manageBilling: () => Promise<void>;
  isLoading: boolean;
  getFeatureAccess: (featureName: string) => { access: boolean; limit?: number };
}

// Define our subscription plans
const subscriptionPlans: Plan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    description: 'Basic invitations for small events',
    price: 0,
    interval: 'monthly',
    features: [
      'Up to 5 guests per invitation',
      'Basic templates',
      'Email invitations',
      'RSVP tracking',
      'Basic design editor'
    ],
    featureDetails: {
      'invitations': { name: 'Invitations', included: true, limit: 5 },
      'guests': { name: 'Guests per invitation', included: true, limit: 5 },
      'analytics': { name: 'Basic analytics', included: true },
      'templates': { name: 'Basic templates', included: true },
      'premiumTemplates': { name: 'Premium templates', included: false },
      'qrCodes': { name: 'QR code inserts', included: false },
      'customization': { name: 'Advanced customization', included: false },
    }
  },
  {
    id: 'plan_pro_monthly',
    name: 'Pro',
    description: 'Professional invitations for any event',
    price: 9.99,
    interval: 'monthly',
    recommended: true,
    colorAccent: 'bg-blue-500',
    features: [
      'Unlimited guests per invitation', 
      'All templates including premium', 
      'QR code generation', 
      'Advanced design options',
      'Priority support',
      'Custom branding'
    ],
    featureDetails: {
      'invitations': { name: 'Invitations', included: true, limit: 999 },
      'guests': { name: 'Guests per invitation', included: true, limit: 999 },
      'analytics': { name: 'Advanced analytics', included: true },
      'templates': { name: 'Basic templates', included: true },
      'premiumTemplates': { name: 'Premium templates', included: true },
      'qrCodes': { name: 'QR code inserts', included: true },
      'customization': { name: 'Advanced customization', included: true },
    }
  },
  {
    id: 'plan_pro_yearly',
    name: 'Pro',
    description: 'Professional invitations for any event',
    price: 99.99,
    interval: 'yearly',
    colorAccent: 'bg-blue-500',
    features: [
      'Unlimited guests per invitation', 
      'All templates including premium', 
      'QR code generation', 
      'Advanced design options',
      'Priority support',
      'Custom branding',
      'Save 16% vs monthly'
    ],
    featureDetails: {
      'invitations': { name: 'Invitations', included: true, limit: 999 },
      'guests': { name: 'Guests per invitation', included: true, limit: 999 },
      'analytics': { name: 'Advanced analytics', included: true },
      'templates': { name: 'Basic templates', included: true },
      'premiumTemplates': { name: 'Premium templates', included: true },
      'qrCodes': { name: 'QR code inserts', included: true },
      'customization': { name: 'Advanced customization', included: true },
    }
  },
];

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, checkSubscription, subscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get current feature access based on subscription
  const getFeatureAccess = (featureName: string) => {
    // Default for free tier or no subscription
    const defaultAccess = { access: false };
    
    if (!subscription?.plan) return defaultAccess;
    
    // Find the plan
    const currentPlan = subscriptionPlans.find(p => 
      p.name.toLowerCase() === subscription.plan.toLowerCase()
    );
    
    if (!currentPlan) return defaultAccess;
    
    const feature = currentPlan.featureDetails[featureName];
    if (!feature) return defaultAccess;
    
    return { 
      access: feature.included, 
      limit: feature.limit 
    };
  };

  // Function to handle subscribing to a plan
  const subscribeToPlan = async (planId: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please login to subscribe to a plan',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    setIsLoading(true);

    try {
      // Create checkout session with PayPal
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Redirect to PayPal checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Subscription failed',
        description: error.message || 'Failed to start subscription process',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to cancel a subscription
  const cancelSubscription = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {});

      if (error) {
        throw new Error(error.message);
      }

      // Refresh subscription status
      await checkSubscription();

      toast({
        title: 'Subscription cancelled',
        description: 'Your subscription has been cancelled',
      });
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Cancellation failed',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manage billing (PayPal portal link)
  const manageBilling = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-portal', {});

      if (error) {
        throw new Error(error.message);
      }

      // Redirect to PayPal portal
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Error accessing billing portal:', error);
      toast({
        title: 'Access failed',
        description: error.message || 'Failed to access billing portal',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        plans: subscriptionPlans,
        subscribeToPlan,
        cancelSubscription,
        manageBilling,
        isLoading,
        getFeatureAccess,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
