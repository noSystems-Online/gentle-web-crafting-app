
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const Billing: React.FC = () => {
  const { subscription } = useAuth();
  const { plans, manageBilling, cancelSubscription, isLoading } = useSubscription();

  const currentPlan = plans.find(p => p.name === subscription?.plan);

  // Mock payment history
  const paymentHistory = [
    {
      id: "INV-001",
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: currentPlan?.price || 0,
      status: "Paid"
    },
    {
      id: "INV-002", 
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      amount: currentPlan?.price || 0, 
      status: "Paid"
    },
    {
      id: "INV-003",
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      amount: currentPlan?.price || 0,
      status: "Paid"
    }
  ];

  const handleManageBilling = async () => {
    await manageBilling();
  };

  const handleCancelSubscription = async () => {
    await cancelSubscription();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Billing</h2>
          <p className="text-muted-foreground">
            Manage your subscription and payment details
          </p>
        </div>

        <div className="grid gap-8">
          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>
                Your current plan and subscription details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {subscription?.subscribed ? (
                        <>
                          {subscription.plan}
                          <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                            Active
                          </Badge>
                        </>
                      ) : (
                        <>
                          Free Plan
                          <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-700 hover:bg-gray-50 border-gray-200">
                            No Subscription
                          </Badge>
                        </>
                      )}
                    </h3>
                    {subscription?.subscribed && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Your subscription renews on {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subscription?.subscribed ? (
                      <>
                        <Button variant="outline" onClick={handleManageBilling} disabled={isLoading}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Manage Payment Details
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleCancelSubscription}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                              Processing...
                            </>
                          ) : (
                            "Cancel Subscription"
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button asChild>
                        <Link to="/pricing">Upgrade Plan</Link>
                      </Button>
                    )}
                  </div>
                </div>

                {currentPlan && (
                  <div className="mt-6">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">
                      Your Plan Includes:
                    </h4>
                    <ul className="grid gap-2">
                      {currentPlan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <Check className="h-4 w-4 text-primary mr-2" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Your recent payments and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentHistory.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 text-sm font-medium text-muted-foreground">
                    <div>Invoice</div>
                    <div>Date</div>
                    <div>Amount</div>
                    <div>Status</div>
                  </div>
                  <Separator />
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="grid grid-cols-4 text-sm">
                      <div className="font-medium">{payment.id}</div>
                      <div>{formatDate(payment.date)}</div>
                      <div>${payment.amount.toFixed(2)}</div>
                      <div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No payment history available</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline">Download All Invoices</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Billing;
