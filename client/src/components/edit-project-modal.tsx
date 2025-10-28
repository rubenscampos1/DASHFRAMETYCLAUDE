import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ProjetoWithRelations, insertProjetoSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const editProjetoSchema = insertProjetoSchema.partial().extend({
  id: z.string(),
  dataPrevistaEntrega: z.string().optional(),
});

type EditProjetoData = z.infer<typeof editProjetoSchema>;

interface EditProjectModalProps {
  project: ProjetoWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const prioridadeOptions = ["Alta", "Média", "Baixa"];
const statusOptions = [
  "Briefing",
  "Roteiro", 
  "Captação",
  "Edição",
  "Aguardando Aprovação",
  "Aprovado",
  "Em Pausa",
  "Cancelado",
];

export function EditProjectModal({
  project,
  isOpen,
  onClose,
  onSave,
}: EditProjectModalProps) {
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState("");

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: tiposVideo = [] } = useQuery<any[]>({
    queryKey: ["/api/tipos-video"],
  });

  const form = useForm<EditProjetoData>({
    resolver: zodResolver(editProjetoSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      cliente: "",
      responsavelId: "",
      tipoVideoId: "",
      prioridade: "Média",
      status: "Briefing",
      dataPrevistaEntrega: "",
      tags: [],
      linkYoutube: "",
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      form.reset({
        id: project.id,
        titulo: project.titulo,
        descricao: project.descricao || "",
        cliente: project.cliente || "",
        responsavelId: project.responsavelId,
        tipoVideoId: project.tipoVideoId,
        prioridade: project.prioridade,
        status: project.status,
        dataPrevistaEntrega: project.dataPrevistaEntrega 
          ? new Date(project.dataPrevistaEntrega).toISOString().split('T')[0]
          : "",
        tags: project.tags || [],
        linkYoutube: project.linkYoutube || "",
      });
    }
  }, [project, form]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: EditProjetoData) => {
      const { id, ...updateData } = data;
      
      // Convert date string to Date object if provided
      const formattedData = {
        ...updateData,
        dataPrevistaEntrega: data.dataPrevistaEntrega 
          ? new Date(data.dataPrevistaEntrega).toISOString()
          : null,
      };

      const response = await apiRequest("PATCH", `/api/projetos/${id}`, formattedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Projeto atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar projeto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EditProjetoData) => {
    updateProjectMutation.mutate(data);
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues("tags") || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue("tags", [...currentTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-project-modal">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nome do projeto"
                        data-testid="input-titulo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""}
                        placeholder="Nome do cliente"
                        data-testid="input-cliente"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Descreva o projeto"
                      rows={3}
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
                name="responsavelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-responsavel">
                          <SelectValue placeholder="Selecione o responsável" />
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

              <FormField
                control={form.control}
                name="tipoVideoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Vídeo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-tipo-video">
                          <SelectValue placeholder="Selecione o tipo" />
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-prioridade">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {prioridadeOptions.map((prioridade) => (
                          <SelectItem key={prioridade} value={prioridade}>
                            {prioridade}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
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
              name="linkYoutube"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Frame.io</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="https://youtube.com/watch?v=..."
                      data-testid="input-youtube-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Tags</FormLabel>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Adicionar tag"
                  data-testid="input-tag"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  data-testid="button-add-tag"
                >
                  Adicionar
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {(form.watch("tags") || []).map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                    data-testid={`tag-${index}`}
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending}
                data-testid="button-save"
              >
                {updateProjectMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}