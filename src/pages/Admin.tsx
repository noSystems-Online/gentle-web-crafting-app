
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Plus, Pencil, Trash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plan, useSubscription } from "@/context/SubscriptionContext";

// Mock data for subscribers
const mockSubscribers = [
  {
    id: "1",
    email: "user1@example.com",
    plan: "Basic",
    status: "active",
    joined: "2023-01-15",
    nextBilling: "2023-02-15",
  },
  {
    id: "2",
    email: "user2@example.com",
    plan: "Pro",
    status: "active",
    joined: "2023-02-20",
    nextBilling: "2023-03-20",
  },
  {
    id: "3",
    email: "user3@example.com",
    plan: "Premium",
    status: "inactive",
    joined: "2023-03-05",
    nextBilling: null,
  },
  {
    id: "4",
    email: "user4@example.com",
    plan: "Basic",
    status: "active",
    joined: "2023-03-10",
    nextBilling: "2023-04-10",
  },
  {
    id: "5",
    email: "user5@example.com",
    plan: "Pro",
    status: "pending",
    joined: "2023-03-15",
    nextBilling: "2023-04-15",
  },
];

type PlanFormData = {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: "monthly" | "yearly";
  features: string[];
};

const Admin: React.FC = () => {
  const { supabase } = useAuth();
  const { plans } = useSubscription();
  
  const [subscribers, setSubscribers] = useState(mockSubscribers);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanFormData | null>(null);
  const [managedPlans, setManagedPlans] = useState<Plan[]>(plans);

  // In a real app, fetch subscribers from Supabase
  useEffect(() => {
    const fetchSubscribers = async () => {
      setLoading(true);
      try {
        // This would be a real Supabase query in production
        // const { data, error } = await supabase
        //   .from('subscriptions')
        //   .select('*, profiles(email)')
        //   .order('created_at', { ascending: false });
        
        // if (error) throw error;
        // setSubscribers(data);
        
        // For demo, we'll just use mock data
        setSubscribers(mockSubscribers);
      } catch (error) {
        console.error('Error fetching subscribers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscribers();
  }, []);

  const filteredSubscribers = subscribers.filter(
    (subscriber) =>
      subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscriber.plan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAddPlan = () => {
    setCurrentPlan({
      id: `plan_${Date.now()}`,
      name: "",
      description: "",
      price: 0,
      interval: "monthly",
      features: [""],
    });
    setPlanDialogOpen(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setCurrentPlan({
      ...plan,
      features: [...plan.features],
    });
    setPlanDialogOpen(true);
  };

  const handleDeletePlan = (planId: string) => {
    setManagedPlans(managedPlans.filter((p) => p.id !== planId));
  };

  const handleSavePlan = (plan: PlanFormData) => {
    if (managedPlans.some((p) => p.id === plan.id)) {
      setManagedPlans(
        managedPlans.map((p) => (p.id === plan.id ? { ...plan } as Plan : p))
      );
    } else {
      setManagedPlans([...managedPlans, plan as Plan]);
    }
    setPlanDialogOpen(false);
  };

  const handleAddFeature = () => {
    if (currentPlan) {
      setCurrentPlan({
        ...currentPlan,
        features: [...currentPlan.features, ""],
      });
    }
  };

  const handleUpdateFeature = (index: number, value: string) => {
    if (currentPlan) {
      const newFeatures = [...currentPlan.features];
      newFeatures[index] = value;
      setCurrentPlan({
        ...currentPlan,
        features: newFeatures,
      });
    }
  };

  const handleRemoveFeature = (index: number) => {
    if (currentPlan) {
      const newFeatures = [...currentPlan.features];
      newFeatures.splice(index, 1);
      setCurrentPlan({
        ...currentPlan,
        features: newFeatures,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Manage subscribers and subscription plans
          </p>
        </div>

        <Tabs defaultValue="subscribers">
          <TabsList className="mb-4">
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subscribers">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Active Subscribers</CardTitle>
                    <CardDescription>
                      Manage your platform subscribers and their subscriptions
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search subscribers..."
                      className="pl-8 w-full md:w-[250px]"
                      value={searchQuery}
                      onChange={handleSearch}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Next Billing</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubscribers.length > 0 ? (
                          filteredSubscribers.map((subscriber) => (
                            <TableRow key={subscriber.id}>
                              <TableCell className="font-medium">{subscriber.email}</TableCell>
                              <TableCell>{subscriber.plan}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    subscriber.status === "active"
                                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-50"
                                      : subscriber.status === "pending"
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50"
                                  }
                                >
                                  {subscriber.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(subscriber.joined).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                {subscriber.nextBilling
                                  ? new Date(subscriber.nextBilling).toLocaleDateString()
                                  : "N/A"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">
                              No subscribers found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Subscription Plans</CardTitle>
                    <CardDescription>
                      Manage the subscription plans offered to your customers
                    </CardDescription>
                  </div>
                  <Button onClick={handleAddPlan}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Interval</TableHead>
                        <TableHead>Features</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managedPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell>{plan.description}</TableCell>
                          <TableCell>${plan.price.toFixed(2)}</TableCell>
                          <TableCell>{plan.interval}</TableCell>
                          <TableCell>{plan.features.length} features</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditPlan(plan)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeletePlan(plan.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {currentPlan && currentPlan.name ? `Edit ${currentPlan.name}` : "Add Plan"}
            </DialogTitle>
            <DialogDescription>
              Create or update subscription plan details
            </DialogDescription>
          </DialogHeader>
          {currentPlan && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={currentPlan.name}
                  onChange={(e) => setCurrentPlan({ ...currentPlan, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={currentPlan.description}
                  onChange={(e) =>
                    setCurrentPlan({ ...currentPlan, description: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={currentPlan.price}
                  onChange={(e) =>
                    setCurrentPlan({
                      ...currentPlan,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="interval" className="text-right">
                  Interval
                </Label>
                <select
                  id="interval"
                  value={currentPlan.interval}
                  onChange={(e) =>
                    setCurrentPlan({
                      ...currentPlan,
                      interval: e.target.value as "monthly" | "yearly",
                    })
                  }
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Label className="text-right pt-2">Features</Label>
                <div className="col-span-3 space-y-2">
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => handleUpdateFeature(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFeature(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleAddFeature}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPlanDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => currentPlan && handleSavePlan(currentPlan)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Admin;
