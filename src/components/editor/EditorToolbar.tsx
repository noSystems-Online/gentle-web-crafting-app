import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Pencil,
  Circle,
  Square,
  Text as TextIcon,
  Trash,
  Image,
  QrCode,
  MoveUp,
  MoveDown,
  SendToBack,
  BringToFront,
  Download,
  Crop
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFeatureAccess } from '@/hooks/use-feature-access';
import { useToast } from "@/hooks/use-toast";
import { fabric } from 'fabric';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EditorToolbarProps {
  onAddText: () => void;
  onAddShape: (type: 'rectangle' | 'circle') => void;
  onDelete: () => void;
  hasSelection: boolean;
  fabricCanvas: fabric.Canvas | null;
  onDownloadAll?: () => void;
  onCropCanvas?: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddText,
  onAddShape,
  onDelete,
  hasSelection,
  fabricCanvas,
  onDownloadAll,
  onCropCanvas
}) => {
  const { canUseQrCodes } = useFeatureAccess();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrValue, setQrValue] = React.useState<string>("");
  const [isQrDialogOpen, setIsQrDialogOpen] = React.useState<boolean>(false);
  
  // Handle file upload for images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    try {
      const file = e.target.files[0];
      
      if (!file.type.includes('image')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (jpg, png, etc)",
          variant: "destructive",
        });
        return;
      }
      
      // Convert to fabric.js Image object
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target || !fabricCanvas) return;
        
        // Create an HTML image element
        const imgElement = document.createElement('img');
        imgElement.src = event.target.result as string;
        
        // Important: Set crossOrigin attribute to prevent canvas tainting issues
        imgElement.crossOrigin = "anonymous";
        
        imgElement.onload = () => {
          // Calculate appropriate dimensions for the canvas
          const maxCanvasWidth = 800; // Maximum width for the canvas
          const maxCanvasHeight = 600; // Maximum height for the canvas
          
          let newCanvasWidth = Math.max(fabricCanvas.width || 600, imgElement.width);
          let newCanvasHeight = Math.max(fabricCanvas.height || 400, imgElement.height);
          
          // Cap dimensions at maximum values
          newCanvasWidth = Math.min(newCanvasWidth, maxCanvasWidth);
          newCanvasHeight = Math.min(newCanvasHeight, maxCanvasHeight);
          
          // Resize canvas if needed
          if (newCanvasWidth > fabricCanvas.width || newCanvasHeight > fabricCanvas.height) {
            fabricCanvas.setDimensions({
              width: newCanvasWidth,
              height: newCanvasHeight
            });
          }
          
          const fabricImage = new fabric.Image(imgElement, {
            left: 100,
            top: 100,
            scaleX: 0.3,
            scaleY: 0.3,
            crossOrigin: 'anonymous', // Important: Add crossOrigin to prevent canvas tainting
          });
          
          fabricCanvas.add(fabricImage);
          fabricCanvas.setActiveObject(fabricImage);
          fabricCanvas.renderAll();
          
          toast({
            title: "Image added",
            description: "Your image has been added to the canvas.",
          });
        };
      };
      reader.readAsDataURL(file);
      
      // Reset the input value so the same file can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your image.",
        variant: "destructive",
      });
    }
  };
  
  // Add QR code to canvas
  const addQrCode = async () => {
    if (!fabricCanvas || !qrValue.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a URL or text for the QR code.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Store the template value for later use - this is the original template with placeholders
      const templateValue = qrValue;
      
      // For preview purposes, we'll use a temporary value
      let previewValue = templateValue;
      
      // For preview purposes, replace placeholder with "Preview" to show something meaningful
      if (templateValue.includes("{guest_name}")) {
        previewValue = templateValue.replace("{guest_name}", "Preview");
        console.log("Created QR with template:", templateValue, "Preview value:", previewValue);
      }
      
      // Generate QR code using a public API with the preview value
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(previewValue)}&size=200x200`;
      
      // Create image from QR code URL with crossOrigin attribute
      fabric.Image.fromURL(qrApiUrl, (qrImage) => {
        // IMPORTANT: Store the original template as a custom property
        // The downloaded versions will use this template and replace {guest_name} with actual guest names
        qrImage.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
          qrTemplate: templateValue, // CRITICAL: Store the original template with placeholders
          crossOrigin: 'anonymous', // Add crossOrigin to prevent canvas tainting
        });
        
        fabricCanvas.add(qrImage);
        fabricCanvas.setActiveObject(qrImage);
        fabricCanvas.renderAll();
        
        toast({
          title: "QR Code added",
          description: templateValue.includes("{guest_name}") 
            ? "Dynamic QR code added. It will be personalized for each guest."
            : "Your QR code has been added to the canvas.",
        });
        
        setIsQrDialogOpen(false);
      }, { crossOrigin: 'anonymous' }); // Important: set crossOrigin when loading the image
    } catch (error) {
      console.error("Error creating QR code:", error);
      toast({
        title: "QR Code generation failed",
        description: "There was a problem creating your QR code.",
        variant: "destructive",
      });
    }
  };

  // Layer arrangement handlers
  const handleBringToFront = () => {
    if (!fabricCanvas || !fabricCanvas.getActiveObject()) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    activeObject.bringToFront();
    fabricCanvas.renderAll();
    
    toast({
      title: "Object arrangement",
      description: "Brought object to front",
    });
  };
  
  const handleSendToBack = () => {
    if (!fabricCanvas || !fabricCanvas.getActiveObject()) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    activeObject.sendToBack();
    fabricCanvas.renderAll();
    
    toast({
      title: "Object arrangement",
      description: "Sent object to back",
    });
  };
  
  const handleBringForward = () => {
    if (!fabricCanvas || !fabricCanvas.getActiveObject()) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    activeObject.bringForward();
    fabricCanvas.renderAll();
    
    toast({
      title: "Object arrangement",
      description: "Brought object forward one layer",
    });
  };
  
  const handleSendBackward = () => {
    if (!fabricCanvas || !fabricCanvas.getActiveObject()) return;
    
    const activeObject = fabricCanvas.getActiveObject();
    activeObject.sendBackwards();
    fabricCanvas.renderAll();
    
    toast({
      title: "Object arrangement",
      description: "Sent object backward one layer",
    });
  };

  // Fixes the ref forwarding issue by making sure components are properly nested
  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
      <TooltipProvider>
        {/* Text button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onAddText}
              className="h-8 w-8 p-0"
            >
              <TextIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Text</p>
          </TooltipContent>
        </Tooltip>

        {/* Rectangle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onAddShape('rectangle')}
              className="h-8 w-8 p-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Rectangle</p>
          </TooltipContent>
        </Tooltip>

        {/* Circle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onAddShape('circle')}
              className="h-8 w-8 p-0"
            >
              <Circle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Circle</p>
          </TooltipContent>
        </Tooltip>

        {/* Image button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-4 w-4" />
              <Input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Image</p>
          </TooltipContent>
        </Tooltip>

        {/* QR Code button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              disabled={!canUseQrCodes()}
              onClick={() => canUseQrCodes() && setIsQrDialogOpen(true)}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{canUseQrCodes() ? 'Add QR Code' : 'QR Code (Pro feature)'}</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Crop button */}
        {onCropCanvas && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onCropCanvas}
              >
                <Crop className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Crop Canvas</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        <div className="border-r h-6 mx-2" />
        
        {/* Layer arrangement - fixed by separating tooltip from dropdown */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    disabled={!hasSelection}
                    className="h-8 px-2 flex items-center gap-1"
                  >
                    <BringToFront className="h-4 w-4" />
                    <span className="text-xs">Arrange</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Layer Order</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleBringToFront} disabled={!hasSelection}>
                      <BringToFront className="h-4 w-4 mr-2" />
                      Bring to Front
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSendToBack} disabled={!hasSelection}>
                      <SendToBack className="h-4 w-4 mr-2" />
                      Send to Back
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBringForward} disabled={!hasSelection}>
                      <MoveUp className="h-4 w-4 mr-2" />
                      Bring Forward
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSendBackward} disabled={!hasSelection}>
                      <MoveDown className="h-4 w-4 mr-2" />
                      Send Backward
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Arrange Layers</p>
          </TooltipContent>
        </Tooltip>

        {/* Delete button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              disabled={!hasSelection}
              className="h-8 w-8 p-0 text-destructive"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>

        {/* Download button */}
        {onDownloadAll && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDownloadAll}
                className="h-8 w-8 p-0 ml-auto"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download Personalized Invitations</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
      
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create QR Code</DialogTitle>
            <DialogDescription>
              Enter a URL, text, or use dynamic placeholders like {'{guest_name}'} that will be replaced with each guest's information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="qrValue" className="block text-sm font-medium mb-2">
                Website URL or Text
              </label>
              <Input
                id="qrValue"
                placeholder="https://example.com or {guest_name}"
                value={qrValue}
                onChange={(e) => setQrValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Tip: You can use {'{guest_name}'} placeholder which will be replaced with the guest's name.
              </p>
            </div>
            <div className="bg-muted rounded-md p-3">
              <h4 className="text-sm font-medium mb-1">Examples:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• Personal greeting: <span className="font-mono">Hello {'{guest_name}'}!</span></li>
                <li>• Custom URL: <span className="font-mono">https://rsvp.com?guest={'{guest_name}'}</span></li>
              </ul>
            </div>
            <Button 
              onClick={addQrCode}
              disabled={!qrValue.trim()}
              className="w-full"
            >
              Create QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditorToolbar;
