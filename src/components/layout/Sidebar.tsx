import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  MessageSquare, 
  Bot, 
  Settings,
  Store,
  ShoppingCart,
  LogOut,
  Phone,
  Plug,
  Menu,
  ChevronLeft,
  Star,
  FileText,
  Workflow,
  Search
} from 'lucide-react';
import nuevoLogo from '@/assets/nuevo-logo.png';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const sidebarItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
  },
  {
    icon: Package,
    label: 'Productos',
    href: '/products'
  },
  {
    icon: Star,
    label: 'Destacados',
    href: '/featured-products'
  },
  {
    icon: ShoppingCart,
    label: 'Pedidos',
    href: '/order-management'
  },
  {
    icon: MessageSquare,
    label: 'Chats',
    href: '/chats'
  },
  {
    icon: Phone,
    label: 'WhatsApp',
    href: '/whatsapp'
  },
  {
    icon: Bot,
    label: 'AI Agent',
    href: '/ai-agent'
  },
  {
    icon: Workflow,
    label: 'Automatizaciones',
    href: '/automations'
  },
  {
    icon: FileText,
    label: 'Plantillas',
    href: '/templates'
  },
  {
    icon: Plug,
    label: 'Integraciones',
    href: '/integrations'
  },
  {
    icon: Store,
    label: 'Mi Tienda',
    href: '/store'
  },
  {
    icon: Settings,
    label: 'Configuración',
    href: '/settings'
  }
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleItemClick = (href: string) => {
    navigate(href);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className={cn(
      "h-full bg-background border-r border-border/40 flex flex-col transition-all duration-300 z-20",
      isCollapsed ? "w-20" : "w-72"
    )}>
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 animate-fade-in">
            <img src={nuevoLogo} alt="Logo" className="h-8 w-auto object-contain" />
          </div>
        ) : (
           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
             <img src={nuevoLogo} alt="Wafy" className="w-6 h-6 object-contain" />
           </div>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar">
        <nav className="space-y-1.5">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <button
                key={item.href}
                onClick={() => handleItemClick(item.href)}
                className={cn(
                  "sidebar-item w-full group relative overflow-hidden",
                  isCollapsed ? "justify-center px-2" : "justify-start",
                  isActive ? "sidebar-item-active" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-current" : "text-muted-foreground group-hover:text-foreground")} />
                
                {!isCollapsed && (
                  <span className="truncate relative z-10">{item.label}</span>
                )}
                
                {/* Active Indicator for collapsed mode */}
                {isCollapsed && isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border/40">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            isCollapsed ? "justify-center px-2" : "justify-start px-4 gap-3"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  );
};
