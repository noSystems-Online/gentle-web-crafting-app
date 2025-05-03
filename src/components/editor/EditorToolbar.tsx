
import React from 'react';
import { Button } from "@/components/ui/button";
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
import { useFeatureAccess } from '@/hooks/use-feature-access';

interface EditorToolbarProps {
  onAddText: () => void;
  onAddShape: (type: 'rectangle' | 'circle') => void;
  onDelete: () => void;
  hasSelection: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddText,
  onAddShape,
  onDelete,
  hasSelection
}) => {
  const { canUseQrCodes } = useFeatureAccess();

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
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              disabled={true} // Image upload to be implemented
            >
              <Image className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Image (Coming Soon)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              disabled={!canUseQrCodes()}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{canUseQrCodes() ? 'Add QR Code' : 'QR Code (Pro feature)'}</p>
          </TooltipContent>
        </Tooltip>

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
