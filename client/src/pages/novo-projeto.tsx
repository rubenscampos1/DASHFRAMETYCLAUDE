import { useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { ProjectForm } from "@/components/project-form";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";

export default function NovoProjeto() {
  const [, setLocation] = useLocation();
  const { mainContentClass } = useSidebarLayout();

  const handleSuccess = () => {
    setLocation("/dashboard");
  };

  const handleCancel = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
          <div className="flex-1 px-6 flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              data-testid="back-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="page-title">
              Novo Projeto
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-4xl mx-auto px-6">
              <ProjectForm onSuccess={handleSuccess} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
