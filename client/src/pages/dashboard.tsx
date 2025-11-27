import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
