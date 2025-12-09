import { memo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, AlertTriangle, Trash2, Copy, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjetoWithRelations } from "@shared/schema";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { formatSequentialId } from "@/lib/utils";
import { ClientApprovalBadge } from "./client-approval-badge";
import { countClientApprovals } from "@/lib/approval-utils";

interface ProjectCardProps {
  projeto: ProjetoWithRelations;
  isDragging?: boolean;
  onEdit?: (projeto: ProjetoWithRelations) => void;
  onDelete?: (projetoId: string) => void;
  onDuplicate?: (projetoId: string) => void;
}

const statusColors = {
  "Briefing": "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200",
  "Roteiro": "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200",
  "Captação": "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200",
  "Edição": "bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-200",
  "Entrega": "bg-teal-100 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200",
  "Outros": "bg-slate-100 dark:bg-slate-900/20 text-slate-800 dark:text-slate-200",
  "Aguardando Aprovação": "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200",
  "Aprovado": "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200",
  "Em Pausa": "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200",
  "Cancelado": "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200",
};

const ProjectCardComponent = ({ projeto, isDragging, onEdit, onDelete, onDuplicate }: ProjectCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isOverdue = projeto.dataPrevistaEntrega &&
    isBefore(startOfDay(new Date(projeto.dataPrevistaEntrega)), startOfDay(new Date())) &&
    !["Aprovado", "Cancelado"].includes(projeto.status);

  // Contar aprovações do cliente
  const approvalCount = countClientApprovals(projeto);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card
        className={`
          glass-card project-card cursor-grab active:cursor-grabbing 
          transition-all duration-200 
          hover:shadow-md active:scale-[0.98] 
          rounded-xl
          ${isDragging ? "opacity-50 rotate-2 scale-105" : ""}
        `}
        onClick={() => onEdit?.(projeto)}
        data-testid={`project-card-${projeto.id}`}
      >
        <CardHeader className="pb-2 pt-4 px-4 md:px-6 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                className={`${statusColors[projeto.status] || "default"} text-xs md:text-xs px-2.5 py-1 rounded-lg`}
                data-testid="project-type"
              >
                {projeto.tipoVideo?.nome}
              </Badge>

              {/* Badge de aprovação do cliente */}
              <ClientApprovalBadge approvalCount={approvalCount} />
            </div>

            <Badge
              variant="outline"
              className="text-xs font-mono font-semibold px-2 py-1 rounded-md bg-secondary/50"
              data-testid="project-sequential-id"
            >
              {formatSequentialId(projeto.sequencialId)}
            </Badge>
          </div>

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
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 md:h-7 md:w-7 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground active:scale-95 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(projeto.id);
                  }}
                  data-testid={`duplicate-project-${projeto.id}`}
                >
                  <Copy className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 md:h-7 md:w-7 p-0 rounded-lg hover:bg-destructive hover:text-destructive-foreground active:scale-95 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  data-testid={`delete-project-${projeto.id}`}
                >
                  <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                {projeto.responsavel?.fotoUrl && (
                  <AvatarImage
                    src={projeto.responsavel.fotoUrl}
                    alt={projeto.responsavel.nome}
                    className="object-cover"
                  />
                )}
                <AvatarFallback
                  className="text-white font-semibold text-[10px]"
                  style={{
                    backgroundColor: projeto.responsavel?.nome
                      ? `hsl(${(projeto.responsavel.nome.charCodeAt(0) * 137.5) % 360}, 70%, 50%)`
                      : undefined
                  }}
                >
                  {projeto.responsavel?.nome?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[90px]" data-testid="project-responsible">
                {projeto.responsavel?.nome}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação para deletar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto "{projeto.titulo}" será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(projeto.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

// Função de comparação customizada para React.memo
// Detecta mudanças nos campos de aprovação para garantir que o badge funcione
const arePropsEqual = (
  prevProps: ProjectCardProps,
  nextProps: ProjectCardProps
): boolean => {
  // Se IDs diferentes, sempre re-renderizar
  if (prevProps.projeto.id !== nextProps.projeto.id) return false;

  // Verificar campos críticos de aprovação (para o badge funcionar)
  if (
    prevProps.projeto.musicaVisualizadaEm !== nextProps.projeto.musicaVisualizadaEm ||
    prevProps.projeto.locucaoVisualizadaEm !== nextProps.projeto.locucaoVisualizadaEm ||
    prevProps.projeto.videoFinalVisualizadoEm !== nextProps.projeto.videoFinalVisualizadoEm ||
    prevProps.projeto.musicaAprovada !== nextProps.projeto.musicaAprovada ||
    prevProps.projeto.locucaoAprovada !== nextProps.projeto.locucaoAprovada ||
    prevProps.projeto.videoFinalAprovado !== nextProps.projeto.videoFinalAprovado
  ) {
    return false;
  }

  // Verificar outros campos importantes
  if (
    prevProps.projeto.status !== nextProps.projeto.status ||
    prevProps.projeto.titulo !== nextProps.projeto.titulo ||
    prevProps.projeto.sequencialId !== nextProps.projeto.sequencialId ||
    prevProps.projeto.dataPrevistaEntrega !== nextProps.projeto.dataPrevistaEntrega ||
    prevProps.projeto.responsavel?.id !== nextProps.projeto.responsavel?.id ||
    prevProps.projeto.responsavel?.nome !== nextProps.projeto.responsavel?.nome ||
    prevProps.isDragging !== nextProps.isDragging
  ) {
    return false;
  }

  // Props são iguais, não precisa re-renderizar
  return true;
};

// Memoizar o componente com comparação customizada para performance
export const ProjectCard = memo(ProjectCardComponent, arePropsEqual);
