import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  Search,
  Upload,
  ArrowLeft,
  Grid as GridIcon,
  List,
  Video,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  Play,
  MoreVertical,
  Trash2,
  Download,
  Share2,
  Loader2,
  Folder,
  ExternalLink,
  Film,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/components/motion-wrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VideoPasta {
  id: string;
  nome: string;
  descricao?: string | null;
  cor: string;
  clienteId: string;
  frameIoFolderId?: string | null;
  totalVideos: number;
  totalStorage: number;
}

interface VideoProjeto {
  id: string;
  titulo: string;
  descricao?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  duration?: number | null; // em segundos
  fileSize?: number | null; // em bytes
  width?: number | null;
  height?: number | null;
  versao: number;
  aprovado?: boolean | null; // null = pendente, true = aprovado, false = reprovado
  feedback?: string | null;
  status: "uploading" | "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
  comentarios?: any[];
}

interface SubpastaInfo {
  id: string;
  nome: string;
  frameIoFolderId?: string;
  totalVideos?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface VideoPastaWithRelations extends VideoPasta {
  cliente?: {
    id: string;
    nome: string;
    empresa?: string | null;
  } | null;
  videos: VideoProjeto[];
  subpastas?: SubpastaInfo[];
}

type ViewMode = "grid" | "list";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getApprovalBadge(aprovado: boolean | null | undefined) {
  if (aprovado === null || aprovado === undefined) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>
    );
  }
  if (aprovado) {
    return (
      <Badge className="bg-green-500 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Aprovado
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="flex items-center gap-1">
      <XCircle className="h-3 w-3" />
      Reprovado
    </Badge>
  );
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: any }> = {
    uploading: { label: "Enviando", variant: "secondary" },
    processing: { label: "Processando", variant: "secondary" },
    ready: { label: "Pronto", variant: "default" },
    failed: { label: "Erro", variant: "destructive" },
  };

  const statusInfo = statusMap[status] || { label: status, variant: "outline" };

  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
}

export default function VideosPasta() {
  const { clienteId, pastaId } = useParams();
  const [, navigate] = useLocation();
  const { mainContentClass } = useSidebarLayout();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: pasta, isLoading } = useQuery<VideoPastaWithRelations>({
    queryKey: [`/api/pastas/${pastaId}`, "frameio"],
    queryFn: async () => {
      // Tentar buscar do Frame.io primeiro
      const responseFrameIo = await fetch(`/api/pastas/${pastaId}?source=frameio&clienteId=${clienteId}`, {
        credentials: "include",
      });
      if (responseFrameIo.ok) {
        const data = await responseFrameIo.json();
        if (data.videos || data.subpastas) return data;
      }
      // Fallback: buscar do banco local
      const response = await fetch(`/api/pastas/${pastaId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao carregar pasta");
      return response.json();
    },
    enabled: !!pastaId,
  });

  const { data: breadcrumb = [] } = useQuery<Array<{ id: string; nome: string }>>({
    queryKey: [`/api/pastas/${pastaId}/breadcrumb`],
    queryFn: async () => {
      const response = await fetch(`/api/pastas/${pastaId}/breadcrumb`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao carregar breadcrumb");
      return response.json();
    },
    enabled: !!pastaId,
  });

  const filteredVideos = (pasta?.videos || []).filter((video) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      video.titulo.toLowerCase().includes(searchLower) ||
      video.descricao?.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteVideo = async (videoId: string, titulo: string) => {
    if (!confirm(`Tem certeza que deseja deletar "${titulo}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar vídeo");
      }

      // Atualizar lista
      queryClient.invalidateQueries({ queryKey: [`/api/pastas/${pastaId}`] });

      toast({
        title: "Vídeo deletado",
        description: `"${titulo}" foi removido com sucesso`,
      });
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast({
        title: "Erro ao deletar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !uploadTitle || !pastaId) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o título e selecione um arquivo",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Inicializar upload (criar arquivo no Frame.io e banco de dados)
      const initResponse = await fetch(`/api/pastas/${pastaId}/videos/upload-init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          titulo: uploadTitle,
          descricao: uploadDescription || undefined,
          fileSize: uploadFile.size,
          mediaType: uploadFile.type || "video/mp4",
        }),
      });

      if (!initResponse.ok) {
        throw new Error("Erro ao inicializar upload");
      }

      const { videoId, uploadUrl, uploadHeaders } = await initResponse.json();
      console.log("Upload inicializado:", { videoId, uploadUrl });

      // 2. Upload direto para Frame.io com progresso
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          console.log("Upload concluído. Status:", xhr.status);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            console.error("Upload falhou:", xhr.status, xhr.responseText);
            reject(new Error(`Upload falhou com status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", (e) => {
          console.error("Erro no upload:", e);
          reject(new Error("Erro no upload"));
        });

        console.log("Iniciando upload para:", uploadUrl);
        xhr.open("PUT", uploadUrl);
        Object.entries(uploadHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
        xhr.send(uploadFile);
      });

      // 3. Atualizar status para "processing"
      console.log("Atualizando status para processing...");
      const statusResponse = await fetch(`/api/videos/${videoId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: "processing" }),
      });
      console.log("Status atualizado:", statusResponse.status);

      // 4. Atualizar lista de vídeos
      queryClient.invalidateQueries({ queryKey: [`/api/pastas/${pastaId}`] });

      toast({
        title: "Sucesso!",
        description: "Vídeo enviado com sucesso. Aguardando processamento...",
      });

      // Resetar formulário
      setUploadDialogOpen(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
          {/* Breadcrumb */}
          <motion.div variants={itemVariants}>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/videos">Vídeos</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/videos/${clienteId}`}>
                    {pasta?.cliente?.nome || "Carregando..."}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumb.map((item, index) => (
                  <div key={item.id} className="flex items-center">
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === breadcrumb.length - 1 ? (
                        <BreadcrumbPage>{item.nome}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={`/videos/${clienteId}/pastas/${item.id}`}>
                          {item.nome}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </motion.div>

          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/videos/${clienteId}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: pasta?.cor || "#3b82f6" }}
                  >
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      {pasta?.nome || "Carregando..."}
                    </h1>
                    {pasta?.descricao && (
                      <p className="text-muted-foreground mt-1">{pasta.descricao}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <GridIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleUploadClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Vídeo
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar vídeos..."
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
                  Total de Vídeos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pasta?.totalVideos || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Armazenamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(pasta?.totalStorage || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vídeos Aprovados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pasta?.videos.filter((v) => v.aprovado === true).length || 0}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando vídeos...</div>
            </div>
          )}

          {/* Subpastas */}
          {!isLoading && (pasta?.subpastas || []).length > 0 && (
            <motion.div variants={containerVariants}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pastas</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                {(pasta?.subpastas || []).map((sub) => (
                  <Link key={sub.id} href={`/videos/${clienteId}/pastas/${sub.id}`}>
                    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group border-2 border-transparent hover:border-blue-500/30">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <Folder className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-1">{sub.nome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {sub.totalVideos ? `${sub.totalVideos} itens` : "Pasta"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && filteredVideos.length === 0 && (pasta?.subpastas || []).length === 0 && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center py-12"
            >
              <Video className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum vídeo encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Tente ajustar sua busca"
                  : "Faça upload do primeiro vídeo para esta pasta"}
              </p>
              {!searchQuery && (
                <Button onClick={handleUploadClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Primeiro Vídeo
                </Button>
              )}
            </motion.div>
          )}

          {/* Videos Grid View */}
          {!isLoading && filteredVideos.length > 0 && viewMode === "grid" && (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredVideos.map((video) => (
                <motion.div key={video.id} variants={itemVariants}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group overflow-hidden">
                    <div
                      className="relative w-full h-48 overflow-hidden"
                      onClick={() => {
                        if (video.videoUrl) {
                          window.open(video.videoUrl, '_blank');
                        } else {
                          toast({
                            title: "Vídeo indisponível",
                            description: "Este vídeo ainda não possui URL de visualização",
                          });
                        }
                      }}
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center relative">
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-4 left-4 w-16 h-10 border border-white/20 rounded" />
                            <div className="absolute bottom-4 right-4 w-20 h-12 border border-white/20 rounded" />
                            <div className="absolute top-1/2 left-1/3 w-12 h-8 border border-white/20 rounded" />
                          </div>
                          <Film className="h-10 w-10 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-xl">
                          <Play className="h-7 w-7 text-black ml-0.5" />
                        </div>
                      </div>
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md font-mono">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      {video.fileSize && video.fileSize > 0 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white/80 text-xs px-2 py-0.5 rounded-md">
                          {formatBytes(video.fileSize)}
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2">{video.titulo}</CardTitle>
                          {video.descricao && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {video.descricao}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {video.videoUrl && (
                              <DropdownMenuItem onClick={() => window.open(video.videoUrl!, '_blank')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver no Frame.io
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Compartilhar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteVideo(video.id, video.titulo)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Versão {video.versao}</span>
                        {getStatusBadge(video.status)}
                      </div>
                      <div className="flex items-center justify-between">
                        {getApprovalBadge(video.aprovado)}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {video.comentarios && video.comentarios.length > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {video.comentarios.length}
                            </div>
                          )}
                          {video.fileSize && (
                            <div className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatBytes(video.fileSize)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        {formatDate(video.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Videos List View */}
          {!isLoading && filteredVideos.length > 0 && viewMode === "list" && (
            <motion.div variants={containerVariants} className="space-y-2">
              {filteredVideos.map((video) => (
                <motion.div key={video.id} variants={itemVariants}>
                  <Card className="cursor-pointer hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-4 p-4">
                      <div
                        className="relative w-40 h-24 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0"
                        onClick={() => {
                          toast({
                            title: "Player de vídeo",
                            description: "Player será implementado em breve",
                          });
                        }}
                      >
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.titulo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        {video.duration && (
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            {formatDuration(video.duration)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg line-clamp-1">{video.titulo}</h3>
                        {video.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {video.descricao}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Versão {video.versao}
                          </span>
                          {getStatusBadge(video.status)}
                          {getApprovalBadge(video.aprovado)}
                          {video.comentarios && video.comentarios.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {video.comentarios.length}
                            </div>
                          )}
                          {video.fileSize && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <HardDrive className="h-3 w-3" />
                              {formatBytes(video.fileSize)}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(video.createdAt)}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartilhar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteVideo(video.id, video.titulo)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Upload Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Enviar Vídeo</DialogTitle>
              <DialogDescription>
                Faça upload de um novo vídeo para {pasta?.nome}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Nome do vídeo"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição opcional do vídeo"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>

              {/* Arquivo */}
              <div className="space-y-2">
                <Label htmlFor="file">Arquivo de Vídeo *</Label>
                <Input
                  id="file"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                />
                {uploadFile && (
                  <p className="text-xs text-muted-foreground">
                    {uploadFile.name} ({formatBytes(uploadFile.size)})
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Enviando...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button onClick={handleUploadSubmit} disabled={isUploading || !uploadFile || !uploadTitle}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
