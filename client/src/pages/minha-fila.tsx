import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { ProjectCard } from "@/components/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, User, Calendar, AlertTriangle } from "lucide-react";
import { ProjetoWithRelations } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";

export default function MinhaFila() {
  const { user } = useAuth();
  const { mainContentClass } = useSidebarLayout();
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
  });
  const [selectedResponsavel, setSelectedResponsavel] = useState(user?.id || "");

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: user?.papel === "Admin" || user?.papel === "Gestor",
  });

  const { data: projetos = [], isLoading } = useQuery<ProjetoWithRelations[]>({
    queryKey: ["/api/projetos", { ...filters, responsavelId: selectedResponsavel }],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add responsavel filter
      if (selectedResponsavel) {
        params.append("responsavelId", selectedResponsavel);
      }
      
      // Add other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/api/projetos?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Erro ao carregar projetos");
      return response.json();
    },
    enabled: !!selectedResponsavel,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      search: "",
    });
  };

  // Calculate statistics
  const totalProjetos = projetos.length;
  const projetosAtrasados = projetos.filter(p => 
    p.dataPrevistaEntrega && 
    isPast(new Date(p.dataPrevistaEntrega)) && 
    !["Aprovado", "Cancelado"].includes(p.status)
  ).length;
  const projetosUrgentes = projetos.filter(p => p.prioridade === "Alta").length;

  // Group projects by status
  const projetosPorStatus = projetos.reduce((acc, projeto) => {
    if (!acc[projeto.status]) {
      acc[projeto.status] = [];
    }
    acc[projeto.status].push(projeto);
    return acc;
  }, {} as Record<string, ProjetoWithRelations[]>);

  const canViewOthers = user?.papel === "Admin" || user?.papel === "Gestor";
  const selectedUser = users.find(u => u.id === selectedResponsavel) || user;

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className={`${mainContentClass} flex flex-col flex-1 transition-all duration-300`}>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-40 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
          <div className="flex-1 px-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-foreground" data-testid="minha-fila-title">
                {canViewOthers ? `Fila - ${selectedUser?.nome}` : "Minha Fila"}
              </h1>
              <div className="hidden md:flex items-center space-x-2">
                <Badge className="bg-chart-1 text-white" data-testid="total-projects">
                  {totalProjetos} projetos
                </Badge>
                {projetosAtrasados > 0 && (
                  <Badge variant="destructive" data-testid="overdue-projects">
                    {projetosAtrasados} atrasados
                  </Badge>
                )}
                {projetosUrgentes > 0 && (
                  <Badge className="bg-chart-3 text-white" data-testid="urgent-projects">
                    {projetosUrgentes} urgentes
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
            </div>
          </div>
        </div>

        {/* Filters and User Selection */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {canViewOthers && (
              <>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ver fila de:</span>
                </div>
                <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}>
                  <SelectTrigger className="w-48" data-testid="select-user">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros:</span>
            </div>
            
            <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value)}>
              <SelectTrigger className="w-40" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status</SelectItem>
                <SelectItem value="Briefing">Briefing</SelectItem>
                <SelectItem value="Roteiro">Roteiro</SelectItem>
                <SelectItem value="Captação">Captação</SelectItem>
                <SelectItem value="Edição">Edição</SelectItem>
                <SelectItem value="Aguardando Aprovação">Aguardando Aprovação</SelectItem>
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

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-6 space-y-6">
              
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-1" data-testid="stats-total">
                      {totalProjetos}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive" data-testid="stats-overdue">
                      {projetosAtrasados}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alta Prioridade</CardTitle>
                    <Calendar className="h-4 w-4 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-3" data-testid="stats-urgent">
                      {projetosUrgentes}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects by Status */}
              {totalProjetos === 0 ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhum projeto encontrado</p>
                    <p className="text-sm">
                      {canViewOthers && selectedUser 
                        ? `${selectedUser.nome} não possui projetos atribuídos.`
                        : "Você não possui projetos atribuídos."
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(projetosPorStatus).map(([status, statusProjetos]) => (
                    <div key={status}>
                      <div className="flex items-center space-x-2 mb-4">
                        <h2 className="text-lg font-semibold text-foreground">{status}</h2>
                        <Badge variant="secondary" data-testid={`status-count-${status}`}>
                          {statusProjetos.length}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {statusProjetos.map((projeto) => (
                          <ProjectCard
                            key={projeto.id}
                            projeto={projeto}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
