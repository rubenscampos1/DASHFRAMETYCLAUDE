import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  Search,
  Plus,
  Folder,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VideoPasta, InsertVideoPasta } from "@shared/schema";

interface VideoPastaWithRelations extends VideoPasta {
  cliente?: {
    id: string;
    nome: string;
    empresa: string | null;
  } | null;
  empreendimento?: {
    id: string;
    nome: string;
  };
  subpastas: VideoPasta[];
  videos: any[];
}

// Cores para pastas (ciclo baseado no index)
const folderColors = [
  { bg: "from-blue-500 to-blue-600", text: "text-blue-600" },
  { bg: "from-violet-500 to-violet-600", text: "text-violet-600" },
  { bg: "from-emerald-500 to-emerald-600", text: "text-emerald-600" },
  { bg: "from-amber-500 to-amber-600", text: "text-amber-600" },
  { bg: "from-rose-500 to-rose-600", text: "text-rose-600" },
  { bg: "from-cyan-500 to-cyan-600", text: "text-cyan-600" },
  { bg: "from-orange-500 to-orange-600", text: "text-orange-600" },
  { bg: "from-pink-500 to-pink-600", text: "text-pink-600" },
];

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
    queryKey: [`/api/clientes/${clienteId}/pastas`, "frameio"],
    queryFn: async () => {
      // Tentar buscar do Frame.io primeiro
      const responseFrameIo = await fetch(`/api/clientes/${clienteId}/pastas?source=frameio`, {
        credentials: "include",
      });
      if (responseFrameIo.ok) {
        const frameIoPastas = await responseFrameIo.json();
        if (frameIoPastas.length > 0) return frameIoPastas;
      }
      // Fallback: buscar do banco local
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

  const handleCreatePasta = () => {
    if (!newPastaData.nome.trim()) {
      toast({
        title: "Nome obrigatorio",
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
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <motion.div
        className={`${mainContentClass} flex-1 overflow-y-auto`}
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
                <p className="text-muted-foreground mt-1">
                  {pastas.length} pastas
                </p>
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
                      Crie uma nova pasta para organizar os videos deste cliente
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome da Pasta *</Label>
                      <Input
                        id="nome"
                        placeholder="Ex: Videos Institucionais"
                        value={newPastaData.nome}
                        onChange={(e) =>
                          setNewPastaData({ ...newPastaData, nome: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descricao</Label>
                      <Textarea
                        id="descricao"
                        placeholder="Descricao opcional da pasta"
                        value={newPastaData.descricao}
                        onChange={(e) =>
                          setNewPastaData({ ...newPastaData, descricao: e.target.value })
                        }
                        rows={3}
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
            {pastas.length > 6 && (
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar pastas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
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
                {searchQuery ? "Tente ajustar sua busca" : "Crie uma pasta para comecar"}
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
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {filteredPastas.map((pasta, index) => {
                const color = folderColors[index % folderColors.length];
                return (
                  <motion.div key={pasta.id} variants={itemVariants}>
                    <Link href={`/videos/${clienteId}/pastas/${pasta.id}`}>
                      <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group border-2 border-transparent hover:border-primary/20 overflow-hidden h-full">
                        {/* Gradient top bar */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${color.bg}`} />
                        <CardContent className="p-5 flex flex-col gap-4">
                          {/* Icon + Arrow */}
                          <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-sm`}>
                              <Folder className="h-6 w-6 text-white" />
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                          </div>

                          {/* Name */}
                          <div>
                            <h3 className="font-semibold text-sm line-clamp-2 leading-snug">{pasta.nome}</h3>
                            {pasta.empreendimento && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {pasta.empreendimento.nome}
                              </p>
                            )}
                          </div>

                          {/* Items count */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
                            <Folder className="h-3 w-3" />
                            <span>{(pasta as any).totalVideos || 0} itens</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
