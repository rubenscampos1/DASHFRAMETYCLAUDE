import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";
import { MobileTopbar } from "@/components/mobile-topbar";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  StickyNote,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Edit,
  Trash2,
  Star,
  StarOff,
  Download,
  FileText,
  Upload,
} from "lucide-react";
import type { Nota } from "@shared/schema";
import { format } from "date-fns";

export default function NotasPage() {
  const { toast } = useToast();
  const { mainContentClass } = useSidebarLayout();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<Nota | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");

  // Form state
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState<"Nota" | "Senha" | "Arquivo">("Nota");
  const [categoria, setCategoria] = useState("");
  const [senha, setSenha] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");
  const [url, setUrl] = useState("");
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);

  const { data: notas = [], isLoading } = useQuery<Nota[]>({
    queryKey: ["/api/notas", filtroTipo, filtroCategoria],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtroTipo !== "todos") params.append("tipo", filtroTipo);
      if (filtroCategoria !== "todos") params.append("categoria", filtroCategoria);
      const url = `/api/notas${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notas");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/notas", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notas"] });
      toast({ title: "Nota criada com sucesso!" });
      resetForm();
      setIsCreateModalOpen(false);
    },
    onError: () => {
      toast({ title: "Erro ao criar nota", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/notas/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notas"] });
      toast({ title: "Nota atualizada com sucesso!" });
      resetForm();
      setEditingNota(null);
    },
    onError: () => {
      toast({ title: "Erro ao atualizar nota", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notas"] });
      toast({ title: "Nota excluída com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir nota", variant: "destructive" });
    },
  });

  const toggleFavoritoMutation = useMutation({
    mutationFn: async ({ id, favorito }: { id: string; favorito: boolean }) => {
      const response = await apiRequest("PATCH", `/api/notas/${id}`, { favorito });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notas"] });
    },
  });

  const resetForm = () => {
    setTitulo("");
    setConteudo("");
    setTipo("Nota");
    setCategoria("");
    setSenha("");
    setUsuarioNome("");
    setUrl("");
    setFileKey(null);
    setFileName(null);
    setFileSize(null);
    setFileMimeType(null);
  };

  const openEditModal = (nota: Nota) => {
    setEditingNota(nota);
    setTitulo(nota.titulo);
    setConteudo(nota.conteudo || "");
    setTipo(nota.tipo as "Nota" | "Senha" | "Arquivo");
    setCategoria(nota.categoria || "");
    setSenha(nota.senha || "");
    setUsuarioNome(nota.usuarioNome || "");
    setUrl(nota.url || "");
    setFileKey(nota.fileKey || null);
    setFileName(nota.fileName || null);
    setFileSize(nota.fileSize || null);
    setFileMimeType(nota.fileMimeType || null);
  };

  const handleSubmit = () => {
    const data: any = {
      titulo,
      conteudo,
      tipo,
      categoria: categoria || null,
    };

    if (tipo === "Senha") {
      data.senha = senha;
      data.usuarioNome = usuarioNome;
      data.url = url;
    }

    if (tipo === "Arquivo") {
      data.fileKey = fileKey;
      data.fileName = fileName;
      data.fileSize = fileSize;
      data.fileMimeType = fileMimeType;
    }

    if (editingNota) {
      updateMutation.mutate({ id: editingNota.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFileUpload = async (result: UploadResult) => {
    const file = result.successful[0];
    if (file && file.response) {
      const response = file.response as any;
      setFileKey(response.objectKey);
      setFileName(file.name);
      setFileSize(file.size);
      setFileMimeType(file.type || "application/octet-stream");
      toast({ title: "Arquivo enviado com sucesso!" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado para a área de transferência!" });
  };

  const categorias = Array.from(new Set(notas.map((n) => n.categoria).filter(Boolean)));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileTopbar />

      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Notas</h1>
              <p className="text-muted-foreground">
                Gerencie suas anotações, senhas e arquivos
              </p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-new-nota">
              <Plus className="h-4 w-4 mr-2" />
              Nova Nota
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-48" data-testid="select-filter-tipo">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="Nota">Notas</SelectItem>
                <SelectItem value="Senha">Senhas</SelectItem>
                <SelectItem value="Arquivo">Arquivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-48" data-testid="select-filter-categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat} value={cat!}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes Grid */}
          {isLoading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : notas.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma nota ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Crie sua primeira nota para começar
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Nota
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notas.map((nota) => (
                <Card key={nota.id} className="hover:shadow-lg transition-shadow" data-testid={`nota-card-${nota.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {nota.tipo === "Senha" ? (
                          <Lock className="h-4 w-4 text-orange-500" />
                        ) : nota.tipo === "Arquivo" ? (
                          <FileText className="h-4 w-4 text-green-500" />
                        ) : (
                          <StickyNote className="h-4 w-4 text-blue-500" />
                        )}
                        <CardTitle className="text-base line-clamp-1">
                          {nota.titulo}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            toggleFavoritoMutation.mutate({
                              id: nota.id,
                              favorito: !nota.favorito,
                            })
                          }
                          data-testid={`button-favorite-${nota.id}`}
                        >
                          {nota.favorito ? (
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          ) : (
                            <StarOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{nota.tipo}</Badge>
                      {nota.categoria && (
                        <Badge variant="secondary">{nota.categoria}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {nota.tipo === "Senha" ? (
                      <div className="space-y-2">
                        {nota.usuarioNome && (
                          <div>
                            <p className="text-xs text-muted-foreground">Usuário</p>
                            <p className="text-sm font-mono">{nota.usuarioNome}</p>
                          </div>
                        )}
                        {nota.senha && (
                          <div>
                            <p className="text-xs text-muted-foreground">Senha</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono flex-1">
                                {showPassword[nota.id] ? nota.senha : "••••••••"}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() =>
                                  setShowPassword((prev) => ({
                                    ...prev,
                                    [nota.id]: !prev[nota.id],
                                  }))
                                }
                                data-testid={`button-toggle-password-${nota.id}`}
                              >
                                {showPassword[nota.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(nota.senha!)}
                                data-testid={`button-copy-password-${nota.id}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {nota.url && (
                          <div>
                            <p className="text-xs text-muted-foreground">URL</p>
                            <a
                              href={nota.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline truncate block"
                            >
                              {nota.url}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : nota.tipo === "Arquivo" ? (
                      <div className="space-y-2">
                        {nota.fileName ? (
                          <>
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{nota.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {nota.fileSize ? `${(nota.fileSize / 1024).toFixed(2)} KB` : ""}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                if (nota.fileKey) {
                                  window.open(`/objects${nota.fileKey}`, "_blank");
                                }
                              }}
                              data-testid={`button-download-${nota.id}`}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar Arquivo
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum arquivo anexado</p>
                        )}
                        {nota.conteudo && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {nota.conteudo}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {nota.conteudo || "Sem conteúdo"}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(nota.updatedAt), "dd/MM/yyyy HH:mm")}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditModal(nota)}
                          data-testid={`button-edit-${nota.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir esta nota?")) {
                              deleteMutation.mutate(nota.id);
                            }
                          }}
                          data-testid={`button-delete-${nota.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      <Dialog
        open={isCreateModalOpen || editingNota !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setEditingNota(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md" data-testid="dialog-nota-form">
          <DialogHeader>
            <DialogTitle>{editingNota ? "Editar Nota" : "Nova Nota"}</DialogTitle>
            <DialogDescription>
              {tipo === "Senha"
                ? "Salve suas credenciais de forma segura"
                : "Crie uma nova anotação"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                <SelectTrigger data-testid="select-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nota">Nota</SelectItem>
                  <SelectItem value="Senha">Senha</SelectItem>
                  <SelectItem value="Arquivo">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Título*</label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Digite um título"
                data-testid="input-titulo"
              />
            </div>

            {tipo === "Senha" ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Usuário/Email</label>
                  <Input
                    value={usuarioNome}
                    onChange={(e) => setUsuarioNome(e.target.value)}
                    placeholder="exemplo@email.com"
                    data-testid="input-usuario"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Senha*</label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite a senha"
                    data-testid="input-senha"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">URL</label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://exemplo.com"
                    data-testid="input-url"
                  />
                </div>
              </>
            ) : tipo === "Arquivo" ? (
              <div>
                <label className="text-sm font-medium mb-2 block">Arquivo</label>
                {fileName ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {fileSize ? `${(fileSize / 1024).toFixed(2)} KB` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFileKey(null);
                        setFileName(null);
                        setFileSize(null);
                        setFileMimeType(null);
                      }}
                      data-testid="button-remove-file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <ObjectUploader onUploadComplete={handleFileUpload} />
                )}
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-2 block">Conteúdo</label>
                <Textarea
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Digite o conteúdo da nota"
                  rows={5}
                  data-testid="textarea-conteudo"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Trabalho, Pessoal..."
                data-testid="input-categoria"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingNota(null);
                  resetForm();
                }}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!titulo || (tipo === "Senha" && !senha)}
                data-testid="button-save"
              >
                {editingNota ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
