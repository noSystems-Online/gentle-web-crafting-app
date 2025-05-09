
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResizeControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWidth: number;
  initialHeight: number;
  onResize: (width: number, height: number) => void;
}

const ResizeControls: React.FC<ResizeControlsProps> = ({
  open,
  onOpenChange,
  initialWidth,
  initialHeight,
  onResize
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [aspectLocked, setAspectLocked] = useState(false);
  const aspectRatio = initialWidth / initialHeight;
  
  // Reset to initial values when dialog opens
  React.useEffect(() => {
    if (open) {
      setWidth(initialWidth);
      setHeight(initialHeight);
    }
  }, [open, initialWidth, initialHeight]);
  
  // Handle width change with optional aspect ratio lock
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10) || 0;
    setWidth(newWidth);
    
    if (aspectLocked) {
      const newHeight = Math.round(newWidth / aspectRatio);
      setHeight(newHeight);
    }
  };
  
  // Handle height change with optional aspect ratio lock
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value, 10) || 0;
    setHeight(newHeight);
    
    if (aspectLocked) {
      const newWidth = Math.round(newHeight * aspectRatio);
      setWidth(newWidth);
    }
  };
  
  // Toggle aspect ratio lock
  const toggleAspectLock = () => {
    setAspectLocked(!aspectLocked);
  };
  
  // Apply the new dimensions
  const handleApply = () => {
    if (width > 0 && height > 0) {
      onResize(width, height);
    }
  };
  
  // Set to common preset sizes
  const applyPreset = (presetWidth: number, presetHeight: number) => {
    setWidth(presetWidth);
    setHeight(presetHeight);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Canvas Size</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Width (px)</Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={handleWidthChange}
                min={1}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (px)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={handleHeightChange}
                min={1}
                className="text-right"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={toggleAspectLock}
              className={aspectLocked ? "border-primary text-primary" : ""}
            >
              {aspectLocked ? "Aspect Ratio Locked" : "Lock Aspect Ratio"}
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Current: {initialWidth}×{initialHeight}
            </span>
          </div>
          
          <div className="border-t pt-4">
            <Label className="mb-2 block">Common Sizes</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPreset(800, 600)}>
                Landscape (800×600)
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset(600, 800)}>
                Portrait (600×800)
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset(1080, 1080)}>
                Square (1080×1080)
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyPreset(1200, 628)}>
                Social Media (1200×628)
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            disabled={width <= 0 || height <= 0}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResizeControls;
