import { useState, useEffect, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle } from "lucide-react";
import { ProjectCard } from "./project-card";
import { ProjectDetailsDrawer } from "./project-details-drawer";
import { ProjetoWithRelations } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAutoScroll } from "@/hooks/use-auto-scroll";

const statusColumns = [
  { id: "Briefing", title: "Briefing", color: "bg-chart-3" },
  { id: "Roteiro", title: "Roteiro", color: "bg-chart-1" },
  { id: "Captação", title: "Captação", color: "bg-chart-4" },
  { id: "Edição", title: "Edição", color: "bg-chart-5" },
  { id: "Revisão", title: "Revisão", color: "bg-destructive" },
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
  const [isDragging, setIsDragging] = useState(false);
  const [orderedProjects, setOrderedProjects] = useState<ProjetoWithRelations[]>([]);
  
  // Hook de auto-scroll para arrastar cards até as bordas
  const scrollContainerRef = useAutoScroll({
    enabled: isDragging,
    scrollSpeed: 15,
    edgeSize: 150,
  });

  const { data: projetos = [], isLoading } = useQuery<ProjetoWithRelations[]>({
    queryKey: ["/api/projetos", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") params.append(key, value);
      });
      
      const response = await fetch(`/api/projetos?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Erro ao carregar projetos");
      const data = await response.json();
      
      // Show all projects including approved ones
      return data;
    },
  });

  // Atualizar orderedProjects quando projetos mudar
  useEffect(() => {
    if (projetos.length > 0) {
      setOrderedProjects(projetos);
    }
  }, [projetos]);

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/projetos/${id}`, { status });
      return response.json();
    },
    // Optimistic update: atualiza a UI imediatamente antes da resposta do servidor
    onMutate: async ({ id, status: newStatus }) => {
      // Cancelar queries em andamento para evitar conflito
      await queryClient.cancelQueries({ queryKey: ["/api/projetos"] });
      
      // Salvar estado anterior para rollback se necessário
      const previousProjetos = queryClient.getQueryData(["/api/projetos", filters]);
      
      // Atualizar cache otimisticamente
      queryClient.setQueryData(["/api/projetos", filters], (old: ProjetoWithRelations[] | undefined) => {
        if (!old) return old;
        return old.map(projeto => 
          projeto.id === id ? { ...projeto, status: newStatus } : projeto
        );
      });
      
      return { previousProjetos };
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
      if (context?.previousProjetos) {
        queryClient.setQueryData(["/api/projetos", filters], context.previousProjetos);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });
      toast({
        title: "Projeto removido",
        description: "O projeto foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Memoizar agrupamento de projetos por status para evitar recalcular em cada render
  const projectsByStatus = useMemo(() => {
    const grouped: Record<string, ProjetoWithRelations[]> = {};
    statusColumns.forEach(column => {
      grouped[column.id] = orderedProjects.filter(projeto => projeto.status === column.id);
    });
    return grouped;
  }, [orderedProjects]);

  // UseCallback para handlers de drag & drop
  const onDragStart = useCallback((start: any) => {
    setDraggedItem(start.draggableId);
    setIsDragging(true);
  }, []);

  const onDragEnd = useCallback((result: DropResult) => {
    setDraggedItem(null);
    setIsDragging(false);
    
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    
    // Se soltou na mesma posição, não faz nada
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const projeto = orderedProjects.find(p => p.id === draggableId);
    if (!projeto) return;

    const newStatus = destination.droppableId;
    
    // Reordena localmente para manter a posição visual
    setOrderedProjects(prev => {
      const newProjects = [...prev];
      
      // Encontra o projeto que está sendo movido
      const movedIndex = newProjects.findIndex(p => p.id === draggableId);
      const [movedProject] = newProjects.splice(movedIndex, 1);
      
      // Atualiza o status se mudou de coluna
      if (movedProject.status !== newStatus) {
        movedProject.status = newStatus as typeof movedProject.status;
      }
      
      // Filtra projetos por status
      const sourceColumn = newProjects.filter(p => p.status === source.droppableId);
      const destColumn = newProjects.filter(p => p.status === destination.droppableId);
      const otherProjects = newProjects.filter(p => 
        p.status !== source.droppableId && p.status !== destination.droppableId
      );
      
      // Insere na posição de destino
      destColumn.splice(destination.index, 0, movedProject);
      
      // Reconstrói a lista
      return [...otherProjects, ...sourceColumn, ...destColumn];
    });
    
    // Faz a requisição para o servidor apenas se mudou de status
    if (projeto.status !== newStatus) {
      updateProjectMutation.mutate({ id: draggableId, status: newStatus });
    }
  }, [orderedProjects, updateProjectMutation]);

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
      <div 
        ref={scrollContainerRef}
        className="h-full flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-2 md:px-0" 
        data-testid="kanban-board"
      >
        {statusColumns.map((column) => {
          const columnProjects = projectsByStatus[column.id] || [];
          
          return (
            <div key={column.id} className="flex-shrink-0 w-[300px] min-w-[300px] md:w-80 md:min-w-0 h-full snap-center md:snap-align-none kanban-column">
              {/* Cada coluna com header fixo e área droppable com scroll */}
              <Card className="h-full flex flex-col">
                {/* Cabeçalho fixo da coluna */}
                <CardHeader className="p-4 border-b border-border flex-shrink-0 bg-card">
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
                        className={`p-4 space-y-3 h-full overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver ? "bg-accent/50" : ""
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
                          columnProjects.map((projeto, index) => (
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
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))
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
