
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type RSVPStatus = 'attending' | 'declined' | 'maybe' | 'sent' | null;

interface Guest {
  id: string;
  name: string;
  email: string;
  invitation_id: string;
  rsvp_status: RSVPStatus;
  rsvp_message: string | null;
}

interface Invitation {
  id: string;
  title: string;
  description: string | null;
  template_id: string | null;
  editor_data: any;
  rsvp_enabled: boolean;
}

const RSVP = () => {
  const { guestId } = useParams<{ guestId: string }>();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [status, setStatus] = useState<RSVPStatus>(null);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuestAndInvitation = async () => {
      try {
        if (!guestId) {
          setError("No guest ID provided");
          setLoading(false);
          return;
        }

        // Fetch guest data
        const { data: guestData, error: guestError } = await supabase
          .from('guests')
          .select('*')
          .eq('id', guestId)
          .single();

        if (guestError) {
          console.error("Error fetching guest:", guestError);
          setError("Guest not found");
          setLoading(false);
          return;
        }

        setGuest(guestData);
        setStatus(guestData.rsvp_status);
        setMessage(guestData.rsvp_message || '');

        // Fetch invitation data
        const { data: invitationData, error: invitationError } = await supabase
          .from('invitations')
          .select('*')
          .eq('id', guestData.invitation_id)
          .single();

        if (invitationError) {
          console.error("Error fetching invitation:", invitationError);
          setError("Invitation not found");
          setLoading(false);
          return;
        }

        setInvitation(invitationData);
        setLoading(false);
      } catch (err) {
        console.error("Error in RSVP page:", err);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    fetchGuestAndInvitation();
  }, [guestId]);

  const handleSubmit = async () => {
    if (!guest || !status) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('guests')
        .update({
          rsvp_status: status,
          rsvp_message: message || null,
          rsvp_updated_at: new Date().toISOString()
        })
        .eq('id', guest.id);

      if (error) {
        console.error("Error updating RSVP:", error);
        toast({
          title: "Error",
          description: "Failed to update your RSVP. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "RSVP Updated",
          description: "Thank you for responding to the invitation!",
        });
      }
    } catch (err) {
      console.error("Error in RSVP submission:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Oops!</CardTitle>
            <CardDescription className="text-center">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center">
              The RSVP link you followed appears to be invalid or has expired.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <a href="/">Return to Home</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!invitation?.rsvp_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">RSVP Unavailable</CardTitle>
            <CardDescription className="text-center">
              RSVP is not enabled for this invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center">
              The event organizer has not enabled RSVP for this invitation.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <a href="/">Return to Home</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">{invitation?.title}</CardTitle>
          <CardDescription className="text-center">
            Hello, {guest?.name}! Please respond to this invitation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Will you attend?</h3>
            <RadioGroup 
              value={status || undefined} 
              onValueChange={(value) => setStatus(value as RSVPStatus)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="attending" id="attending" />
                <Label htmlFor="attending">Yes, I'll be there</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maybe" id="maybe" />
                <Label htmlFor="maybe">Maybe</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="declined" id="declined" />
                <Label htmlFor="declined">No, I can't make it</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Add a message (optional)</h3>
            <Textarea
              placeholder="Write your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={!status || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Sending...
              </>
            ) : (
              "Submit RSVP"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RSVP;
