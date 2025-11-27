/*
 * Página Finalizados - Melhorias:
 * - Toggle Card/Lista com persistência em localStorage
 * - Filtros por data (mês/ano) e responsável
 * - Visualização em tabela com colunas principais
 * - Paginação e estado vazio para filtros
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Calendar, Youtube, Edit, LayoutGrid, List as ListIcon, X, Filter, Star, Loader2 } from "lucide-react";
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

export default function Finalizados() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { mainContentClass } = useSidebarLayout();
  const [editingProject, setEditingProject] = useState<ProjetoWithRelations | null>(null);
  const [youtubeLink, setYoutubeLink] = useState("");

  // NPS State
  const [npsProject, setNpsProject] = useState<ProjetoWithRelations | null>(null);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsContact, setNpsContact] = useState("");
  const [npsResponsible, setNpsResponsible] = useState("");

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

  // Infinite Query para paginação otimizada
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/projetos", { status: "Aprovado" }],
    queryFn: async ({ pageParam }) => {
      const startTime = performance.now();
      console.log('⏱️ [Performance] Carregando página de projetos finalizados...', { cursor: pageParam });

      const params = new URLSearchParams();
      params.append('status', 'Aprovado');

      if (pageParam) {
        params.append('cursor', pageParam);
      }

      params.append('limit', '50');

      const response = await fetch(`/api/projetos?${params}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Erro ao carregar projetos finalizados");
      const data = await response.json();

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`⏱️ [Performance] Página carregada em ${duration}ms (${data.projetos.length} projetos, hasMore: ${data.hasMore})`);

      return data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined,
  });

  // Achatar as páginas em um único array de projetos
  const projetos = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.projetos);
  }, [data]);

  // Intersection Observer para scroll infinito
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('⏱️ [Performance] Carregando próxima página (Finalizados)...');
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
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

  const updateNpsMutation = useMutation({
    mutationFn: async ({ id, npsScore, npsContact, npsResponsible }: {
      id: string;
      npsScore: number | null;
      npsContact: string;
      npsResponsible: string;
    }) => {
      const response = await apiRequest("PUT", `/api/projetos/${id}/nps`, {
        npsScore,
        npsContact,
        npsResponsible
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      toast({
        title: "NPS salvo com sucesso!",
        description: "A avaliação do projeto foi registrada.",
      });
      setNpsProject(null);
      setNpsScore(null);
      setNpsContact("");
      setNpsResponsible("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar NPS",
        description: error.message,
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

  const handleEditNps = (projeto: ProjetoWithRelations) => {
    setNpsProject(projeto);
    setNpsScore(projeto.npsScore ?? null);
    setNpsContact(projeto.npsContact || "");
    setNpsResponsible(projeto.npsResponsible || "");
  };

  const handleSaveNps = () => {
    if (!npsProject) return;

    if (!npsContact.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o número de contato.",
        variant: "destructive",
      });
      return;
    }

    if (!npsResponsible.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o nome do responsável.",
        variant: "destructive",
      });
      return;
    }

    updateNpsMutation.mutate({
      id: npsProject.id,
      npsScore,
      npsContact: npsContact.trim(),
      npsResponsible: npsResponsible.trim(),
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
                {projetosFiltrados.length} projetos
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
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Data de Aprovação</TableHead>
                        <TableHead className="text-right">YouTube</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projetosFiltrados.map((projeto) => (
                        <TableRow key={projeto.id} data-testid={`table-row-${projeto.id}`}>
                          <TableCell className="font-medium">{projeto.titulo}</TableCell>
                          <TableCell>{projeto.cliente?.nome || "-"}</TableCell>
                          <TableCell>{projeto.responsavel?.nome || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{projeto.tipoVideo?.nome}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={projeto.prioridade === "Alta" ? "destructive" : "secondary"}>
                              {projeto.prioridade}
                            </Badge>
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

                  {/* Observer target e loading indicator para tabela */}
                  <div ref={observerTarget} className="h-4" />
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Visualização em Card (padrão) */
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {projetosFiltrados.map((projeto, index) => (
                    <motion.div
                      key={projeto.id}
                      variants={itemVariants}
                      custom={index}
                    >
                      <Card className="hover:shadow-lg transition-shadow" data-testid={`finalized-project-${projeto.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-foreground line-clamp-2" data-testid="project-title">
                              {projeto.titulo}
                            </h3>
                            <Badge className="bg-chart-4 text-white">
                              Finalizado
                            </Badge>
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
                            {projeto.prioridade && (
                              <Badge variant={projeto.prioridade === "Alta" ? "destructive" : "secondary"} data-testid="project-priority">
                                {projeto.prioridade}
                              </Badge>
                            )}
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
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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

                          {/* NPS Section */}
                          <div className="border-t pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Avaliação NPS:</span>
                              {projeto.npsScore ? (
                                <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                                  <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                  {projeto.npsScore}/10
                                </Badge>
                              ) : projeto.npsContact ? (
                                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900">
                                  Pendente
                                </Badge>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              variant={projeto.npsScore ? "ghost" : "outline"}
                              onClick={() => handleEditNps(projeto)}
                              className="w-full"
                              data-testid={`nps-button-${projeto.id}`}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              {projeto.npsScore
                                ? "Editar NPS"
                                : projeto.npsContact
                                  ? "Adicionar Nota"
                                  : "Cadastrar Contato"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {/* Observer target e loading indicator para grid */}
                  <div ref={observerTarget} className="h-4 col-span-full" />
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-8 col-span-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </main>
      </div>

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

      {/* NPS Dialog */}
      <Dialog open={!!npsProject} onOpenChange={() => setNpsProject(null)}>
        <DialogContent data-testid="nps-dialog">
          <DialogHeader>
            <DialogTitle>
              {npsProject?.npsScore ? "Editar NPS" : npsProject?.npsContact ? "Adicionar Nota NPS" : "Cadastrar Contato"}
            </DialogTitle>
            <DialogDescription>
              {npsProject?.npsContact
                ? "Adicione ou atualize a nota de satisfação do cliente"
                : "Cadastre primeiro o contato do responsável, a nota pode ser adicionada depois"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Nota (1 a 10) {!npsProject?.npsContact && <span className="text-muted-foreground">(opcional)</span>}
                </label>
                {npsScore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNpsScore(null)}
                    className="h-6 text-xs"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => setNpsScore(score)}
                    className={`w-10 h-10 rounded-md border-2 transition-all ${npsScore === score
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                      }`}
                    data-testid={`nps-score-${score}`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Número de Contato *</label>
              <Input
                value={npsContact}
                onChange={(e) => setNpsContact(e.target.value)}
                placeholder="(11) 99999-9999"
                data-testid="nps-contact-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nome do Responsável *</label>
              <Input
                value={npsResponsible}
                onChange={(e) => setNpsResponsible(e.target.value)}
                placeholder="Nome completo"
                data-testid="nps-responsible-input"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setNpsProject(null)}
                data-testid="cancel-nps"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveNps}
                disabled={updateNpsMutation.isPending}
                data-testid="save-nps"
              >
                {updateNpsMutation.isPending ? "Salvando..." : "Salvar NPS"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
