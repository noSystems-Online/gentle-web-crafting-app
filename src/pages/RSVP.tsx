
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Check } from "lucide-react";
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
  custom_design_url?: string | null;
  reply_to_email?: string | null;
  sender_name?: string | null;
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
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchGuestAndInvitation = async () => {
      try {
        if (!guestId) {
          console.error("No guest ID provided in URL");
          setError("No guest ID provided");
          setLoading(false);
          return;
        }

        console.log("Fetching guest with ID:", guestId);

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

        console.log("Found guest:", guestData);

        // Cast the rsvp_status to our RSVPStatus type since we know it's one of our valid values
        const guestWithTypedStatus: Guest = {
          ...guestData,
          rsvp_status: guestData.rsvp_status as RSVPStatus
        };

        setGuest(guestWithTypedStatus);
        setStatus(guestWithTypedStatus.rsvp_status);
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

        console.log("Found invitation:", invitationData);
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

  const sendNotificationEmail = async (newStatus: RSVPStatus) => {
    if (!guest || !invitation || !invitation.reply_to_email) return;
    
    try {
      // We'll use the existing send-invitations edge function to send a notification email
      const response = await fetch('/api/v1/notify-rsvp-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guestId: guest.id,
          guestName: guest.name,
          guestEmail: guest.email,
          invitationId: invitation.id,
          invitationTitle: invitation.title,
          rsvpStatus: newStatus,
          rsvpMessage: message,
          replyToEmail: invitation.reply_to_email,
          senderName: invitation.sender_name || 'InviteCanvas'
        }),
      });
      
      if (!response.ok) {
        console.error("Failed to send notification email");
      }
    } catch (err) {
      console.error("Error sending notification email:", err);
      // Don't throw here, as we still want to update the RSVP status
      // even if the notification email fails
    }
  };

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
        // Send notification email
        await sendNotificationEmail(status);
        
        // Show success message
        setSubmitSuccess(true);
        
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
            <CardTitle className="text-center text-red-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              Oops!
            </CardTitle>
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
              <Link to="/">Return to Home</Link>
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
              <Link to="/">Return to Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-center">Thank You!</CardTitle>
            <CardDescription className="text-center">
              Your RSVP has been successfully submitted
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">
              {status === 'attending' 
                ? "We're looking forward to seeing you!" 
                : status === 'maybe' 
                  ? "We hope you can make it!" 
                  : "We're sorry you can't make it, but thank you for letting us know."}
            </p>
            {message && (
              <div className="bg-gray-50 p-4 rounded-md text-left italic">
                "{message}"
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link to="/">Return to Home</Link>
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
          {/* Display the invitation image if available */}
          {invitation?.custom_design_url && (
            <div className="mb-4">
              <img 
                src={invitation.custom_design_url} 
                alt="Invitation" 
                className="w-full h-auto rounded-md border border-gray-200 shadow-sm"
              />
            </div>
          )}
          
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
