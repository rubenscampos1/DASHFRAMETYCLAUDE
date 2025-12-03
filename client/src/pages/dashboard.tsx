import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sidebar } from "@/components/sidebar";
import { KanbanBoard } from "@/components/kanban-board";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { containerVariants, itemVariants } from "@/components/motion-wrapper";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { mainContentClass } = useSidebarLayout();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("all");
  const [tipoVideoId, setTipoVideoId] = useState<string>("all");

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const startTime = performance.now();
      console.log('⏱️ [Performance] Carregando usuários...');

      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) throw new Error('Erro ao carregar usuários');
      const data = await response.json();

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`⏱️ [Performance] Usuários carregados em ${duration}ms (${data.length} usuários)`);

      return data;
    },
  });

  const { data: tiposVideo = [] } = useQuery<any[]>({
    queryKey: ["/api/tipos-video"],
    queryFn: async () => {
      const startTime = performance.now();
      console.log('⏱️ [Performance] Carregando tipos de vídeo...');

      const response = await fetch('/api/tipos-video', { credentials: 'include' });
      if (!response.ok) throw new Error('Erro ao carregar tipos de vídeo');
      const data = await response.json();

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`⏱️ [Performance] Tipos de vídeo carregados em ${duration}ms (${data.length} tipos)`);

      return data;
    },
  });

  // 🚀 Prefetch inteligente: Carregar outras páginas em background após dashboard pronto
  useEffect(() => {
    // Só fazer prefetch depois que o dashboard já carregou (users e tiposVideo prontos)
    if (users.length > 0 && tiposVideo.length > 0) {
      console.log('🚀 [Prefetch] Dashboard pronto! Iniciando prefetch de outras páginas em 2 segundos...');

      // Aguardar 2 segundos para não competir com carregamento inicial
      const timer = setTimeout(async () => {
        const startTime = performance.now();
        console.log('🚀 [Prefetch] Carregando dados em background...');

        try {
          // Prefetch das rotas mais acessadas
          await Promise.all([
            queryClient.prefetchQuery({
              queryKey: ['/api/metricas'],
              queryFn: async () => {
                console.log('  📊 [Prefetch] Carregando métricas...');
                const res = await fetch('/api/metricas', { credentials: 'include' });
                if (!res.ok) throw new Error('Erro ao carregar métricas');
                return res.json();
              },
            }),
            queryClient.prefetchQuery({
              queryKey: ['/api/clientes'],
              queryFn: async () => {
                console.log('  👥 [Prefetch] Carregando clientes...');
                const res = await fetch('/api/clientes', { credentials: 'include' });
                if (!res.ok) throw new Error('Erro ao carregar clientes');
                return res.json();
              },
            }),
            queryClient.prefetchQuery({
              queryKey: ['/api/empreendimentos'],
              queryFn: async () => {
                console.log('  🏢 [Prefetch] Carregando empreendimentos...');
                const res = await fetch('/api/empreendimentos', { credentials: 'include' });
                if (!res.ok) throw new Error('Erro ao carregar empreendimentos');
                return res.json();
              },
            }),
            queryClient.prefetchInfiniteQuery({
              queryKey: ['/api/projetos', { status: 'Aprovado', dateFilter: 'all', responsavelFilter: 'all', customDateStart: '', customDateEnd: '' }],
              queryFn: async ({ pageParam = 0 }) => {
                console.log('  ✅ [Prefetch] Carregando projetos finalizados...');
                const res = await fetch(`/api/projetos?status=Aprovado&limit=20&offset=${pageParam}`, { credentials: 'include' });
                if (!res.ok) throw new Error('Erro ao carregar projetos finalizados');
                return res.json();
              },
              initialPageParam: 0,
              getNextPageParam: (lastPage: any) => {
                if (lastPage.hasMore) {
                  return lastPage.offset + lastPage.limit;
                }
                return undefined;
              },
            }),
            queryClient.prefetchQuery({
              queryKey: ['/api/projetos', { status: 'all', responsavelId: 'all', tipoVideoId: 'all', cliente: '', search: '', dataInicioAprovacao: undefined, dataFimAprovacao: undefined }],
              queryFn: async () => {
                console.log('  📈 [Prefetch] Carregando dados para relatórios...');
                const res = await fetch('/api/projetos', { credentials: 'include' });
                if (!res.ok) throw new Error('Erro ao carregar projetos para relatórios');
                return res.json();
              },
            }),
          ]);

          const duration = (performance.now() - startTime).toFixed(2);
          console.log(`🚀 [Prefetch] ✅ Todas as páginas pré-carregadas em ${duration}ms! Navegação será instantânea.`);
        } catch (error) {
          console.error('❌ [Prefetch] Erro ao pré-carregar páginas:', error);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [users, tiposVideo, queryClient]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex-shrink-0 flex h-20 glass border-b border-white/10 shadow-sm"
        >
          <div className="flex-1 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div variants={itemVariants} className="flex flex-col gap-2 justify-center">
                <label className="text-xs font-medium text-muted-foreground px-1">Buscar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    type="search"
                    placeholder="Buscar projetos..."
                    className="pl-10 w-64 bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-white/10 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col gap-2 justify-center">
                <label className="text-xs font-medium text-muted-foreground px-1">Responsável</label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger className="w-[170px] bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-white/10">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col gap-2 justify-center">
                <label className="text-xs font-medium text-muted-foreground px-1">Tipo de Vídeo</label>
                <Select value={tipoVideoId} onValueChange={setTipoVideoId}>
                  <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50 border-white/20 dark:border-white/10">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="glass-card">
                    <SelectItem value="all">Todos</SelectItem>
                    {tiposVideo.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="flex items-center">
              <Link href="/novo-projeto">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden p-6">
          <motion.div
            className="flex flex-col h-full w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Kanban Board */}
            <motion.div variants={itemVariants} className="flex-1 min-h-0">
              <KanbanBoard
                filters={{
                  search: searchQuery,
                  responsavelId: responsavelId !== "all" ? responsavelId : undefined,
                  tipoVideoId: tipoVideoId !== "all" ? tipoVideoId : undefined
                }}
              />
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
