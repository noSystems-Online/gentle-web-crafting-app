
import React from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import SubscriptionInfo from '@/components/SubscriptionInfo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Billing: React.FC = () => {
  const { subscription } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing</h2>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SubscriptionInfo />
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
                <CardDescription>
                  {subscription?.subscribed 
                    ? "Compare plans or upgrade to access more features" 
                    : "Choose a plan to get started"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start">
                <p className="mb-4 text-sm text-muted-foreground">
                  We offer three different plans to suit your needs - Basic, Pro, and Premium. Each plan includes different features and limits.
                </p>
                <Button asChild>
                  <Link to="/pricing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    View Plans
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage your payment methods
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start">
                <p className="mb-4 text-sm text-muted-foreground">
                  We securely process payments through PayPal. You can manage your payment methods and billing information directly through your PayPal account.
                </p>
                {subscription?.subscribed && (
                  <Button variant="outline" onClick={() => window.location.href = 'https://www.paypal.com/myaccount/'}>
                    Manage PayPal Account
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View your past invoices and payment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscription?.subscribed ? (
              <p className="text-sm text-muted-foreground">
                Your complete billing history is available in your PayPal account. Click the button below to access your payment history.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You don't have any billing history yet. Subscribe to a plan to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {!subscription?.subscribed && (
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 rounded-lg flex items-center justify-between">
            <div>
              <h3 className="text-xl font-medium">Get started with a subscription plan</h3>
              <p className="text-muted-foreground mt-1">
                Choose a plan that fits your needs and unlock premium features.
              </p>
            </div>
            <Button asChild>
              <Link to="/pricing">
                Browse Plans
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Billing;
