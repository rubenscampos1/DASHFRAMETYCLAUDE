/*
 * Página Finalizados - Melhorias:
 * - Toggle Card/Lista com persistência em localStorage
 * - Filtros por data (mês/ano) e responsável
 * - Visualização em tabela com colunas principais
 * - Paginação com scroll infinito para carregamento rápido
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Calendar, Youtube, Edit, LayoutGrid, List as ListIcon, X, Filter, Star, MessageSquare, Send } from "lucide-react";
import { ProjetoWithRelations } from "@shared/schema";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { MotionWrapper, containerVariants, itemVariants } from "@/components/motion-wrapper";
import { motion } from "framer-motion";

type ViewMode = "card" | "list";

const PROJETOS_POR_PAGINA = 20; // Carregar 20 projetos por vez para performance

export default function Finalizados() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { mainContentClass } = useSidebarLayout();
  const [editingProject, setEditingProject] = useState<ProjetoWithRelations | null>(null);
  const [youtubeLink, setYoutubeLink] = useState("");
  const [viewingNpsProject, setViewingNpsProject] = useState<ProjetoWithRelations | null>(null);

  // View mode com persistência
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("finalizados_view_mode");
    return (saved as ViewMode) || "card";
  });

  // Filtros
  const [dateFilter, setDateFilter] = useState<string>("all"); // all, this_month, last_month, custom
  const [customDateStart, setCustomDateStart] = useState<string>("");
  const [customDateEnd, setCustomDateEnd] = useState<string>("");
  const [responsavelFilter, setResponsavelFilter] = useState<string>("all");

  // Salvar preferência de visualização
  useEffect(() => {
    localStorage.setItem("finalizados_view_mode", viewMode);
  }, [viewMode]);

  // Usar infinite query para scroll infinito
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/projetos", { status: "Aprovado", dateFilter, responsavelFilter, customDateStart, customDateEnd }],
    queryFn: async ({ pageParam = 0 }) => {
      const startTime = performance.now();
      console.log(`⏱️ [Performance] Carregando página ${pageParam / PROJETOS_POR_PAGINA + 1} de projetos finalizados...`);

      const response = await fetch(
        `/api/projetos?status=Aprovado&limit=${PROJETOS_POR_PAGINA}&offset=${pageParam}`,
        { credentials: "include" }
      );

      if (!response.ok) throw new Error("Erro ao carregar projetos finalizados");
      const result = await response.json();

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`⏱️ [Performance] Página carregada em ${duration}ms (${result.projetos.length} projetos, total: ${result.total})`);

      return result;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  // Combinar todos os projetos de todas as páginas
  const projetos = useMemo(() => {
    return data?.pages.flatMap((page) => page.projetos) || [];
  }, [data]);

  // Total de projetos (do primeiro page)
  const totalProjetos = data?.pages[0]?.total || 0;

  // Observer para detectar quando chegar ao final da página
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('📜 [Scroll] Carregando mais projetos...');
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Responsáveis únicos dos projetos finalizados
  const responsaveis = useMemo(() => {
    const unique = new Map<string, { id: string; nome: string }>();
    projetos.forEach((p) => {
      if (p.responsavel) {
        unique.set(p.responsavel.id, { id: p.responsavel.id, nome: p.responsavel.nome });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [projetos]);

  // Projetos filtrados
  const projetosFiltrados = useMemo(() => {
    let filtered = [...projetos];

    // Filtro por data
    if (dateFilter === "this_month") {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      filtered = filtered.filter(p =>
        p.dataAprovacao && isWithinInterval(new Date(p.dataAprovacao), { start, end })
      );
    } else if (dateFilter === "last_month") {
      const start = startOfMonth(subMonths(new Date(), 1));
      const end = endOfMonth(subMonths(new Date(), 1));
      filtered = filtered.filter(p =>
        p.dataAprovacao && isWithinInterval(new Date(p.dataAprovacao), { start, end })
      );
    } else if (dateFilter === "custom" && customDateStart && customDateEnd) {
      const start = new Date(customDateStart);
      const end = new Date(customDateEnd);
      filtered = filtered.filter(p =>
        p.dataAprovacao && isWithinInterval(new Date(p.dataAprovacao), { start, end })
      );
    }

    // Filtro por responsável
    if (responsavelFilter !== "all") {
      filtered = filtered.filter(p => p.responsavelId === responsavelFilter);
    }

    // Ordenar por data de aprovação (mais recente primeiro)
    return filtered.sort((a, b) => {
      if (!a.dataAprovacao) return 1;
      if (!b.dataAprovacao) return -1;
      return new Date(b.dataAprovacao).getTime() - new Date(a.dataAprovacao).getTime();
    });
  }, [projetos, dateFilter, customDateStart, customDateEnd, responsavelFilter]);

  // Limpar filtros
  const clearFilters = () => {
    setDateFilter("all");
    setCustomDateStart("");
    setCustomDateEnd("");
    setResponsavelFilter("all");
  };

  // Verificar se há filtros ativos (data personalizada só conta se ambas as datas estiverem preenchidas)
  const hasActiveFilters = (dateFilter !== "all" && (dateFilter !== "custom" || (customDateStart && customDateEnd))) || responsavelFilter !== "all";

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, linkYoutube }: { id: string; linkYoutube: string }) => {
      const response = await apiRequest("PATCH", `/api/projetos/${id}`, { linkYoutube });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      toast({
        title: "Link do YouTube atualizado!",
        description: "O link foi salvo com sucesso.",
      });
      setEditingProject(null);
      setYoutubeLink("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar checkbox de "enviado" com update otimista
  const updateEnviadoMutation = useMutation({
    mutationFn: async ({ id, enviado }: { id: string; enviado: boolean }) => {
      const response = await fetch(`/api/projetos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enviadoCliente: enviado })
      });
      if (!response.ok) throw new Error('Erro ao atualizar');
      return response.json();
    },
    onMutate: async ({ id, enviado }) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: ["/api/projetos", { status: "Aprovado", dateFilter, responsavelFilter, customDateStart, customDateEnd }] });

      // Salva o estado anterior
      const previousData = queryClient.getQueryData(["/api/projetos", { status: "Aprovado", dateFilter, responsavelFilter, customDateStart, customDateEnd }]);

      // Atualiza otimisticamente o cache
      queryClient.setQueryData(
        ["/api/projetos", { status: "Aprovado", dateFilter, responsavelFilter, customDateStart, customDateEnd }],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              projetos: page.projetos.map((p: ProjetoWithRelations) =>
                p.id === id ? { ...p, enviadoCliente: enviado } : p
              ),
            })),
          };
        }
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Se der erro, reverte para o estado anterior
      if (context?.previousData) {
        queryClient.setQueryData(
          ["/api/projetos", { status: "Aprovado", dateFilter, responsavelFilter, customDateStart, customDateEnd }],
          context.previousData
        );
      }
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    },
  });


  const handleEditYoutubeLink = (projeto: ProjetoWithRelations) => {
    setEditingProject(projeto);
    setYoutubeLink(projeto.linkYoutube || "");
  };

  const handleSaveYoutubeLink = () => {
    if (!editingProject) return;

    // Basic YouTube URL validation
    if (youtubeLink && !youtubeLink.includes('youtube.com') && !youtubeLink.includes('youtu.be')) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida do YouTube.",
        variant: "destructive",
      });
      return;
    }

    updateProjectMutation.mutate({
      id: editingProject.id,
      linkYoutube: youtubeLink
    });
  };


  const canEdit = (projeto: ProjetoWithRelations) => {
    if (user?.papel === "Admin" || user?.papel === "Gestor") return true;
    return user?.id === projeto.responsavelId;
  };

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
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm"
        >
          <div className="flex-1 px-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-foreground" data-testid="finalizados-title">
                Projetos Finalizados
              </h1>
              <Badge className="bg-chart-4 text-white" data-testid="finalizados-count">
                {totalProjetos} projetos
              </Badge>
            </div>

            {/* Toggle Card/Lista */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "card" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="rounded-r-none"
                data-testid="view-mode-card"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Card
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
                data-testid="view-mode-list"
              >
                <ListIcon className="h-4 w-4 mr-2" />
                Lista
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Barra de Filtros */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-card border-b border-border px-6 py-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros:</span>
            </div>

            {/* Filtro de Data */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-48" data-testid="filter-date">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="this_month">Este mês</SelectItem>
                  <SelectItem value="last_month">Mês passado</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos de data personalizada */}
            {dateFilter === "custom" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Data Inicial</label>
                  <Input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="w-40"
                    data-testid="custom-date-start"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Data Final</label>
                  <Input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="w-40"
                    data-testid="custom-date-end"
                  />
                </div>
              </>
            )}

            {/* Filtro de Responsável */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
                <SelectTrigger className="w-48" data-testid="filter-responsavel">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {responsaveis.map((resp) => (
                    <SelectItem key={resp.id} value={resp.id}>
                      {resp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chips de filtros ativos e botão limpar */}
            {hasActiveFilters && (
              <>
                <div className="flex items-center gap-2">
                  {dateFilter !== "all" && (
                    <Badge variant="outline" className="gap-1">
                      {dateFilter === "this_month" && "Este mês"}
                      {dateFilter === "last_month" && "Mês passado"}
                      {dateFilter === "custom" && "Período personalizado"}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => {
                          setDateFilter("all");
                          setCustomDateStart("");
                          setCustomDateEnd("");
                        }}
                      />
                    </Badge>
                  )}
                  {responsavelFilter !== "all" && (
                    <Badge variant="outline" className="gap-1">
                      {responsaveis.find(r => r.id === responsavelFilter)?.nome}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setResponsavelFilter("all")}
                      />
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="clear-filters"
                >
                  Limpar filtros
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="w-full px-6"
            >

              {projetosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Youtube className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      {hasActiveFilters ? "Nenhum projeto encontrado com esses filtros" : "Nenhum projeto finalizado ainda"}
                    </p>
                    <p className="text-sm">
                      {hasActiveFilters ? "Tente ajustar os filtros para ver outros projetos." : "Os projetos aprovados aparecerão aqui."}
                    </p>
                  </div>
                </div>
              ) : viewMode === "list" ? (
                /* Visualização em Lista (Tabela) */
                <motion.div
                  variants={itemVariants}
                  className="rounded-md border"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Enviado</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data de Aprovação</TableHead>
                        <TableHead className="text-right">YouTube</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projetosFiltrados.map((projeto) => (
                        <TableRow key={projeto.id} data-testid={`table-row-${projeto.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={projeto.enviadoCliente || false}
                              onCheckedChange={(checked) => {
                                updateEnviadoMutation.mutate({
                                  id: projeto.id,
                                  enviado: checked as boolean
                                });
                              }}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{projeto.titulo}</TableCell>
                          <TableCell>{projeto.cliente?.nome || "-"}</TableCell>
                          <TableCell>{projeto.responsavel?.nome || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{projeto.tipoVideo?.nome}</Badge>
                          </TableCell>
                          <TableCell>
                            {projeto.dataAprovacao
                              ? format(new Date(projeto.dataAprovacao), "dd/MM/yyyy", { locale: ptBR })
                              : "-"
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {projeto.linkYoutube ? (
                              <a
                                href={projeto.linkYoutube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-chart-1 hover:underline"
                              >
                                <Youtube className="w-4 h-4 mr-1" />
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              canEdit(projeto) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditYoutubeLink(projeto)}
                                >
                                  <Youtube className="w-4 h-4" />
                                </Button>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Indicador de carregamento e observer para scroll infinito */}
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  )}
                  <div ref={observerTarget} className="h-4" />
                </motion.div>
              ) : (
                /* Visualização em Card (padrão) */
                <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {projetosFiltrados.map((projeto, index) => (
                    <motion.div
                      key={projeto.id}
                      variants={itemVariants}
                      custom={index}
                    >
                      <Card className="hover:shadow-lg transition-shadow" data-testid={`finalized-project-${projeto.id}`}>
                        <CardHeader className="pb-3 space-y-3">
                          {/* Status e Título */}
                          <div className="flex items-start justify-between gap-2">
                            {/* Título com mais espaço */}
                            <h3
                              className="text-base font-semibold text-foreground line-clamp-2 leading-tight flex-1"
                              title={projeto.titulo}
                              data-testid="project-title"
                            >
                              {projeto.titulo}
                            </h3>

                            {/* Checkbox Enviado */}
                            <div
                              className="flex items-center gap-1.5 px-2 py-1 flex-shrink-0"
                              title={projeto.enviadoCliente ? "Enviado ao cliente" : "Não enviado"}
                            >
                              <Checkbox
                                checked={projeto.enviadoCliente || false}
                                onCheckedChange={(checked) => {
                                  updateEnviadoMutation.mutate({
                                    id: projeto.id,
                                    enviado: checked as boolean
                                  });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                              <Send className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {projeto.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-3" data-testid="project-description">
                              {projeto.descricao}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <Badge variant="outline" data-testid="project-type">
                              {projeto.tipoVideo?.nome}
                            </Badge>
                          </div>

                          {projeto.tags && projeto.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1" data-testid="project-tags">
                              {projeto.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                              {projeto.responsavel?.fotoUrl && (
                                <AvatarImage
                                  src={projeto.responsavel.fotoUrl}
                                  alt={projeto.responsavel.nome}
                                  className="object-cover"
                                />
                              )}
                              <AvatarFallback
                                className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-xs"
                                style={{
                                  backgroundColor: projeto.responsavel?.nome
                                    ? `hsl(${(projeto.responsavel.nome.charCodeAt(0) * 137.5) % 360}, 70%, 50%)`
                                    : undefined
                                }}
                              >
                                {projeto.responsavel?.nome?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate" data-testid="project-responsible">
                                {projeto.responsavel?.nome}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Responsável
                              </p>
                            </div>
                          </div>

                          {projeto.dataAprovacao && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4 mr-2" />
                              <span data-testid="approval-date">
                                Aprovado em {format(new Date(projeto.dataAprovacao), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          )}

                          {projeto.cliente && (
                            <div className="text-sm text-muted-foreground" data-testid="project-client">
                              <strong>Cliente:</strong> {projeto.cliente.nome}
                            </div>
                          )}

                          {/* YouTube Link Section */}
                          <div className="border-t pt-4">
                            {projeto.linkYoutube ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Link do YouTube:</span>
                                  {canEdit(projeto) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditYoutubeLink(projeto)}
                                      data-testid="edit-youtube-link"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <a
                                  href={projeto.linkYoutube}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-chart-1 hover:underline"
                                  data-testid="youtube-link"
                                >
                                  <Youtube className="w-4 h-4 mr-2" />
                                  Ver no YouTube
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </div>
                            ) : (
                              canEdit(projeto) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditYoutubeLink(projeto)}
                                  className="w-full"
                                  data-testid="add-youtube-link"
                                >
                                  <Youtube className="w-4 h-4 mr-2" />
                                  Adicionar Link do YouTube
                                </Button>
                              )
                            )}
                          </div>

                          {/* NPS Section - Botão para ver pesquisa */}
                          {projeto.respostaNps && (
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Avaliação NPS:</span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    projeto.respostaNps.categoria === 'promotor' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' :
                                    projeto.respostaNps.categoria === 'neutro' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' :
                                    'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
                                  }`}
                                >
                                  <Star className="h-3 w-3 mr-1 fill-current" />
                                  {projeto.respostaNps.notaMedia}/10
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingNpsProject(projeto);
                                }}
                                className="w-full"
                                data-testid={`view-nps-${projeto.id}`}
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Ver Avaliação Completa
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Indicador de carregamento e observer para scroll infinito */}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                <div ref={observerTarget} className="h-4" />
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>

      {/* NPS Details Dialog */}
      <Dialog open={!!viewingNpsProject} onOpenChange={() => setViewingNpsProject(null)}>
        <DialogContent className="max-w-2xl" data-testid="nps-details-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-500 fill-yellow-600 dark:fill-yellow-500" />
              Avaliação NPS do Cliente
            </DialogTitle>
            <DialogDescription>
              Resultados da pesquisa de satisfação para o projeto: <strong>{viewingNpsProject?.titulo}</strong>
            </DialogDescription>
          </DialogHeader>

          {viewingNpsProject?.respostaNps && (
            <div className="space-y-6">
              {/* Categoria */}
              <div className="flex items-center justify-center">
                <Badge
                  className={`text-base px-4 py-2 ${
                    viewingNpsProject.respostaNps.categoria === 'promotor' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' :
                    viewingNpsProject.respostaNps.categoria === 'neutro' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' :
                    'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
                  }`}
                >
                  {viewingNpsProject.respostaNps.categoria === 'promotor' ? '😊 Cliente Promotor' :
                   viewingNpsProject.respostaNps.categoria === 'neutro' ? '😐 Cliente Neutro' :
                   '😞 Cliente Detrator'}
                </Badge>
              </div>

              {/* Perguntas e Respostas */}
              <div className="space-y-4">
                {/* Pergunta 1 */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    1. Em uma escala de 0 a 10, como você avalia nossos serviços prestados?
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold text-primary">{viewingNpsProject.respostaNps.notaServicos}</div>
                      <span className="text-sm text-muted-foreground">/ 10</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Serviços</Badge>
                  </div>
                </div>

                {/* Pergunta 2 */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    2. Em uma escala de 0 a 10, como você avalia nosso atendimento?
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold text-primary">{viewingNpsProject.respostaNps.notaAtendimento}</div>
                      <span className="text-sm text-muted-foreground">/ 10</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Atendimento</Badge>
                  </div>
                </div>

                {/* Pergunta 3 */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    3. Em uma escala de 0 a 10, qual a probabilidade de indicar o Grupo Skyline a um parceiro?
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold text-primary">{viewingNpsProject.respostaNps.notaIndicacao}</div>
                      <span className="text-sm text-muted-foreground">/ 10</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Indicação</Badge>
                  </div>
                </div>
              </div>

              {/* Média Final */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Média Geral</p>
                  <div className="flex items-center justify-center gap-2">
                    <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-500 fill-yellow-600 dark:fill-yellow-500" />
                    <span className="text-5xl font-bold text-primary">{viewingNpsProject.respostaNps.notaMedia}</span>
                    <span className="text-2xl text-muted-foreground">/ 10</span>
                  </div>
                </div>
              </div>

              {/* Comentário do Cliente */}
              {viewingNpsProject?.respostaNps?.comentario && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Comentário do Cliente:</span>
                  </div>
                  <p className="text-sm text-foreground italic leading-relaxed">
                    "{viewingNpsProject?.respostaNps?.comentario}"
                  </p>
                </div>
              )}

              {/* Data da resposta */}
              {viewingNpsProject.respostaNps.dataResposta && (
                <div className="text-center text-xs text-muted-foreground">
                  Respondido em {format(new Date(viewingNpsProject.respostaNps.dataResposta), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setViewingNpsProject(null)}
              data-testid="close-nps-details"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* YouTube Link Edit Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent data-testid="youtube-dialog">
          <DialogHeader>
            <DialogTitle>Editar Link do YouTube</DialogTitle>
            <DialogDescription>
              Adicione ou edite o link do vídeo aprovado no YouTube
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">URL do YouTube</label>
              <Input
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                data-testid="youtube-url-input"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingProject(null)}
                data-testid="cancel-youtube-edit"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveYoutubeLink}
                disabled={updateProjectMutation.isPending}
                data-testid="save-youtube-link"
              >
                {updateProjectMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
