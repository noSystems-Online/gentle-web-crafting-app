
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from '@/layouts/DashboardLayout';
import { useFeatureAccess } from '@/hooks/use-feature-access';
import { Plus, Folder, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

// Mock project data
const mockProjects = [
  { id: '1', name: 'Marketing Website', createdAt: '2023-05-01' },
  { id: '2', name: 'Mobile App', createdAt: '2023-05-15' },
  { id: '3', name: 'E-commerce Platform', createdAt: '2023-06-01' }
];

const Projects: React.FC = () => {
  const [projects, setProjects] = useState(mockProjects);
  const [newProjectName, setNewProjectName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { checkAccess, checkLimit } = useFeatureAccess();
  const { toast } = useToast();
  
  // Check if user has access to create projects and how many they can create
  const projectsAccess = checkAccess('projects');
  const canCreateProject = checkLimit('projects', projects.length);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project.",
        variant: "destructive"
      });
      return;
    }

    if (!canCreateProject) {
      toast({
        title: "Project limit reached",
        description: "You've reached the maximum number of projects for your plan. Please upgrade to create more.",
        variant: "destructive"
      });
      return;
    }

    const newProject = {
      id: Date.now().toString(),
      name: newProjectName,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setProjects([...projects, newProject]);
    setNewProjectName('');
    setDialogOpen(false);
    
    toast({
      title: "Project created",
      description: `Successfully created project "${newProjectName}"`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">
              Create and manage your projects
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canCreateProject}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Give your project a name to get started.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="projectName">Project Name</Label>
                <Input 
                  id="projectName" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="mt-2"
                  placeholder="My awesome project"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>
                  Create Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {!projectsAccess.hasAccess ? (
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/70" />
              <h3 className="mt-3 text-xl font-semibold">Subscription Required</h3>
              <p className="mt-2 text-muted-foreground">
                Access to projects requires a paid subscription plan.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/pricing">View Plans</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {projects.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Folder className="h-5 w-5 mr-2 text-primary" />
                        {project.name}
                      </CardTitle>
                      <CardDescription>
                        Created on {new Date(project.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        This is a project workspace where you can manage all your related tasks and resources.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button size="sm" variant="outline" asChild className="w-full">
                        <Link to={`/project/${project.id}`}>Open Project</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-muted-foreground/20">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold">No projects yet</h3>
                  <p className="mt-2 text-muted-foreground">
                    Create your first project to get started
                  </p>
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {projectsAccess.limit !== undefined && (
              <div className="mt-4 text-sm text-muted-foreground">
                Using {projects.length} of {projectsAccess.limit === 999 ? 'unlimited' : projectsAccess.limit} projects
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects;
