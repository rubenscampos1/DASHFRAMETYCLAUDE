import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, AlertTriangle, Trash2 } from "lucide-react";
import { ProjetoWithRelations } from "@shared/schema";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectCardProps {
  projeto: ProjetoWithRelations;
  isDragging?: boolean;
  onEdit?: (projeto: ProjetoWithRelations) => void;
  onDelete?: (projetoId: string) => void;
}

const priorityColors = {
  "Alta": "destructive",
  "Média": "default", 
  "Baixa": "secondary",
} as const;

const statusColors = {
  "Briefing": "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200",
  "Roteiro": "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200",
  "Captação": "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200",
  "Edição": "bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-200",
  "Revisão": "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200",
  "Aguardando Aprovação": "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200",
  "Aprovado": "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200",
  "Em Pausa": "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200",
  "Cancelado": "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200",
};

export function ProjectCard({ projeto, isDragging, onEdit, onDelete }: ProjectCardProps) {
  const isOverdue = projeto.dataPrevistaEntrega && 
    isPast(new Date(projeto.dataPrevistaEntrega)) && 
    !["Aprovado", "Cancelado"].includes(projeto.status);

  const priorityBorderClass = {
    "Alta": "border-l-destructive",
    "Média": "border-l-chart-3", 
    "Baixa": "border-l-chart-4",
  }[projeto.prioridade];

  return (
    <Card 
      className={`
        project-card cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md
        ${priorityBorderClass} border-l-4
        ${isDragging ? "opacity-50 rotate-2 scale-105" : ""}
      `}
      onClick={() => onEdit?.(projeto)}
      data-testid={`project-card-${projeto.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-semibold text-foreground line-clamp-2" data-testid="project-title">
            {projeto.titulo}
          </h4>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={priorityColors[projeto.prioridade]}
              className="text-xs"
              data-testid="project-priority"
            >
              {projeto.prioridade}
            </Badge>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(projeto.id);
                }}
                data-testid={`delete-project-${projeto.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {projeto.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2" data-testid="project-description">
            {projeto.descricao}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <Badge className={statusColors[projeto.status] || "default"} data-testid="project-type">
            {projeto.tipoVideo?.nome}
          </Badge>
          {projeto.tags && projeto.tags.length > 0 && (
            <div className="flex flex-wrap gap-1" data-testid="project-tags">
              {projeto.tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {projeto.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{projeto.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {projeto.responsavel?.nome?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground" data-testid="project-responsible">
              {projeto.responsavel?.nome}
            </span>
          </div>
          
          <div className={`flex items-center text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            {isOverdue && <AlertTriangle className="w-3 h-3 mr-1" />}
            <Calendar className="w-3 h-3 mr-1" />
            <span data-testid="project-due-date">
              {projeto.dataPrevistaEntrega 
                ? format(new Date(projeto.dataPrevistaEntrega), "dd MMM", { locale: ptBR })
                : "Sem prazo"
              }
            </span>
          </div>
        </div>
        
        {projeto.cliente && (
          <div className="text-xs text-muted-foreground" data-testid="project-client">
            Cliente: {projeto.cliente.nome}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
