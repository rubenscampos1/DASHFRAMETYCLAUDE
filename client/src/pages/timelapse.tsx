import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Sidebar } from "@/components/sidebar";
import { MobileTopbar } from "@/components/mobile-topbar";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";

type Cliente = {
  id: string;
  nome: string;
  empresa: string;
  backgroundColor: string;
  textColor: string;
};

type Empreendimento = {
  id: string;
  nome: string;
  clienteId: string;
  backgroundColor: string;
  textColor: string;
  cliente: Cliente;
};

type Timelapse = {
  id: string;
  clienteId: string;
  empreendimentoId: string;
  dataUltimoVideo: string | null;
  linkVideo: string | null;
  dataProximoVideo: string | null;
  frequencia: "Semanal" | "Quinzenal" | "Mensal";
  status: "Ativo" | "Pausado" | "Cancelado";
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
  cliente: Cliente;
  empreendimento: Empreendimento;
};

type TimelapseFormData = {
  clienteId: string;
  empreendimentoId: string;
  dataUltimoVideo: string;
  linkVideo: string;
  dataProximoVideo: string;
  frequencia: "Semanal" | "Quinzenal" | "Mensal";
  status: "Ativo" | "Pausado" | "Cancelado";
  observacoes: string;
};

export default function TimelapsePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mainContentClass } = useSidebarLayout();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTimelapse, setEditingTimelapse] = useState<Timelapse | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [formData, setFormData] = useState<TimelapseFormData>({
    clienteId: "",
    empreendimentoId: "",
    dataUltimoVideo: "",
    linkVideo: "",
    dataProximoVideo: "",
    frequencia: "Semanal",
    status: "Ativo",
    observacoes: "",
  });

  // Query: Fetch timelapses
  const { data: timelapses = [], isLoading } = useQuery<Timelapse[]>({
    queryKey: ["/api/timelapses"],
  });

  // Query: Fetch clientes
  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
  });

  // Query: Fetch empreendimentos
  const { data: empreendimentos = [] } = useQuery<Empreendimento[]>({
    queryKey: ["/api/empreendimentos"],
  });

  // Filter empreendimentos by selected cliente
  const filteredEmpreendimentos = empreendimentos.filter(
    (emp) => emp.clienteId === selectedClienteId
  );

  // Mutation: Create timelapse
  const createMutation = useMutation({
    mutationFn: async (data: TimelapseFormData) => {
      const res = await fetch("/api/timelapses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao criar timelapse");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelapses"] });
      toast({
        title: "Timelapse criado",
        description: "O timelapse foi criado com sucesso.",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o timelapse.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Update timelapse
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TimelapseFormData> }) => {
      const res = await fetch(`/api/timelapses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao atualizar timelapse");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelapses"] });
      toast({
        title: "Timelapse atualizado",
        description: "O timelapse foi atualizado com sucesso.",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o timelapse.",
        variant: "destructive",
      });
    },
  });

  // Mutation: Delete timelapse
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/timelapses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao excluir timelapse");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timelapses"] });
      toast({
        title: "Timelapse excluído",
        description: "O timelapse foi excluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o timelapse.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      clienteId: "",
      empreendimentoId: "",
      dataUltimoVideo: "",
      linkVideo: "",
      dataProximoVideo: "",
      frequencia: "Semanal",
      status: "Ativo",
      observacoes: "",
    });
    setSelectedClienteId("");
    setEditingTimelapse(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTimelapse) {
      updateMutation.mutate({ id: editingTimelapse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (timelapse: Timelapse) => {
    setEditingTimelapse(timelapse);
    setSelectedClienteId(timelapse.clienteId);
    setFormData({
      clienteId: timelapse.clienteId,
      empreendimentoId: timelapse.empreendimentoId,
      dataUltimoVideo: timelapse.dataUltimoVideo
        ? format(new Date(timelapse.dataUltimoVideo), "yyyy-MM-dd")
        : "",
      linkVideo: timelapse.linkVideo || "",
      dataProximoVideo: timelapse.dataProximoVideo
        ? format(new Date(timelapse.dataProximoVideo), "yyyy-MM-dd")
        : "",
      frequencia: timelapse.frequencia,
      status: timelapse.status,
      observacoes: timelapse.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este timelapse?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativo":
        return "bg-green-500";
      case "Pausado":
        return "bg-yellow-500";
      case "Cancelado":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileTopbar />

      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Timelapses</h1>
          <p className="text-muted-foreground">
            Gerencie os timelapses por cliente e empreendimento
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Timelapse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTimelapse ? "Editar Timelapse" : "Novo Timelapse"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do timelapse
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clienteId">Cliente *</Label>
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, clienteId: value, empreendimentoId: "" });
                      setSelectedClienteId(value);
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="empreendimentoId">Empreendimento *</Label>
                  <Select
                    value={formData.empreendimentoId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, empreendimentoId: value })
                    }
                    disabled={!selectedClienteId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o empreendimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEmpreendimentos.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataUltimoVideo">Data do Último Vídeo</Label>
                  <Input
                    id="dataUltimoVideo"
                    type="date"
                    value={formData.dataUltimoVideo}
                    onChange={(e) =>
                      setFormData({ ...formData, dataUltimoVideo: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataProximoVideo">Data do Próximo Vídeo</Label>
                  <Input
                    id="dataProximoVideo"
                    type="date"
                    value={formData.dataProximoVideo}
                    onChange={(e) =>
                      setFormData({ ...formData, dataProximoVideo: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkVideo">Link do Vídeo</Label>
                <Input
                  id="linkVideo"
                  type="url"
                  placeholder="https://..."
                  value={formData.linkVideo}
                  onChange={(e) => setFormData({ ...formData, linkVideo: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequencia">Frequência *</Label>
                  <Select
                    value={formData.frequencia}
                    onValueChange={(value: "Semanal" | "Quinzenal" | "Mensal") =>
                      setFormData({ ...formData, frequencia: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "Ativo" | "Pausado" | "Cancelado") =>
                      setFormData({ ...formData, status: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Pausado">Pausado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Adicione observações sobre este timelapse..."
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTimelapse ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : timelapses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum timelapse cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Novo Timelapse" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timelapses.map((timelapse) => (
            <Card key={timelapse.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {timelapse.empreendimento.nome}
                    </CardTitle>
                    <CardDescription>
                      <Badge
                        style={{
                          backgroundColor: timelapse.cliente.backgroundColor,
                          color: timelapse.cliente.textColor,
                        }}
                        className="mt-2"
                      >
                        {timelapse.cliente.nome}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(timelapse)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(timelapse.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(timelapse.status)}>
                    {timelapse.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Frequência:</span>
                  <span className="font-medium">{timelapse.frequencia}</span>
                </div>
                {timelapse.dataUltimoVideo && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Último vídeo:</span>
                    <span className="font-medium">
                      {format(new Date(timelapse.dataUltimoVideo), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
                {timelapse.dataProximoVideo && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Próximo vídeo:</span>
                    <span className="font-medium">
                      {format(new Date(timelapse.dataProximoVideo), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
                {timelapse.linkVideo && (
                  <div className="pt-2">
                    <a
                      href={timelapse.linkVideo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver vídeo
                    </a>
                  </div>
                )}
                {timelapse.observacoes && (
                  <div className="pt-2 text-sm text-muted-foreground border-t">
                    <p className="line-clamp-2">{timelapse.observacoes}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Criado em {format(new Date(timelapse.createdAt), "dd/MM/yyyy")}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
        </div>
      </main>
    </div>
  </div>
  );
}
