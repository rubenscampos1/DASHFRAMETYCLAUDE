import { useState, useEffect } from "react";
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

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/projetos/${id}`, { status });
      return response.json();
    },
    onSuccess: (updatedProject, { status }) => {
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
    onError: (error: Error) => {
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

  const duplicateProjectMutation = useMutation({
    mutationFn: async (projeto: ProjetoWithRelations) => {
      const newProject = {
        titulo: `${projeto.titulo} (cópia)`,
        descricao: projeto.descricao,
        tipoVideoId: projeto.tipoVideoId,
        tags: projeto.tags || [],
        status: projeto.status,
        responsavelId: projeto.responsavelId,
        dataPrevistaEntrega: projeto.dataPrevistaEntrega,
        prioridade: projeto.prioridade,
        clienteId: projeto.clienteId,
        empreendimentoId: projeto.empreendimentoId,
        anexos: projeto.anexos || [],
        linkYoutube: projeto.linkYoutube,
        duracao: projeto.duracao,
        formato: projeto.formato,
        captacao: projeto.captacao,
        roteiro: projeto.roteiro,
        locucao: projeto.locucao,
        dataInterna: projeto.dataInterna,
        dataMeeting: projeto.dataMeeting,
        linkFrameIo: projeto.linkFrameIo,
        caminho: projeto.caminho,
        referencias: projeto.referencias,
        informacoesAdicionais: projeto.informacoesAdicionais,
      };
      const response = await apiRequest("POST", "/api/projetos", newProject);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });
      toast({
        title: "Projeto duplicado",
        description: "O projeto foi duplicado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao duplicar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = (projetoId: string) => {
    updateProjectMutation.mutate({ id: projetoId, status: "Aprovado" });
  };

  const onDragStart = (start: any) => {
    setDraggedItem(start.draggableId);
  };

  const onDragEnd = (result: DropResult) => {
    setDraggedItem(null);
    
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    const projeto = projetos.find(p => p.id === draggableId);
    if (!projeto) return;

    // Allow all authenticated users to change project status

    if (projeto.status !== newStatus) {
      updateProjectMutation.mutate({ id: draggableId, status: newStatus });
    }
  };

  const getProjectsByStatus = (status: string) => {
    return projetos.filter(projeto => projeto.status === status);
  };

  return isLoading ? (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {statusColumns.map((column) => (
        <div key={column.id} className="flex-shrink-0 w-80">
          <Card className="h-full">
            <CardHeader className="p-4 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="text-sm font-medium">{column.title}</h3>
                <Badge variant="secondary" className="animate-pulse">...</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
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
      <div className="flex space-x-4 overflow-x-auto pb-4" data-testid="kanban-board">
        {statusColumns.map((column) => {
          const columnProjects = getProjectsByStatus(column.id);
          
          return (
            <div key={column.id} className="flex-shrink-0 w-80 kanban-column">
              <Card className="h-full">
                <CardHeader className="p-4 border-b border-border">
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
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-4 space-y-3 min-h-[500px] transition-colors ${
                        snapshot.isDraggingOver ? "bg-accent/50" : ""
                      }`}
                      data-testid={`column-${column.id}`}
                    >
                      {column.isDropZone && columnProjects.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
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
                                  onDuplicate={(projeto) => duplicateProjectMutation.mutate(projeto)}
                                  onMarkComplete={handleMarkComplete}
                                  onViewComments={setSelectedProject}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </CardContent>
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
      />
    </DragDropContext>
  );
}
