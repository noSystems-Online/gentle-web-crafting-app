
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
  QrCode
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
} from "@/components/ui/dialog";
import { useFeatureAccess } from '@/hooks/use-feature-access';
import { useToast } from "@/hooks/use-toast";
import { fabric } from 'fabric';
import { supabase } from '@/integrations/supabase/client';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddShape: (type: 'rectangle' | 'circle') => void;
  onDelete: () => void;
  hasSelection: boolean;
  fabricCanvas: fabric.Canvas | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddText,
  onAddShape,
  onDelete,
  hasSelection,
  fabricCanvas
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
            scaleY: 0.3
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
        description: "Please enter a URL for the QR code.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Generate QR code using a public API
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrValue)}&size=200x200`;
      
      // Create image from QR code URL
      fabric.Image.fromURL(qrApiUrl, (qrImage) => {
        qrImage.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5
        });
        
        fabricCanvas.add(qrImage);
        fabricCanvas.setActiveObject(qrImage);
        fabricCanvas.renderAll();
        
        toast({
          title: "QR Code added",
          description: "Your QR code has been added to the canvas.",
        });
        
        setIsQrDialogOpen(false);
      });
    } catch (error) {
      console.error("Error creating QR code:", error);
      toast({
        title: "QR Code generation failed",
        description: "There was a problem creating your QR code.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
      <TooltipProvider>
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

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-4 w-4" />
              </Button>
              <Input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Image</p>
          </TooltipContent>
        </Tooltip>

        {/* Fix: Separate Dialog from Tooltip to ensure both work properly */}
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create QR Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="qrValue" className="block text-sm font-medium mb-2">
                  Website URL or Text
                </label>
                <Input
                  id="qrValue"
                  placeholder="https://example.com or your text here"
                  value={qrValue}
                  onChange={(e) => setQrValue(e.target.value)}
                />
              </div>
              <Button 
                onClick={addQrCode}
                disabled={!qrValue.trim()}
              >
                Create QR Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="border-r h-6 mx-2" />

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
      </TooltipProvider>
    </div>
  );
};

export default EditorToolbar;
