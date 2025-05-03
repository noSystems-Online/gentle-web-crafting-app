
import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Types for our subscription plans
export type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  recommended?: boolean;
  interval: 'monthly' | 'yearly';
};

interface SubscriptionContextType {
  plans: Plan[];
  subscribeToPlan: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  manageBilling: () => Promise<void>;
  isLoading: boolean;
}

// Define our subscription plans
const subscriptionPlans: Plan[] = [
  {
    id: 'plan_basic_monthly',
    name: 'Basic',
    description: 'Essential features for small projects',
    price: 9.99,
    interval: 'monthly',
    features: ['Basic features', 'Email support', '1 project'],
  },
  {
    id: 'plan_pro_monthly',
    name: 'Pro',
    description: 'Perfect for growing businesses',
    price: 19.99,
    interval: 'monthly',
    recommended: true,
    features: ['All Basic features', 'Priority support', '5 projects', 'Advanced analytics'],
  },
  {
    id: 'plan_premium_monthly',
    name: 'Premium',
    description: 'For teams and enterprises',
    price: 49.99,
    interval: 'monthly',
    features: [
      'All Pro features',
      'Dedicated support',
      'Unlimited projects',
      'Custom integrations',
      'Team collaboration',
    ],
  },
];

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, checkSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
