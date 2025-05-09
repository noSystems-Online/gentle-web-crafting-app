import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { fabric } from 'fabric';
import { useToast } from '@/hooks/use-toast';

interface Guest {
  id: string;
  name: string;
  email: string;
  rsvp_status?: string;
}

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fabricCanvas: fabric.Canvas | null;
  guest: Guest | null;
  onPrevious: () => void;
  onNext: () => void;
  currentIndex: number;
  totalGuests: number;
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({
  open,
  onOpenChange,
  fabricCanvas,
  guest,
  onPrevious,
  onNext,
  currentIndex,
  totalGuests
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [previewCanvas, setPreviewCanvas] = useState<fabric.Canvas | null>(null);
  const { toast } = useToast();

  // Cleanup function to dispose canvas when dialog closes or component unmounts
  useEffect(() => {
    return () => {
      if (previewCanvas) {
        try {
          previewCanvas.dispose();
          setPreviewCanvas(null);
        } catch (error) {
          console.error("Error disposing canvas:", error);
        }
      }
    };
  }, []);

  // Effect that runs when dialog opens/closes or guest changes
  useEffect(() => {
    // Clean up previous canvas when dialog closes
    if (!open) {
      if (previewCanvas) {
        try {
          previewCanvas.dispose();
          setPreviewCanvas(null);
        } catch (error) {
          console.error("Error disposing canvas on close:", error);
        }
      }
      return;
    }

    // Don't proceed if we don't have required data
    if (!fabricCanvas || !guest) {
      return;
    }
    
    setIsLoading(true);
    
    // Use a small timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      setupPreviewCanvas();
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [open, guest?.id, fabricCanvas]);

  const setupPreviewCanvas = async () => {
    try {
      if (!fabricCanvas || !previewCanvasRef.current || !open) {
        setIsLoading(false);
        return;
      }
      
      // Dispose of any existing canvas first
      if (previewCanvas) {
        try {
          previewCanvas.dispose();
        } catch (error) {
          console.error("Error disposing existing canvas:", error);
        }
      }
      
      // Create a new fabric canvas
      const canvas = new fabric.Canvas(previewCanvasRef.current, {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight(),
        selection: false,
        interactive: false
      });
      
      setPreviewCanvas(canvas);
      
      // Clone the canvas content
      const originalJson = fabricCanvas.toJSON();
      
      // Set background color
      canvas.backgroundColor = fabricCanvas.backgroundColor;
      
      // Handle background image if present
      if (fabricCanvas.backgroundImage) {
        const bgImage = fabricCanvas.backgroundImage;
        
        if ('src' in bgImage && typeof bgImage.src === 'string') {
          await new Promise<void>((resolve) => {
            fabric.Image.fromURL(bgImage.src, (img) => {
              canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: bgImage.scaleX || 1,
                scaleY: bgImage.scaleY || 1,
                originX: 'left',
                originY: 'top'
              });
              resolve();
            });
          });
        }
      }
      
      // Load the objects
      await new Promise<void>((resolve) => {
        canvas.loadFromJSON(originalJson, async () => {
          // Replace placeholders with guest data
          if (guest) {
            const canvasObjects = canvas.getObjects();
            const qrCodePromises: Promise<void>[] = [];
            
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
                    // Replace the placeholder with the actual guest name
                    const personalized = qrTemplate.replace(/{guest_name}/g, guest.name);
                    
                    // Generate a new QR code URL with the personalized data
                    const qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + 
                      encodeURIComponent(personalized) + "&size=200x200";
                    
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
                      
                      // Instead of replacing the object (which can cause DOM issues),
                      // modify its properties
                      canvas.remove(qrObj);
                      canvas.add(newQrImage);
                      canvas.renderAll();
                      resolveQr();
                    }, { crossOrigin: 'anonymous' });
                  });
                  
                  qrCodePromises.push(qrPromise);
                }
              }
            }
            
            // Wait for all QR code updates to complete
            await Promise.all(qrCodePromises);
          }
          
          canvas.renderAll();
          resolve();
        });
      });
    } catch (err) {
      console.error('Error creating preview:', err);
      toast({
        title: "Preview Error",
        description: "There was a problem generating the preview.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show nothing if no guest is selected
  if (!guest) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Clean up before closing
      if (!newOpen && previewCanvas) {
        try {
          previewCanvas.dispose();
          setPreviewCanvas(null);
        } catch (error) {
          console.error("Error disposing canvas on close:", error);
        }
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview for {guest.name}</DialogTitle>
        </DialogHeader>
        
        <div className="relative bg-gray-50 border rounded-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          ) : (
            <div className="canvas-container">
              <canvas ref={previewCanvasRef} className="w-full" />
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Guest {currentIndex + 1} of {totalGuests}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={onPrevious}
              disabled={isLoading || totalGuests <= 1}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button 
              variant="outline" 
              onClick={onNext}
              disabled={isLoading || totalGuests <= 1}
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewDialog;
