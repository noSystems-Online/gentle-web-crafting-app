
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fabric } from 'fabric';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureAccess } from '@/hooks/use-feature-access';
import EditorToolbar from '@/components/editor/EditorToolbar';
import TextControls from '@/components/editor/TextControls';
import TemplateSelector from '@/components/editor/TemplateSelector';
import GuestList from '@/components/editor/GuestList';
import CropTool from '@/components/editor/CropTool';
import { AlertCircle, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Guest {
  id: string;
  name: string;
  email: string;
  rsvp_status?: string;
}

const InvitationEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
  const [invitationTitle, setInvitationTitle] = useState("Untitled Invitation");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const { toast } = useToast();
  const { user } = useAuth();
  const { canAccessPremiumTemplate, getGuestLimit } = useFeatureAccess();
  
  // Get current guest count to determine if user can add more
  const [guestCount, setGuestCount] = useState(0);
  const [guests, setGuests] = useState<Guest[]>([]);
  
  // Download progress state
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  
  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create a new canvas with fabric.js
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true, // Maintain z-index when selecting objects
    });

    // Handle selection changes
    canvas.on('selection:created', (e) => handleSelectionChange(e));
    canvas.on('selection:updated', (e) => handleSelectionChange(e));
    canvas.on('selection:cleared', () => setActiveObject(null));

    setFabricCanvas(canvas);

    // Load invitation if ID provided
    if (id) {
      loadInvitation(id);
    }

    return () => {
      canvas.dispose();
    };
  }, [id]);

  // Fetch guest count when invitation ID is available
  useEffect(() => {
    if (id && user) {
      fetchGuestCount();
      fetchGuests();
    }
  }, [id, user]);
  
  // Fetch the current guest count
  const fetchGuestCount = async () => {
    if (!id) return;
    
    try {
      const { data, error, count } = await supabase
        .from('guests')
        .select('*', { count: 'exact' })
        .eq('invitation_id', id);
        
      if (error) throw error;
      
      setGuestCount(count || 0);
    } catch (error) {
      console.error('Error fetching guest count:', error);
    }
  };

  // Fetch the guests data
  const fetchGuests = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('invitation_id', id);
        
      if (error) throw error;
      
      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  // Handle selection change
  const handleSelectionChange = (e: fabric.IEvent) => {
    const selected = e.selected?.[0];
    setActiveObject(selected || null);
  };

  // Add a text element
  const addText = () => {
    if (!fabricCanvas) return;
    
    const text = new fabric.Text('Sample Text', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000'
    });
    
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  // Add a shape
  const addShape = (type: 'rectangle' | 'circle') => {
    if (!fabricCanvas) return;
    
    if (type === 'rectangle') {
      const rect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        fill: '#4CAF50',
        stroke: '#000000',
        strokeWidth: 1,
      });
      
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
    }
    
    fabricCanvas.renderAll();
  };

  // Delete active object
  const deleteObject = () => {
    if (!fabricCanvas || !activeObject) return;
    
    fabricCanvas.remove(activeObject);
    setActiveObject(null);
    fabricCanvas.renderAll();
  };

  // Apply a template
  const applyTemplate = async (templateId: string, isPremium: boolean) => {
    if (isPremium && !canAccessPremiumTemplate()) {
      toast({
        title: "Premium Template",
        description: "You need a Pro subscription to use this template.",
        variant: "destructive",
      });
      return;
    }

    if (!fabricCanvas) return;

    try {
      // In a real app, you would fetch the template data from Supabase
      // This is simplified to just change background color for demonstration
      fabricCanvas.backgroundColor = templateId === 'premium1' ? '#ffd700' : '#e6f7ff';
      fabricCanvas.renderAll();
      
      toast({
        title: "Template Applied",
        description: "The template has been applied to your invitation.",
      });
    } catch (error) {
      console.error("Error applying template:", error);
      toast({
        title: "Failed to apply template",
        description: "There was an error applying the template.",
        variant: "destructive",
      });
    }
  };

  // Load invitation from database
  const loadInvitation = async (invitationId: string) => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error) throw error;

      if (data) {
        setInvitationTitle(data.title);
        setDescription(data.description || '');
        
        if (data.editor_data && fabricCanvas) {
          try {
            fabricCanvas.loadFromJSON(data.editor_data, fabricCanvas.renderAll.bind(fabricCanvas));
          } catch (e) {
            console.error("Error loading canvas data:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error loading invitation:", error);
      toast({
        title: "Failed to load invitation",
        description: "There was an error loading your invitation.",
        variant: "destructive",
      });
    }
  };

  // Save invitation
  const saveInvitation = async () => {
    if (!fabricCanvas || !user) {
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please login or register to save your invitation.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsSaving(true);

    try {
      const canvasData = fabricCanvas.toJSON();
      
      const invitationData = {
        title: invitationTitle,
        description: description,
        editor_data: canvasData,
        user_id: user.id,
        status: 'draft',
      };

      let result;
      
      if (id) {
        // Update existing invitation
        result = await supabase
          .from('invitations')
          .update(invitationData)
          .eq('id', id);
      } else {
        // Create new invitation
        result = await supabase
          .from('invitations')
          .insert(invitationData);
      }

      if (result.error) throw result.error;
      
      toast({
        title: "Invitation Saved",
        description: "Your invitation has been saved successfully.",
      });
      
      if (!id && result.data) {
        navigate(`/invitation/edit/${result.data[0].id}`);
      }
    } catch (error) {
      console.error("Error saving invitation:", error);
      toast({
        title: "Failed to save invitation",
        description: "There was an error saving your invitation.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if user can add more guests based on their subscription
  const canAddMoreGuests = () => {
    const guestLimit = getGuestLimit();
    return guestCount < guestLimit;
  };

  // Generate and download personalized invitations for all guests
  const downloadPersonalizedInvitations = async () => {
    if (!fabricCanvas || !guests.length) {
      toast({
        title: "No guests found",
        description: "Add guests to generate personalized invitations.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setShowDownloadProgress(true);
    setDownloadComplete(false);

    try {
      // Create a zip file with JSZip
      const JSZip = await import('jszip').then(module => module.default);
      const zip = new JSZip();
      
      // Save original canvas state
      const originalCanvasData = fabricCanvas.toJSON();
      
      // Create folder for the invitations
      const folder = zip.folder(`${invitationTitle.replace(/[^a-z0-9]/gi, '_')}_invitations`);
      
      // Generate one image per guest
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i];
        
        // Update progress
        setDownloadProgress(Math.round((i / guests.length) * 50));
        
        try {
          // Create a temporary canvas for each guest with the EXACT same dimensions
          const canvasWidth = fabricCanvas.getWidth();
          const canvasHeight = fabricCanvas.getHeight();
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvasWidth;
          tempCanvas.height = canvasHeight;
          const tempContext = tempCanvas.getContext('2d');
          
          if (!tempContext) {
            throw new Error("Could not create canvas context");
          }
          
          // Draw background color
          tempContext.fillStyle = fabricCanvas.backgroundColor as string;
          tempContext.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // Create a new fabric canvas instance with the same dimensions
          const clonedCanvas = new fabric.Canvas(document.createElement('canvas'), {
            width: canvasWidth,
            height: canvasHeight
          });
          
          // Load objects from the original canvas
          await new Promise<void>((resolve) => {
            clonedCanvas.loadFromJSON(originalCanvasData, async () => {
              // Replace placeholders with guest data
              const canvasObjects = clonedCanvas.getObjects();
              const qrCodePromises: Promise<void>[] = [];
              
              // Process each object on canvas
              for (const obj of canvasObjects) {
                // Handle text objects with {guest_name} placeholder
                if ((obj.type === 'text' || obj.type === 'i-text') && obj instanceof fabric.Text) {
                  const textObj = obj;
                  const originalText = textObj.text || '';
                  
                  // Replace the placeholder with the actual guest name
                  if (originalText.includes('{guest_name}')) {
                    textObj.set('text', originalText.replace(/{guest_name}/g, guest.name));
                  }
                }
                
                // Handle QR codes with {guest_name} placeholder in their template
                if (obj.type === 'image' && 'qrTemplate' in obj && typeof obj.qrTemplate === 'string') {
                  const qrObj = obj as fabric.Image & { qrTemplate: string };
                  const qrTemplate = qrObj.qrTemplate;
                  
                  // If the QR code has a template with the placeholder
                  if (qrTemplate && qrTemplate.includes('{guest_name}')) {
                    // Create a promise to update the QR code
                    const qrPromise = new Promise<void>((resolveQr) => {
                      // Replace the placeholder with the actual guest name - IMPORTANT: Use the actual guest name, not "Preview"
                      const personalized = qrTemplate.replace(/{guest_name}/g, guest.name);
                      
                      // Generate a new QR code URL with the personalized data
                      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(personalized)}&size=200x200`;
                      
                      // Log for debugging
                      console.log(`Generating QR for guest ${guest.name} with data: ${personalized}`);
                      
                      // Update the QR code image
                      fabric.Image.fromURL(qrApiUrl, (newQrImage) => {
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
                        const index = clonedCanvas.getObjects().indexOf(qrObj);
                        clonedCanvas.remove(qrObj);
                        clonedCanvas.insertAt(newQrImage, index);
                        clonedCanvas.renderAll();
                        resolveQr();
                      }, { crossOrigin: 'anonymous' }); // Set crossOrigin for image loading
                    });
                    
                    qrCodePromises.push(qrPromise);
                  }
                }
              }
              
              // Wait for all QR codes to be updated
              await Promise.all(qrCodePromises);
              
              clonedCanvas.renderAll();
              resolve();
            });
          });
          
          // Increase timeout to ensure rendering is complete
          await new Promise<void>((resolve) => {
            setTimeout(() => {
              try {
                // Ensure the canvas is fully rendered before capturing
                clonedCanvas.renderAll();
                
                // Get the cloned canvas element
                const clonedElement = clonedCanvas.getElement() as HTMLCanvasElement;
                
                // Draw the full canvas image to the temp context
                tempContext.drawImage(clonedElement, 0, 0, canvasWidth, canvasHeight);
                
                // Convert the temp canvas to data URL
                const dataURL = tempCanvas.toDataURL('image/png');
                
                // Add to zip file
                folder?.file(`${guest.name.replace(/[^a-z0-9]/gi, '_')}_invitation.png`, dataURL.split(',')[1], {base64: true});
                
                // Clean up the temporary canvas to free memory
                clonedCanvas.dispose();
                
                resolve();
              } catch (err) {
                console.error("Error converting canvas to data URL:", err);
                resolve(); // Resolve anyway to continue with other guests
              }
            }, 800); // Increased timeout to ensure rendering is complete
          });
          
          // Update progress
          setDownloadProgress(Math.round((i + 1) / guests.length * 100));
        } catch (err) {
          console.error("Error processing guest:", guest.name, err);
          // Continue with next guest if one fails
          continue;
        }
      }
      
      // Generate and download the zip file
      try {
        const content = await zip.generateAsync({ type: 'blob' });
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(content);
        downloadLink.download = `${invitationTitle.replace(/[^a-z0-9]/gi, '_')}_invitations.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Restore original canvas
        fabricCanvas.loadFromJSON(originalCanvasData, () => {
          fabricCanvas.renderAll();
          
          // Complete download process
          setDownloadComplete(true);
          
          setTimeout(() => {
            setIsDownloading(false);
            setShowDownloadProgress(false);
          }, 2000);
        });
      } catch (err) {
        console.error("Error generating zip file:", err);
        throw err;
      }
    } catch (error) {
      console.error('Error generating personalized invitations:', error);
      toast({
        title: "Error generating invitations",
        description: "There was a problem creating the personalized invitations.",
        variant: "destructive"
      });
      setIsDownloading(false);
      setShowDownloadProgress(false);
    }
  };
  
  // Function to replace placeholders with guest data
  const replaceGuestPlaceholders = (guestName: string) => {
    if (!fabricCanvas) return;
    
    const canvasObjects = fabricCanvas.getObjects();
    
    // Process each object on canvas
    canvasObjects.forEach((obj) => {
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
          const personalized = qrTemplate.replace(/{guest_name}/g, guestName);
          
          // Generate a new QR code URL with the personalized data
          const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(personalized)}&size=200x200`;
          
          // Update the QR code image
          fabric.Image.fromURL(qrApiUrl, (newQrImage) => {
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
            fabricCanvas.remove(qrObj);
            fabricCanvas.add(newQrImage);
            fabricCanvas.renderAll();
          }, { crossOrigin: 'anonymous' }); // Set crossOrigin for image loading
        }
      }
    });
    
    fabricCanvas.renderAll();
  };

  // Add state for crop tool
  const [isCropping, setIsCropping] = useState(false);

  // Handle crop canvas action
  const handleCropCanvas = () => {
    setIsCropping(true);
  };
  
  // Handle crop complete
  const handleCropComplete = () => {
    setIsCropping(false);
    // Save the current state after cropping
    saveInvitation();
  };
  
  // Handle crop cancel
  const handleCropCancel = () => {
    setIsCropping(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Invitation Editor</h2>
            <p className="text-muted-foreground">Design your perfect invitation</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/projects')}
            >
              Cancel
            </Button>
            <Button
              onClick={saveInvitation}
              disabled={isSaving || !user}
            >
              {isSaving ? 'Saving...' : 'Save Invitation'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar - Settings and properties */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium mb-1">Invitation Title</label>
                    <Input
                      id="title"
                      value={invitationTitle}
                      onChange={(e) => setInvitationTitle(e.target.value)}
                      placeholder="Enter a title for your invitation"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">Description (Optional)</label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter a description"
                    />
                  </div>

                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="design">Design</TabsTrigger>
                      <TabsTrigger value="guests">Guests</TabsTrigger>
                    </TabsList>
                    <TabsContent value="design" className="space-y-4 mt-4">
                      <TextControls 
                        activeObject={activeObject} 
                        fabricCanvas={fabricCanvas}
                      />
                      
                      <TemplateSelector 
                        onApply={applyTemplate}
                        canAccessPremium={canAccessPremiumTemplate()}
                      />
                    </TabsContent>
                    <TabsContent value="guests" className="mt-4">
                      <GuestList 
                        invitationId={id} 
                        canAddMore={canAddMoreGuests()}
                        fabricCanvas={fabricCanvas}
                      />
                    </TabsContent>
                  </Tabs>

                  {/* Download button for personalized invitations */}
                  {guests.length > 0 && (
                    <div className="pt-4">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={downloadPersonalizedInvitations}
                        disabled={isDownloading || !guests.length}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download All Personalized Invitations
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Creates a .zip file with personalized invitations for each guest.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Canvas area */}
          <div className="lg:col-span-2">
            <Card className="w-full">
              <CardContent className="p-6">
                <EditorToolbar 
                  onAddText={addText}
                  onAddShape={addShape}
                  onDelete={deleteObject}
                  hasSelection={!!activeObject}
                  fabricCanvas={fabricCanvas}
                  onDownloadAll={downloadPersonalizedInvitations}
                  onCropCanvas={handleCropCanvas}
                />
                
                <div className="border rounded-md overflow-hidden mt-4">
                  <div className="bg-gray-50 relative">
                    <canvas ref={canvasRef} className="mx-auto" />
                    
                    {!user && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-amber-100 border border-amber-300 p-2 rounded-md flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span>Login to save your work</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Show crop tool overlay when cropping */}
                    {isCropping && fabricCanvas && (
                      <CropTool 
                        fabricCanvas={fabricCanvas} 
                        onCropComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Download progress dialog */}
      <Dialog open={showDownloadProgress} onOpenChange={(open) => {
        if (!isDownloading) setShowDownloadProgress(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {downloadComplete ? "Download Complete" : "Generating Personalized Invitations"}
            </DialogTitle>
            <DialogDescription>
              {downloadComplete 
                ? "All personalized invitations have been downloaded as a ZIP file." 
                : "Please wait while we generate personalized invitations for each guest."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            <Progress value={downloadProgress} className="w-full" />
            <p className="text-center text-sm text-muted-foreground mt-2">
              {downloadComplete 
                ? "100% Complete" 
                : `${downloadProgress}% Complete - Processing ${guests.length} invitation${guests.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              disabled={!downloadComplete} 
              onClick={() => setShowDownloadProgress(false)}
              className="w-full"
            >
              {downloadComplete ? "Close" : "Processing..."}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InvitationEditor;
