import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { type InsertProjeto, type User, type TipoVideo, type Cliente, type EmpreendimentoWithRelations } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

// Schema para o formulário (usa strings, não Date)
const formSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().optional(),
  tipoVideoId: z.string().min(1, "Tipo de vídeo é obrigatório"),
  responsavelId: z.string().optional(),
  prioridade: z.enum(["Baixa", "Média", "Alta"]).default("Média"),
  clienteId: z.string().optional(),
  empreendimentoId: z.string().optional(),
  dataPrevistaEntrega: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectFormProps {
  onSuccess?: () => void;
  initialData?: Partial<InsertProjeto>;
  isEdit?: boolean;
  projectId?: string;
}

export function ProjectForm({ onSuccess, initialData, isEdit, projectId }: ProjectFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: users = [] } = useQuery<User[]>({
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: initialData?.titulo || "",
      descricao: initialData?.descricao || "",
      tipoVideoId: initialData?.tipoVideoId || "",
      responsavelId: initialData?.responsavelId || "",
      prioridade: initialData?.prioridade || "Média",
      clienteId: initialData?.clienteId || "",
      empreendimentoId: initialData?.empreendimentoId || "",
      dataPrevistaEntrega: initialData?.dataPrevistaEntrega 
        ? new Date(initialData.dataPrevistaEntrega).toISOString().split('T')[0]
        : "",
    },
  });

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
      // Verifica se o empreendimento atual pertence ao cliente selecionado
      const empreendimentoValido = empreendimentos.find(
        emp => emp.id === empreendimentoAtual && emp.clienteId === clienteSelecionado
      );
      
      // Se não for válido, limpa o campo
      if (!empreendimentoValido) {
        form.setValue("empreendimentoId", "");
      }
    }
  }, [clienteSelecionado, empreendimentos, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertProjeto) => {
      const response = await apiRequest("POST", "/api/projetos", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidar queries manualmente para garantir atualização imediata
      // O WebSocket também vai invalidar, mas isso garante que funcione mesmo se houver delay
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
        }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });

      toast({
        title: "Projeto criado com sucesso!",
        description: "O projeto foi adicionado à sua lista.",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertProjeto>) => {
      const response = await apiRequest("PATCH", `/api/projetos/${projectId}`, data);
      return response.json();
    },
    onMutate: async (updatedData) => {
      await queryClient.cancelQueries({ queryKey: ["/api/projetos"] });
      
      const previousQueries: any[] = [];
      queryClient.getQueriesData({ queryKey: ["/api/projetos"] }).forEach(([key, data]) => {
        previousQueries.push({ key, data });
        queryClient.setQueryData(key, (old: any) => {
          if (!old) return old;
          return old.map((p: any) => 
            p.id === projectId ? { ...p, ...updatedData } : p
          );
        });
      });
      
      return { previousQueries };
    },
    onSuccess: (data) => {
      queryClient.getQueriesData({ queryKey: ["/api/projetos"] }).forEach(([key]) => {
        queryClient.setQueryData(key, (old: any) => {
          if (!old) return old;
          return old.map((p: any) => p.id === projectId ? data : p);
        });
      });
      queryClient.invalidateQueries({ queryKey: ["/api/metricas"] });
      toast({
        title: "Projeto atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });
      onSuccess?.();
    },
    onError: (error: Error, _updatedData, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ key, data }: any) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast({
        title: "Erro ao atualizar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // O backend schema converte as strings de data para Date corretamente
    if (isEdit) {
      updateMutation.mutate(data as any);
    } else {
      createMutation.mutate(data as any);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle data-testid="form-title">
          {isEdit ? "Editar Projeto" : "Novo Projeto"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6" data-testid="project-form">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título*</FormLabel>
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

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o projeto"
                      rows={3}
                      {...field}
                      data-testid="input-descricao"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipoVideoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Vídeo*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tipo-video">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background/95 backdrop-blur-md border-2">
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

              <FormField
                control={form.control}
                name="responsavelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-responsavel">
                          <SelectValue placeholder="Selecione (opcional)..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background/95 backdrop-blur-md border-2">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-prioridade">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background/95 backdrop-blur-md border-2">
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataPrevistaEntrega"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Entrega</FormLabel>
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
            </div>


            <FormField
              control={form.control}
              name="clienteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-cliente">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background/95 backdrop-blur-md border-2">
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id} data-testid={`option-cliente-${cliente.id}`}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="empreendimentoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empreendimento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-empreendimento">
                        <SelectValue placeholder="Selecione um empreendimento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background/95 backdrop-blur-md border-2">
                      {empreendimentosFiltrados.map((empreendimento) => (
                        <SelectItem key={empreendimento.id} value={empreendimento.id} data-testid={`option-empreendimento-${empreendimento.id}`}>
                          {empreendimento.nome} - {empreendimento.cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSuccess?.()}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Salvando..." : isEdit ? "Atualizar Projeto" : "Criar Projeto"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
