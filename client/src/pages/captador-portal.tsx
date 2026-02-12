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

        // 3. Confirmar upload no servidor (salva no banco)
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

        {/* Navegação de Pastas */}
        {link.driveFolderId && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Pastas
              </CardTitle>
              {/* Breadcrumb */}
              {folderStack.length > 1 && (
                <div className="flex items-center gap-1 flex-wrap mt-2 text-xs">
                  {folderStack.map((crumb, i) => (
                    <React.Fragment key={crumb.id}>
                      {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                      {i < folderStack.length - 1 ? (
                        <button
                          onClick={() => navigateToBreadcrumb(i)}
                          className="text-primary hover:underline font-medium"
                        >
                          {crumb.name}
                        </button>
                      ) : (
                        <span className="text-foreground font-semibold">{crumb.name}</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              {/* Subfolders list */}
              {loadingFolders ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando pastas...
                </div>
              ) : subfolders.length > 0 ? (
                <div className="grid gap-2">
                  {subfolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => navigateToFolder(folder)}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all"
                    >
                      <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Create folder */}
              {showCreateFolder ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nome da nova pasta"
                    className="text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleCreateFolder} disabled={creatingFolder}>
                    {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateFolder(true)}
                  className="w-full"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Criar Pasta
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload area */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Enviar Arquivos
              {folderStack.length > 1 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  em "{folderStack[folderStack.length - 1].name}"
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Arraste ou clique para selecionar os arquivos de captação
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/30"
              } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
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
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Enviando{currentFileName ? `: ${currentFileName}` : "..."}
                  </p>
                  <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Arraste arquivos ou pastas aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Vídeos, imagens, áudios, ZIPs — sem limite de tamanho
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                    >
                      <FolderUp className="h-4 w-4 mr-2" />
                      Selecionar Pasta
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Arquivos recem enviados */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-1">
                {uploadedFiles.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Arquivos desta pasta — collapsible */}
        {currentFolderUploads.length > 0 && (
          <Card>
            <CardHeader
              className="p-4 cursor-pointer select-none"
              onClick={() => setShowUploads(prev => !prev)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {currentFolderUploads.length} arquivo(s) nesta pasta
                </CardTitle>
                {showUploads ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {showUploads && (
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {currentFolderUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border"
                    >
                      {getFileIcon(upload.mimeType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{upload.nomeOriginal}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(upload.tamanho)}
                          {upload.nomeCaptador && ` • ${upload.nomeCaptador}`}
                          {" • "}
                          {new Date(upload.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Total de arquivos no projeto (se diferente da pasta atual) */}
        {uploads.length > 0 && uploads.length !== currentFolderUploads.length && (
          <p className="text-xs text-center text-muted-foreground">
            Total no projeto: {uploads.length} arquivo(s) enviado(s)
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
