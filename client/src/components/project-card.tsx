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
  "Alta": "bg-red-500/90 text-white hover:bg-red-600",
  "Média": "bg-pink-500/90 text-white hover:bg-pink-600", 
  "Baixa": "bg-gray-500/90 text-white hover:bg-gray-600",
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
  const formattedDate = projeto.dataInterna 
    ? format(new Date(projeto.dataInterna), "dd MMM", { locale: ptBR })
    : null;

  return (
    <Card 
      className={`
        project-card cursor-pointer transition-all duration-200 hover:shadow-xl
        border-l-4 border-l-yellow-500 dark:border-l-yellow-400
        ${isDragging ? "opacity-50 rotate-2 scale-105" : ""}
        bg-card dark:bg-card/50 hover:bg-accent/10 dark:hover:bg-accent/5
      `}
      onClick={handleCardClick}
      data-testid={`project-card-${projeto.id}`}
    >
      <CardContent className="p-4 space-y-4">
        {/* Categoria - Badge grande no topo */}
        {projeto.tipoVideo && (
          <Badge 
            className="text-sm font-bold px-4 py-1.5 rounded-full"
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
              className="text-sm font-semibold px-3 py-1 rounded-md border-0"
              style={{
                backgroundColor: projeto.cliente.backgroundColor,
                color: projeto.cliente.textColor,
              }}
              data-testid="project-client"
            >
              {projeto.cliente.nome}
            </Badge>
          )}
          {projeto.empreendimento && (
            <Badge 
              className="text-sm font-semibold px-3 py-1 rounded-md border-0"
              style={{
                backgroundColor: projeto.empreendimento.backgroundColor,
                color: projeto.empreendimento.textColor,
              }}
              data-testid="project-empreendimento"
            >
              {projeto.empreendimento.nome}
            </Badge>
          )}
        </div>

        {/* Data V1 Interna - Destaque grande com ícone */}
        {formattedDate && (
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-muted-foreground" />
            <span className="text-3xl font-bold text-cyan-400 dark:text-cyan-300" data-testid="project-internal-date">
              {formattedDate}
            </span>
          </div>
        )}

        {/* Rodapé: Esquerda (ações + complexidade + data) e Direita (ícones + avatar) */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          {/* Esquerda: Lixeira + Duplicar + Badge Prioridade + Data pequena */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-50 hover:opacity-100 transition-opacity"
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
                    className="h-8 w-8 p-0 opacity-50 hover:opacity-100 transition-opacity"
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
              className={`${priorityColors[projeto.prioridade]} text-xs font-bold px-3 py-1 rounded-full shadow-sm`}
              data-testid="project-priority"
            >
              {projeto.prioridade}
            </Badge>

            {/* Data pequena repetida */}
            {formattedDate && (
              <span className="text-sm text-muted-foreground ml-2">
                {formattedDate}
              </span>
            )}
          </div>

          {/* Direita: Badge Comentários + Botões + Avatar */}
          <div className="flex items-center gap-2">
            {/* Badge de Comentários */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-1 opacity-70 hover:opacity-100"
                    onClick={handleViewComments}
                    data-testid={`comments-${projeto.id}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-semibold">{commentCount}</span>
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
                    className="h-8 w-8 p-0 opacity-50 hover:opacity-100 disabled:opacity-30"
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
                    className="h-8 w-8 p-0 opacity-50 hover:opacity-100 disabled:opacity-30"
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
                    className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
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

            {/* Avatar do responsável - maior e mais destacado */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/20" data-testid="project-avatar">
                    {projeto.responsavel?.fotoUrl && (
                      <AvatarImage src={projeto.responsavel.fotoUrl} alt={projeto.responsavel.nome} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                      {projeto.responsavel?.nome?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{projeto.responsavel?.nome}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
