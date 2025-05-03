
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/context/AuthContext";

const Success: React.FC = () => {
  const { checkSubscription } = useAuth();

  useEffect(() => {
    // Refresh subscription status when the success page loads
    const updateSubscription = async () => {
      await checkSubscription();
    };
    updateSubscription();
  }, [checkSubscription]);

  return (
    <MainLayout>
      <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-144px)] py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Subscription Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you for subscribing to our service. Your subscription has been activated successfully.
            </p>
            <p className="font-medium">
              You now have access to all the features included in your plan.
            </p>
          </CardContent>
          <CardFooter className="flex-col space-y-4">
            <Button className="w-full" asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/billing">View Subscription Details</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Success;
