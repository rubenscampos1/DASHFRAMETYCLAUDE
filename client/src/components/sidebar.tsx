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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "@/contexts/sidebar-context";

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
        <div className={`flex-shrink-0 ${isCollapsed ? 'px-1' : 'px-6'}`}>
          {isCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Video className="w-4 h-4 text-primary-foreground" />
              </div>
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
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Video className="w-4 h-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">FRAMETY</h1>
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
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.nome?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-foreground" data-testid="user-name">
                  {user?.nome}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="user-role">
                  {user?.papel}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
