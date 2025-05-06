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
  fabricCanvas: any;
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
      
      // Generate an image of the current canvas
      const imageDataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.8,
      });
      
      // Get the current session and authorization token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error("Authentication token not available");
      }
      
      // Get the Supabase URL from the client configuration
      const supabaseUrl = supabase.supabaseUrl;
      
      // Construct the full URL for the function
      const functionUrl = `${supabaseUrl}/functions/v1/send-invitations`;
      
      console.log("Sending invitations to:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId: invitationId,
          imageDataUrl: imageDataUrl
        }),
      });

      // Check if the response is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response from server:", errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        toast({
          title: "Error Sending Invitations",
          description: result.error || "There was a problem sending invitations.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitations Sent",
          description: `Successfully sent ${result.results.sent} invitation(s).`,
        });
        
        // Refresh guest list to show updated status
        fetchGuests();
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast({
        title: "Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
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
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Guest Name"
              value={newGuestName}
              onChange={(e) => setNewGuestName(e.target.value)}
              disabled={!canAddMore || isAddingGuest}
            />
            <Input
              type="email"
              placeholder="Guest Email"
              value={newGuestEmail}
              onChange={(e) => setNewGuestEmail(e.target.value)}
              disabled={!canAddMore || isAddingGuest}
            />
            <Button
              size="sm"
              onClick={addGuest}
              disabled={!canAddMore || isAddingGuest}
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
          </div>
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
