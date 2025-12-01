import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { FloatingHelpButton } from './FloatingHelpButton';
import { AIBlockedBanner } from '@/components/settings/AIBlockedBanner';
import { ModeToggle } from '@/components/mode-toggle';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* Topbar */}
        <header className="flex items-center justify-end p-4 md:px-8 border-b border-border/40 bg-background/50 backdrop-blur-xl sticky top-0 z-10">
          {/* Right Actions */}
          <div className="flex items-center gap-3">
            
            <div className="h-8 w-[1px] bg-border mx-2 hidden md:block" />
            
            <ModeToggle />
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            
            <div className="flex items-center gap-3 ml-2 pl-2 border-l border-border/40">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0] || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground mt-1">Cuenta Pro</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full bg-secondary/50 overflow-hidden h-9 w-9 border border-border">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <AIBlockedBanner />
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
      <FloatingHelpButton />
    </div>
  );
};
