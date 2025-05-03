
import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useSubscription, Plan } from "@/context/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { Link } from "react-router-dom";

const Pricing: React.FC = () => {
  const { user, subscription } = useAuth();
  const { plans, subscribeToPlan, isLoading } = useSubscription();

  const handleSubscribe = (planId: string) => {
    subscribeToPlan(planId);
  };

  return (
    <MainLayout>
      <div className="container py-16 mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Choose Your Plan
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Select the plan that best fits your needs. All plans include access to our core features.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-[1200px] w-full mt-8">
            {plans.map((plan: Plan) => {
              const isCurrentPlan = subscription?.plan === plan.name;
              const isRecommended = plan.recommended;

              return (
                <Card key={plan.id} className={`flex flex-col ${isRecommended ? 'border-primary shadow-lg' : ''}`}>
                  {isRecommended && (
                    <div className="flex justify-center">
                      <div className="px-3 py-1 text-xs font-medium text-primary-foreground bg-primary -mt-2 rounded-md">
                        Recommended
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="flex items-baseline mt-4">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      <span className="ml-1 text-sm text-muted-foreground">/ month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {user ? (
                      isCurrentPlan ? (
                        <Button className="w-full" variant="outline" disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Subscribe to ${plan.name}`
                          )}
                        </Button>
                      )
                    ) : (
                      <Button className="w-full" asChild>
                        <Link to="/login?redirect=pricing">Login to Subscribe</Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 space-y-4">
            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
            <div className="grid gap-4 md:grid-cols-2 max-w-[900px]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Can I change plans later?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected at the beginning of your next billing cycle.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">How does billing work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    We bill monthly or yearly depending on your plan. You can cancel at any time and you'll retain access until the end of your billing period.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Do you offer a free trial?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    We offer a 14-day money-back guarantee. If you're not satisfied with our service, you can request a refund within 14 days of your purchase.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">How do I cancel my subscription?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    You can cancel your subscription at any time from your Billing page in the dashboard. Once cancelled, your plan will remain active until the end of your current billing period.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Pricing;
