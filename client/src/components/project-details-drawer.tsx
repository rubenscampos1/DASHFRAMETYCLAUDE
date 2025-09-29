import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { X, Edit2, Save, MessageCircle, Calendar, Clock, Link as LinkIcon, User, Building2, Tag as TagIcon, AlertCircle, Trash2 } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { 
  insertProjetoSchema, 
  insertComentarioSchema,
  type ProjetoWithRelations, 
  type User as UserType, 
  type TipoVideo, 
  type Cliente, 
  type EmpreendimentoWithRelations,
  type ComentarioWithRelations,
  type InsertProjeto,
  type InsertComentario
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

// Schema específico para o formulário que aceita string no campo duracao
const formSchema = insertProjetoSchema.extend({
  duracao: z.string().optional().transform((val) => val && val !== "" ? Number(val) : undefined),
});

interface ProjectDetailsDrawerProps {
  projeto: ProjetoWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdate?: (updatedProject: ProjetoWithRelations) => void;
}

export function ProjectDetailsDrawer({ 
  projeto, 
  isOpen, 
  onClose, 
  onProjectUpdate 
}: ProjectDetailsDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Queries para dados auxiliares
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: tiposVideo = [] } = useQuery<TipoVideo[]>({
    queryKey: ["/api/tipos-video"],
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
  });

  const { data: empreendimentos = [] } = useQuery<EmpreendimentoWithRelations[]>({
    queryKey: ["/api/empreendimentos"],
  });

  // Query para comentários
  const { data: comentarios = [], refetch: refetchComentarios } = useQuery<ComentarioWithRelations[]>({
    queryKey: ["/api/projetos", projeto?.id, "comentarios"],
    enabled: !!projeto?.id,
  });

  // Form para edição
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: projeto?.titulo || "",
      descricao: projeto?.descricao || "",
      tipoVideoId: projeto?.tipoVideoId || "",
      responsavelId: projeto?.responsavelId || "",
      prioridade: projeto?.prioridade || "Média",
      status: projeto?.status || "Briefing",
      clienteId: projeto?.clienteId || "",
      empreendimentoId: projeto?.empreendimentoId || "",
      duracao: projeto?.duracao?.toString() || "",
      formato: projeto?.formato || "",
      captacao: projeto?.captacao || false,
      roteiro: projeto?.roteiro || false,
      locucao: projeto?.locucao || false,
      dataInterna: projeto?.dataInterna ? format(new Date(projeto.dataInterna), "yyyy-MM-dd") : "",
      dataMeeting: projeto?.dataMeeting ? format(new Date(projeto.dataMeeting), "yyyy-MM-dd") : "",
      dataPrevistaEntrega: projeto?.dataPrevistaEntrega ? format(new Date(projeto.dataPrevistaEntrega), "yyyy-MM-dd") : "",
      linkFrameIo: projeto?.linkFrameIo || "",
      linkYoutube: projeto?.linkYoutube || "",
      caminho: projeto?.caminho || "",
      referencias: projeto?.referencias || "",
      informacoesAdicionais: projeto?.informacoesAdicionais || "",
    },
  });

  // Mutation para atualizar projeto
  const updateProjectMutation = useMutation({
    mutationFn: async (data: InsertProjeto) => {
      const response = await apiRequest("PATCH", `/api/projetos/${projeto?.id}`, data);
      return response.json();
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });
      onProjectUpdate?.(updatedProject);
      setIsEditing(false);
      toast({
        title: "Projeto atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar projeto",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar comentário
  const createCommentMutation = useMutation({
    mutationFn: async (data: InsertComentario) => {
      const response = await apiRequest("POST", "/api/comentarios", data);
      return response.json();
    },
    onSuccess: () => {
      refetchComentarios();
      setNewComment("");
      toast({
        title: "Comentário adicionado!",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar comentário",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar comentário
  const deleteCommentMutation = useMutation({
    mutationFn: async (comentarioId: string) => {
      await apiRequest("DELETE", `/api/comentarios/${comentarioId}`);
    },
    onSuccess: () => {
      refetchComentarios();
      toast({
        title: "Comentário removido!",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover comentário",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    form.handleSubmit((data) => {
      // Filter out empty strings and convert types appropriately
      const submitData: any = {};
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          submitData[key] = value;
        }
      });
      
      // Handle special field conversions
      if (submitData.duracao) {
        submitData.duracao = Number(submitData.duracao);
      }
      if (submitData.dataInterna) {
        submitData.dataInterna = new Date(submitData.dataInterna);
      }
      if (submitData.dataMeeting) {
        submitData.dataMeeting = new Date(submitData.dataMeeting);
      }
      if (submitData.dataPrevistaEntrega) {
        submitData.dataPrevistaEntrega = new Date(submitData.dataPrevistaEntrega);
      }
      
      updateProjectMutation.mutate(submitData);
    })();
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const handleAddComment = () => {
    if (newComment.trim() && projeto && user) {
      createCommentMutation.mutate({
        projetoId: projeto.id,
        autorId: user.id,
        texto: newComment.trim(),
        anexos: [],
      });
    }
  };

  const handleDeleteComment = (comentarioId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este comentário?")) {
      deleteCommentMutation.mutate(comentarioId);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const statusColors: Record<string, string> = {
      "Briefing": "bg-blue-100 text-blue-800",
      "Roteiro": "bg-purple-100 text-purple-800", 
      "Captação": "bg-orange-100 text-orange-800",
      "Edição": "bg-green-100 text-green-800",
      "Entrega": "bg-teal-100 text-teal-800",
      "Outros": "bg-gray-100 text-gray-800",
      "Revisão": "bg-yellow-100 text-yellow-800",
      "Aguardando Aprovação": "bg-amber-100 text-amber-800",
      "Aprovado": "bg-emerald-100 text-emerald-800",
      "Em Pausa": "bg-slate-100 text-slate-800",
      "Cancelado": "bg-red-100 text-red-800"
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  if (!projeto) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh] max-w-4xl mx-auto">
        <DrawerHeader className="flex items-center justify-between border-b px-6 py-4">
          <DrawerTitle className="text-xl font-semibold">
            {projeto.titulo}
          </DrawerTitle>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-project"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateProjectMutation.isPending}
                  data-testid="button-save-project"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProjectMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" data-testid="button-close-drawer">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 h-[calc(90vh-120px)] overflow-y-auto px-6 py-4">
          <ScrollArea className="h-full">
            <Form {...form}>
              <div className="space-y-4">
                {/* Cliente - Empreendimento - Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Cliente
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="clienteId"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-cliente">
                                <SelectValue placeholder="Selecione um cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clientes.map((cliente) => (
                                <SelectItem key={cliente.id} value={cliente.id}>
                                  {cliente.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.cliente?.nome || "—"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Empreendimento
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="empreendimentoId"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-empreendimento">
                                <SelectValue placeholder="Selecione um empreendimento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {empreendimentos.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.nome} - {emp.cliente.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.empreendimento?.nome || "—"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Categoria
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="tipoVideoId"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tipo-video">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tiposVideo.map((tipo) => (
                                <SelectItem key={tipo.id} value={tipo.id}>
                                  {tipo.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.tipoVideo?.nome || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Fase, Duração e Formato */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fase
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["Briefing", "Roteiro", "Captação", "Edição", "Entrega", "Outros"].map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <Badge className={getStatusBadgeColor(projeto.status)}>
                      {projeto.status}
                    </Badge>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duração (minutos)
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="duracao"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Ex: 30"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value)}
                              data-testid="input-duracao"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.duracao ? `${projeto.duracao} min` : "—"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Formato
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="formato"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Ex: 16:9, Vertical, Quadrado"
                              {...field}
                              data-testid="input-formato"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.formato || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Checkboxes */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                  Serviços
                </label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="captacao"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-captacao"
                              />
                            </FormControl>
                            <label className="text-sm">Captação</label>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <Checkbox checked={projeto.captacao || false} disabled />
                        <label className="text-sm">Captação</label>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="roteiro"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-roteiro"
                              />
                            </FormControl>
                            <label className="text-sm">Roteiro</label>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <Checkbox checked={projeto.roteiro || false} disabled />
                        <label className="text-sm">Roteiro</label>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="locucao"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-locucao"
                              />
                            </FormControl>
                            <label className="text-sm">Locução</label>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <>
                        <Checkbox checked={projeto.locucao || false} disabled />
                        <label className="text-sm">Locução</label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data interna
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="dataInterna"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-data-interna"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.dataInterna ? format(new Date(projeto.dataInterna), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data meeting
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="dataMeeting"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-data-meeting"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.dataMeeting ? format(new Date(projeto.dataMeeting), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Entrega
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="dataPrevistaEntrega"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              data-testid="input-data-entrega"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {projeto.dataPrevistaEntrega ? format(new Date(projeto.dataPrevistaEntrega), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Link Frame.io
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="linkFrameIo"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="https://app.frame.io/..."
                              {...field}
                              data-testid="input-link-frameio"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1">
                      {projeto.linkFrameIo ? (
                        <a 
                          href={projeto.linkFrameIo} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {projeto.linkFrameIo}
                        </a>
                      ) : "—"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Link YouTube
                  </label>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="linkYoutube"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="https://youtube.com/watch?v=..."
                              {...field}
                              data-testid="input-link-youtube"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <p className="mt-1">
                      {projeto.linkYoutube ? (
                        <a 
                          href={projeto.linkYoutube} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {projeto.linkYoutube}
                        </a>
                      ) : "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* Caminho */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Caminho
                </label>
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="caminho"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Localização ou pasta do projeto"
                            {...field}
                            data-testid="input-caminho"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="mt-1 text-gray-900 dark:text-gray-100">
                    {projeto.caminho || "—"}
                  </p>
                )}
              </div>

              {/* Referências */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Referências
                </label>
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="referencias"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Links e referências (uma por linha)"
                            rows={3}
                            {...field}
                            data-testid="textarea-referencias"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="mt-1 text-gray-900 dark:text-gray-100">
                    {projeto.referencias ? (
                      <div className="space-y-1">
                        {projeto.referencias.split('\n').map((ref, index) => (
                          <div key={index}>
                            {ref.trim().startsWith('http') ? (
                              <a 
                                href={ref.trim()} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline block"
                              >
                                {ref.trim()}
                              </a>
                            ) : (
                              <p>{ref}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : "—"}
                  </div>
                )}
              </div>

              {/* Informações adicionais */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Informações adicionais
                </label>
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="informacoesAdicionais"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Informações extras sobre o projeto..."
                            rows={4}
                            {...field}
                            data-testid="textarea-info-adicionais"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {projeto.informacoesAdicionais || "—"}
                  </p>
                )}
              </div>

              <Separator />

              {/* Sistema de Comentários */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comentários
                </h3>

                {/* Lista de comentários */}
                <div className="space-y-4 mb-4">
                  {comentarios.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhum comentário ainda.</p>
                  ) : (
                    comentarios.map((comentario) => (
                      <Card key={comentario.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            {comentario.autor.fotoUrl && (
                              <AvatarImage src={comentario.autor.fotoUrl} alt={comentario.autor.nome} />
                            )}
                            <AvatarFallback>
                              {comentario.autor.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{comentario.autor.nome}</span>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(comentario.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              {user?.papel === "Admin" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteComment(comentario.id)}
                                  disabled={deleteCommentMutation.isPending}
                                  data-testid={`button-delete-comment-${comentario.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {comentario.texto}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                {/* Adicionar comentário */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    {user?.fotoUrl && (
                      <AvatarImage src={user.fotoUrl} alt={user.nome} />
                    )}
                    <AvatarFallback>
                      {user?.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Adicione um comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                      data-testid="textarea-new-comment"
                    />
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || createCommentMutation.isPending}
                      data-testid="button-add-comment"
                    >
                      {createCommentMutation.isPending ? "Enviando..." : "Comentar"}
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </Form>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}