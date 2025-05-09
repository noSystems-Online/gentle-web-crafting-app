import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Plus, Send, Trash2, X, User, Mail, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Guest {
  id: string;
  name: string;
  email: string;
  invitation_id: string;
  rsvp_status?: string;
  rsvp_updated_at?: string;
  rsvp_message?: string;
  sent_at?: string;
}

interface GuestListProps {
  invitationId: string | null;
  canAddMore: boolean;
  fabricCanvas: fabric.Canvas | null;
}

const GuestList: React.FC<GuestListProps> = ({ invitationId, canAddMore, fabricCanvas }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestEmail, setNewGuestEmail] = useState("");
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [isDeletingGuest, setIsDeletingGuest] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [showAddGuestDialog, setShowAddGuestDialog] = useState(false);
  const [showSendProgress, setShowSendProgress] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendComplete, setSendComplete] = useState(false);

  useEffect(() => {
    if (invitationId) {
      fetchGuests();
    }
  }, [invitationId]);

  const fetchGuests = async () => {
    if (!invitationId) return;

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_id', invitationId);

      if (error) throw error;

      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast({
        title: "Error",
        description: "Failed to load guests. Please try again.",
        variant: "destructive"
      });
    }
  };

  const addGuest = async () => {
    if (!invitationId || !newGuestName || !newGuestEmail) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and email for the guest.",
        variant: "destructive"
      });
      return;
    }

    setIsAddingGuest(true);

    try {
      const { data, error } = await supabase
        .from('guests')
        .insert([{
          invitation_id: invitationId,
          name: newGuestName,
          email: newGuestEmail,
        }]);

      if (error) throw error;

      setNewGuestName("");
      setNewGuestEmail("");
      fetchGuests();
      toast({
        title: "Guest Added",
        description: `${newGuestName} has been added to the guest list.`,
      });
      // Don't close the modal so user can add more guests
    } catch (error) {
      console.error('Error adding guest:', error);
      toast({
        title: "Error",
        description: "Failed to add guest. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingGuest(false);
    }
  };

  const confirmDeleteGuest = (guestId: string) => {
    setGuestToDelete(guestId);
  };

  const cancelDeleteGuest = () => {
    setGuestToDelete(null);
  };

  const deleteGuest = async () => {
    if (!invitationId || !guestToDelete) return;

    setIsDeletingGuest(true);

    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestToDelete);

      if (error) throw error;

      setGuestToDelete(null);
      fetchGuests();
      toast({
        title: "Guest Deleted",
        description: "Guest has been removed from the invitation.",
      });
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast({
        title: "Error",
        description: "Failed to delete guest. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingGuest(false);
    }
  };

  // When invitations are sent, we need to send the canvas image as well
  const sendInvitations = async () => {
    if (!fabricCanvas || !invitationId) {
      toast({
        title: "Error",
        description: "Missing required data to send invitations.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSending(true);
      setShowSendProgress(true);
      setSendProgress(0);
      setSendComplete(false);
      
      // Generate an image of the current canvas
      const imageDataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.8,
      });
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSendProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return newProgress;
        });
      }, 200);
      
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-invitations', {
        body: {
          invitationId: invitationId,
          imageDataUrl: imageDataUrl // Send the canvas image as a data URL
        }
      });

      if (error) {
        clearInterval(progressInterval);
        console.error("Error response from server:", error);
        throw new Error(`Server error: ${error.message || error.status}`);
      }

      if (!data.success) {
        clearInterval(progressInterval);
        throw new Error(data.error || "There was a problem sending invitations.");
      } else {
        // Ensure progress reaches 100%
        setSendProgress(100);
        setSendComplete(true);
        
        setTimeout(() => {
          toast({
            title: "Invitations Sent",
            description: `Successfully sent ${data.results.sent} invitation(s).`,
          });
          
          // Refresh guest list to show updated status
          fetchGuests();
        }, 500);
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast({
        title: "Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive",
      });
      setShowSendProgress(false);
    } finally {
      setIsSending(false);
      
      if (sendComplete) {
        setTimeout(() => {
          setShowSendProgress(false);
        }, 1500);
      }
    }
  };

  // Add a new component to view RSVP responses
  const RSVPResponseList = ({ guests }) => {
    const [expandedGuest, setExpandedGuest] = useState(null);
    
    const getStatusBadge = (status) => {
      switch (status) {
        case 'attending':
          return <Badge className="bg-green-500">Attending</Badge>;
        case 'declined':
          return <Badge className="bg-red-500">Declined</Badge>;
        case 'maybe':
          return <Badge className="bg-amber-500">Maybe</Badge>;
        case 'sent':
          return <Badge className="bg-blue-500">Sent</Badge>;
        default:
          return <Badge className="bg-gray-500">No Response</Badge>;
      }
    };
    
    const respondedGuests = guests.filter(guest => guest.rsvp_status && guest.rsvp_status !== 'sent');
    
    if (respondedGuests.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          No RSVP responses yet
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {respondedGuests.map(guest => (
          <Card key={guest.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{guest.name}</CardTitle>
                  <CardDescription className="text-xs">{guest.email}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(guest.rsvp_status)}
                  {guest.rsvp_updated_at && (
                    <span className="text-xs text-gray-400">
                      {new Date(guest.rsvp_updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {guest.rsvp_message && (
              <CardContent className="pt-2">
                <div className="bg-gray-50 p-3 rounded-md text-sm">
                  "{guest.rsvp_message}"
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Guest List</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={sendInvitations}
            disabled={isSending || guests.length === 0}
          >
            {isSending ? (
              <>
                <Send className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invitations
              </>
            )}
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddGuestDialog(true)}
            disabled={!canAddMore}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Guest
          </Button>
          
          {!canAddMore && (
            <div className="text-sm text-red-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              You have reached the guest limit for your current plan.
            </div>
          )}
        </div>

        <Separator />

        {guests.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No guests added yet
          </div>
        ) : (
          <div className="space-y-3">
            {guests.map((guest) => (
              <Card key={guest.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{guest.name}</CardTitle>
                      <CardDescription className="text-xs">{guest.email}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDeleteGuest(guest.id)}
                      disabled={isDeletingGuest}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />
      
      <h3 className="text-lg font-semibold">RSVP Responses</h3>
      <RSVPResponseList guests={guests} />

      {/* Send Invitation Progress Dialog */}
      <Dialog open={showSendProgress} onOpenChange={(open) => {
        if (!isSending) setShowSendProgress(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sendComplete ? "Invitations Sent" : "Sending Invitations"}
            </DialogTitle>
            <DialogDescription>
              {sendComplete 
                ? "All invitations have been sent successfully." 
                : "Please wait while we send personalized invitations to your guests."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <Progress value={sendProgress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground mt-2">
              {sendComplete 
                ? "100% Complete" 
                : `${sendProgress}% Complete - Processing invitations...`}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              disabled={!sendComplete} 
              onClick={() => setShowSendProgress(false)}
              className="w-full"
            >
              {sendComplete ? "Close" : "Processing..."}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Guest Dialog */}
      <Dialog open={showAddGuestDialog} onOpenChange={setShowAddGuestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Guest</DialogTitle>
            <DialogDescription>
              Enter the guest details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Guest Name</Label>
              <Input
                id="name"
                placeholder="Enter guest name"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Guest Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter guest email"
                value={newGuestEmail}
                onChange={(e) => setNewGuestEmail(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGuestDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addGuest} 
              disabled={isAddingGuest || !newGuestName || !newGuestEmail}
            >
              {isAddingGuest ? (
                <>
                  <Plus className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Guest
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={guestToDelete !== null} onOpenChange={() => setGuestToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Guest</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this guest? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={cancelDeleteGuest} disabled={isDeletingGuest}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteGuest} disabled={isDeletingGuest}>
              {isDeletingGuest ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GuestList;
