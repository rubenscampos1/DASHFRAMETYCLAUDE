import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  Search,
  Plus,
  Folder,
  FolderOpen,
  Video,
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Move,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/components/motion-wrapper";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VideoPasta, InsertVideoPasta } from "@shared/schema";

interface VideoPastaWithRelations extends VideoPasta {
  cliente: {
    id: string;
    nome: string;
    empresa: string | null;
  };
  empreendimento?: {
    id: string;
    nome: string;
  };
  subpastas: VideoPasta[];
  videos: any[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb < 0.01) {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }
  return `${gb.toFixed(2)} GB`;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function VideosCliente() {
  const { clienteId } = useParams();
  const [, navigate] = useLocation();
  const { mainContentClass } = useSidebarLayout();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPastaData, setNewPastaData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
    empreendimentoId: "",
  });

  const { data: pastas = [], isLoading } = useQuery<VideoPastaWithRelations[]>({
    queryKey: [`/api/clientes/${clienteId}/pastas`],
    queryFn: async () => {
      const response = await fetch(`/api/clientes/${clienteId}/pastas?includeSubpastas=false`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao carregar pastas");
      return response.json();
    },
    enabled: !!clienteId,
  });

  const { data: empreendimentos = [] } = useQuery<any[]>({
    queryKey: [`/api/empreendimentos`],
    queryFn: async () => {
      const response = await fetch(`/api/empreendimentos`, { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao carregar empreendimentos");
      return response.json();
    },
  });

  const createPastaMutation = useMutation({
    mutationFn: async (data: Partial<InsertVideoPasta>) => {
      return await apiRequest("POST", `/api/clientes/${clienteId}/pastas`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clientes/${clienteId}/pastas`] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/clientes"] });
      setCreateDialogOpen(false);
      setNewPastaData({ nome: "", descricao: "", cor: "#3b82f6", empreendimentoId: "" });
      toast({
        title: "Pasta criada",
        description: "A pasta foi criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar pasta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const deletePastaMutation = useMutation({
    mutationFn: async (pastaId: string) => {
      return await apiRequest("DELETE", `/api/pastas/${pastaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clientes/${clienteId}/pastas`] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos/clientes"] });
      toast({
        title: "Pasta deletada",
        description: "A pasta foi deletada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao deletar pasta",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleCreatePasta = () => {
    if (!newPastaData.nome.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a pasta",
        variant: "destructive",
      });
      return;
    }

    createPastaMutation.mutate({
      nome: newPastaData.nome,
      descricao: newPastaData.descricao || undefined,
      cor: newPastaData.cor,
      empreendimentoId: newPastaData.empreendimentoId || undefined,
    });
  };

  const filteredPastas = pastas.filter((pasta) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      pasta.nome.toLowerCase().includes(searchLower) ||
      pasta.descricao?.toLowerCase().includes(searchLower) ||
      pasta.empreendimento?.nome.toLowerCase().includes(searchLower)
    );
  });

  const cliente = pastas[0]?.cliente;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <motion.div
        className={mainContentClass}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/videos")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {cliente?.nome || "Carregando..."}
                </h1>
                {cliente?.empresa && (
                  <p className="text-muted-foreground mt-1">{cliente.empresa}</p>
                )}
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Pasta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Pasta</DialogTitle>
                    <DialogDescription>
                      Crie uma nova pasta para organizar os vídeos deste cliente
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Pasta *</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: Vídeos Institucionais"
                        value={newPastaData.nome}
                        onChange={(e) =>
                          setNewPastaData({ ...newPastaData, nome: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        placeholder="Descrição opcional da pasta"
                        value={newPastaData.descricao}
                        onChange={(e) =>
                          setNewPastaData({ ...newPastaData, descricao: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cor">Cor</Label>
                      <Input
                        id="cor"
                        type="color"
                        value={newPastaData.cor}
                        onChange={(e) =>
                          setNewPastaData({ ...newPastaData, cor: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empreendimento">Empreendimento (opcional)</Label>
                      <select
                        id="empreendimento"
                        className="w-full px-3 py-2 border rounded-md"
                        value={newPastaData.empreendimentoId}
                        onChange={(e) =>
                          setNewPastaData({
                            ...newPastaData,
                            empreendimentoId: e.target.value,
                          })
                        }
                      >
                        <option value="">Nenhum</option>
                        {empreendimentos
                          .filter((e) => e.clienteId === clienteId)
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.nome}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreatePasta}
                      disabled={createPastaMutation.isPending}
                    >
                      {createPastaMutation.isPending ? "Criando..." : "Criar Pasta"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar pastas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </motion.div>

          {/* Stats Summary */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Pastas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pastas.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Vídeos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pastas.reduce((acc, p) => acc + (p.totalVideos || 0), 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Armazenamento Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatBytes(pastas.reduce((acc, p) => acc + (p.totalStorage || 0), 0))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando pastas...</div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredPastas.length === 0 && (
            <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-12">
              <Folder className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma pasta encontrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Tente ajustar sua busca" : "Crie uma pasta para começar"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Pasta
                </Button>
              )}
            </motion.div>
          )}

          {/* Folders Grid */}
          {!isLoading && filteredPastas.length > 0 && (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredPastas.map((pasta) => (
                <motion.div key={pasta.id} variants={itemVariants}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group">
                    <Link href={`/videos/${clienteId}/pastas/${pasta.id}`}>
                      <CardHeader className="space-y-4">
                        {/* Folder Icon with Color */}
                        <div className="flex items-center justify-between">
                          <div
                            className="w-16 h-16 rounded-lg flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: pasta.cor || "#3b82f6" }}
                          >
                            <Folder className="h-8 w-8 text-white" />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.preventDefault();
                                // TODO: Implement edit
                                console.log("Edit pasta:", pasta.id);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.preventDefault();
                                // TODO: Implement move
                                console.log("Move pasta:", pasta.id);
                              }}>
                                <Move className="h-4 w-4 mr-2" />
                                Mover
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (confirm(`Deseja realmente deletar a pasta "${pasta.nome}"?`)) {
                                    deletePastaMutation.mutate(pasta.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Folder Name */}
                        <div>
                          <CardTitle className="text-lg line-clamp-1">{pasta.nome}</CardTitle>
                          {pasta.descricao && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {pasta.descricao}
                            </CardDescription>
                          )}
                          {pasta.empreendimento && (
                            <CardDescription className="mt-1 text-xs">
                              {pasta.empreendimento.nome}
                            </CardDescription>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Video className="h-4 w-4" />
                            <span>Vídeos</span>
                          </div>
                          <div className="font-medium">{pasta.totalVideos || 0}</div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="h-4 w-4" />
                            <span>Tamanho</span>
                          </div>
                          <div className="font-medium">{formatBytes(pasta.totalStorage || 0)}</div>
                        </div>

                        {/* Last Update */}
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Atualizado {formatDate(pasta.updatedAt)}
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
