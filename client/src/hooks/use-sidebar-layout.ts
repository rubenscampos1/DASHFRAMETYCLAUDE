import { useSidebar } from "@/contexts/sidebar-context";

export function useSidebarLayout() {
  const { isCollapsed } = useSidebar();
  
  // Retorna a classe CSS apropriada para o padding do conteúdo principal
  const mainContentClass = isCollapsed ? "lg:pl-20" : "lg:pl-64";
  
  return {
    isCollapsed,
    mainContentClass,
  };
}