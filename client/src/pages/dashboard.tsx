import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { KanbanBoard } from "@/components/kanban-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mainContentClass } = useSidebarLayout();
  const [filters, setFilters] = useState({
    responsavelId: "all",
    tipoVideoId: "all",
    prioridade: "all",
    search: "",
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: tiposVideo = [] } = useQuery<any[]>({
    queryKey: ["/api/tipos-video"],
  });

  const { data: metricas } = useQuery<any>({
    queryKey: ["/api/metricas"],
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    refetchOnWindowFocus: true, // Atualiza quando volta ao foco da janela
    refetchOnReconnect: true, // Atualiza quando reconecta à internet
    staleTime: 0, // Dados sempre considerados desatualizados para forçar refetch
  });

  // Seed data mutation for development
  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/seed");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dados iniciais criados",
        description: "Tipos de vídeo e tags foram adicionados ao sistema.",
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      responsavelId: "all",
      tipoVideoId: "all",
      prioridade: "all",
      search: "",
    });
  };

  const activeProjetos = metricas?.totalProjetos || 0;
  const projetosAtrasados = metricas?.projetosAtrasados || 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
          <div className="flex-1 px-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-foreground" data-testid="dashboard-title">
                Dashboard
              </h1>
              <div className="hidden md:flex items-center space-x-2">
                <Badge className="bg-chart-1 text-white" data-testid="active-projects-count">
                  {activeProjetos} Ativos
                </Badge>
                {projetosAtrasados > 0 && (
                  <Badge variant="destructive" data-testid="overdue-projects-count">
                    {projetosAtrasados} Atrasados
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar projetos..."
                  className="pl-10 w-64"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  data-testid="search-input"
                />
              </div>
              
              <Link href="/novo-projeto">
                <Button data-testid="new-project-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Button>
              </Link>

              {/* Development seed button */}
              {user?.papel === "Admin" && (
                <Button
                  variant="outline"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="seed-button"
                >
                  {seedMutation.isPending ? "Criando..." : "Seed Data"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros:</span>
            </div>
            
            <Select value={filters.responsavelId} onValueChange={(value) => handleFilterChange("responsavelId", value === "all" ? "" : value)}>
              <SelectTrigger className="w-40" data-testid="filter-responsavel">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.tipoVideoId} onValueChange={(value) => handleFilterChange("tipoVideoId", value === "all" ? "" : value)}>
              <SelectTrigger className="w-40" data-testid="filter-tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tiposVideo.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.prioridade} onValueChange={(value) => handleFilterChange("prioridade", value === "all" ? "" : value)}>
              <SelectTrigger className="w-40" data-testid="filter-prioridade">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
            
            {Object.values(filters).some(Boolean) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="clear-filters"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Main Content - Removido overflow-y-auto para layout estático */}
        <main className="flex-1 relative overflow-hidden focus:outline-none">
          <div className="h-full py-6">
            <div className="h-full max-w-full mx-auto px-6">
              <KanbanBoard filters={filters} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
