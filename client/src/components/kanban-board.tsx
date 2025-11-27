import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Loader2 } from "lucide-react";
import { ProjectCard } from "./project-card";
import { ProjectDetailsDrawer } from "./project-details-drawer";
import { ProjetoWithRelations } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const statusColumns = [
  { id: "Briefing", title: "Briefing", color: "bg-chart-3" },
  { id: "Roteiro", title: "Roteiro", color: "bg-chart-1" },
  { id: "Captação", title: "Captação", color: "bg-chart-4" },
  { id: "Edição", title: "Edição", color: "bg-chart-5" },
  { id: "Aguardando Aprovação", title: "Aguardando Aprovação", color: "bg-chart-3" },
  { id: "Aprovado", title: "Aprovado", color: "bg-chart-4", isDropZone: true },
];

interface KanbanBoardProps {
  filters?: {
    responsavelId?: string;
    tipoVideoId?: string;
    prioridade?: string;
    search?: string;
  };
}

export function KanbanBoard({ filters }: KanbanBoardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjetoWithRelations | null>(null);

  // Infinite Query para paginação otimizada
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["/api/projetos", filters],
    queryFn: async ({ pageParam }) => {
      const startTime = performance.now();
      console.log('⏱️ [Performance] Carregando página de projetos...', { filters, cursor: pageParam });

      const params = new URLSearchParams();

      // Adicionar filtros
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") params.append(key, value);
      });

      // Adicionar cursor para paginação
      if (pageParam) {
        params.append('cursor', pageParam);
      }

      // Limitar a 50 projetos por página para performance
      params.append('limit', '50');

      const response = await fetch(`/api/projetos?${params}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Erro ao carregar projetos");
      const data = await response.json();

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`⏱️ [Performance] Página carregada em ${duration}ms (${data.projetos.length} projetos, hasMore: ${data.hasMore})`);

      return data;
    },
    getNextPageParam: (lastPage) => {
      // Retornar o cursor da próxima página, ou undefined se não houver mais
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
        // Quando o elemento observado aparecer na tela, carregar mais
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log('⏱️ [Performance] Carregando próxima página...');
          fetchNextPage();
        }
      },
      { threshold: 0.1 } // Trigger quando 10% do elemento estiver visível
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/projetos/${id}`, { status });
      return response.json();
    },
    // Optimistic update: atualiza a UI imediatamente antes da resposta do servidor
    onMutate: async ({ id, status: newStatus }) => {
      // Cancelar queries em andamento para evitar conflito
      await queryClient.cancelQueries({ queryKey: ["/api/projetos", filters] });

      // Salvar estado anterior para rollback se necessário
      const previousData = queryClient.getQueryData(["/api/projetos", filters]);

      // Atualizar cache otimisticamente para infinite queries
      queryClient.setQueryData(["/api/projetos", filters], (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            projetos: page.projetos.map((projeto: ProjetoWithRelations) => {
              if (projeto.id === id) {
                return { ...projeto, status: newStatus };
              }
              return projeto;
            }),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: (updatedProject, { status }) => {
      // Invalidar queries para garantir sincronização com servidor
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });

      if (status === "Aprovado") {
        toast({
          title: "Projeto aprovado!",
          description: "O projeto foi aprovado com sucesso.",
        });
      } else {
        toast({
          title: "Status atualizado",
          description: "O projeto foi movido com sucesso.",
        });
      }
    },
    onError: (error: Error, variables, context) => {
      // Rollback: reverter para estado anterior em caso de erro
      if (context?.previousData) {
        queryClient.setQueryData(["/api/projetos", filters], context.previousData);
      }

      toast({
        title: "Erro ao atualizar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projetoId: string) => {
      await apiRequest("DELETE", `/api/projetos/${projetoId}`);
      return { success: true };
    },
    onMutate: async (projetoId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projetos", filters] });

      const previousData = queryClient.getQueryData(["/api/projetos", filters]);

      queryClient.setQueryData(["/api/projetos", filters], (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            projetos: page.projetos.filter((p: ProjetoWithRelations) => p.id !== projetoId),
          })),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });
      toast({
        title: "Projeto removido",
        description: "O projeto foi removido com sucesso.",
      });
    },
    onError: (error: Error, _projetoId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/projetos", filters], context.previousData);
      }
      toast({
        title: "Erro ao remover projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateProjectMutation = useMutation({
    mutationFn: async (projetoId: string) => {
      const response = await apiRequest("POST", `/api/projetos/${projetoId}/duplicar`);
      return response.json();
    },
    onMutate: async (projetoId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projetos", filters] });

      const previousData = queryClient.getQueryData(["/api/projetos", filters]);

      const originalProject = projetos.find(p => p.id === projetoId);
      if (originalProject) {
        const tempDuplicate = {
          ...originalProject,
          id: `temp-dup-${Date.now()}`,
          titulo: `${originalProject.titulo} (Cópia)`,
        };

        queryClient.setQueryData(["/api/projetos", filters], (old: any) => {
          if (!old?.pages) return old;

          // Adicionar o projeto temporário na primeira página
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) => {
              if (index === 0) {
                return {
                  ...page,
                  projetos: [tempDuplicate, ...page.projetos],
                };
              }
              return page;
            }),
          };
        });
      }

      return { previousData };
    },
    onSuccess: (newProject) => {
      queryClient.setQueryData(["/api/projetos", filters], (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            projetos: page.projetos.map((p: any) =>
              p.id.toString().startsWith('temp-dup-') ? newProject : p
            ),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });
      toast({
        title: "Projeto duplicado",
        description: "O projeto foi duplicado com sucesso. Agora você pode editá-lo.",
      });
    },
    onError: (error: Error, _projetoId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/projetos", filters], context.previousData);
      }
      toast({
        title: "Erro ao duplicar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Memoizar agrupamento de projetos por status para evitar recalcular em cada render
  const projectsByStatus = useMemo(() => {
    const grouped: Record<string, ProjetoWithRelations[]> = {};
    statusColumns.forEach(column => {
      grouped[column.id] = projetos.filter(projeto => projeto.status === column.id);
    });
    return grouped;
  }, [projetos]);

  // UseCallback para handlers de drag & drop
  const onDragStart = useCallback((start: any) => {
    setDraggedItem(start.draggableId);
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    setDraggedItem(null);

    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    const projeto = projetos.find(p => p.id === draggableId);
    if (!projeto) return;

    if (projeto.status !== newStatus) {
      updateProjectMutation.mutate({ id: draggableId, status: newStatus });
    }
  }, [projetos, updateProjectMutation]);

  return isLoading ? (
    <div className="h-full flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-2 md:px-0">
      {statusColumns.map((column) => (
        <div key={column.id} className="flex-shrink-0 w-[280px] min-w-[280px] md:w-80 md:min-w-0 h-full snap-center md:snap-align-none">
          <Card className="h-full flex flex-col">
            <CardHeader className="p-4 border-b border-border flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="text-sm font-medium">{column.title}</h3>
                <Badge variant="secondary" className="animate-pulse">...</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  ) : (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {/* Container principal com scroll horizontal suave no mobile, normal no desktop */}
      <div className="h-full flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-2 md:px-0" data-testid="kanban-board">
        {statusColumns.map((column) => {
          const columnProjects = projectsByStatus[column.id] || [];

          return (
            <div key={column.id} className="flex-shrink-0 w-[300px] min-w-[300px] md:w-80 md:min-w-0 h-full snap-center md:snap-align-none kanban-column relative group">
              {/* Background layer with glass effect - separate from content to avoid breaking fixed positioning */}
              <div className="absolute inset-0 glass-card border-0 rounded-xl" />

              {/* Content layer */}
              <Card className="h-full flex flex-col bg-transparent border-0 relative z-10">
                {/* Cabeçalho fixo da coluna */}
                <CardHeader className="p-4 border-b border-white/10 flex-shrink-0 bg-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${column.color}`} />
                      <h3 className="text-sm font-medium text-foreground">
                        {column.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs" data-testid={`column-count-${column.id}`}>
                        {columnProjects.length}
                      </Badge>
                    </div>
                    {column.isDropZone ? (
                      <CheckCircle className="h-4 w-4 text-chart-4" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                    )}
                  </div>
                </CardHeader>

                {/* Droppable com scroll vertical independente */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div className="flex-1 overflow-hidden">
                      <CardContent
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-4 space-y-3 h-full overflow-y-auto transition-colors ${snapshot.isDraggingOver ? "bg-accent/20" : ""
                          }`}
                        data-testid={`column-${column.id}`}
                      >
                        {column.isDropZone && columnProjects.length === 0 ? (
                          <div className="h-full flex items-center justify-center min-h-[200px]">
                            <div className="text-center text-muted-foreground">
                              <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-sm">Arraste projetos aqui para aprovar</p>
                              <p className="text-xs mt-1">Serão movidos para "Finalizados"</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {columnProjects.map((projeto, index) => (
                              <Draggable
                                key={projeto.id}
                                draggableId={projeto.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                  >
                                    <ProjectCard
                                      projeto={projeto}
                                      isDragging={snapshot.isDragging || draggedItem === projeto.id}
                                      onEdit={setSelectedProject}
                                      onDelete={(projetoId) => deleteProjectMutation.mutate(projetoId)}
                                      onDuplicate={(projetoId) => duplicateProjectMutation.mutate(projetoId)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}

                            {/* Observer target - só mostrar na primeira coluna para evitar múltiplos triggers */}
                            {column.id === statusColumns[0].id && (
                              <div ref={observerTarget} className="h-4" />
                            )}

                            {/* Loading indicator quando carregando próxima página */}
                            {column.id === statusColumns[0].id && isFetchingNextPage && (
                              <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            )}
                          </>
                        )}
                        {provided.placeholder}
                      </CardContent>
                    </div>
                  )}
                </Droppable>
              </Card>
            </div>
          );
        })}
      </div>

      <ProjectDetailsDrawer
        projeto={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        onProjectUpdate={(updatedProject) => {
          // Atualiza o projeto selecionado com os dados novos
          setSelectedProject(updatedProject);
        }}
      />
    </DragDropContext>
  );
}
