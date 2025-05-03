
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Plus, Mail, Trash2, UploadCloud, Lock, AlertCircle, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface GuestListProps {
  invitationId?: string;
  canAddMore: boolean;
  fabricCanvas?: fabric.Canvas | null;
}

interface Guest {
  id: string;
  name: string;
  email: string;
  rsvp_status?: string;
  created_at?: string;
  sent_at?: string;
  rsvp_message?: string;
  rsvp_updated_at?: string;
  invitation_id: string;
}

const GuestList: React.FC<GuestListProps> = ({ 
  invitationId,
  canAddMore,
  fabricCanvas
}) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentPreviewGuest, setCurrentPreviewGuest] = useState<Guest | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch guests
  useEffect(() => {
    if (invitationId && user) {
      fetchGuests();
    } else {
      setIsLoading(false);
    }
  }, [invitationId, user]);

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
        title: "Error loading guests",
        description: "There was a problem fetching the guest list.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGuest = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both name and email.",
        variant: "destructive"
      });
      return;
    }

    if (!invitationId || !user) {
      toast({
        title: "Login required",
        description: "You must be logged in and have a saved invitation to add guests.",
        variant: "destructive"
      });
      return;
    }

    if (!canAddMore) {
      toast({
        title: "Guest limit reached",
        description: "Upgrade to Pro to add more guests.",
        variant: "destructive"
      });
      return;
    }

    setIsAdding(true);

    try {
      // Note: We're not sending the user_id field as it doesn't exist in the database schema
      const { error } = await supabase
        .from('guests')
        .insert({
          name,
          email,
          invitation_id: invitationId,
          rsvp_status: 'pending'
        });
        
      if (error) throw error;
      
      toast({
        title: "Guest added",
        description: `${name} has been added to your guest list.`
      });
      
      setName("");
      setEmail("");
      setDialogOpen(false);
      fetchGuests();
    } catch (error) {
      console.error('Error adding guest:', error);
      toast({
        title: "Error adding guest",
        description: "There was a problem adding this guest.",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!invitationId || !user) return;
    
    try {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', id)
        .eq('invitation_id', invitationId);
        
      if (error) throw error;
      
      setGuests(guests.filter(guest => guest.id !== id));
      toast({
        title: "Guest removed",
        description: "The guest has been removed from your list."
      });
    } catch (error) {
      console.error('Error removing guest:', error);
      toast({
        title: "Error removing guest",
        description: "There was a problem removing this guest.",
        variant: "destructive"
      });
    }
  };

  const previewInvitation = (guest: Guest) => {
    setCurrentPreviewGuest(guest);
    setPreviewOpen(true);
    
    // Clone the canvas for the preview
    if (fabricCanvas) {
      setTimeout(() => {
        updatePreviewWithGuestName(guest.name);
      }, 100);
    }
  };
  
  const updatePreviewWithGuestName = (guestName: string) => {
    if (!fabricCanvas) return;

    // Find the canvas objects
    const canvasObjects = fabricCanvas.getObjects();
    
    // Look for text objects that contain "{guest_name}" placeholder
    const previewCanvas = fabricCanvas.clone();
    previewCanvas.getObjects().forEach((obj) => {
      if (obj.type === 'text' || obj.type === 'i-text') {
        const textObj = obj as fabric.Text;
        const originalText = textObj.text || '';
        
        // Replace the placeholder with the actual guest name
        if (originalText.includes('{guest_name}')) {
          textObj.set('text', originalText.replace('{guest_name}', guestName));
          previewCanvas.renderAll();
        }
      }
    });
  };

  const sendInvites = () => {
    if (!invitationId || !user || !guests.length) return;
    
    // In a real app, this would call a serverless function to send emails with personalized invitations
    toast({
      title: "Invitations sent",
      description: `Sent personalized invitations to ${guests.length} guests.`
    });

    // Update sent_at timestamp for all guests
    const updateGuests = async () => {
      try {
        const now = new Date().toISOString();
        const guestIds = guests.map(guest => guest.id);
        
        const { error } = await supabase
          .from('guests')
          .update({ sent_at: now, rsvp_status: 'sent' })
          .in('id', guestIds);
          
        if (error) throw error;
        
        // Refresh the guest list
        fetchGuests();
      } catch (error) {
        console.error('Error updating guests:', error);
      }
    };
    
    updateGuests();
  };

  if (isLoading) {
    return <div className="py-6 text-center text-muted-foreground">Loading guests...</div>;
  }

  if (!invitationId || !user) {
    return (
      <div className="p-4 border border-dashed rounded-md text-center space-y-4">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
        <h3 className="font-medium">Save to Add Guests</h3>
        <p className="text-sm text-muted-foreground">
          You need to save your invitation before adding guests.
        </p>
        {!user && (
          <div className="mt-2">
            <Button variant="outline" asChild size="sm">
              <Link to="/login">Login to Continue</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted p-4 rounded-md mb-4">
        <h4 className="font-medium mb-2">Personalization Tip</h4>
        <p className="text-sm text-muted-foreground">
          Add <code className="bg-background px-1 py-0.5 rounded">{"{guest_name}"}</code> to any text in your invitation design to dynamically insert the guest's name.
        </p>
      </div>
    
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Guest List</h3>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              disabled={!canAddMore}
              variant="outline"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Guest</DialogTitle>
              <DialogDescription>
                Enter the guest's details below to add them to your invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="Enter guest name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddGuest}
                disabled={isAdding}
              >
                {isAdding ? 'Adding...' : 'Add Guest'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {!canAddMore && guests.length >= 5 && (
        <div className="bg-amber-50 text-amber-900 p-3 rounded-md flex items-center text-sm">
          <Lock className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>You've reached your guest limit. <Link to="/pricing" className="underline">Upgrade to Pro</Link> to add more guests.</span>
        </div>
      )}
      
      {guests.length > 0 ? (
        <div className="border rounded-md">
          <ScrollArea className="h-[250px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell>{guest.name}</TableCell>
                    <TableCell>{guest.email}</TableCell>
                    <TableCell>
                      <Badge variant={(guest.rsvp_status === 'sent' || guest.sent_at) ? "default" : "outline"}>
                        {guest.sent_at ? 'Sent' : (guest.rsvp_status ? guest.rsvp_status.charAt(0).toUpperCase() + guest.rsvp_status.slice(1) : 'Pending')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => previewInvitation(guest)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGuest(guest.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      ) : (
        <div className="border border-dashed rounded-md p-6 text-center">
          <p className="text-muted-foreground">No guests added yet</p>
        </div>
      )}
      
      {guests.length > 0 && (
        <div className="flex items-center gap-2 mt-4">
          <Button variant="outline" className="flex-1">
            <UploadCloud className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button className="flex-1" onClick={sendInvites}>
            <Mail className="mr-2 h-4 w-4" />
            Send Invites
          </Button>
        </div>
      )}
      
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Personalized Preview for {currentPreviewGuest?.name}</DialogTitle>
            <DialogDescription>
              This is how the invitation will look when sent to this guest.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 border rounded-md bg-gray-50">
            <p className="text-muted-foreground mb-2">Preview:</p>
            <div className="text-center">
              {/* This would be a personalized preview of the invitation */}
              <p>Dear {currentPreviewGuest?.name},</p>
              <p>You've been invited!</p>
              <p className="text-sm text-muted-foreground mt-4">
                (In the real email, your full invitation design will appear here with the guest's name inserted)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestList;
