import { memo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertTriangle, Trash2 } from "lucide-react";
import { ProjetoWithRelations } from "@shared/schema";
import { format, isBefore, startOfDay } from "date-fns";
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
  "Entrega": "bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200",
  "Outros": "bg-slate-100 dark:bg-slate-900/20 text-slate-800 dark:text-slate-200",
  "Revisão": "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200",
  "Aguardando Aprovação": "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200",
  "Aprovado": "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200",
  "Em Pausa": "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200",
  "Cancelado": "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200",
};

const ProjectCardComponent = ({ projeto, isDragging, onEdit, onDelete }: ProjectCardProps) => {
  const isOverdue = projeto.dataPrevistaEntrega && 
    isBefore(startOfDay(new Date(projeto.dataPrevistaEntrega)), startOfDay(new Date())) && 
    !["Aprovado", "Cancelado"].includes(projeto.status);

  const priorityBorderClass = {
    "Alta": "border-l-destructive",
    "Média": "border-l-chart-3", 
    "Baixa": "border-l-chart-4",
  }[projeto.prioridade];

  return (
    <Card 
      className={`
        project-card cursor-grab active:cursor-grabbing 
        transition-all duration-200 
        hover:shadow-md active:scale-[0.98] 
        rounded-xl
        ${priorityBorderClass} border-l-4
        ${isDragging ? "opacity-50 rotate-2 scale-105" : ""}
      `}
      onClick={() => onEdit?.(projeto)}
      data-testid={`project-card-${projeto.id}`}
    >
      <CardHeader className="pb-2 pt-4 px-4 md:px-6 space-y-2">
        <Badge 
          className={`${statusColors[projeto.status] || "default"} text-xs md:text-xs px-2.5 py-1 rounded-lg`}
          data-testid="project-type"
        >
          {projeto.tipoVideo?.nome}
        </Badge>

        <h4 className="text-sm md:text-sm font-bold text-foreground line-clamp-2 leading-snug min-h-[2.5rem]" data-testid="project-title">
          {projeto.titulo}
        </h4>
        
        <p className="text-xs md:text-xs text-muted-foreground line-clamp-1" data-testid="project-client">
          {projeto.cliente?.nome}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-3 pb-4 px-4 md:px-6">        
        <div className="flex items-center justify-between">
          <div className={`flex items-center text-xs md:text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            {isOverdue && <AlertTriangle className="w-4 h-4 md:w-3 md:h-3 mr-1.5" />}
            <Calendar className="w-4 h-4 md:w-3 md:h-3 mr-1.5" />
            <span data-testid="project-due-date">
              {projeto.dataPrevistaEntrega 
                ? format(new Date(projeto.dataPrevistaEntrega), "dd MMM", { locale: ptBR })
                : "Sem prazo"
              }
            </span>
          </div>
          
          {projeto.tags && projeto.tags.length > 0 && (
            <div className="flex gap-1.5" data-testid="project-tags">
              {projeto.tags.slice(0, 1).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs px-2 py-1 rounded-md">
                  {tag}
                </Badge>
              ))}
              {projeto.tags.length > 1 && (
                <Badge variant="outline" className="text-xs px-2 py-1 rounded-md">
                  +{projeto.tags.length - 1}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 md:h-7 md:w-7 p-0 rounded-lg hover:bg-destructive hover:text-destructive-foreground active:scale-95 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(projeto.id);
                }}
                data-testid={`delete-project-${projeto.id}`}
              >
                <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
              </Button>
            )}
            
            <Badge 
              variant={priorityColors[projeto.prioridade]}
              className="text-xs px-2.5 py-1.5 md:py-1 rounded-lg"
              data-testid="project-priority"
            >
              {projeto.prioridade}
            </Badge>
          </div>
          
          <span className="text-xs md:text-xs text-muted-foreground truncate max-w-[120px]" data-testid="project-responsible">
            {projeto.responsavel?.nome}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// Memoizar o componente para evitar re-renders desnecessários
// Usando shallow comparison padrão do React.memo para segurança
export const ProjectCard = memo(ProjectCardComponent);
