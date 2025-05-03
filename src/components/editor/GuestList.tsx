
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Plus, Trash } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Guest {
  id?: string;
  name: string;
  email: string;
  invitation_id: string;
  rsvp_status?: string | null;
}

interface GuestListProps {
  invitationId?: string;
  canAddMore: (currentCount: number) => boolean;
}

const GuestList: React.FC<GuestListProps> = ({
  invitationId,
  canAddMore
}) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [newGuest, setNewGuest] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load existing guests if invitation ID is provided
  useEffect(() => {
    if (invitationId) {
      fetchGuests();
    }
  }, [invitationId]);

  const fetchGuests = async () => {
    if (!invitationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_id', invitationId);

      if (error) throw error;

      setGuests(data || []);
    } catch (error) {
      console.error("Error fetching guests:", error);
      toast({
        title: "Failed to load guest list",
        description: "There was an error loading the guest list.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuest = async () => {
    if (!invitationId) {
      toast({
        title: "Save invitation first",
        description: "Please save your invitation before adding guests.",
        variant: "destructive",
      });
      return;
    }

    if (!newGuest.name || !newGuest.email) {
      toast({
        title: "Missing information",
        description: "Please provide both name and email for the guest.",
        variant: "destructive",
      });
      return;
    }

    if (!canAddMore(guests.length)) {
      toast({
        title: "Guest limit reached",
        description: "You've reached the maximum number of guests for your plan.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const guestData = {
        ...newGuest,
        invitation_id: invitationId
      };

      const { data, error } = await supabase
        .from('guests')
        .insert(guestData)
        .select();

      if (error) throw error;

      setGuests([...guests, data[0]]);
      setNewGuest({ name: '', email: '' });
      
      toast({
        title: "Guest added",
        description: `${newGuest.name} has been added to the guest list.`,
      });
    } catch (error) {
      console.error("Error adding guest:", error);
      toast({
        title: "Failed to add guest",
        description: "There was an error adding the guest.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGuest = async (guestId?: string) => {
    if (!guestId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      setGuests(guests.filter(guest => guest.id !== guestId));
      
      toast({
        title: "Guest removed",
        description: "The guest has been removed from the list.",
      });
    } catch (error) {
      console.error("Error removing guest:", error);
      toast({
        title: "Failed to remove guest",
        description: "There was an error removing the guest.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Guest List</h3>
      
      {!invitationId && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Save First</AlertTitle>
          <AlertDescription>
            Save your invitation before adding guests.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Current guest list */}
      <div className="space-y-2">
        {guests.length > 0 ? (
          guests.map((guest) => (
            <div key={guest.id} className="flex items-center justify-between p-2 border rounded-md">
              <div>
                <div className="font-medium">{guest.name}</div>
                <div className="text-xs text-muted-foreground">{guest.email}</div>
              </div>
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => handleRemoveGuest(guest.id)}
                disabled={loading}
                className="h-8 w-8 p-0 text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No guests added yet.</div>
        )}
      </div>
      
      {/* Add new guest form */}
      {canAddMore(guests.length) && invitationId ? (
        <div className="space-y-2 border-t pt-2">
          <div className="grid gap-2">
            <Label htmlFor="guest-name">Guest Name</Label>
            <Input
              id="guest-name"
              value={newGuest.name}
              onChange={(e) => setNewGuest({...newGuest, name: e.target.value})}
              placeholder="Enter guest name"
              disabled={loading || !invitationId || !user}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guest-email">Guest Email</Label>
            <Input
              id="guest-email"
              type="email"
              value={newGuest.email}
              onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
              placeholder="Enter guest email"
              disabled={loading || !invitationId || !user}
            />
          </div>
          <Button 
            onClick={handleAddGuest}
            disabled={loading || !invitationId || !user || !newGuest.name || !newGuest.email}
            className="w-full mt-2"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Guest
          </Button>
        </div>
      ) : (
        invitationId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Guest Limit Reached</AlertTitle>
            <AlertDescription>
              {user ? 'Upgrade to Pro for unlimited guests.' : 'Sign in to add more guests.'}
            </AlertDescription>
          </Alert>
        )
      )}
    </div>
  );
};

export default GuestList;
