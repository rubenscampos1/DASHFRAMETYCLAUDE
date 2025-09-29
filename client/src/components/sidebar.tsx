import { Link, useLocation } from "wouter";
import { 
  Video, 
  LayoutDashboard, 
  BarChart3, 
  CheckCircle, 
  Plus, 
  User, 
  FileText, 
  Database,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  ChevronLeft
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/contexts/sidebar-context";
import { UserProfileDrawer } from "@/components/user-profile-drawer";
import frametyLogo from "@assets/Framety - PNG -  01_1759177448673.png";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Métricas",
      href: "/metricas",
      icon: BarChart3,
    },
    {
      name: "Finalizados",
      href: "/finalizados",
      icon: CheckCircle,
    },
    {
      name: "Novo Projeto",
      href: "/novo-projeto",
      icon: Plus,
    },
    {
      name: "Minha Fila",
      href: "/minha-fila",
      icon: User,
    },
    {
      name: "Relatórios",
      href: "/relatorios",
      icon: FileText,
    },
    {
      name: "Banco de Dados",
      href: "/banco-de-dados",
      icon: Database,
    },
  ];

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
      <div className="flex flex-col flex-grow bg-card border-r border-border pt-5 pb-4 overflow-y-auto">
        <div className={`flex-shrink-0 ${isCollapsed ? 'px-4' : 'px-6'}`}>
          {isCollapsed ? (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="h-8 w-8 p-0"
                data-testid="sidebar-toggle"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="flex items-center">
                <img 
                  src={frametyLogo} 
                  alt="Framety" 
                  className="h-20 w-auto max-w-full"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="ml-auto h-8 w-8 p-0"
                data-testid="sidebar-toggle"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex-grow flex flex-col">
          <nav className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} ${isCollapsed ? 'space-y-4' : 'space-y-2'}`} data-testid="navigation">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }
                    ${isCollapsed ? 'justify-center px-2 py-3' : ''}
                  `}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={`h-4 w-4 ${!isCollapsed ? 'mr-3' : ''}`} />
                  {!isCollapsed && item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className={`flex-shrink-0 border-t border-border pt-4 ${isCollapsed ? 'px-3' : 'px-4'}`}>
          <div className={`flex items-center mb-4 ${isCollapsed ? 'flex-col space-y-3' : 'justify-between'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              data-testid="theme-toggle"
              title={isCollapsed ? (theme === "light" ? "Modo escuro" : "Modo claro") : undefined}
              className={isCollapsed ? 'w-8 h-8 p-0' : ''}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="logout-button"
              title={isCollapsed ? "Sair" : undefined}
              className={isCollapsed ? 'w-8 h-8 p-0' : ''}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <UserProfileDrawer isCollapsed={isCollapsed} />
        </div>
      </div>
    </div>
  );
}
