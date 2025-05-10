
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
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [renderComplete, setRenderComplete] = useState(false);

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
          setRenderComplete(false);
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
    setRenderComplete(false);
    
    // Use a timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      setupPreviewCanvas();
    }, 300); // Increased timeout for better DOM preparation
    
    return () => {
      clearTimeout(timer);
    };
  }, [open, guest?.id, fabricCanvas]);

  const setupPreviewCanvas = async () => {
    try {
      if (!fabricCanvas || !previewCanvasRef.current || !open || !guest) {
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
      
      // Create a new fabric canvas in the container
      const containerWidth = previewContainerRef.current?.clientWidth || fabricCanvas.getWidth();
      
      const canvas = new fabric.Canvas(previewCanvasRef.current, {
        width: containerWidth,
        height: fabricCanvas.getHeight() * (containerWidth / fabricCanvas.getWidth()),
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
        await new Promise<void>((resolve) => {
          const bgImage = fabricCanvas.backgroundImage as fabric.Image;
          
          if ('src' in bgImage && typeof bgImage.src === 'string') {
            fabric.Image.fromURL(bgImage.src, (img) => {
              canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: bgImage.scaleX || 1,
                scaleY: bgImage.scaleY || 1,
                originX: 'left',
                originY: 'top'
              });
              resolve();
            }, { crossOrigin: 'anonymous' });
          } else {
            resolve();
          }
        });
      }
      
      // Load the objects
      await new Promise<void>((resolve) => {
        canvas.loadFromJSON(originalJson, async () => {
          // Replace placeholders with guest data
          if (guest) {
            const canvasObjects = canvas.getObjects();
            const qrCodePromises: Promise<void>[] = [];
            
            // First process all text objects
            for (const obj of canvasObjects) {
              // Handle text objects with {guest_name} placeholder
              if ((obj.type === 'text' || obj.type === 'i-text') && obj instanceof fabric.Text) {
                const textObj = obj;
                const originalText = textObj.text || '';
                
                // Replace the placeholder with the actual guest name
                if (originalText.includes('{guest_name}')) {
                  textObj.set('text', originalText.replace(/{guest_name}/g, guest.name));
                  canvas.renderAll(); // Render after each text change
                }
              }
            }
            
            // Then process QR codes
            for (const obj of canvasObjects) {
              // Handle QR codes with {guest_name} placeholder in their template
              if (obj.type === 'image' && 'qrTemplate' in obj && typeof obj.qrTemplate === 'string') {
                const qrObj = obj as fabric.Image & { qrTemplate: string };
                const qrTemplate = qrObj.qrTemplate;
                
                // If the QR code has a template with the placeholder
                if (qrTemplate && qrTemplate.includes('{guest_name}')) {
                  const qrPromise = new Promise<void>((resolveQr) => {
                    // Replace the placeholder with the actual guest name
                    const personalized = qrTemplate.replace(/{guest_name}/g, guest.name);
                    
                    // Generate a new QR code URL with the personalized data
                    const qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?data=" + 
                      encodeURIComponent(personalized) + "&size=200x200";
                    
                    // Load the new QR code image
                    fabric.Image.fromURL(qrApiUrl, (newQrImage) => {
                      const qrLeft = qrObj.left || 0;
                      const qrTop = qrObj.top || 0;
                      const qrScaleX = qrObj.scaleX || 1;
                      const qrScaleY = qrObj.scaleY || 1;
                      const qrAngle = qrObj.angle || 0;
                      
                      // Remove the old QR code
                      canvas.remove(qrObj);
                      
                      // Configure the new QR code with the same properties
                      newQrImage.set({
                        left: qrLeft,
                        top: qrTop,
                        scaleX: qrScaleX,
                        scaleY: qrScaleY,
                        angle: qrAngle,
                        qrTemplate: qrTemplate, // Keep the original template
                        crossOrigin: 'anonymous' // Add cross-origin attribute
                      });
                      
                      // Add the new QR code
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
            if (qrCodePromises.length > 0) {
              await Promise.all(qrCodePromises);
            }
          }
          
          canvas.renderAll();
          resolve();
        });
      });
      
      // Final render and finish loading
      canvas.renderAll();
      
      // Add a slight delay to ensure everything is rendered properly
      setTimeout(() => {
        setIsLoading(false);
        setRenderComplete(true);
      }, 500);
      
    } catch (err) {
      console.error('Error creating preview:', err);
      toast({
        title: "Preview Error",
        description: "There was a problem generating the preview.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  // Show nothing if no guest is selected
  if (!guest) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Only allow closing if rendering is complete or there was an error (isLoading is false)
      if (newOpen === false && isLoading) {
        return; // Prevent closing while loading
      }
      
      // Clean up before closing
      if (!newOpen && previewCanvas) {
        try {
          previewCanvas.dispose();
          setPreviewCanvas(null);
          setRenderComplete(false);
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
        
        <div className="relative bg-gray-50 border rounded-md overflow-hidden" ref={previewContainerRef}>
          {isLoading ? (
            <div className="flex items-center justify-center p-20">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <span className="ml-2">Generating preview...</span>
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
