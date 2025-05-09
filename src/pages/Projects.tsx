import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DashboardLayout from '@/layouts/DashboardLayout';
import { useFeatureAccess } from '@/hooks/use-feature-access';
import { Plus, Folder, AlertCircle, Mail, Loader2, Trash2, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  title: string;
  created_at: string;
  status: string;
}

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { checkAccess, checkLimit } = useFeatureAccess();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // For delete confirmation
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // For pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 5;
  
  // Mock project data - we'll keep this for now
  const mockProjects = [
    { id: '1', name: 'Marketing Website', createdAt: '2023-05-01' },
    { id: '2', name: 'Mobile App', createdAt: '2023-05-15' },
    { id: '3', name: 'E-commerce Platform', createdAt: '2023-06-01' }
  ];
  
  // Check if user has access to create projects and how many they can create
  const projectsAccess = checkAccess('projects');
  const canCreateProject = checkLimit('projects', projects.length);

  // Fetch user's invitations
  useEffect(() => {
    if (user) {
      fetchInvitations();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchInvitations = async (resetPage = true) => {
    if (resetPage) {
      setIsLoading(true);
      setPage(0);
    } else {
      setIsLoadingMore(true);
    }
    
    const currentPage = resetPage ? 0 : page;
    
    try {
      // Fetch with pagination and simple ordering to avoid large JSON responses
      const { data, error } = await supabase
        .from('invitations')
        .select('id, title, created_at, status') 
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage * pageSize) + pageSize - 1);

      if (error) throw error;
      
      // If we got fewer results than the page size, there are no more to load
      if (data && data.length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (resetPage) {
        setInvitations(data || []);
      } else {
        setInvitations(prev => [...prev, ...(data || [])]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: 'Error fetching invitations',
        description: 'There was a problem retrieving your invitations.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    fetchInvitations(false);
  };

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

  const handleCreateInvitation = () => {
    navigate('/invitation/new');
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete the invitation
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationToDelete.id);
        
      if (error) throw error;
      
      // Also delete any guests associated with this invitation
      await supabase
        .from('guests')
        .delete()
        .eq('invitation_id', invitationToDelete.id);
      
      // Remove from local state
      setInvitations(invitations.filter(inv => inv.id !== invitationToDelete.id));
      
      toast({
        title: "Invitation deleted",
        description: `"${invitationToDelete.title}" has been deleted successfully.`,
      });
      
      // Close the dialog
      setIsDeleteDialogOpen(false);
      setInvitationToDelete(null);
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting the invitation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Invitations</h2>
            <p className="text-muted-foreground">
              Create and manage your digital invitations
            </p>
          </div>
          <Button onClick={() => navigate('/invitation/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Invitation
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading your invitations...</p>
          </div>
        ) : (
          <>
            {invitations.length > 0 ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {invitations.map((invitation) => (
                    <Card key={invitation.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="flex items-center">
                            <Mail className="h-5 w-5 mr-2 text-primary" />
                            {invitation.title}
                          </CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" title="More options">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/invitation/edit/${invitation.id}`} className="cursor-pointer">
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => {
                                  setInvitationToDelete(invitation);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription>
                          Created on {new Date(invitation.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(invitation.status)}`}>
                            {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        <Button size="sm" variant="outline" asChild className="flex-1">
                          <Link to={`/invitation/edit/${invitation.id}`}>Edit</Link>
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1">
                          Preview
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                {/* Load more button */}
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button 
                      variant="outline" 
                      onClick={handleLoadMore} 
                      disabled={isLoadingMore}
                      className="min-w-[150px]"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More"
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="border-dashed border-2 border-muted-foreground/20">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold">No invitations yet</h3>
                  <p className="mt-2 text-muted-foreground">
                    Create your first digital invitation to get started
                  </p>
                  <Button className="mt-4" onClick={() => navigate('/invitation/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Invitation
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
        
        <div className="mt-10 border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
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
              {mockProjects.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {mockProjects.map((project) => (
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
      </div>

      {/* Delete Invitation Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{invitationToDelete?.title}" and all associated guest data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteInvitation}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Projects;
