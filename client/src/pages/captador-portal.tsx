import React, { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Upload,
  FileVideo,
  FileImage,
  FileArchive,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Info,
  Clock,
  User,
  Building2,
  FolderUp,
  FolderPlus,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface CaptadorData {
  link: {
    id: string;
    token: string;
    nomeCaptador: string | null;
    instrucoes: string | null;
    driveFolderId: string | null;
    createdAt: string;
  };
  projeto: {
    id: string;
    sequencialId: number;
    titulo: string;
    status: string;
    tipoVideo: string;
    cliente: string | null;
  };
  uploads: Array<{
    id: string;
    nomeOriginal: string;
    tamanho: number | null;
    mimeType: string | null;
    nomeCaptador: string | null;
    observacao: string | null;
    driveFolderId: string | null;
    thumbnail: string | null;
    createdAt: string;
  }>;
}

interface DriveFolder {
  id: string;
  name: string;
  url: string;
}

interface FolderBreadcrumb {
  id: string;
  name: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="h-5 w-5 text-primary" />;
  if (mimeType.startsWith("image/")) return <FileImage className="h-5 w-5 text-green-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z"))
    return <FileArchive className="h-5 w-5 text-yellow-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

/**
 * Gera thumbnail de um arquivo (vídeo ou imagem) no browser.
 * Retorna base64 data URL ou null se não conseguir.
 */
async function generateThumbnail(file: File): Promise<string | null> {
  try {
    if (file.type.startsWith("image/")) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 160;
          const scale = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => { URL.revokeObjectURL(img.src); resolve(null); };
        img.src = URL.createObjectURL(file);
      });
    }

    if (file.type.startsWith("video/")) {
      return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        video.onloadeddata = () => {
          // Seek to 1s or 25% of duration
          video.currentTime = Math.min(1, video.duration * 0.25);
        };

        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          const MAX = 160;
          const scale = Math.min(MAX / video.videoWidth, MAX / video.videoHeight, 1);
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
          URL.revokeObjectURL(video.src);
        };

        video.onerror = () => { URL.revokeObjectURL(video.src); resolve(null); };

        // Timeout de 5s para não travar
        setTimeout(() => { URL.revokeObjectURL(video.src); resolve(null); }, 5000);

        video.src = URL.createObjectURL(file);
      });
    }
  } catch {
    // Ignora erro silenciosamente
  }
  return null;
}

export default function CaptadorPortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [nomeCaptador, setNomeCaptador] = useState("");
  const [observacao, setObservacao] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showUploads, setShowUploads] = useState(false);
  const [currentFileName, setCurrentFileName] = useState("");

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderBreadcrumb[]>([]);
  const [subfolders, setSubfolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<CaptadorData>({
    queryKey: [`/api/captador/${token}`],
    retry: false,
    enabled: !!token,
  });

  // Initialize folder navigation when data loads
  useEffect(() => {
    if (data?.link?.driveFolderId && !currentFolderId) {
      setCurrentFolderId(data.link.driveFolderId);
      setFolderStack([{ id: data.link.driveFolderId, name: "Raiz" }]);
    }
  }, [data, currentFolderId]);

  // Fetch subfolders when navigating
  const fetchFolders = useCallback(async (folderId: string) => {
    setLoadingFolders(true);
    try {
      const res = await fetch(`/api/captador/${token}/folders?parentId=${folderId}`);
      if (res.ok) {
        const { folders } = await res.json();
        setSubfolders(folders);
      }
    } catch (err) {
      console.error("Erro ao listar pastas:", err);
    } finally {
      setLoadingFolders(false);
    }
  }, [token]);

  useEffect(() => {
    if (currentFolderId) {
      fetchFolders(currentFolderId);
    }
  }, [currentFolderId, fetchFolders]);

  // Folder navigation handlers
  const navigateToFolder = useCallback((folder: DriveFolder) => {
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    setShowUploads(false);
    setUploadedFiles([]);
  }, []);

  const navigateToBreadcrumb = useCallback((index: number) => {
    const target = folderStack[index];
    setFolderStack(prev => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
    setShowUploads(false);
    setUploadedFiles([]);
  }, [folderStack]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || creatingFolder) return;
    setCreatingFolder(true);
    try {
      const res = await fetch(`/api/captador/${token}/create-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });
      if (res.ok) {
        toast({ title: "Pasta criada!", description: `"${newFolderName.trim()}" criada com sucesso.` });
        setNewFolderName("");
        setShowCreateFolder(false);
        if (currentFolderId) fetchFolders(currentFolderId);
      } else {
        const err = await res.json();
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, creatingFolder, currentFolderId, token, toast, fetchFolders]);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (!data || uploading) return;

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const newUploaded: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setCurrentFileName(file.name);

      try {
        // 1. Pedir URL de upload ao servidor (leve, só metadados)
        const initRes = await fetch(`/api/captador/${token}/init-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            folderId: currentFolderId,
          }),
        });

        if (!initRes.ok) {
          const err = await initRes.json().catch(() => ({ message: "Erro ao iniciar upload" }));
          throw new Error(err.message);
        }

        const { uploadUrl } = await initRes.json();

        // 2. Enviar arquivo DIRETO pro Google Drive (não passa pelo servidor)
        let driveFileId = "";

        try {
          driveFileId = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let progressReached100 = false;

            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const fileProgress = (e.loaded / e.total) * 100;
                const totalProgress = ((i + fileProgress / 100) / fileArray.length) * 100;
                setUploadProgress(Math.round(totalProgress));
                if (fileProgress >= 99.9) progressReached100 = true;
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response.id || "");
                } catch {
                  resolve("");
                }
              } else if (xhr.status === 0 && progressReached100) {
                resolve("");
              } else {
                reject(new Error(`Google Drive respondeu com status ${xhr.status}`));
              }
            });

            xhr.addEventListener("error", () => {
              if (progressReached100) {
                resolve("");
              } else {
                reject(new Error("Falha de conexão com Google Drive"));
              }
            });

            xhr.addEventListener("abort", () => reject(new Error("Upload cancelado")));

            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
            xhr.send(file);
          });
        } catch (uploadErr: any) {
          console.warn("Erro no upload direto, mas pode ter completado:", uploadErr.message);
        }

        // 3. Gerar thumbnail (não bloqueia o fluxo se falhar)
        const thumbnail = await generateThumbnail(file);

        // 4. Confirmar upload no servidor (salva no banco)
        await fetch(`/api/captador/${token}/complete-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driveFileId: driveFileId || undefined,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "application/octet-stream",
            nomeCaptador: nomeCaptador.trim() || undefined,
            observacao: observacao.trim() || undefined,
            driveFolderId: currentFolderId,
            thumbnail: thumbnail || undefined,
          }),
        });

        newUploaded.push(file.name);
      } catch (err: any) {
        failed.push(file.name);
        toast({
          title: `Erro: ${file.name}`,
          description: err.message,
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    setCurrentFileName("");
    setUploadProgress(100);

    if (newUploaded.length > 0) {
      setUploadedFiles(prev => [...prev, ...newUploaded]);
      toast({
        title: "Upload concluído!",
        description: `${newUploaded.length} arquivo(s) enviado(s)${failed.length > 0 ? `, ${failed.length} falharam` : ""}`,
      });
      refetch();
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => setUploadProgress(0), 2000);
  }, [data, uploading, nomeCaptador, observacao, token, toast, refetch, currentFolderId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Extrair arquivos recursivamente de um diretório (drag & drop)
  const getFilesFromEntry = useCallback(async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file((f) => resolve([f]), () => resolve([]));
      });
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve) => {
        const allEntries: FileSystemEntry[] = [];
        const readBatch = () => {
          reader.readEntries((batch) => {
            if (batch.length === 0) { resolve(allEntries); return; }
            allEntries.push(...batch);
            readBatch();
          }, () => resolve(allEntries));
        };
        readBatch();
      });
      const files: File[] = [];
      for (const e of entries) {
        files.push(...(await getFilesFromEntry(e)));
      }
      return files;
    }
    return [];
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const allFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          allFiles.push(...(await getFilesFromEntry(entry)));
        }
      }
      if (allFiles.length > 0) {
        handleUpload(allFiles);
        return;
      }
    }

    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload, getFilesFromEntry]);

  // Filter uploads for current folder
  const currentFolderUploads = data?.uploads.filter(u => {
    const rootId = data.link.driveFolderId;
    if (!currentFolderId || currentFolderId === rootId) {
      return !u.driveFolderId || u.driveFolderId === rootId;
    }
    return u.driveFolderId === currentFolderId;
  }) || [];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando informações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    const errorMsg = error?.message || "";
    const isGone = errorMsg.includes("410");
    const isNotFound = errorMsg.includes("404");

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isGone ? "Link expirado" : isNotFound ? "Link inválido" : "Erro"}
              </AlertTitle>
              <AlertDescription>
                {isGone
                  ? "Este link de upload foi desativado ou expirou. Entre em contato com a equipe Framety."
                  : isNotFound
                  ? "Este link de upload não foi encontrado. Verifique se o link está correto."
                  : "Ocorreu um erro ao carregar. Tente novamente."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { link, projeto, uploads } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted overflow-x-hidden w-full">
      <div className="container max-w-4xl mx-auto p-3 sm:p-4 space-y-3 overflow-x-hidden">
        {/* Header */}
        <Card className="border-none shadow bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <CardHeader className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <p className="font-bold text-base sm:text-xl">Portal do Captador</p>
              </div>
              {projeto.cliente && (
                <div className="flex items-center gap-2 text-primary">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <p className="font-bold text-base sm:text-xl">{projeto.cliente}</p>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Info do Projeto */}
        <Card>
          <CardHeader className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Projeto</h3>
                <p className="text-lg font-bold text-primary mt-0.5">
                  {projeto.titulo}
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    #SKY{projeto.sequencialId}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="shrink-0">
                  {projeto.tipoVideo}
                </Badge>
                <div className="mt-1">
                  <Badge variant="default" className="text-xs">
                    {projeto.status}
                  </Badge>
                </div>
              </div>
            </div>

            {link.nomeCaptador && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Captador: <strong className="text-foreground">{link.nomeCaptador}</strong></span>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Instrucoes */}
        {link.instrucoes && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader className="p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Instruções da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-foreground whitespace-pre-wrap">{link.instrucoes}</p>
            </CardContent>
          </Card>
        )}

        {/* Campos do captador */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Identificação
            </CardTitle>
            <CardDescription className="text-xs">
              Preencha seus dados antes de enviar os arquivos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Seu nome</label>
              <Input
                value={nomeCaptador}
                onChange={(e) => setNomeCaptador(e.target.value)}
                placeholder={link.nomeCaptador || "Nome do captador"}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Observação (opcional)</label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Gravação do dia 12/02, câmera Sony A7III..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* ===== ÁREA UNIFICADA ESTILO DRIVE ===== */}
        <Card>
          {/* Toolbar: breadcrumb + ações */}
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 flex-wrap text-sm min-w-0">
                {folderStack.map((crumb, i) => (
                  <React.Fragment key={crumb.id}>
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                    {i < folderStack.length - 1 ? (
                      <button
                        onClick={() => navigateToBreadcrumb(i)}
                        className="text-primary hover:underline font-medium truncate max-w-[120px]"
                      >
                        {crumb.name}
                      </button>
                    ) : (
                      <span className="text-foreground font-semibold truncate max-w-[200px]">{crumb.name}</span>
                    )}
                  </React.Fragment>
                ))}
                {folderStack.length === 0 && (
                  <span className="text-foreground font-semibold">Arquivos</span>
                )}
              </div>

              {/* Botões de ação */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {link.driveFolderId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateFolder(true)}
                    disabled={showCreateFolder}
                    className="h-8"
                  >
                    <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                    <span className="hidden sm:inline">Nova Pasta</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-8"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Upload</span>
                </Button>
              </div>
            </div>

            {/* Criar pasta inline */}
            {showCreateFolder && (
              <div className="flex items-center gap-2 mt-3">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da nova pasta"
                  className="text-sm h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") { setShowCreateFolder(false); setNewFolderName(""); }
                  }}
                  autoFocus
                />
                <Button size="sm" className="h-8" onClick={handleCreateFolder} disabled={creatingFolder}>
                  {creatingFolder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }}>
                  Cancelar
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-4 pt-0">
            {/* Inputs ocultos */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />

            {/* Upload progress overlay */}
            {uploading && (
              <div className="mb-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Enviando{currentFileName ? `: ${currentFileName}` : "..."}
                    </p>
                    <Progress value={uploadProgress} className="mt-1.5 h-1.5" />
                  </div>
                  <span className="text-sm font-medium text-primary flex-shrink-0">{uploadProgress}%</span>
                </div>
              </div>
            )}

            {/* Conteúdo: pastas + arquivos (estilo Drive) */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`min-h-[200px] rounded-lg transition-all ${
                isDragging ? "bg-primary/5 ring-2 ring-primary/30 ring-dashed" : ""
              }`}
            >
              {/* Loading */}
              {loadingFolders && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              )}

              {/* Pastas */}
              {!loadingFolders && subfolders.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Pastas</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {subfolders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => navigateToFolder(folder)}
                        className="flex items-center gap-2.5 p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all group"
                      >
                        <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{folder.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Arquivos em grid com thumbnails */}
              {!loadingFolders && currentFolderUploads.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Arquivos ({currentFolderUploads.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {currentFolderUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="rounded-lg border bg-card overflow-hidden group"
                      >
                        {/* Thumbnail ou ícone */}
                        <div className="aspect-video bg-muted/50 flex items-center justify-center overflow-hidden">
                          {upload.thumbnail ? (
                            <img
                              src={upload.thumbnail}
                              alt={upload.nomeOriginal}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              {upload.mimeType?.startsWith("video/") ? (
                                <FileVideo className="h-8 w-8 text-primary/40" />
                              ) : upload.mimeType?.startsWith("image/") ? (
                                <FileImage className="h-8 w-8 text-green-500/40" />
                              ) : upload.mimeType?.includes("zip") || upload.mimeType?.includes("rar") ? (
                                <FileArchive className="h-8 w-8 text-yellow-500/40" />
                              ) : (
                                <File className="h-8 w-8 text-muted-foreground/40" />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2">
                          <p className="text-xs font-medium truncate" title={upload.nomeOriginal}>
                            {upload.nomeOriginal}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatFileSize(upload.tamanho)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado vazio + drop zone */}
              {!loadingFolders && subfolders.length === 0 && currentFolderUploads.length === 0 && !uploading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Esta pasta está vazia
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                    Arraste arquivos aqui ou use os botões acima
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Selecionar Arquivos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      <FolderUp className="h-3.5 w-3.5 mr-1.5" />
                      Selecionar Pasta
                    </Button>
                  </div>
                </div>
              )}

              {/* Drop indicator (quando arrastando sobre área com conteúdo) */}
              {isDragging && (subfolders.length > 0 || currentFolderUploads.length > 0) && (
                <div className="mt-3 p-4 border-2 border-dashed border-primary/40 rounded-lg text-center bg-primary/5">
                  <Upload className="h-6 w-6 text-primary/60 mx-auto mb-1" />
                  <p className="text-xs text-primary font-medium">Solte para enviar</p>
                </div>
              )}
            </div>

            {/* Arquivos recem enviados */}
            {uploadedFiles.length > 0 && !uploading && (
              <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {uploadedFiles.length} arquivo(s) enviado(s)
                </div>
                <div className="space-y-0.5">
                  {uploadedFiles.slice(0, 5).map((name, i) => (
                    <p key={i} className="text-xs text-green-600 dark:text-green-500 truncate pl-6">{name}</p>
                  ))}
                  {uploadedFiles.length > 5 && (
                    <p className="text-xs text-green-500/70 pl-6">+{uploadedFiles.length - 5} mais</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total de arquivos no projeto */}
        {uploads.length > 0 && uploads.length !== currentFolderUploads.length && (
          <p className="text-xs text-center text-muted-foreground">
            Total no projeto: {uploads.length} arquivo(s)
          </p>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Powered by <strong className="text-primary">Framety</strong> • Grupo Skyline
          </p>
        </div>
      </div>
    </div>
  );
}
