/*
 * MOBILE NAVIGATION COMPONENT
 * 
 * Drawer/Menu lateral para navegação mobile com:
 * - Transição suave de slide in/out
 * - Overlay escuro semi-transparente
 * - Scroll interno se necessário
 * - Links de navegação principais
 * - Perfil do usuário e botões de ação (tema, logout)
 * - Visível apenas em telas mobile (md:hidden)
 * - Acessibilidade: suporte a Escape key, role="dialog", aria-labels
 */

import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  BarChart3, 
  CheckCircle, 
  User, 
  FileText, 
  Database,
  StickyNote,
  LogOut,
  Moon,
  Sun,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import frametyLogo from "@assets/Framety - PNG -  01_1759177448673.png";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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
    {
      name: "Notas",
      href: "/notas",
      icon: StickyNote,
    },
  ];

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    onClose();
  };

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        data-testid="mobile-nav-overlay"
      />

      {/* Drawer */}
      <div
        className={`
          md:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-card border-r border-border z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação mobile"
        data-testid="mobile-nav-drawer"
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
            <img 
              src={frametyLogo} 
              alt="Framety" 
              className="h-16 w-auto object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Fechar menu"
              data-testid="mobile-nav-close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Profile */}
          {user && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {user.fotoUrl && (
                    <AvatarImage src={user.fotoUrl} alt={user.nome} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" data-testid="text-username">
                    {user.nome}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" data-testid="text-email">
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-role">
                    {user.papel}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1" data-testid="mobile-navigation">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`
                    flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all touch-target
                    ${isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              onClick={toggleTheme}
              className="w-full justify-start touch-target"
              data-testid="mobile-nav-theme-toggle"
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4 mr-3" />
                  Modo Escuro
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 mr-3" />
                  Modo Claro
                </>
              )}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full justify-start touch-target"
              disabled={logoutMutation.isPending}
              data-testid="mobile-nav-logout"
            >
              <LogOut className="h-4 w-4 mr-3" />
              {logoutMutation.isPending ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
