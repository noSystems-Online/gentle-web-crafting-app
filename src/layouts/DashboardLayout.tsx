
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { User, LogOut, CreditCard, Settings, LayoutDashboard, Users, FolderKanban } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, signOut, subscription } = useAuth();
  const navigate = useNavigate();
  
  const isAdmin = user?.email === 'admin@example.com';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <div className="flex h-14 items-center border-b px-4">
            <div className="flex items-center gap-2 font-semibold">
              <div className="rounded-md bg-primary p-1">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <span>SaaS Platform</span>
            </div>
          </div>
          <SidebarContent className="flex flex-col h-[calc(100vh-56px)]">
            <div className="flex-1 overflow-auto py-2">
              <nav className="grid items-start px-2 text-sm font-medium">
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 justify-start px-3 py-2 mb-1"
                  onClick={() => navigate('/dashboard')}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 justify-start px-3 py-2 mb-1"
                  onClick={() => navigate('/projects')}
                >
                  <FolderKanban className="h-4 w-4" />
                  Projects
                </Button>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 justify-start px-3 py-2 mb-1"
                  onClick={() => navigate('/billing')}
                >
                  <CreditCard className="h-4 w-4" />
                  Billing
                </Button>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 justify-start px-3 py-2 mb-1"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                
                {isAdmin && (
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 justify-start px-3 py-2 mb-1"
                    onClick={() => navigate('/admin')}
                  >
                    <Users className="h-4 w-4" />
                    Admin
                  </Button>
                )}
              </nav>
            </div>
            
            <div className="border-t p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {subscription?.plan || 'Free Plan'}
                  </div>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>
        <div className="flex flex-col w-full">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="font-semibold text-lg">Dashboard</h1>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
