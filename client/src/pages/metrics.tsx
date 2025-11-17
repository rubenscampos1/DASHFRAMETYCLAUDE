import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Video, AlertTriangle, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectCard } from "@/components/project-card";
import { ProjectDetailsDrawer } from "@/components/project-details-drawer";
import { ProjetoWithRelations } from "@shared/schema";

export default function Metrics() {
  const { mainContentClass } = useSidebarLayout();
  const [selectedResponsavel, setSelectedResponsavel] = useState<string | null>(null);
  const [selectedTipoVideo, setSelectedTipoVideo] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjetoWithRelations | null>(null);
  
  const { data: metricas, isLoading } = useQuery<any>({
    queryKey: ["/api/metricas"],
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    refetchOnWindowFocus: true, // Atualiza quando volta ao foco da janela
    refetchOnReconnect: true, // Atualiza quando reconecta à internet
    staleTime: 0, // Dados sempre considerados desatualizados para forçar refetch
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: tiposVideo = [] } = useQuery<any[]>({
    queryKey: ["/api/tipos-video"],
  });

  const { data: clientes = [] } = useQuery<any[]>({
    queryKey: ["/api/clientes"],
  });

  // Buscar projetos do responsável selecionado (excluindo Aprovados)
  const { data: projetosResponsavel = [], isLoading: isLoadingProjetosResponsavel } = useQuery<ProjetoWithRelations[]>({
    queryKey: ["/api/projetos", "responsavel", selectedResponsavel],
    queryFn: async () => {
      if (!selectedResponsavel) return [];
      const response = await fetch(`/api/projetos?responsavelId=${selectedResponsavel}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao carregar projetos");
      const projetos = await response.json();
      // Filtrar projetos aprovados
      return projetos.filter((p: ProjetoWithRelations) => p.status !== "Aprovado");
    },
    enabled: !!selectedResponsavel,
  });

  // Buscar projetos do tipo de vídeo selecionado (excluindo Aprovados)
  const { data: projetosTipo = [], isLoading: isLoadingProjetosTipo } = useQuery<ProjetoWithRelations[]>({
    queryKey: ["/api/projetos", "tipo", selectedTipoVideo],
    queryFn: async () => {
      if (!selectedTipoVideo) return [];
      const response = await fetch(`/api/projetos?tipoVideoId=${selectedTipoVideo}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao carregar projetos");
      const projetos = await response.json();
      // Filtrar projetos aprovados
      return projetos.filter((p: ProjetoWithRelations) => p.status !== "Aprovado");
    },
    enabled: !!selectedTipoVideo,
  });

  // Buscar projetos do cliente selecionado (excluindo Aprovados)
  const { data: projetosCliente = [], isLoading: isLoadingProjetosCliente } = useQuery<ProjetoWithRelations[]>({
    queryKey: ["/api/projetos", "cliente", selectedCliente],
    queryFn: async () => {
      if (!selectedCliente) return [];
      const response = await fetch(`/api/projetos`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao carregar projetos");
      const projetos = await response.json();
      // Filtrar por cliente e excluir projetos aprovados
      return projetos.filter((p: ProjetoWithRelations) => 
        p.empreendimento?.clienteId === selectedCliente && p.status !== "Aprovado"
      );
    },
    enabled: !!selectedCliente,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className={`${mainContentClass} flex flex-col flex-1 transition-all duration-300`}>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handler para clicar na barra do gráfico de responsáveis
  const handleBarClick = (data: any) => {
    if (data && data.name) {
      // Encontrar o usuário pelo nome
      const user = users.find((u: any) => u.nome === data.name);
      if (user) {
        setSelectedResponsavel(user.id);
      }
    }
  };

  // Handler para clicar na barra do gráfico de tipos
  const handleTipoBarClick = (data: any) => {
    if (data && data.name) {
      // Encontrar o tipo de vídeo pelo nome
      const tipo = tiposVideo.find((t: any) => t.nome === data.name);
      if (tipo) {
        setSelectedTipoVideo(tipo.id);
      }
    }
  };

  // Handler para clicar na barra do gráfico de clientes
  const handleClienteBarClick = (data: any) => {
    if (data && data.name) {
      // Encontrar o cliente pelo nome
      const cliente = clientes.find((c: any) => c.nome === data.name);
      if (cliente) {
        setSelectedCliente(cliente.id);
      }
    }
  };

  const responsavelData = Object.entries(metricas?.projetosPorResponsavel || {}).map(([responsavel, count]) => ({
    name: responsavel,
    projetos: count,
  }));

  const tipoData = Object.entries(metricas?.projetosPorTipo || {}).map(([tipo, count]) => ({
    name: tipo,
    projetos: count,
  }));

  const clienteData = Object.entries(metricas?.videosPorCliente || {}).map(([cliente, count]) => ({
    name: cliente,
    videos: count,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
          <div className="flex-1 px-6 flex items-center">
            <h1 className="text-2xl font-semibold text-foreground" data-testid="metrics-title">
              Métricas
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-6 space-y-6">
              
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="total-projects">
                      {metricas?.totalProjetos || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Excluindo aprovados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projetos Aprovados</CardTitle>
                    <TrendingUp className="h-4 w-4 text-chart-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-4" data-testid="approved-projects">
                      {metricas?.projetosAprovados || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Projetos finalizados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
                    <Users className="h-4 w-4 text-chart-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-1" data-testid="active-projects">
                      {metricas?.projetosAtivos || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Em produção
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projetos Atrasados</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive" data-testid="overdue-projects">
                      {metricas?.projetosAtrasados || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Precisam de atenção
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                    <TrendingUp className="h-4 w-4 text-chart-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-2" data-testid="completion-rate">
                      {(metricas?.totalProjetos || 0) + (metricas?.projetosAprovados || 0) > 0 
                        ? Math.round(((metricas?.projetosAprovados || 0) / ((metricas?.totalProjetos || 0) + (metricas?.projetosAprovados || 0))) * 100)
                        : 0
                      }%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Taxa geral
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
                    <Users className="h-4 w-4 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-3" data-testid="active-members">
                      {Object.keys(metricas?.projetosPorResponsavel || {}).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Produtividade
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Projects by Responsible */}
                <Card>
                  <CardHeader>
                    <CardTitle>Projetos por Responsável</CardTitle>
                    <CardDescription>
                      Distribuição de trabalho na equipe
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={responsavelData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar 
                          dataKey="projetos" 
                          fill="#8884d8" 
                          onClick={handleBarClick}
                          cursor="pointer"
                          data-testid="bar-responsavel"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Projects by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Projetos por Tipo de Vídeo</CardTitle>
                    <CardDescription>
                      Tipos de conteúdo mais produzidos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={tipoData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar 
                          dataKey="projetos" 
                          fill="#82ca9d" 
                          onClick={handleTipoBarClick}
                          cursor="pointer"
                          data-testid="bar-tipo"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Videos by Client */}
                <Card>
                  <CardHeader>
                    <CardTitle>Vídeos por Cliente</CardTitle>
                    <CardDescription>
                      Distribuição de projetos por cliente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={clienteData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar 
                          dataKey="videos" 
                          fill="#8884d8" 
                          onClick={handleClienteBarClick}
                          cursor="pointer"
                          data-testid="bar-cliente"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Status Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo por Status</CardTitle>
                    <CardDescription>
                      Visão detalhada do pipeline de projetos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(metricas?.projetosPorStatus || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{status}</span>
                        <Badge variant="secondary" data-testid={`status-count-${status}`}>
                          {count as number}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Drawer para mostrar projetos do responsável */}
      <Drawer open={!!selectedResponsavel && !selectedProject} onOpenChange={(open) => !open && setSelectedResponsavel(null)}>
        <DrawerContent className="max-h-[70vh] max-w-2xl mx-auto">
          <DrawerHeader className="border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                Projetos de {users.find((u: any) => u.id === selectedResponsavel)?.nome || "Responsável"}
              </DrawerTitle>
              <button
                onClick={() => setSelectedResponsavel(null)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                data-testid="close-drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DrawerHeader>
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(70vh - 80px)' }}>
            {isLoadingProjetosResponsavel ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : projetosResponsavel.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum projeto encontrado para este responsável.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projetosResponsavel.map((projeto) => (
                  <ProjectCard
                    key={projeto.id}
                    projeto={projeto}
                    onEdit={setSelectedProject}
                  />
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer para mostrar projetos do tipo de vídeo */}
      <Drawer open={!!selectedTipoVideo && !selectedProject} onOpenChange={(open) => !open && setSelectedTipoVideo(null)}>
        <DrawerContent className="max-h-[70vh] max-w-2xl mx-auto">
          <DrawerHeader className="border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                Projetos do tipo {tiposVideo.find((t: any) => t.id === selectedTipoVideo)?.nome || "Tipo de Vídeo"}
              </DrawerTitle>
              <button
                onClick={() => setSelectedTipoVideo(null)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                data-testid="close-drawer-tipo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DrawerHeader>
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(70vh - 80px)' }}>
            {isLoadingProjetosTipo ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : projetosTipo.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum projeto encontrado para este tipo de vídeo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projetosTipo.map((projeto) => (
                  <ProjectCard
                    key={projeto.id}
                    projeto={projeto}
                    onEdit={setSelectedProject}
                  />
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer para mostrar projetos do cliente */}
      <Drawer open={!!selectedCliente && !selectedProject} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DrawerContent className="max-h-[70vh] max-w-2xl mx-auto">
          <DrawerHeader className="border-b px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                Projetos de {clientes.find((c: any) => c.id === selectedCliente)?.nome || "Cliente"}
              </DrawerTitle>
              <button
                onClick={() => setSelectedCliente(null)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                data-testid="close-drawer-cliente"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DrawerHeader>
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(70vh - 80px)' }}>
            {isLoadingProjetosCliente ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : projetosCliente.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum projeto encontrado para este cliente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projetosCliente.map((projeto) => (
                  <ProjectCard
                    key={projeto.id}
                    projeto={projeto}
                    onEdit={setSelectedProject}
                  />
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Drawer para detalhes do projeto */}
      <ProjectDetailsDrawer
        projeto={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        onProjectUpdate={(updatedProject) => setSelectedProject(updatedProject)}
      />
    </div>
  );
}
