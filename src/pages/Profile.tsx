
import React from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { User, Settings, CreditCard } from "lucide-react";

const Profile: React.FC = () => {
  const { user, subscription } = useAuth();

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Profile</h2>
          <p className="text-muted-foreground">
            View and manage your profile information
          </p>
        </div>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>User Profile</CardTitle>
              <CardDescription>
                Your personal information and subscription details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl">
                      {user ? getInitials(user.email || "") : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline">Change Avatar</Button>
                </div>
                
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Account Information</h3>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p>{user?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Account ID</p>
                        <p className="text-sm font-mono">{user?.id?.substring(0, 12) + "..."}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Joined</p>
                        <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Last Sign In</p>
                        <p>{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium">Subscription</h3>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Plan</p>
                        <p>{subscription?.subscribed ? subscription.plan : "Free"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p>{subscription?.subscribed ? "Active" : "Inactive"}</p>
                      </div>
                      {subscription?.subscribed && (
                        <>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Renewal Date</p>
                            <p>{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "N/A"}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" asChild>
                      <Link to="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/billing">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
