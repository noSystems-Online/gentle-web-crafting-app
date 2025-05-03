
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mock templates - in a real app these would come from your database
const TEMPLATES = [
  { id: 'basic1', name: 'Basic Template 1', isPremium: false },
  { id: 'basic2', name: 'Basic Template 2', isPremium: false },
  { id: 'premium1', name: 'Premium Template 1', isPremium: true },
  { id: 'premium2', name: 'Premium Template 2', isPremium: true },
];

interface TemplateSelectorProps {
  onApply: (templateId: string, isPremium: boolean) => void;
  canAccessPremium: boolean;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ 
  onApply,
  canAccessPremium
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Templates</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((template) => (
          <Card key={template.id} className={`overflow-hidden ${template.isPremium && !canAccessPremium ? 'opacity-60' : ''}`}>
            <div className="h-20 bg-gray-100 flex items-center justify-center">
              {/* In a real app, this would be an image of the template */}
              <div className="text-sm text-gray-500">Template Preview</div>
            </div>
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center">
                  {template.name}
                  {template.isPremium && (
                    <Badge variant="secondary" className="ml-1">Pro</Badge>
                  )}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 text-xs"
                  onClick={() => onApply(template.id, template.isPremium)}
                  disabled={template.isPremium && !canAccessPremium}
                >
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {!canAccessPremium && (
        <div className="text-xs text-muted-foreground mt-2">
          Upgrade to Pro to access premium templates
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;
