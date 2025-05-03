
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas as FabricCanvas, ActiveSelection, IEvent, Rect, Text } from 'fabric';
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
import { AlertCircle } from 'lucide-react';

const InvitationEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeObject, setActiveObject] = useState<any>(null);
  const [invitationTitle, setInvitationTitle] = useState("Untitled Invitation");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const { toast } = useToast();
  const { user } = useAuth();
  const { canAccessPremiumTemplate, canAddGuest } = useFeatureAccess();

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create a new canvas with fabric.js v6 syntax
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: '#ffffff',
    });

    // Handle selection changes
    canvas.on('selection:created', (e: IEvent) => handleSelectionChange(e));
    canvas.on('selection:updated', (e: IEvent) => handleSelectionChange(e));
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

  // Handle selection change
  const handleSelectionChange = (e: IEvent) => {
    const selected = e.selected?.[0];
    setActiveObject(selected);
  };

  // Add a text element
  const addText = () => {
    if (!fabricCanvas) return;
    
    const text = new Text('Sample Text', {
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
      const rect = new Rect({
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
                        canAddMore={canAddGuest}
                      />
                    </TabsContent>
                  </Tabs>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InvitationEditor;
