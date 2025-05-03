
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
    id: 'plan_basic_monthly',
    name: 'Basic',
    description: 'Essential features for individuals',
    price: 9.99,
    interval: 'monthly',
    features: [
      '5 project workspaces',
      'Email support',
      '1 GB storage',
      'Core analytics',
      'Basic templates'
    ],
    featureDetails: {
      'projects': { name: 'Project workspaces', included: true, limit: 5 },
      'storage': { name: 'Storage space', included: true, limit: 1 },
      'analytics': { name: 'Analytics', included: true },
      'templates': { name: 'Templates', included: true },
      'apiAccess': { name: 'API Access', included: false },
      'customization': { name: 'Customization', included: false },
      'teamMembers': { name: 'Team members', included: false },
      'prioritySupport': { name: 'Priority support', included: false },
      'whiteLabel': { name: 'White labeling', included: false },
    }
  },
  {
    id: 'plan_pro_monthly',
    name: 'Pro',
    description: 'Perfect for growing businesses',
    price: 19.99,
    interval: 'monthly',
    recommended: true,
    colorAccent: 'bg-blue-500',
    features: [
      '15 project workspaces', 
      'Priority support', 
      '10 GB storage', 
      'Advanced analytics',
      'All templates',
      'API access',
      'Custom branding'
    ],
    featureDetails: {
      'projects': { name: 'Project workspaces', included: true, limit: 15 },
      'storage': { name: 'Storage space', included: true, limit: 10 },
      'analytics': { name: 'Analytics', included: true },
      'templates': { name: 'Templates', included: true },
      'apiAccess': { name: 'API Access', included: true },
      'customization': { name: 'Customization', included: true },
      'teamMembers': { name: 'Team members', included: true, limit: 3 },
      'prioritySupport': { name: 'Priority support', included: true },
      'whiteLabel': { name: 'White labeling', included: false },
    }
  },
  {
    id: 'plan_premium_monthly',
    name: 'Premium',
    description: 'For teams and enterprises',
    price: 49.99,
    interval: 'monthly',
    colorAccent: 'bg-purple-500',
    features: [
      'Unlimited projects',
      'Dedicated support',
      'Unlimited storage',
      'Enterprise analytics',
      'Custom templates',
      'Advanced API access',
      'White labeling',
      'Unlimited team members'
    ],
    featureDetails: {
      'projects': { name: 'Project workspaces', included: true, limit: 999 },
      'storage': { name: 'Storage space', included: true, limit: 999 },
      'analytics': { name: 'Analytics', included: true },
      'templates': { name: 'Templates', included: true },
      'apiAccess': { name: 'API Access', included: true },
      'customization': { name: 'Customization', included: true },
      'teamMembers': { name: 'Team members', included: true, limit: 999 },
      'prioritySupport': { name: 'Priority support', included: true },
      'whiteLabel': { name: 'White labeling', included: true },
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
