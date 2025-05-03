
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { useFeatureAccess } from "@/hooks/use-feature-access";

interface FeatureStatusProps {
  name: string;
  included: boolean;
  limit?: number;
}

const FeatureStatus: React.FC<FeatureStatusProps> = ({ name, included, limit }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center">
        {included ? (
          <Check className="h-5 w-5 text-green-500 mr-2" />
        ) : (
          <X className="h-5 w-5 text-red-500 mr-2" />
        )}
        <span>{name}</span>
      </div>
      {limit !== undefined && included && (
        <span className="text-sm text-muted-foreground">
          {limit === 999 ? "Unlimited" : limit}
        </span>
      )}
    </div>
  );
};

const SubscriptionInfo: React.FC = () => {
  const { subscription } = useAuth();
  const { plans, cancelSubscription, manageBilling, isLoading } = useSubscription();
  const { checkAccess } = useFeatureAccess();

  // Find the current plan
  const currentPlan = subscription?.plan
    ? plans.find(p => p.name.toLowerCase() === subscription.plan.toLowerCase())
    : null;

  const renderExpiration = () => {
    if (!subscription?.currentPeriodEnd) return null;
    
    const endDate = new Date(subscription.currentPeriodEnd);
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Your subscription will {subscription.status === 'canceled' ? 'end' : 'renew'} on{" "}
        <time dateTime={endDate.toISOString()}>
          {endDate.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </time>
      </p>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Subscription</CardTitle>
        <CardDescription>
          Manage your current subscription plan and features
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscription?.subscribed ? (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{subscription.plan} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="capitalize">{subscription.status}</span>
                  </p>
                  {renderExpiration()}
                </div>
                {subscription.status === 'active' && (
                  <div className="px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                    Active
                  </div>
                )}
                {subscription.status === 'canceled' && (
                  <div className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                    Canceled
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Your features:</h4>
              <div className="space-y-1">
                {currentPlan && Object.entries(currentPlan.featureDetails).map(([key, feature]) => (
                  <FeatureStatus 
                    key={key} 
                    name={feature.name} 
                    included={feature.included}
                    limit={feature.limit}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="mb-4 text-muted-foreground">You don't have an active subscription.</p>
            <Button asChild>
              <a href="/pricing">Choose a Plan</a>
            </Button>
          </div>
        )}
      </CardContent>
      {subscription?.subscribed && (
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={manageBilling}
            disabled={isLoading}
          >
            Manage Billing
          </Button>
          {subscription.status === 'active' && (
            <Button 
              variant="destructive" 
              onClick={cancelSubscription}
              disabled={isLoading}
            >
              Cancel Subscription
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default SubscriptionInfo;
