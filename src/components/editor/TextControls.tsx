
import React, { useEffect, useState } from 'react';
import { Canvas, Text } from 'fabric';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Bold,
  Italic,
  Underline
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TextControlsProps {
  activeObject: any;
  fabricCanvas: Canvas | null;
}

const TextControls: React.FC<TextControlsProps> = ({ 
  activeObject, 
  fabricCanvas 
}) => {
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderlined, setIsUnderlined] = useState(false);

  // Update controls when active object changes
  useEffect(() => {
    if (activeObject && activeObject.type === 'text') {
      setText(activeObject.text);
      setFontSize(activeObject.fontSize);
      setFontFamily(activeObject.fontFamily);
      setTextColor(activeObject.fill);
      setIsBold(activeObject.fontWeight === 'bold');
      setIsItalic(activeObject.fontStyle === 'italic');
      setIsUnderlined(activeObject.underline);
    }
  }, [activeObject]);

  // Is the selected object a text object?
  const isTextObject = activeObject && activeObject.type === 'text';

  // Update text
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    if (isTextObject && fabricCanvas) {
      activeObject.set('text', newText);
      fabricCanvas.renderAll();
    }
  };

  // Update font size
  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    if (isTextObject && fabricCanvas) {
      activeObject.set('fontSize', newSize);
      fabricCanvas.renderAll();
    }
  };

  // Update font family
  const handleFontFamilyChange = (value: string) => {
    setFontFamily(value);
    if (isTextObject && fabricCanvas) {
      activeObject.set('fontFamily', value);
      fabricCanvas.renderAll();
    }
  };

  // Update text color
  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setTextColor(newColor);
    if (isTextObject && fabricCanvas) {
      activeObject.set('fill', newColor);
      fabricCanvas.renderAll();
    }
  };

  // Toggle bold
  const toggleBold = () => {
    if (!isTextObject || !fabricCanvas) return;
    
    const newBold = !isBold;
    setIsBold(newBold);
    activeObject.set('fontWeight', newBold ? 'bold' : 'normal');
    fabricCanvas.renderAll();
  };

  // Toggle italic
  const toggleItalic = () => {
    if (!isTextObject || !fabricCanvas) return;
    
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    activeObject.set('fontStyle', newItalic ? 'italic' : 'normal');
    fabricCanvas.renderAll();
  };

  // Toggle underline
  const toggleUnderline = () => {
    if (!isTextObject || !fabricCanvas) return;
    
    const newUnderline = !isUnderlined;
    setIsUnderlined(newUnderline);
    activeObject.set('underline', newUnderline);
    fabricCanvas.renderAll();
  };

  // Set text alignment
  const setTextAlign = (align: 'left' | 'center' | 'right') => {
    if (!isTextObject || !fabricCanvas) return;
    
    activeObject.set('textAlign', align);
    fabricCanvas.renderAll();
  };

  if (!isTextObject) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Text Properties</h3>
      
      <div className="space-y-2">
        <Label htmlFor="text-content">Text Content</Label>
        <Input
          id="text-content"
          value={text}
          onChange={handleTextChange}
          placeholder="Enter text"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="font-family">Font</Label>
        <Select
          value={fontFamily}
          onValueChange={handleFontFamilyChange}
        >
          <SelectTrigger id="font-family">
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Arial">Arial</SelectItem>
            <SelectItem value="Helvetica">Helvetica</SelectItem>
            <SelectItem value="Times New Roman">Times New Roman</SelectItem>
            <SelectItem value="Courier New">Courier New</SelectItem>
            <SelectItem value="Georgia">Georgia</SelectItem>
            <SelectItem value="Verdana">Verdana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="font-size">Font Size: {fontSize}px</Label>
        </div>
        <Slider
          id="font-size"
          min={8}
          max={72}
          step={1}
          value={[fontSize]}
          onValueChange={handleFontSizeChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="text-color">Text Color</Label>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md border" style={{ backgroundColor: textColor }} />
          <Input
            id="text-color"
            type="color"
            value={textColor}
            onChange={handleTextColorChange}
            className="w-full h-8"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Style & Alignment</Label>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isBold ? "default" : "outline"}
                  size="sm"
                  onClick={toggleBold}
                  className="h-8 w-8 p-0"
                >
                  <Bold className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isItalic ? "default" : "outline"}
                  size="sm"
                  onClick={toggleItalic}
                  className="h-8 w-8 p-0"
                >
                  <Italic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isUnderlined ? "default" : "outline"}
                  size="sm"
                  onClick={toggleUnderline}
                  className="h-8 w-8 p-0"
                >
                  <Underline className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Underline</TooltipContent>
            </Tooltip>

            <div className="border-r h-6 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTextAlign('left')}
                  className="h-8 w-8 p-0"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align Left</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTextAlign('center')}
                  className="h-8 w-8 p-0"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align Center</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTextAlign('right')}
                  className="h-8 w-8 p-0"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Align Right</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};

export default TextControls;
