import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getApprovalDetails } from "@/lib/approval-utils";
import { X, Edit2, Save, MessageCircle, Calendar, Clock, Link as LinkIcon, User, Building2, Tag as TagIcon, AlertCircle, Trash2, Copy, ExternalLink } from "lucide-react";

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
import { formatSequentialId } from "@/lib/utils";
import { ProjetoMusicas } from "@/components/projeto-musicas";
import { ProjetoLocutores } from "@/components/projeto-locutores";

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

  // Query para buscar o projeto completo (com todos os campos)
  const { data: projetoCompleto, refetch: refetchProjeto } = useQuery<ProjetoWithRelations>({
    queryKey: ["/api/projetos", projeto?.id],
    enabled: !!projeto?.id && isOpen,
  });

  // Usa o projeto completo se disponível, senão usa o projeto do prop
  const projetoAtual = projetoCompleto || projeto;

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
      titulo: projetoAtual?.titulo || "",
      descricao: projetoAtual?.descricao || "",
      tipoVideoId: projetoAtual?.tipoVideoId || "",
      responsavelId: projetoAtual?.responsavelId || "",
      prioridade: projetoAtual?.prioridade || "Média",
      status: projetoAtual?.status || "Briefing",
      clienteId: projetoAtual?.clienteId || "",
      empreendimentoId: projetoAtual?.empreendimentoId || "",
      duracao: projetoAtual?.duracao?.toString() || "",
      formato: projetoAtual?.formato || "",
      captacao: projetoAtual?.captacao || false,
      roteiro: projetoAtual?.roteiro || false,
      locucao: projetoAtual?.locucao || false,
      dataInterna: projetoAtual?.dataInterna ? format(new Date(projetoAtual.dataInterna), "yyyy-MM-dd") : "",
      dataMeeting: projetoAtual?.dataMeeting ? format(new Date(projetoAtual.dataMeeting), "yyyy-MM-dd") : "",
      dataPrevistaEntrega: projetoAtual?.dataPrevistaEntrega ? format(new Date(projetoAtual.dataPrevistaEntrega), "yyyy-MM-dd") : "",
      linkFrameIo: projetoAtual?.linkFrameIo || "",
      linkYoutube: projetoAtual?.linkYoutube || "",
      caminho: projetoAtual?.caminho || "",
      referencias: projetoAtual?.referencias || "",
      informacoesAdicionais: projetoAtual?.informacoesAdicionais || "",
    },
  });

  // Atualiza o formulário quando o projeto completo é carregado
  useEffect(() => {
    if (projetoAtual) {
      form.reset({
        titulo: projetoAtual.titulo || "",
        descricao: projetoAtual.descricao || "",
        tipoVideoId: projetoAtual.tipoVideoId || "",
        responsavelId: projetoAtual.responsavelId || "",
        prioridade: projetoAtual.prioridade || "Média",
        status: projetoAtual.status || "Briefing",
        clienteId: projetoAtual.clienteId || "",
        empreendimentoId: projetoAtual.empreendimentoId || "",
        duracao: projetoAtual.duracao?.toString() || "",
        formato: projetoAtual.formato || "",
        captacao: projetoAtual.captacao || false,
        roteiro: projetoAtual.roteiro || false,
        locucao: projetoAtual.locucao || false,
        dataInterna: projetoAtual.dataInterna ? format(new Date(projetoAtual.dataInterna), "yyyy-MM-dd") : "",
        dataMeeting: projetoAtual.dataMeeting ? format(new Date(projetoAtual.dataMeeting), "yyyy-MM-dd") : "",
        dataPrevistaEntrega: projetoAtual.dataPrevistaEntrega ? format(new Date(projetoAtual.dataPrevistaEntrega), "yyyy-MM-dd") : "",
        linkFrameIo: projetoAtual.linkFrameIo || "",
        linkYoutube: projetoAtual.linkYoutube || "",
        caminho: projetoAtual.caminho || "",
        referencias: projetoAtual.referencias || "",
        informacoesAdicionais: projetoAtual.informacoesAdicionais || "",
      });
    }
  }, [projetoAtual, form]);

  // Observar campo clienteId para filtrar empreendimentos
  const clienteSelecionado = form.watch("clienteId");

  // Filtrar empreendimentos baseado no cliente selecionado
  const empreendimentosFiltrados = useMemo(() => {
    if (!clienteSelecionado || clienteSelecionado === "") {
      return empreendimentos; // Se nenhum cliente selecionado, mostra todos
    }
    return empreendimentos.filter(emp => emp.clienteId === clienteSelecionado);
  }, [empreendimentos, clienteSelecionado]);

  // Limpar empreendimento quando cliente mudar
  useEffect(() => {
    const empreendimentoAtual = form.getValues("empreendimentoId");
    if (empreendimentoAtual && clienteSelecionado) {
      // Verifica se o empreendimento selecionado pertence ao novo cliente
      const empreendimentoValido = empreendimentos.find(
        emp => emp.id === empreendimentoAtual && emp.clienteId === clienteSelecionado
      );

      // Se não pertence, limpar o campo
      if (!empreendimentoValido) {
        form.setValue("empreendimentoId", "");
      }
    }
  }, [clienteSelecionado, empreendimentos, form]);

  // Mutation para atualizar projeto
  const updateProjectMutation = useMutation({
    mutationFn: async (data: InsertProjeto & { projectId: string }) => {
      const { projectId, ...updateData } = data;
      const response = await apiRequest("PATCH", `/api/projetos/${projectId}`, updateData);
      return response.json();
    },
    onSuccess: (updatedProject) => {
      // Invalida queries para refetch - isso fará com que o projeto seja atualizado
      queryClient.invalidateQueries({ queryKey: ["/api/projetos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });

      // Atualiza o callback do parent com os dados novos
      onProjectUpdate?.(updatedProject);

      // O useEffect vai atualizar o formulário quando o projeto for atualizado
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
    if (!projetoAtual?.id) {
      toast({
        title: "Erro",
        description: "ID do projeto não encontrado.",
        variant: "destructive",
      });
      return;
    }

    form.handleSubmit((data) => {
      // Convert types appropriately and handle empty strings
      const submitData: any = {};

      Object.entries(data).forEach(([key, value]) => {
        // Include all fields, even empty strings (to allow clearing fields)
        // But skip undefined and null values
        if (value !== null && value !== undefined) {
          submitData[key] = value;
        }
      });

      // Handle special field conversions
      if (submitData.duracao) {
        submitData.duracao = Number(submitData.duracao);
      }
      // O schema já converte as strings de data para Date corretamente

      // Adiciona o ID do projeto para garantir que o projeto correto seja atualizado
      updateProjectMutation.mutate({
        ...submitData,
        projectId: projetoAtual.id,
      });
    })();
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const handleCopyClientLink = async () => {

    // Refetch para garantir que temos os dados mais recentes
    const { data: projetoAtualizado } = await refetchProjeto();
    const projetoParaCopiar = projetoAtualizado || projetoAtual;


    if (projetoParaCopiar?.clientToken) {
      const clientLink = `${window.location.origin}/cliente/${projetoParaCopiar.clientToken}`;

      // Função para copiar que funciona tanto em HTTP quanto HTTPS
      const copyToClipboard = (text: string): boolean => {
        // Tentar usar a API moderna primeiro (funciona em HTTPS e localhost)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text)
            .then(() => {
              toast({
                title: "Link copiado!",
                description: "O link do portal do cliente foi copiado para a área de transferência",
              });
            })
            .catch((err) => {
              // Se falhar, tenta o fallback
              fallbackCopy(text);
            });
          return true;
        }

        // Se não há API moderna, usa fallback diretamente
        return fallbackCopy(text);
      };

      // Fallback para HTTP (usando método antigo)
      const fallbackCopy = (text: string): boolean => {
        let textArea: HTMLTextAreaElement | null = null;

        try {

          // Focar no documento primeiro
          window.focus();

          textArea = document.createElement("textarea");
          textArea.value = text;

          // IMPORTANTE: Fazer o textarea visível mas fora da viewport
          // Alguns navegadores não copiam de elementos invisíveis
          textArea.style.position = "fixed";
          textArea.style.top = "0";
          textArea.style.left = "-9999px";
          textArea.style.width = "1px";
          textArea.style.height = "1px";
          textArea.style.padding = "0";
          textArea.style.border = "none";
          textArea.style.outline = "none";
          textArea.style.boxShadow = "none";
          textArea.style.background = "transparent";
          textArea.style.color = "transparent";
          textArea.setAttribute('readonly', '');
          // Importante: não usar display:none ou visibility:hidden

          document.body.appendChild(textArea);

          // Dar um pequeno delay para o DOM processar
          textArea.focus();
          textArea.select();

          // setSelectionRange é mais confiável
          const length = textArea.value.length;
          try {
            textArea.setSelectionRange(0, length);
          } catch (e) {
          }

          // Executar o comando de cópia
          let successful = false;
          try {
            successful = document.execCommand('copy');

            // Verificar o que foi copiado (se possível)
            if (successful) {
            }
          } catch (err) {
            console.error("[COPY] execCommand exception:", err);
            successful = false;
          }

          // Remover o textarea após um delay maior
          setTimeout(() => {
            if (textArea && document.body.contains(textArea)) {
              document.body.removeChild(textArea);
            }
          }, 300);

          if (successful) {
            // Mostrar mensagem com o link para o usuário verificar
            toast({
              title: "Link copiado!",
              description: `Link: ${text}`,
              duration: 5000,
            });
            return true;
          } else {
            throw new Error("execCommand retornou false");
          }
        } catch (err) {
          console.error("[COPY] Fallback falhou:", err);

          // Limpar o textarea se ainda existir
          if (textArea && document.body.contains(textArea)) {
            document.body.removeChild(textArea);
          }

          // Mostrar o link completo para copiar manualmente
          toast({
            title: "Link do portal do cliente",
            description: text,
            duration: 10000,
          });

          // Criar um alerta para facilitar a cópia manual
          setTimeout(() => {
            const copiarManual = window.confirm(
              `Link do portal do cliente:\n\n${text}\n\nClique OK para selecionar e copiar manualmente.`
            );
            if (copiarManual) {
              // Tentar uma última vez com prompt
              window.prompt("Copie este link (Ctrl+C ou Cmd+C):", text);
            }
          }, 100);

          return false;
        }
      };

      // Executar a cópia
      copyToClipboard(clientLink);
    } else {
      console.error("Cliente token não encontrado!");
      toast({
        title: "Erro",
        description: "Este projeto ainda não tem um link do cliente. Tente recarregar a página.",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && projetoAtual && user) {
      createCommentMutation.mutate({
        projetoId: projetoAtual.id,
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
      "Aguardando Aprovação": "bg-amber-100 text-amber-800",
      "Aprovado": "bg-emerald-100 text-emerald-800",
      "Em Pausa": "bg-slate-100 text-slate-800",
      "Cancelado": "bg-red-100 text-red-800"
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  if (!projetoAtual) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh] max-w-4xl mx-auto glass">
        <DrawerHeader className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="text-sm font-mono font-semibold px-2.5 py-1 rounded-md bg-secondary/50"
              data-testid="project-details-sequential-id"
            >
              {formatSequentialId(projetoAtual.sequencialId)}
            </Badge>
            <DrawerTitle className="text-xl font-semibold">
              {projetoAtual.titulo}
            </DrawerTitle>
          </div>
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
                {/* Link do Portal do Cliente */}
                {projetoAtual?.clientToken && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <label className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2 mb-2">
                      <ExternalLink className="h-4 w-4" />
                      Link do Portal do Cliente
                    </label>
                    <Input
                      readOnly
                      value={`${window.location.origin}/cliente/${projetoAtual.clientToken}`}
                      className="font-mono text-sm bg-white dark:bg-gray-800 cursor-pointer"
                      onClick={(e) => {
                        e.currentTarget.select();
                        handleCopyClientLink();
                      }}
                      onFocus={(e) => {
                        e.currentTarget.select();
                      }}
                    />
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      {window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.protocol.startsWith('https') ? (
                        <>
                          Clique no campo acima para copiar o link.
                        </>
                      ) : (
                        <>
                          Clique no campo para copiar o link e compartilhar com o cliente.
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Aprovações do Cliente */}
                {projetoAtual && getApprovalDetails(projetoAtual).length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <label className="text-sm font-semibold text-green-900 dark:text-green-100 flex items-center gap-2 mb-3">
                      🎉 Aprovações do Cliente
                    </label>
                    <div className="space-y-3">
                      {getApprovalDetails(projetoAtual).map((approval, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 rounded-md p-3 border border-green-100 dark:border-green-900">
                          <div className="flex items-start gap-2">
                            <span className="text-2xl">{approval.icon}</span>
                            <div className="flex-1">
                              <div className="font-medium text-sm text-green-900 dark:text-green-100">
                                {approval.type} aprovado
                              </div>
                              {approval.date && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {format(new Date(approval.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                              )}
                              {approval.feedback && (
                                <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                  "{approval.feedback}"
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Título */}
                {isEditing && (
                  <div>
                    <FormField
                      control={form.control}
                      name="titulo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do Projeto</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Digite o título do projeto"
                              {...field}
                              data-testid="input-titulo"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Descrição */}
                {isEditing && (
                  <div>
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Digite a descrição do projeto"
                              {...field}
                              data-testid="textarea-descricao"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

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
                        {projetoAtual.cliente?.nome || "—"}
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
                                {empreendimentosFiltrados.map((emp) => (
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
                        {projetoAtual.empreendimento?.nome || "—"}
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
                        {projetoAtual.tipoVideo?.nome || "—"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Responsável, Duração e Formato */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Responsável
                    </label>
                    {isEditing ? (
                      <FormField
                        control={form.control}
                        name="responsavelId"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-responsavel">
                                  <SelectValue placeholder="Selecione (opcional)..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.nome}
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
                        {projetoAtual.responsavel?.nome || "—"}
                      </p>
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
                        {projetoAtual.duracao ? `${projetoAtual.duracao} min` : "—"}
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
                        {projetoAtual.formato || "—"}
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
                          <Checkbox checked={projetoAtual.captacao || false} disabled />
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
                          <Checkbox checked={projetoAtual.roteiro || false} disabled />
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
                          <Checkbox checked={projetoAtual.locucao || false} disabled />
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
                        {projetoAtual.dataInterna ? format(new Date(projetoAtual.dataInterna), "dd/MM/yyyy", { locale: ptBR }) : "—"}
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
                        {projetoAtual.dataMeeting ? format(new Date(projetoAtual.dataMeeting), "dd/MM/yyyy", { locale: ptBR }) : "—"}
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
                        {projetoAtual.dataPrevistaEntrega ? format(new Date(projetoAtual.dataPrevistaEntrega), "dd/MM/yyyy", { locale: ptBR }) : "—"}
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
                        {projetoAtual.linkFrameIo ? (
                          <a
                            href={projetoAtual.linkFrameIo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {projetoAtual.linkFrameIo}
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
                        {projetoAtual.linkYoutube ? (
                          <a
                            href={projetoAtual.linkYoutube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {projetoAtual.linkYoutube}
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
                      {projetoAtual.caminho || "—"}
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
                      {projetoAtual.referencias ? (
                        <div className="space-y-1">
                          {projetoAtual.referencias.split('\n').map((ref, index) => (
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
                      {projetoAtual.informacoesAdicionais || "—"}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Músicas do Projeto */}
                {projetoAtual && <ProjetoMusicas projetoId={projetoAtual.id} />}

                {/* Locutores do Projeto */}
                {projetoAtual && <ProjetoLocutores projetoId={projetoAtual.id} />}

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
                              {comentario.autor?.fotoUrl && (
                                <AvatarImage src={comentario.autor?.fotoUrl} alt={comentario.autor?.nome || "Avatar"} />
                              )}
                              <AvatarFallback>
                                {comentario.autor?.nome?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{comentario.autor?.nome || 'Usuário desconhecido'}</span>
                                  <span className="text-xs text-gray-500">
                                    {comentario.createdAt ? format(new Date(comentario.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ""}
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
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap select-text">
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