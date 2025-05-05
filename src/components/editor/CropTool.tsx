
import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { Button } from "@/components/ui/button";
import { Crop, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

interface CropToolProps {
  fabricCanvas: fabric.Canvas | null;
  onCropComplete: () => void;
  onCancel: () => void;
}

const CropTool: React.FC<CropToolProps> = ({ 
  fabricCanvas, 
  onCropComplete,
  onCancel
}) => {
  const [cropRect, setCropRect] = useState<fabric.Rect | null>(null);
  const [originalObjects, setOriginalObjects] = useState<fabric.Object[]>([]);
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [originalBackgroundColor, setOriginalBackgroundColor] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Initialize crop tool
  useEffect(() => {
    if (!fabricCanvas) return;

    // Store original canvas dimensions, background color, and objects
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    setOriginalDimensions({ width: canvasWidth, height: canvasHeight });
    setOriginalBackgroundColor(fabricCanvas.backgroundColor as string || '#ffffff');
    
    // Clone all objects to restore them if needed
    const clonedObjects: fabric.Object[] = [];
    fabricCanvas.getObjects().forEach(obj => {
      // Use fabric's clone method with proper type handling
      obj.clone((clonedObj: fabric.Object) => {
        clonedObjects.push(clonedObj);
      });
    });
    setOriginalObjects(clonedObjects);
    
    // Create the crop rectangle
    const rect = new fabric.Rect({
      left: canvasWidth * 0.1,
      top: canvasHeight * 0.1,
      width: canvasWidth * 0.8,
      height: canvasHeight * 0.8,
      fill: 'rgba(0,0,0,0.1)',
      stroke: '#2563eb',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      transparentCorners: false,
      cornerColor: '#2563eb',
      cornerSize: 10,
      lockRotation: true,
      hasRotatingPoint: false,
    });
    
    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    setCropRect(rect);
    
    // Disable selection of other objects during cropping
    fabricCanvas.getObjects().forEach(obj => {
      if (obj !== rect) {
        obj.selectable = false;
        obj.evented = false;
      }
    });
    
    fabricCanvas.renderAll();
    
    toast({
      title: "Crop Tool Activated",
      description: "Adjust the blue rectangle to define the crop area, then click the Apply button in the toolbar.",
    });
    
    // Clean up on unmount
    return () => {
      if (fabricCanvas && cropRect && fabricCanvas.contains(cropRect)) {
        fabricCanvas.remove(cropRect);
        
        // Re-enable selection of other objects
        fabricCanvas.getObjects().forEach(obj => {
          obj.selectable = true;
          obj.evented = true;
        });
        
        fabricCanvas.renderAll();
      }
    };
  }, [fabricCanvas]);

  // Show the dialog for confirming crop action
  const showCropConfirmation = () => {
    setIsDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  // Apply the crop
  const applyCrop = () => {
    if (!fabricCanvas || !cropRect) return;
    
    try {
      // Get crop rectangle position and dimensions
      const cropLeft = cropRect.left || 0;
      const cropTop = cropRect.top || 0;
      const cropWidth = cropRect.width || 0;
      const cropHeight = cropRect.height || 0;
      const scaleX = cropRect.scaleX || 1;
      const scaleY = cropRect.scaleY || 1;
      
      // Calculate actual crop dimensions considering scale
      const actualCropWidth = cropWidth * scaleX;
      const actualCropHeight = cropHeight * scaleY;
      
      // Remove the crop rectangle
      fabricCanvas.remove(cropRect);
      
      // Store the current background color before cropping
      const backgroundColor = fabricCanvas.backgroundColor || '#ffffff';
      
      // Adjust all objects' positions relative to the crop rectangle
      fabricCanvas.getObjects().forEach(obj => {
        obj.left = (obj.left || 0) - cropLeft;
        obj.top = (obj.top || 0) - cropTop;
        obj.setCoords();
      });
      
      // Update canvas dimensions
      fabricCanvas.setDimensions({
        width: actualCropWidth,
        height: actualCropHeight
      });
      
      // Update the canvas viewport
      fabricCanvas.setViewportTransform([1, 0, 0, 1, -cropLeft, -cropTop]);
      
      // Explicitly set the background color again to ensure it's preserved
      fabricCanvas.backgroundColor = backgroundColor;
      
      fabricCanvas.renderAll();
      
      // Reset the viewport to account for the new dimensions
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      
      // Re-enable selection of objects
      fabricCanvas.getObjects().forEach(obj => {
        obj.selectable = true;
        obj.evented = true;
      });
      
      toast({
        title: "Canvas Cropped",
        description: "The canvas has been cropped to your selection."
      });
      
      setIsDialogOpen(false);
      
      // IMPORTANT: Delay the onCropComplete callback to ensure the canvas state is properly
      // saved before any other tools are activated or the page is refreshed
      setTimeout(() => {
        onCropComplete();
      }, 100);
    } catch (error) {
      console.error("Error cropping canvas:", error);
      toast({
        title: "Crop Failed",
        description: "There was an error cropping the canvas.",
        variant: "destructive"
      });
      
      // Restore original state
      cancelCrop();
    }
  };

  // Cancel the crop operation
  const cancelCrop = () => {
    if (!fabricCanvas || !cropRect) return;
    
    // Remove the crop rectangle
    fabricCanvas.remove(cropRect);
    
    // Re-enable selection of objects
    fabricCanvas.getObjects().forEach(obj => {
      obj.selectable = true;
      obj.evented = true;
    });
    
    fabricCanvas.renderAll();
    setIsDialogOpen(false);
    onCancel();
  };

  return (
    <>
      {/* Floating action buttons for crop actions */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button 
          variant="default" 
          size="sm" 
          onClick={showCropConfirmation}
          className="flex items-center gap-1"
        >
          <Crop className="h-4 w-4" />
          Apply Crop
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={cancelCrop}
          className="flex items-center gap-1"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
      
      {/* Confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Canvas</DialogTitle>
            <DialogDescription>
              Are you sure you want to crop the canvas? This will remove everything outside the selected area.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between mt-4">
            <Button variant="outline" onClick={handleDialogClose} className="sm:flex-1">
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={applyCrop} className="sm:flex-1">
              <Crop className="mr-1 h-4 w-4" />
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CropTool;
