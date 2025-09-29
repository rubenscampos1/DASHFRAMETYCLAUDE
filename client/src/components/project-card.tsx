import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Trash2, 
  Copy, 
  Check, 
  Youtube, 
  MessageSquare,
  ExternalLink
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProjetoWithRelations } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProjectCardProps {
  projeto: ProjetoWithRelations;
  isDragging?: boolean;
  onEdit?: (projeto: ProjetoWithRelations) => void;
  onDelete?: (projetoId: string) => void;
  onDuplicate?: (projeto: ProjetoWithRelations) => void;
  onMarkComplete?: (projetoId: string) => void;
  onViewComments?: (projeto: ProjetoWithRelations) => void;
}

const priorityColors = {
  "Alta": "bg-red-500 text-white hover:bg-red-600",
  "Média": "bg-pink-500 text-white hover:bg-pink-600", 
  "Baixa": "bg-gray-400 text-white hover:bg-gray-500",
} as const;

export function ProjectCard({ 
  projeto, 
  isDragging, 
  onEdit, 
  onDelete,
  onDuplicate,
  onMarkComplete,
  onViewComments 
}: ProjectCardProps) {
  const handleCardClick = () => {
    onEdit?.(projeto);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja remover o projeto "${projeto.titulo}"?`)) {
      onDelete?.(projeto.id);
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate?.(projeto);
  };

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkComplete?.(projeto.id);
  };

  const handleViewComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewComments?.(projeto);
  };

  const handleOpenLink = (e: React.MouseEvent, url: string | null) => {
    e.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const commentCount = projeto.comentarios?.length || 0;

  return (
    <Card 
      className={`
        project-card cursor-pointer transition-all duration-200 hover:shadow-lg
        border-l-4 border-l-yellow-500
        ${isDragging ? "opacity-50 rotate-2 scale-105" : ""}
        bg-card hover:bg-accent/5
      `}
      onClick={handleCardClick}
      data-testid={`project-card-${projeto.id}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Categoria - Badge grande no topo */}
        {projeto.tipoVideo && (
          <Badge 
            className="text-sm font-semibold px-3 py-1"
            style={{
              backgroundColor: projeto.tipoVideo.backgroundColor,
              color: projeto.tipoVideo.textColor
            }}
            data-testid="project-category"
          >
            {projeto.tipoVideo.nome}
          </Badge>
        )}

        {/* Cliente e Empreendimento lado a lado */}
        <div className="flex items-center gap-2 flex-wrap">
          {projeto.cliente && (
            <Badge 
              variant="outline"
              className="text-xs font-medium"
              style={{
                backgroundColor: projeto.cliente.backgroundColor,
                color: projeto.cliente.textColor,
                borderColor: projeto.cliente.backgroundColor
              }}
              data-testid="project-client"
            >
              {projeto.cliente.nome}
            </Badge>
          )}
          {projeto.empreendimento && (
            <Badge 
              variant="outline"
              className="text-xs font-medium"
              style={{
                backgroundColor: projeto.empreendimento.backgroundColor,
                color: projeto.empreendimento.textColor,
                borderColor: projeto.empreendimento.backgroundColor
              }}
              data-testid="project-empreendimento"
            >
              {projeto.empreendimento.nome}
            </Badge>
          )}
        </div>

        {/* Data V1 Interna - Destaque grande */}
        {projeto.dataInterna && (
          <div className="flex items-center gap-2 py-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-2xl font-bold text-foreground" data-testid="project-internal-date">
              {format(new Date(projeto.dataInterna), "dd MMM", { locale: ptBR })}
            </span>
          </div>
        )}

        {/* Rodapé: Esquerda (ações + complexidade) e Direita (avatar + botões) */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {/* Esquerda: Lixeira + Duplicar + Complexidade */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                    onClick={handleDelete}
                    data-testid={`delete-project-${projeto.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remover projeto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                    onClick={handleDuplicate}
                    data-testid={`duplicate-project-${projeto.id}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicar projeto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Badge 
              className={`${priorityColors[projeto.prioridade]} text-xs font-medium px-3 py-1`}
              data-testid="project-priority"
            >
              {projeto.prioridade}
            </Badge>
          </div>

          {/* Direita: Avatar + Badge Comentários + 3 Botões */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer" data-testid="project-avatar">
                    {projeto.responsavel?.fotoUrl && (
                      <AvatarImage src={projeto.responsavel.fotoUrl} alt={projeto.responsavel.nome} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {projeto.responsavel?.nome?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{projeto.responsavel?.nome}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Badge de Comentários */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1"
                    onClick={handleViewComments}
                    data-testid={`comments-${projeto.id}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-medium">{commentCount}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ver comentários</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botão Frame.io */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => handleOpenLink(e, projeto.linkFrameIo)}
                    disabled={!projeto.linkFrameIo}
                    data-testid={`frameio-${projeto.id}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{projeto.linkFrameIo ? "Abrir Frame.io" : "Link não definido"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botão YouTube */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => handleOpenLink(e, projeto.linkYoutube)}
                    disabled={!projeto.linkYoutube}
                    data-testid={`youtube-${projeto.id}`}
                  >
                    <Youtube className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{projeto.linkYoutube ? "Abrir YouTube" : "Link não definido"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botão Check (Marcar como Aprovado) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleMarkComplete}
                    data-testid={`complete-${projeto.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Marcar como aprovado</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
