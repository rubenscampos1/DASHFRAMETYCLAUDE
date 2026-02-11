import { useState, useCallback, useRef } from "react";
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
    createdAt: string;
  }>;
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

  const [nomeCaptador, setNomeCaptador] = useState("");
  const [observacao, setObservacao] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const { data, isLoading, error, refetch } = useQuery<CaptadorData>({
    queryKey: [`/api/captador/${token}`],
    retry: false,
    enabled: !!token,
  });

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    if (!data || uploading) return;

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const newUploaded: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const formData = new FormData();
      formData.append("file", file);
      if (nomeCaptador.trim()) formData.append("nomeCaptador", nomeCaptador.trim());
      if (observacao.trim()) formData.append("observacao", observacao.trim());

      try {
        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const fileProgress = (e.loaded / e.total) * 100;
              const totalProgress = ((i + fileProgress / 100) / fileArray.length) * 100;
              setUploadProgress(Math.round(totalProgress));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              newUploaded.push(file.name);
              resolve();
            } else {
              reject(new Error(`Erro ao enviar ${file.name}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error(`Falha no upload de ${file.name}`)));
          xhr.open("POST", `/api/captador/${token}/upload`);
          xhr.send(formData);
        });
      } catch (err: any) {
        toast({
          title: "Erro no upload",
          description: err.message,
          variant: "destructive",
        });
      }
    }

    setUploading(false);
    setUploadProgress(100);

    if (newUploaded.length > 0) {
      setUploadedFiles(prev => [...prev, ...newUploaded]);
      toast({
        title: "Upload concluido!",
        description: `${newUploaded.length} arquivo(s) enviado(s) com sucesso`,
      });
      refetch();
    }

    // Reset
    setTimeout(() => setUploadProgress(0), 2000);
  }, [data, uploading, nomeCaptador, observacao, token, toast, refetch]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

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

        {/* Upload area */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Enviar Arquivos
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
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
              } ${uploading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Enviando arquivos...</p>
                  <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vídeos, imagens, áudios, ZIPs — até 500MB por arquivo
                  </p>
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

        {/* Arquivos ja enviados */}
        {uploads.length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Arquivos Enviados ({uploads.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {uploads.map((upload) => (
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
          </Card>
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
