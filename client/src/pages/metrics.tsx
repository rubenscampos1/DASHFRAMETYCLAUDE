import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Users, Video, AlertTriangle, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ProjectCard } from "@/components/project-card";
import { ProjectDetailsDrawer } from "@/components/project-details-drawer";
import { ProjetoWithRelations } from "@shared/schema";
import { motion } from "framer-motion";
import { MotionWrapper, containerVariants, itemVariants } from "@/components/motion-wrapper";

export default function Metrics() {
  const { mainContentClass } = useSidebarLayout();
  const [selectedResponsavel, setSelectedResponsavel] = useState<string | null>(null);
  const [selectedTipoVideo, setSelectedTipoVideo] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjetoWithRelations | null>(null);

  // ========== CONFIGURAÇÃO OTIMIZADA DE MÉTRICAS (FASE 1B) ==========
  // Reduzida pressão no banco ao remover polling e refetches desnecessários
  const { data: metricas, isLoading } = useQuery<any>({
    queryKey: ["/api/metricas"],

    // ❌ REMOVIDO: refetchInterval: 30000
    //    - Antes: refetch automático a cada 30 segundos (muito agressivo!)
    //    - Agora: sem polling automático
    //    - Métricas ainda atualizam via WebSocket quando projeto muda
    //    - Reduz 120+ chamadas/hora para ~0 chamadas automáticas

    // ❌ DESABILITADO: refetchOnWindowFocus
    //    - Antes: refetch toda vez que usuário foca na janela
    //    - Agora: false (não refaz chamada ao focar)
    //    - Reduz chamadas desnecessárias ao trocar de aba/janela
    refetchOnWindowFocus: false,

    // ❌ DESABILITADO: refetchOnReconnect
    //    - Antes: refetch toda vez que reconecta à internet
    //    - Agora: false (não refaz chamada ao reconectar)
    //    - Evita spike de chamadas quando rede volta
    refetchOnReconnect: false,

    // ✅ AUMENTADO: staleTime de 0 → 5 minutos (300000ms)
    //    - Antes: 0 (dados sempre "stale", sempre refetch)
    //    - Agora: 5 minutos (dados considerados "fresh" por 5 min)
    //    - Métricas não mudam tão rápido; 5min é razoável
    //    - WebSocket invalida quando há mudanças reais (projeto criado/atualizado)
    //    - Reduz chamadas redundantes ao navegar entre páginas
    staleTime: 5 * 60 * 1000, // 5 minutos

    // RESULTADO:
    // ✅ Polling removido: de ~120 chamadas/hora → 0 chamadas automáticas
    // ✅ Cache eficiente: reutiliza dados por 5 minutos
    // ✅ Dados ainda atualizados: WebSocket invalida quando necessário
    // ✅ Menos pressão no banco: 8 queries SQL executadas muito menos vezes
    // ================================================================
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
      return projetos.filter((p: ProjetoWithRelations) =>
        p.empreendimento?.clienteId === selectedCliente && p.status !== "Aprovado"
      );
    },
    enabled: !!selectedCliente,
  });

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 rounded-lg border border-white/20 shadow-xl backdrop-blur-md">
          <p className="font-medium text-sm mb-1">{label}</p>
          <p className="text-primary font-bold text-lg">
            {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

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

  // Handlers
  const handleBarClick = (data: any) => {
    if (data && data.name) {
      const user = users.find((u: any) => u.nome === data.name);
      if (user) setSelectedResponsavel(user.id);
    }
  };

  const handleTipoBarClick = (data: any) => {
    if (data && data.name) {
      const tipo = tiposVideo.find((t: any) => t.nome === data.name);
      if (tipo) setSelectedTipoVideo(tipo.id);
    }
  };

  const handleClienteBarClick = (data: any) => {
    if (data && data.name) {
      const cliente = clientes.find((c: any) => c.nome === data.name);
      if (cliente) setSelectedCliente(cliente.id);
    }
  };

  const responsavelData = Object.entries(metricas?.projetosPorResponsavel || {})
    .filter(([responsavel]) => responsavel !== "Sem Responsável" && responsavel !== "Sem responsável")
    .map(([responsavel, count]) => ({
      name: responsavel,
      value: count,
    }));

  const tipoVideoData = Object.entries(metricas?.projetosPorTipoVideo || {}).map(([tipo, count]) => ({
    name: tipo,
    value: count,
  }));

  const clienteData = Object.entries(metricas?.projetosPorCliente || {}).map(([cliente, count]) => ({
    name: cliente,
    value: count,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-sm">
          <div className="flex-1 px-6 flex items-center">
            <h1 className="text-2xl font-semibold text-foreground" data-testid="metrics-title">
              Métricas
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-6">
          <motion.div
            className="flex flex-col w-full space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <MotionWrapper>
              <h1 className="text-3xl font-bold mb-8">Visão Geral</h1>
            </MotionWrapper>

            {/* Overview Cards */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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

              <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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

              <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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

              <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
            </motion.div>

            {/* Charts Section */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Projects by Responsible */}
              <Card className="glass-card col-span-1 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Projetos por Responsável</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={responsavelData}>
                        <defs>
                          <linearGradient id="colorResponsavel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#ffffff"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#ffffff"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <Bar
                          dataKey="value"
                          fill="url(#colorResponsavel)"
                          radius={[8, 8, 0, 0]}
                          animationDuration={1500}
                          animationBegin={300}
                          onClick={handleBarClick}
                          cursor="pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Projects by Type */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Projetos por Tipo de Vídeo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tipoVideoData}>
                        <defs>
                          <linearGradient id="colorTipo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#ffffff"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#ffffff"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <Bar
                          dataKey="value"
                          fill="url(#colorTipo)"
                          radius={[8, 8, 0, 0]}
                          animationDuration={1500}
                          animationBegin={500}
                          onClick={handleTipoBarClick}
                          cursor="pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Projects by Client */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Vídeos por Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={clienteData}>
                        <defs>
                          <linearGradient id="colorCliente" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#ffffff"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#ffffff"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <Bar
                          dataKey="value"
                          fill="url(#colorCliente)"
                          radius={[8, 8, 0, 0]}
                          animationDuration={1500}
                          animationBegin={700}
                          onClick={handleClienteBarClick}
                          cursor="pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Status Summary */}
              <Card className="glass-card">
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
            </motion.div>
          </motion.div>
        </main>
      </div>

      {/* Drawers */}
      <Drawer open={!!selectedResponsavel && !selectedProject} onOpenChange={(open) => !open && setSelectedResponsavel(null)}>
        <DrawerContent className="max-h-[70vh] max-w-2xl mx-auto glass-card">
          <DrawerHeader className="border-b border-white/10 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                Projetos de {users.find((u: any) => u.id === selectedResponsavel)?.nome || "Responsável"}
              </DrawerTitle>
              <button
                onClick={() => setSelectedResponsavel(null)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

      <Drawer open={!!selectedTipoVideo && !selectedProject} onOpenChange={(open) => !open && setSelectedTipoVideo(null)}>
        <DrawerContent className="max-h-[70vh] max-w-2xl mx-auto glass-card">
          <DrawerHeader className="border-b border-white/10 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                Projetos do tipo {tiposVideo.find((t: any) => t.id === selectedTipoVideo)?.nome || "Tipo de Vídeo"}
              </DrawerTitle>
              <button
                onClick={() => setSelectedTipoVideo(null)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

      <Drawer open={!!selectedCliente && !selectedProject} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DrawerContent className="max-h-[70vh] max-w-2xl mx-auto glass-card">
          <DrawerHeader className="border-b border-white/10 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>
                Projetos de {clientes.find((c: any) => c.id === selectedCliente)?.nome || "Cliente"}
              </DrawerTitle>
              <button
                onClick={() => setSelectedCliente(null)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

      <ProjectDetailsDrawer
        projeto={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        onProjectUpdate={(updatedProject) => setSelectedProject(updatedProject)}
      />
    </div>
  );
}
