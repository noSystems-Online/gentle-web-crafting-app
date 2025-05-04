import React, { useState, useEffect, useCallback } from 'react';
import { fabric } from 'fabric';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Plus, Mail, Trash2, UploadCloud, Lock, AlertCircle, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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

interface EmailCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  crypto: "ssl" | "tls" | "none";
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
  // States for the preview carousel
  const [previewCarouselOpen, setPreviewCarouselOpen] = useState(false);
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0);
  const [previewCanvasRef, setPreviewCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [previewCanvas, setPreviewCanvas] = useState<fabric.Canvas | null>(null);
  const previewCanvasContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Email sending states
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);
  const [smtpCredentials, setSmtpCredentials] = useState<EmailCredentials>({
    host: "",
    port: 587,
    username: "",
    password: "",
    crypto: "tls"
  });
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [showSendingProgress, setShowSendingProgress] = useState(false);

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

  // Create preview canvas when the carousel sheet is opened
  useEffect(() => {
    if (previewCarouselOpen && previewCanvasRef && fabricCanvas) {
      console.log("Creating preview canvas for carousel");
      
      // Create a new fabric canvas for the preview
      const canvas = new fabric.Canvas(previewCanvasRef, {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight(),
        backgroundColor: fabricCanvas.backgroundColor || '#ffffff',
      });
      
      setPreviewCanvas(canvas);
      
      // Load the original canvas content
      canvas.loadFromJSON(fabricCanvas.toJSON(), () => {
        console.log("Canvas JSON loaded into preview canvas");
        if (guests.length > 0) {
          updatePreviewForGuest(guests[currentGuestIndex], canvas);
        }
        canvas.renderAll();
      });
      
      return () => {
        console.log("Disposing preview canvas");
        canvas.dispose();
        setPreviewCanvas(null);
      };
    }
  }, [previewCarouselOpen, previewCanvasRef, fabricCanvas]);

  // Update preview when navigating between guests
  useEffect(() => {
    if (previewCanvas && guests.length > 0) {
      console.log(`Updating preview for guest index ${currentGuestIndex}: ${guests[currentGuestIndex]?.name}`);
      updatePreviewForGuest(guests[currentGuestIndex], previewCanvas);
    }
  }, [currentGuestIndex, guests, previewCanvas]);

  // Adjust canvas size when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (previewCanvas && previewCanvasContainerRef.current && fabricCanvas) {
        const containerWidth = previewCanvasContainerRef.current.clientWidth;
        const originalWidth = fabricCanvas.getWidth();
        const originalHeight = fabricCanvas.getHeight();
        const scaleFactor = Math.min(containerWidth / originalWidth, 0.8);
        
        // Clone canvas at original size but display it scaled
        const displayWidth = Math.floor(originalWidth * scaleFactor);
        const displayHeight = Math.floor(originalHeight * scaleFactor);
        
        // Use cssOnly to avoid changing the internal canvas dimensions
        previewCanvas.setDimensions({
          width: displayWidth,
          height: displayHeight
        }, { cssOnly: true });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Initial sizing
    if (previewCarouselOpen) {
      setTimeout(handleResize, 100); // Wait for sheet to open
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [previewCarouselOpen, previewCanvas, fabricCanvas]);

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
  
  const updatePreviewWithGuestName = async (guestName: string) => {
    if (!fabricCanvas) return;

    // Find the canvas objects
    const canvasObjects = fabricCanvas.getObjects();
    const qrCodePromises: Promise<void>[] = [];
    
    // Look for text objects that contain "{guest_name}" placeholder
    for (const obj of canvasObjects) {
      // Handle text objects with {guest_name} placeholder
      if ((obj.type === 'text' || obj.type === 'i-text') && obj instanceof fabric.Text) {
        const textObj = obj;
        const originalText = textObj.text || '';
        
        // Replace the placeholder with the actual guest name
        if (originalText.includes('{guest_name}')) {
          textObj.set('text', originalText.replace(/{guest_name}/g, guestName));
        }
      }
      
      // Handle QR codes with {guest_name} placeholder in their template
      if (obj.type === 'image' && 'qrTemplate' in obj && typeof obj.qrTemplate === 'string') {
        const qrObj = obj as fabric.Image & { qrTemplate: string };
        const qrTemplate = qrObj.qrTemplate;
        
        // If the QR code has a template with the placeholder
        if (qrTemplate && qrTemplate.includes('{guest_name}')) {
          // Create a promise to update the QR code
          const qrPromise = new Promise<void>((resolve) => {
            // Replace the placeholder with the actual guest name
            const personalized = qrTemplate.replace(/{guest_name}/g, guestName);
            
            // Log QR code generation for debugging
            console.log(`Generating QR for guest: ${guestName}, with value: ${personalized}`);
            
            // Generate a new QR code URL with the personalized data
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(personalized)}&size=200x200`;
            
            // Update the QR code image
            fabric.Image.fromURL(qrApiUrl, (newQrImage) => {
              if (!newQrImage) {
                console.error("Failed to load QR image");
                resolve();
                return;
              }
              
              // Keep the position, scale, etc. of the original QR code
              newQrImage.set({
                left: qrObj.left,
                top: qrObj.top,
                scaleX: qrObj.scaleX,
                scaleY: qrObj.scaleY,
                angle: qrObj.angle,
                qrTemplate: qrTemplate, // Keep the original template
                crossOrigin: 'anonymous' // Add cross-origin attribute
              });
              
              // Replace the old QR code with the new one
              const index = fabricCanvas.getObjects().indexOf(qrObj);
              if (index !== -1) {
                fabricCanvas.remove(qrObj);
                fabricCanvas.insertAt(newQrImage, index);
                fabricCanvas.renderAll();
              }
              resolve();
            }, { crossOrigin: 'anonymous' }); // Set crossOrigin for image loading
          });
          
          qrCodePromises.push(qrPromise);
        }
      }
    }
    
    // Wait for all QR codes to be updated
    await Promise.all(qrCodePromises);
    
    fabricCanvas.renderAll();
  };

  // Improved function to update preview canvas for a specific guest
  const updatePreviewForGuest = useCallback(async (guest: Guest, canvas: fabric.Canvas) => {
    if (!canvas || !canvas.getElement()) {
      console.error("Invalid canvas for preview");
      return;
    }
    
    console.log(`Updating preview for guest: ${guest.name}`);
    
    try {
      // Find the canvas objects
      const canvasObjects = canvas.getObjects();
      const qrCodePromises: Promise<void>[] = [];
      
      // First handle text objects to avoid race conditions
      for (const obj of canvasObjects) {
        // Handle text objects with {guest_name} placeholder
        if ((obj.type === 'text' || obj.type === 'i-text') && obj instanceof fabric.Text) {
          const textObj = obj;
          const originalText = textObj.text || '';
          
          // Replace the placeholder with the actual guest name
          if (originalText.includes('{guest_name}')) {
            console.log(`Replacing text placeholder for ${guest.name}`);
            textObj.set('text', originalText.replace(/{guest_name}/g, guest.name));
            canvas.renderAll();
          }
        }
      }
      
      // Then handle QR codes separately
      for (const obj of canvasObjects) {
        // Handle QR codes with {guest_name} placeholder in their template
        if (obj.type === 'image' && 'qrTemplate' in obj && typeof obj.qrTemplate === 'string') {
          const qrObj = obj as fabric.Image & { qrTemplate: string };
          const qrTemplate = qrObj.qrTemplate;
          
          // If the QR code has a template with the placeholder
          if (qrTemplate && qrTemplate.includes('{guest_name}')) {
            // Create a promise to update the QR code
            const qrPromise = new Promise<void>((resolve) => {
              // Replace the placeholder with the actual guest name
              const personalized = qrTemplate.replace(/{guest_name}/g, guest.name);
              
              // Log QR code generation for debugging
              console.log(`Generating QR for guest: ${guest.name}, with value: ${personalized}`);
              
              // Generate a new QR code URL with the personalized data
              const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(personalized)}&size=200x200`;
              
              // Update the QR code image
              fabric.Image.fromURL(qrApiUrl, (newQrImage) => {
                if (!newQrImage) {
                  console.error("Failed to load QR image");
                  resolve();
                  return;
                }
                
                try {
                  // Keep the position, scale, etc. of the original QR code
                  newQrImage.set({
                    left: qrObj.left,
                    top: qrObj.top,
                    scaleX: qrObj.scaleX,
                    scaleY: qrObj.scaleY,
                    angle: qrObj.angle,
                    qrTemplate: qrTemplate, // Keep the original template
                    crossOrigin: 'anonymous' // Add cross-origin attribute
                  });
                  
                  // Replace the old QR code with the new one
                  const index = canvas.getObjects().indexOf(qrObj);
                  if (index !== -1) {
                    canvas.remove(qrObj);
                    canvas.insertAt(newQrImage, index);
                    canvas.renderAll();
                  }
                } catch (err) {
                  console.error("Error replacing QR code:", err);
                }
                resolve();
              }, { crossOrigin: 'anonymous' }); // Set crossOrigin for image loading
            });
            
            qrCodePromises.push(qrPromise);
          }
        }
      }
      
      // Wait for all QR codes to be updated
      if (qrCodePromises.length > 0) {
        await Promise.all(qrCodePromises);
        // Final render after all promises resolve
        setTimeout(() => canvas.renderAll(), 100);
      }
    } catch (error) {
      console.error("Error updating preview for guest:", error);
    }
  }, []);

  // Functions to navigate between guests in the preview
  const nextGuest = () => {
    setCurrentGuestIndex((prev) => 
      prev === guests.length - 1 ? 0 : prev + 1
    );
  };

  const prevGuest = () => {
    setCurrentGuestIndex((prev) => 
      prev === 0 ? guests.length - 1 : prev - 1
    );
  };

  // Function to open the preview carousel and set the initial guest
  const openPreviewCarousel = (initialGuestIndex = 0) => {
    setCurrentGuestIndex(initialGuestIndex);
    setPreviewCarouselOpen(true);
  };

  // Function to generate HTML for a personalized invitation
  const generatePersonalizedHtml = (guest: Guest, invitationTitle: string) => {
    // Generate a basic HTML template for the invitation
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${invitationTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #4a5568; text-align: center; }
        .invitation { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; background-color: #f7fafc; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #718096; }
        .button { display: inline-block; background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>${invitationTitle}</h1>
      <div class="invitation">
        <p>Dear ${guest.name},</p>
        <p>You've been invited! Please click the button below to view your personal invitation and RSVP.</p>
        <p style="text-align: center;">
          <a href="${window.location.origin}/rsvp/${guest.id}" class="button">View Invitation & RSVP</a>
        </p>
      </div>
      <div class="footer">
        <p>This invitation was sent using InviteCanvas. If you have any questions, please contact the event organizer.</p>
      </div>
    </body>
    </html>
    `;
    
    return html;
  };

  // Function to handle changes to SMTP credentials
  const handleSmtpInputChange = (field: keyof EmailCredentials, value: any) => {
    setSmtpCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Send invitations using the email gateway API
  const sendInvites = async () => {
    // Open the SMTP dialog if no credentials are saved
    if (!smtpCredentials.host || !smtpCredentials.username || !smtpCredentials.password) {
      setSmtpDialogOpen(true);
      return;
    }
    
    // Check if we have guests and a valid invitation
    if (!invitationId || !user || !guests.length) {
      toast({
        title: "No guests to send to",
        description: "Please add guests to your invitation first.",
        variant: "destructive"
      });
      return;
    }
    
    // Start the sending process
    setIsSendingEmails(true);
    setShowSendingProgress(true);
    setSendingProgress(0);
    
    const invitationTitle = "Your Invitation"; // In a real app, this would come from the parent component
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Process each guest
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        
        // Skip guests who already received invitations
        if (guest.sent_at) {
          setSendingProgress(Math.round(((i + 1) / guests.length) * 100));
          continue;
        }
        
        // Generate personalized HTML for this guest
        const htmlContent = generatePersonalizedHtml(guest, invitationTitle);
        
        // Prepare the email request payload
        const emailPayload = {
          smtp: smtpCredentials,
          email: {
            fromEmail: smtpCredentials.username,
            fromName: "Invitation Service",
            to: [guest.email],
            subject: `${invitationTitle} - You're Invited!`,
            text: `Dear ${guest.name}, you've been invited! Please check your email client to view this invitation properly.`,
            html: htmlContent
          }
        };
        
        try {
          // Send the email using the API
          const response = await fetch('https://email-relay-express-gateway.onrender.com/api/send-mail', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
          });
          
          const result = await response.json();
          
          if (result.success) {
            // Update the guest's sent_at timestamp in database
            const { error } = await supabase
              .from('guests')
              .update({ sent_at: new Date().toISOString(), rsvp_status: 'sent' })
              .eq('id', guest.id);
              
            if (!error) {
              successCount++;
            } else {
              console.error("Error updating guest status:", error);
              failedCount++;
            }
          } else {
            console.error("Failed to send email for guest:", guest.name, result);
            failedCount++;
          }
        } catch (error) {
          console.error("Error sending invitation to", guest.name, error);
          failedCount++;
        }
        
        // Update progress
        setSendingProgress(Math.round(((i + 1) / guests.length) * 100));
      }
      
      // Show results
      if (successCount > 0) {
        toast({
          title: "Invitations sent",
          description: `Successfully sent ${successCount} invitation${successCount !== 1 ? 's' : ''}.${failedCount > 0 ? ` Failed to send ${failedCount}.` : ''}`
        });
        
        // Refresh the guest list to update statuses
        fetchGuests();
      } else if (failedCount > 0) {
        toast({
          title: "Failed to send invitations",
          description: `Failed to send ${failedCount} invitation${failedCount !== 1 ? 's' : ''}.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "No invitations sent",
          description: "All selected guests have already received invitations."
        });
      }
    } catch (error) {
      console.error("Error in send invitations process:", error);
      toast({
        title: "Error sending invitations",
        description: "There was an unexpected error during the sending process.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmails(false);
      // Keep progress dialog open briefly to show completion
      setTimeout(() => {
        setShowSendingProgress(false);
      }, 1500);
    }
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
                {guests.map((guest, index) => (
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
                          onClick={() => openPreviewCarousel(index)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGuest(guest.id)}
                          title="Delete"
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
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
          <Button variant="outline" className="w-full sm:flex-1">
            <UploadCloud className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button 
            className="w-full sm:flex-1" 
            onClick={sendInvites} 
            disabled={isSendingEmails}
          >
            {isSendingEmails ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invites
              </>
            )}
          </Button>
          <Button 
            variant="secondary" 
            className="w-full sm:flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300"
            onClick={() => openPreviewCarousel()}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview All
          </Button>
        </div>
      )}
      
      {/* Preview Carousel Sheet */}
      <Sheet open={previewCarouselOpen} onOpenChange={setPreviewCarouselOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Personalized Preview</SheetTitle>
            <SheetDescription>
              Preview how the invitation will appear with each guest's name.
              {guests.length > 0 && (
                <span className="block mt-1 font-medium">
                  Viewing invitation for: <span className="text-foreground">{guests[currentGuestIndex]?.name}</span>
                  <span className="ml-2 text-muted-foreground">({currentGuestIndex + 1} of {guests.length})</span>
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6 flex flex-col items-center justify-center">
            <div 
              className="border bg-background rounded-lg overflow-hidden mb-4 max-w-full"
              ref={previewCanvasContainerRef}
            >
              <canvas 
                ref={(ref) => setPreviewCanvasRef(ref)} 
                className="mx-auto"
              />
            </div>
            
            {guests.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={prevGuest}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-center min-w-[140px]">
                  {currentGuestIndex + 1} / {guests.length}
                </span>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={nextGuest}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close Preview</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* SMTP Settings Dialog */}
      <Dialog open={smtpDialogOpen} onOpenChange={setSmtpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Server Settings</DialogTitle>
            <DialogDescription>
              Enter your SMTP server details to send invitations via email.
              These settings will only be used for this session and won't be stored permanently.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="smtp-host" className="text-right">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={smtpCredentials.host}
                onChange={(e) => handleSmtpInputChange('host', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="smtp-port" className="text-right">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={smtpCredentials.port}
                onChange={(e) => handleSmtpInputChange('port', parseInt(e.target.value))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="smtp-username" className="text-right">Username</Label>
              <Input
                id="smtp-username"
                placeholder="your-email@gmail.com"
                value={smtpCredentials.username}
                onChange={(e) => handleSmtpInputChange('username', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="smtp-password" className="text-right">Password</Label>
              <Input
                id="smtp-password"
                type="password"
                placeholder="Password or App Password"
                value={smtpCredentials.password}
                onChange={(e) => handleSmtpInputChange('password', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="smtp-crypto" className="text-right">Security</Label>
              <select
                id="smtp-crypto"
                value={smtpCredentials.crypto}
                onChange={(e) => handleSmtpInputChange('crypto', e.target.value as "ssl" | "tls" | "none")}
                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="col-span-full text-xs text-muted-foreground">
              <p>Note: For Gmail, you may need to use an App Password. <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Learn more</a></p>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSmtpDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={() => {
                setSmtpDialogOpen(false);
                sendInvites();
              }}
              disabled={!smtpCredentials.host || !smtpCredentials.username || !smtpCredentials.password}
            >
              Save & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Email sending progress dialog */}
      <Dialog 
        open={showSendingProgress} 
        onOpenChange={(open) => {
          if (!isSendingEmails) setShowSendingProgress(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sendingProgress === 100 ? "Invitations Sent" : "Sending Invitations"}
            </DialogTitle>
            <DialogDescription>
              {sendingProgress === 100 
                ? "Your invitations have been sent." 
                : "Please wait while we send out your invitations."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{sendingProgress}%</span>
            </div>
            <div className="h-2 w-full bg-secondary overflow-hidden rounded-full">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${sendingProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {sendingProgress < 100 
                ? `Processing ${guests.length} invitation${guests.length !== 1 ? 's' : ''}...` 
                : "All invitations have been processed."}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              disabled={isSendingEmails} 
              onClick={() => setShowSendingProgress(false)}
            >
              {isSendingEmails ? "Sending..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Original preview dialog (keeping for reference) */}
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
