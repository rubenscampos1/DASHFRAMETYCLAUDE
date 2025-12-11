import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Database, Building2, Video, Mic, Music, Upload, Play, Pause, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClienteSchema, insertTipoVideoSchema, insertEmpreendimentoSchema, insertLocutorSchema, type Cliente, type InsertCliente, type TipoVideo, type InsertTipoVideo, type Empreendimento, type InsertEmpreendimento, type EmpreendimentoWithRelations, type Locutor, type InsertLocutor, type LocutorWithRelations, type AmostraLocutor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { getLocutorAudioUrl } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/components/motion-wrapper";

export default function DatabasePage() {
  const { toast } = useToast();
  const { mainContentClass } = useSidebarLayout();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  // Category modals
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TipoVideo | null>(null);

  // Empreendimento modals
  const [createEmpreendimentoDialogOpen, setCreateEmpreendimentoDialogOpen] = useState(false);
  const [editingEmpreendimento, setEditingEmpreendimento] = useState<EmpreendimentoWithRelations | null>(null);

  // Locutor modals
  const [createLocutorDialogOpen, setCreateLocutorDialogOpen] = useState(false);
  const [editingLocutor, setEditingLocutor] = useState<Locutor | null>(null);

  // Audio samples modal
  const [audioSamplesDialogOpen, setAudioSamplesDialogOpen] = useState(false);
  const [selectedLocutorForAudio, setSelectedLocutorForAudio] = useState<Locutor | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Search states
  const [searchCliente, setSearchCliente] = useState("");
  const [searchEmpreendimento, setSearchEmpreendimento] = useState("");
  const [searchLocutor, setSearchLocutor] = useState("");

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
  });


  const { data: categorias = [] } = useQuery<TipoVideo[]>({
    queryKey: ["/api/tipos-video"],
  });

  const { data: empreendimentos = [] } = useQuery<EmpreendimentoWithRelations[]>({
    queryKey: ["/api/empreendimentos"],
  });

  const { data: locutores = [] } = useQuery<LocutorWithRelations[]>({
    queryKey: ["/api/locutores"],
  });

  const { data: audioSamples = [] } = useQuery<AmostraLocutor[]>({
    queryKey: [`/api/locutores/${selectedLocutorForAudio?.id}/amostras`],
    enabled: !!selectedLocutorForAudio,
  });

  // Filter clientes based on search
  const filteredClientes = clientes.filter((cliente) => {
    if (!searchCliente) return true;
    const searchLower = searchCliente.toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(searchLower) ||
      cliente.email?.toLowerCase().includes(searchLower) ||
      cliente.empresa?.toLowerCase().includes(searchLower) ||
      cliente.telefone?.toLowerCase().includes(searchLower)
    );
  });

  // Filter empreendimentos based on search
  const filteredEmpreendimentos = empreendimentos.filter((emp) => {
    if (!searchEmpreendimento) return true;
    const searchLower = searchEmpreendimento.toLowerCase();
    return (
      emp.nome.toLowerCase().includes(searchLower) ||
      emp.descricao?.toLowerCase().includes(searchLower) ||
      emp.cliente?.nome?.toLowerCase().includes(searchLower)
    );
  });

  // Filter locutores based on search
  const filteredLocutores = locutores.filter((locutor) => {
    if (!searchLocutor) return true;
    const searchLower = searchLocutor.toLowerCase();
    return (
      locutor.nomeFicticio.toLowerCase().includes(searchLower) ||
      locutor.nomeReal.toLowerCase().includes(searchLower) ||
      locutor.email?.toLowerCase().includes(searchLower)
    );
  });

  const createForm = useForm<InsertCliente>({
    resolver: zodResolver(insertClienteSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      empresa: "",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    },
  });

  const editForm = useForm<InsertCliente>({
    resolver: zodResolver(insertClienteSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      empresa: "",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    },
  });


  const categoryForm = useForm<InsertTipoVideo>({
    resolver: zodResolver(insertTipoVideoSchema),
    defaultValues: {
      nome: "",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    },
  });

  const editCategoryForm = useForm<InsertTipoVideo>({
    resolver: zodResolver(insertTipoVideoSchema),
    defaultValues: {
      nome: "",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    },
  });

  // Empreendimentos forms
  const empreendimentoForm = useForm<InsertEmpreendimento>({
    resolver: zodResolver(insertEmpreendimentoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      clienteId: "",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    },
  });

  const editEmpreendimentoForm = useForm<InsertEmpreendimento>({
    resolver: zodResolver(insertEmpreendimentoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      clienteId: "",
      backgroundColor: "#3b82f6",
      textColor: "#ffffff",
    },
  });

  // Locutores forms
  const locutorForm = useForm<InsertLocutor>({
    resolver: zodResolver(insertLocutorSchema),
    defaultValues: {
      nomeFicticio: "",
      nomeReal: "",
      genero: "Masculino",
      faixaEtaria: "Adulto",
      idiomas: ["Português"],
      valorPorMinuto: "",
      email: "",
      telefone: "",
      instagram: "",
    },
  });

  const editLocutorForm = useForm<InsertLocutor>({
    resolver: zodResolver(insertLocutorSchema),
    defaultValues: {
      nomeFicticio: "",
      nomeReal: "",
      genero: "Masculino",
      faixaEtaria: "Adulto",
      idiomas: ["Português"],
      valorPorMinuto: "",
      email: "",
      telefone: "",
      instagram: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCliente) => {
      const response = await apiRequest("POST", "/api/clientes", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Cliente criado",
        description: "Cliente adicionado ao banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertCliente }) => {
      const response = await apiRequest("PUT", `/api/clientes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      setEditingCliente(null);
      editForm.reset();
      toast({
        title: "Cliente atualizado",
        description: "Informações do cliente atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clientes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clientes"] });
      toast({
        title: "Cliente removido",
        description: "Cliente removido do banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover cliente",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });


  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: InsertTipoVideo) => {
      const response = await apiRequest("POST", "/api/tipos-video", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tipos-video"] });
      setCreateCategoryDialogOpen(false);
      categoryForm.reset();
      toast({
        title: "Categoria criada",
        description: "Categoria adicionada ao banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tipos-video/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tipos-video"] });
      toast({
        title: "Categoria excluída",
        description: "Categoria removida do banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertTipoVideo }) => {
      const response = await apiRequest("PUT", `/api/tipos-video/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tipos-video"] });
      setEditingCategory(null);
      editCategoryForm.reset();
      toast({
        title: "Categoria atualizada",
        description: "Informações da categoria atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  // Empreendimentos mutations
  const createEmpreendimentoMutation = useMutation({
    mutationFn: async (data: InsertEmpreendimento) => {
      const response = await apiRequest("POST", "/api/empreendimentos", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empreendimentos"] });
      setCreateEmpreendimentoDialogOpen(false);
      empreendimentoForm.reset();
      toast({
        title: "Empreendimento criado",
        description: "Empreendimento adicionado ao banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar empreendimento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const updateEmpreendimentoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertEmpreendimento }) => {
      const response = await apiRequest("PUT", `/api/empreendimentos/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empreendimentos"] });
      setEditingEmpreendimento(null);
      editEmpreendimentoForm.reset();
      toast({
        title: "Empreendimento atualizado",
        description: "Informações do empreendimento atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar empreendimento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const deleteEmpreendimentoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/empreendimentos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/empreendimentos"] });
      toast({
        title: "Empreendimento excluído",
        description: "Empreendimento removido do banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir empreendimento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  // Locutores mutations
  const createLocutorMutation = useMutation({
    mutationFn: async (data: InsertLocutor) => {
      const response = await apiRequest("POST", "/api/locutores", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locutores"] });
      setCreateLocutorDialogOpen(false);
      locutorForm.reset();
      toast({
        title: "Locutor criado",
        description: "Locutor adicionado ao banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar locutor",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const updateLocutorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertLocutor }) => {
      const response = await apiRequest("PUT", `/api/locutores/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locutores"] });
      setEditingLocutor(null);
      editLocutorForm.reset();
      toast({
        title: "Locutor atualizado",
        description: "Informações do locutor atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar locutor",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const deleteLocutorMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/locutores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locutores"] });
      toast({
        title: "Locutor excluído",
        description: "Locutor removido do banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir locutor",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const onCreateSubmit = (data: InsertCliente) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertCliente) => {
    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id, data });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    editForm.reset({
      nome: cliente.nome,
      email: cliente.email || "",
      telefone: cliente.telefone || "",
      empresa: cliente.empresa || "",
      backgroundColor: cliente.backgroundColor || "#3b82f6",
      textColor: cliente.textColor || "#ffffff",
    });
  };

  const handleEditCategory = (categoria: TipoVideo) => {
    setEditingCategory(categoria);
    editCategoryForm.reset({
      nome: categoria.nome,
      backgroundColor: categoria.backgroundColor,
      textColor: categoria.textColor,
    });
  };

  const onCreateCategorySubmit = (data: InsertTipoVideo) => {
    createCategoryMutation.mutate(data);
  };

  const onEditCategorySubmit = (data: InsertTipoVideo) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };


  const handleDeleteCategory = (id: string) => {
    deleteCategoryMutation.mutate(id);
  };

  // Empreendimentos handlers
  const handleEditEmpreendimento = (empreendimento: EmpreendimentoWithRelations) => {
    setEditingEmpreendimento(empreendimento);
    editEmpreendimentoForm.reset({
      nome: empreendimento.nome,
      descricao: empreendimento.descricao || "",
      clienteId: empreendimento.clienteId,
      backgroundColor: empreendimento.backgroundColor,
      textColor: empreendimento.textColor,
    });
  };

  const onCreateEmpreendimentoSubmit = (data: InsertEmpreendimento) => {
    createEmpreendimentoMutation.mutate(data);
  };

  const onEditEmpreendimentoSubmit = (data: InsertEmpreendimento) => {
    if (editingEmpreendimento) {
      updateEmpreendimentoMutation.mutate({ id: editingEmpreendimento.id, data });
    }
  };

  const handleDeleteEmpreendimento = (id: string) => {
    deleteEmpreendimentoMutation.mutate(id);
  };

  // Locutores handlers
  const handleEditLocutor = (locutor: Locutor) => {
    setEditingLocutor(locutor);
    editLocutorForm.reset({
      nomeFicticio: locutor.nomeFicticio,
      nomeReal: locutor.nomeReal,
      genero: locutor.genero,
      faixaEtaria: locutor.faixaEtaria,
      idiomas: locutor.idiomas,
      valorPorMinuto: locutor.valorPorMinuto || "",
      email: locutor.email || "",
      telefone: locutor.telefone || "",
      instagram: locutor.instagram || "",
    });
  };

  const onCreateLocutorSubmit = (data: InsertLocutor) => {
    createLocutorMutation.mutate(data);
  };

  const onEditLocutorSubmit = (data: InsertLocutor) => {
    if (editingLocutor) {
      updateLocutorMutation.mutate({ id: editingLocutor.id, data });
    }
  };

  const handleDeleteLocutor = (id: string) => {
    deleteLocutorMutation.mutate(id);
  };

  // Audio samples handlers
  const handleUploadAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !selectedLocutorForAudio) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('titulo', file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    formData.append('destaque', 'false');

    setUploadingAudio(true);
    try {
      const response = await fetch(`/api/locutores/${selectedLocutorForAudio.id}/amostras`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Erro ao enviar áudio');
      }

      queryClient.invalidateQueries({ queryKey: [`/api/locutores/${selectedLocutorForAudio.id}/amostras`] });

      toast({
        title: "Sucesso",
        description: "Áudio enviado com sucesso",
      });

      // Reset the input
      event.target.value = '';
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar áudio",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleDeleteAudioSample = async (sampleId: string) => {
    if (!selectedLocutorForAudio) return;

    try {
      await apiRequest('DELETE', `/api/amostras/${sampleId}`);

      queryClient.invalidateQueries({ queryKey: [`/api/locutores/${selectedLocutorForAudio.id}/amostras`] });

      toast({
        title: "Sucesso",
        description: "Amostra removida com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover amostra",
        variant: "destructive",
      });
    }
  };

  const handlePlayAudio = (audioId: string, audioUrl: string) => {
    if (playingAudioId === audioId) {
      // Stop the currently playing audio
      const audio = document.getElementById(`audio-${audioId}`) as HTMLAudioElement;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlayingAudioId(null);
    } else {
      // Stop any currently playing audio
      if (playingAudioId) {
        const prevAudio = document.getElementById(`audio-${playingAudioId}`) as HTMLAudioElement;
        if (prevAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
      }
      // Play the new audio
      const audio = document.getElementById(`audio-${audioId}`) as HTMLAudioElement;
      if (audio) {
        audio.play();
        setPlayingAudioId(audioId);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className={`${mainContentClass} flex flex-col flex-1 transition-all duration-300`}>
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm"
        >
          <div className="flex-1 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold text-foreground" data-testid="database-title">
                Banco de Dados - Clientes
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <Button data-testid="button-new-client" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>

              {user?.papel === "Admin" && (
                <>
                  <Button variant="outline" data-testid="button-new-category" onClick={() => setCreateCategoryDialogOpen(true)}>
                    <Video className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                  <Button variant="outline" data-testid="button-new-empreendimento" onClick={() => setCreateEmpreendimentoDialogOpen(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Novo Empreendimento
                  </Button>
                  <Button variant="outline" data-testid="button-new-locutor" onClick={() => setCreateLocutorDialogOpen(true)}>
                    <Mic className="h-4 w-4 mr-2" />
                    Novo Locutor
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="max-w-7xl mx-auto px-6 space-y-6"
            >

              {/* Stats Cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="total-clients">
                      {clientes.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clientes cadastrados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Empreendimentos</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="total-empreendimentos">
                      {empreendimentos.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Empreendimentos cadastrados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Locutores</CardTitle>
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="total-locutores">
                      {locutores.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {locutores.filter(l => l.disponivel).length} disponíveis
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Accordion Sections */}
              <motion.div variants={itemVariants}>
                <Accordion type="multiple" className="space-y-4">

                  {/* Clients Section */}
                  <AccordionItem value="clients" className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">Clientes Cadastrados</span>
                        <span className="ml-2 text-sm text-muted-foreground">({clientes.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Gerencie todos os clientes do sistema
                          </p>
                          <Input
                            type="text"
                            placeholder="Pesquisar por nome, email, telefone ou empresa..."
                            value={searchCliente}
                            onChange={(e) => setSearchCliente(e.target.value)}
                            className="max-w-md"
                            data-testid="input-search-cliente"
                          />
                        </div>
                        <div>
                          {filteredClientes.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Preview</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Telefone</TableHead>
                                  <TableHead>Nome do Responsável</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredClientes.map((cliente) => (
                                  <TableRow key={cliente.id} data-testid={`row-client-${cliente.id}`}>
                                    <TableCell className="font-medium" data-testid={`text-nome-${cliente.id}`}>
                                      {cliente.nome}
                                    </TableCell>
                                    <TableCell data-testid={`preview-client-${cliente.id}`}>
                                      <div
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: cliente.backgroundColor || "#3b82f6",
                                          color: cliente.textColor || "#ffffff"
                                        }}
                                      >
                                        {cliente.nome}
                                      </div>
                                    </TableCell>
                                    <TableCell data-testid={`text-email-${cliente.id}`}>
                                      {cliente.email || "—"}
                                    </TableCell>
                                    <TableCell data-testid={`text-telefone-${cliente.id}`}>
                                      {cliente.telefone || "—"}
                                    </TableCell>
                                    <TableCell data-testid={`text-empresa-${cliente.id}`}>
                                      {cliente.empresa || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEdit(cliente)}
                                          data-testid={`button-edit-${cliente.id}`}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>

                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              data-testid={`button-delete-${cliente.id}`}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Tem certeza que deseja remover o cliente "{cliente.nome}"?
                                                Esta ação não pode ser desfeita.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDelete(cliente.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                data-testid={`confirm-delete-${cliente.id}`}
                                              >
                                                Remover
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8" data-testid="empty-clients">
                              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">
                                Nenhum cliente cadastrado ainda.
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Clique em "Novo Cliente" para adicionar o primeiro cliente.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Empreendimentos Section */}
                  <AccordionItem value="empreendimentos" className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">Empreendimentos Cadastrados</span>
                        <span className="ml-2 text-sm text-muted-foreground">({empreendimentos.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Gerencie todos os empreendimentos do sistema
                          </p>
                          <Input
                            type="text"
                            placeholder="Pesquisar por nome, descrição ou cliente..."
                            value={searchEmpreendimento}
                            onChange={(e) => setSearchEmpreendimento(e.target.value)}
                            className="max-w-md"
                            data-testid="input-search-empreendimento"
                          />
                        </div>
                        <div>
                          {filteredEmpreendimentos.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Cliente</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Preview</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredEmpreendimentos.map((empreendimento) => (
                                  <TableRow key={empreendimento.id}>
                                    <TableCell className="font-medium">{empreendimento.nome}</TableCell>
                                    <TableCell>{empreendimento.cliente?.nome}</TableCell>
                                    <TableCell className="max-w-xs truncate">
                                      {empreendimento.descricao || "—"}
                                    </TableCell>
                                    <TableCell>
                                      <div
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: empreendimento.backgroundColor,
                                          color: empreendimento.textColor
                                        }}
                                        data-testid={`empreendimento-preview-${empreendimento.id}`}
                                      >
                                        {empreendimento.nome}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end space-x-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditEmpreendimento(empreendimento)}
                                          data-testid={`edit-empreendimento-${empreendimento.id}`}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              data-testid={`delete-empreendimento-${empreendimento.id}`}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Tem certeza de que deseja remover o empreendimento "{empreendimento.nome}"?
                                                Esta ação não pode ser desfeita.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteEmpreendimento(empreendimento.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                data-testid={`confirm-delete-empreendimento-${empreendimento.id}`}
                                              >
                                                Remover
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8" data-testid="empty-empreendimentos">
                              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">
                                Nenhum empreendimento cadastrado ainda.
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Clique em "Novo Empreendimento" para adicionar o primeiro empreendimento.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Categories Section */}
                  <AccordionItem value="categories" className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Video className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">Categorias de Vídeo Cadastradas</span>
                        <span className="ml-2 text-sm text-muted-foreground">({categorias.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Gerencie todas as categorias de vídeo do sistema
                          </p>
                        </div>
                        <div>
                          {categorias.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Preview</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {categorias.map((tipo) => (
                                  <TableRow key={tipo.id}>
                                    <TableCell className="font-medium">{tipo.nome}</TableCell>
                                    <TableCell>
                                      <div
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: tipo.backgroundColor,
                                          color: tipo.textColor
                                        }}
                                        data-testid={`category-preview-${tipo.id}`}
                                      >
                                        {tipo.nome}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {user?.papel === "Admin" && (
                                        <div className="flex justify-end space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditCategory(tipo)}
                                            data-testid={`button-edit-category-${tipo.id}`}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>

                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                data-testid={`delete-category-${tipo.id}`}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Tem certeza que deseja remover a categoria "{tipo.nome}"? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => handleDeleteCategory(tipo.id)}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  data-testid={`confirm-delete-category-${tipo.id}`}
                                                >
                                                  Remover
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8" data-testid="empty-categories">
                              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">
                                Nenhuma categoria cadastrada ainda.
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Clique em "Nova Categoria" para adicionar a primeira categoria.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Locutores Section */}
                  <AccordionItem value="locutores" className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Mic className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">Locutores Cadastrados</span>
                        <span className="ml-2 text-sm text-muted-foreground">({locutores.length})</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Gerencie todos os locutores do sistema
                          </p>
                          <Input
                            type="text"
                            placeholder="Pesquisar por nome, email, sotaque ou região..."
                            value={searchLocutor}
                            onChange={(e) => setSearchLocutor(e.target.value)}
                            className="max-w-md"
                            data-testid="input-search-locutor"
                          />
                        </div>
                        <div>
                          {filteredLocutores.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nome Fictício</TableHead>
                                  <TableHead>Gênero</TableHead>
                                  <TableHead>Faixa Etária</TableHead>
                                  <TableHead>Idiomas</TableHead>
                                  <TableHead>Valor/min</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredLocutores.map((locutor) => (
                                  <TableRow key={locutor.id} data-testid={`row-locutor-${locutor.id}`}>
                                    <TableCell className="font-medium">{locutor.nomeFicticio}</TableCell>
                                    <TableCell>{locutor.genero}</TableCell>
                                    <TableCell>{locutor.faixaEtaria}</TableCell>
                                    <TableCell>{locutor.idiomas.join(", ")}</TableCell>
                                    <TableCell>
                                      {locutor.valorPorMinuto || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {user?.papel === "Admin" && (
                                        <div className="flex justify-end space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setSelectedLocutorForAudio(locutor);
                                              setAudioSamplesDialogOpen(true);
                                            }}
                                            data-testid={`button-audio-samples-${locutor.id}`}
                                            title="Gerenciar amostras de áudio"
                                          >
                                            <Music className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditLocutor(locutor)}
                                            data-testid={`button-edit-locutor-${locutor.id}`}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                data-testid={`button-delete-locutor-${locutor.id}`}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Tem certeza que deseja remover o locutor "{locutor.nomeFicticio}"? Esta ação não pode ser desfeita.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => handleDeleteLocutor(locutor.id)}
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  data-testid={`confirm-delete-locutor-${locutor.id}`}
                                                >
                                                  Remover
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8" data-testid="empty-locutores">
                              <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">
                                Nenhum locutor cadastrado ainda.
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Clique em "Novo Locutor" para adicionar o primeiro locutor.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </motion.div>
            </motion.div>
          </div>
        </main>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)}>
              <DialogHeader>
                <DialogTitle>Adicionar Cliente</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo cliente.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FormField
                  control={createForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do cliente"
                          {...field}
                          data-testid="input-create-nome"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@cliente.com"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-create-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-create-telefone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="empresa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Responsável</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do responsável"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-create-empresa"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Fundo</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-create-bg-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#3b82f6"
                            className="flex-1"
                            data-testid="input-create-bg-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-create-text-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#ffffff"
                            className="flex-1"
                            data-testid="input-create-text-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: createForm.watch("backgroundColor") || "#3b82f6",
                      color: createForm.watch("textColor") || "#ffffff"
                    }}
                    data-testid="client-preview"
                  >
                    {createForm.watch("nome") || "Nome do Cliente"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-create-submit"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCliente} onOpenChange={() => setEditingCliente(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
              <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
                <DialogDescription>
                  Atualize as informações do cliente.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FormField
                  control={editForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do cliente"
                          {...field}
                          data-testid="input-edit-nome"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@cliente.com"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-edit-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-edit-telefone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="empresa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Responsável</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome do responsável"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-edit-empresa"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Fundo</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-edit-bg-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#3b82f6"
                            className="flex-1"
                            data-testid="input-edit-bg-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-edit-text-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#ffffff"
                            className="flex-1"
                            data-testid="input-edit-text-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: editForm.watch("backgroundColor") || "#3b82f6",
                      color: editForm.watch("textColor") || "#ffffff"
                    }}
                    data-testid="client-edit-preview"
                  >
                    {editForm.watch("nome") || "Nome do Cliente"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-edit-submit"
                >
                  {updateMutation.isPending ? "Atualizando..." : "Atualizar Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


      {/* Create Category Dialog */}
      <Dialog open={createCategoryDialogOpen} onOpenChange={setCreateCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onCreateCategorySubmit)}>
              <DialogHeader>
                <DialogTitle>Adicionar Categoria de Vídeo</DialogTitle>
                <DialogDescription>
                  Crie uma nova categoria de vídeo com cores personalizadas.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FormField
                  control={categoryForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Categoria *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite o nome da categoria"
                          {...field}
                          data-testid="input-category-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={categoryForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Fundo</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-category-bg-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#FF0000"
                            className="flex-1"
                            data-testid="input-category-bg-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={categoryForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-category-text-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#FFFFFF"
                            className="flex-1"
                            data-testid="input-category-text-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: categoryForm.watch("backgroundColor") || "#3b82f6",
                      color: categoryForm.watch("textColor") || "#ffffff"
                    }}
                    data-testid="category-preview"
                  >
                    {categoryForm.watch("nome") || "Nome da Categoria"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  data-testid="button-category-submit"
                >
                  {createCategoryMutation.isPending ? "Criando..." : "Criar Categoria"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...editCategoryForm}>
            <form onSubmit={editCategoryForm.handleSubmit(onEditCategorySubmit)}>
              <DialogHeader>
                <DialogTitle>Editar Categoria de Vídeo</DialogTitle>
                <DialogDescription>
                  Atualize as informações da categoria com cores personalizadas.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <FormField
                  control={editCategoryForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da categoria"
                          {...field}
                          data-testid="input-edit-category-nome"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCategoryForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Fundo</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-edit-category-bg-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#3b82f6"
                            className="flex-1"
                            data-testid="input-edit-category-bg-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editCategoryForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-edit-category-text-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#ffffff"
                            className="flex-1"
                            data-testid="input-edit-category-text-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: editCategoryForm.watch("backgroundColor") || "#3b82f6",
                      color: editCategoryForm.watch("textColor") || "#ffffff"
                    }}
                    data-testid="category-edit-preview"
                  >
                    {editCategoryForm.watch("nome") || "Nome da Categoria"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateCategoryMutation.isPending}
                  data-testid="button-edit-category-submit"
                >
                  {updateCategoryMutation.isPending ? "Atualizando..." : "Atualizar Categoria"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Empreendimento Dialog */}
      <Dialog open={createEmpreendimentoDialogOpen} onOpenChange={setCreateEmpreendimentoDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Empreendimento</DialogTitle>
            <DialogDescription>
              Adicione um novo empreendimento ao banco de dados.
            </DialogDescription>
          </DialogHeader>

          <Form {...empreendimentoForm}>
            <form onSubmit={empreendimentoForm.handleSubmit(onCreateEmpreendimentoSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={empreendimentoForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Empreendimento</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do empreendimento" {...field} data-testid="input-empreendimento-nome" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={empreendimentoForm.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-empreendimento-cliente">
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
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
                  control={empreendimentoForm.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite uma descrição para o empreendimento"
                          {...field}
                          data-testid="input-empreendimento-descricao"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={empreendimentoForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Fundo</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-empreendimento-bg-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#3b82f6"
                            className="flex-1"
                            data-testid="input-empreendimento-bg-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={empreendimentoForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-empreendimento-text-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#ffffff"
                            className="flex-1"
                            data-testid="input-empreendimento-text-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: empreendimentoForm.watch("backgroundColor") || "#3b82f6",
                      color: empreendimentoForm.watch("textColor") || "#ffffff"
                    }}
                    data-testid="empreendimento-preview"
                  >
                    {empreendimentoForm.watch("nome") || "Nome do Empreendimento"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createEmpreendimentoMutation.isPending}
                  data-testid="button-create-empreendimento-submit"
                >
                  {createEmpreendimentoMutation.isPending ? "Criando..." : "Criar Empreendimento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Empreendimento Dialog */}
      <Dialog open={!!editingEmpreendimento} onOpenChange={() => setEditingEmpreendimento(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Empreendimento</DialogTitle>
            <DialogDescription>
              Atualize as informações do empreendimento.
            </DialogDescription>
          </DialogHeader>

          <Form {...editEmpreendimentoForm}>
            <form onSubmit={editEmpreendimentoForm.handleSubmit(onEditEmpreendimentoSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={editEmpreendimentoForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Empreendimento</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do empreendimento" {...field} data-testid="input-edit-empreendimento-nome" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editEmpreendimentoForm.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-empreendimento-cliente">
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
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
                  control={editEmpreendimentoForm.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite uma descrição para o empreendimento"
                          {...field}
                          data-testid="input-edit-empreendimento-descricao"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editEmpreendimentoForm.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor de Fundo</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-edit-empreendimento-bg-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#3b82f6"
                            className="flex-1"
                            data-testid="input-edit-empreendimento-bg-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editEmpreendimentoForm.control}
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Texto</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="color"
                            {...field}
                            className="w-16 h-10 p-1 border rounded"
                            data-testid="input-edit-empreendimento-text-color"
                          />
                          <Input
                            type="text"
                            {...field}
                            placeholder="#ffffff"
                            className="flex-1"
                            data-testid="input-edit-empreendimento-text-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Preview:</span>
                  <div
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: editEmpreendimentoForm.watch("backgroundColor") || "#3b82f6",
                      color: editEmpreendimentoForm.watch("textColor") || "#ffffff"
                    }}
                    data-testid="empreendimento-edit-preview"
                  >
                    {editEmpreendimentoForm.watch("nome") || "Nome do Empreendimento"}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateEmpreendimentoMutation.isPending}
                  data-testid="button-edit-empreendimento-submit"
                >
                  {updateEmpreendimentoMutation.isPending ? "Atualizando..." : "Atualizar Empreendimento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Locutor Dialog */}
      <Dialog open={createLocutorDialogOpen} onOpenChange={setCreateLocutorDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <Form {...locutorForm}>
            <form onSubmit={locutorForm.handleSubmit(onCreateLocutorSubmit)}>
              <DialogHeader>
                <DialogTitle>Adicionar Locutor</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo locutor.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Informações Básicas</h3>

                  <FormField
                    control={locutorForm.control}
                    name="nomeFicticio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fictício *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome público do locutor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={locutorForm.control}
                    name="nomeReal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Real *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome verdadeiro do locutor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Características */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm">Características</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={locutorForm.control}
                      name="genero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Masculino">Masculino</SelectItem>
                              <SelectItem value="Feminino">Feminino</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={locutorForm.control}
                      name="faixaEtaria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faixa Etária *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Criança">Criança</SelectItem>
                              <SelectItem value="Jovem">Jovem</SelectItem>
                              <SelectItem value="Adulto">Adulto</SelectItem>
                              <SelectItem value="Madura">Madura</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={locutorForm.control}
                    name="idiomas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idiomas</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Português, Inglês, Espanhol (separados por vírgula)"
                            {...field}
                            value={field.value?.join(", ") || ""}
                            onChange={(e) => field.onChange(e.target.value.split(",").map(i => i.trim()))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Valores */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm">Valores</h3>

                  <FormField
                    control={locutorForm.control}
                    name="valorPorMinuto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor por Minuto</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: R$ 50,00 ou Sob consulta"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contato */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm">Contato</h3>

                  <FormField
                    control={locutorForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={locutorForm.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(11) 99999-9999"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={locutorForm.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="@usuario"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createLocutorMutation.isPending}
                >
                  {createLocutorMutation.isPending ? "Criando..." : "Criar Locutor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Locutor Dialog */}
      <Dialog open={!!editingLocutor} onOpenChange={() => setEditingLocutor(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <Form {...editLocutorForm}>
            <form onSubmit={editLocutorForm.handleSubmit(onEditLocutorSubmit)}>
              <DialogHeader>
                <DialogTitle>Editar Locutor</DialogTitle>
                <DialogDescription>
                  Atualize as informações do locutor.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Informações Básicas</h3>

                  <FormField
                    control={editLocutorForm.control}
                    name="nomeFicticio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Fictício *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome público do locutor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editLocutorForm.control}
                    name="nomeReal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Real *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome verdadeiro do locutor" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Características */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm">Características</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editLocutorForm.control}
                      name="genero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gênero *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Masculino">Masculino</SelectItem>
                              <SelectItem value="Feminino">Feminino</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editLocutorForm.control}
                      name="faixaEtaria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faixa Etária *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Criança">Criança</SelectItem>
                              <SelectItem value="Jovem">Jovem</SelectItem>
                              <SelectItem value="Adulto">Adulto</SelectItem>
                              <SelectItem value="Madura">Madura</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editLocutorForm.control}
                    name="idiomas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idiomas</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Português, Inglês, Espanhol (separados por vírgula)"
                            {...field}
                            value={field.value?.join(", ") || ""}
                            onChange={(e) => field.onChange(e.target.value.split(",").map(i => i.trim()))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Valores */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm">Valores</h3>

                  <FormField
                    control={editLocutorForm.control}
                    name="valorPorMinuto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor por Minuto</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: R$ 50,00 ou Sob consulta"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contato */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-sm">Contato</h3>

                  <FormField
                    control={editLocutorForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editLocutorForm.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(11) 99999-9999"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editLocutorForm.control}
                      name="instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="@usuario"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateLocutorMutation.isPending}
                >
                  {updateLocutorMutation.isPending ? "Atualizando..." : "Atualizar Locutor"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Audio Samples Dialog */}
      <Dialog open={audioSamplesDialogOpen} onOpenChange={(open) => {
        setAudioSamplesDialogOpen(open);
        if (!open) {
          setSelectedLocutorForAudio(null);
          setPlayingAudioId(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Amostras de Áudio - {selectedLocutorForAudio?.nomeFicticio}</DialogTitle>
            <DialogDescription>
              Gerencie as amostras de áudio do locutor. Faça upload de novos arquivos ou ouça as amostras existentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Samples List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Amostras Cadastradas</h3>
                <span className="text-sm text-muted-foreground">
                  {audioSamples.length} {audioSamples.length === 1 ? 'amostra' : 'amostras'}
                </span>
              </div>

              {audioSamples.length > 0 ? (
                <div className="space-y-3">
                  {audioSamples.map((sample) => (
                    <div key={sample.id} className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Music className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold">{sample.titulo}</h4>
                          </div>
                          {sample.descricao && (
                            <p className="text-sm text-muted-foreground mt-1 ml-6">{sample.descricao}</p>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover esta amostra de áudio? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAudioSample(sample.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-md">
                        <Button
                          variant={playingAudioId === sample.id ? "default" : "secondary"}
                          size="sm"
                          onClick={() => handlePlayAudio(sample.id, sample.arquivoUrl)}
                          className="flex items-center gap-2"
                        >
                          {playingAudioId === sample.id ? (
                            <>
                              <Pause className="h-4 w-4" />
                              <span>Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 ml-0.5" />
                              <span>Reproduzir</span>
                            </>
                          )}
                        </Button>
                        <div className="flex-1 text-sm text-muted-foreground">
                          {playingAudioId === sample.id ? "Reproduzindo..." : "Clique para ouvir"}
                        </div>
                        <audio
                          id={`audio-${sample.id}`}
                          src={getLocutorAudioUrl(sample.arquivoUrl)}
                          onEnded={() => setPlayingAudioId(null)}
                          className="hidden"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add More Button */}
                  <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary/50 hover:bg-accent/5 transition-all">
                    <input
                      type="file"
                      accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/webm"
                      onChange={handleUploadAudio}
                      disabled={uploadingAudio}
                      className="hidden"
                      id="audio-upload-more"
                    />
                    <label htmlFor="audio-upload-more" className="cursor-pointer">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Plus className={`h-4 w-4 ${uploadingAudio ? 'text-muted-foreground' : 'text-primary'}`} />
                        <span className="font-medium">
                          {uploadingAudio ? 'Enviando...' : 'Adicionar outra amostra'}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/webm"
                    onChange={handleUploadAudio}
                    disabled={uploadingAudio}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="rounded-full bg-primary/10 p-4">
                        <Upload className={`h-8 w-8 ${uploadingAudio ? 'text-muted-foreground' : 'text-primary'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-lg mb-1">
                          {uploadingAudio ? 'Enviando...' : 'Adicionar primeira amostra'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Clique para selecionar um arquivo
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          MP3, WAV, OGG ou WEBM (máx. 50MB)
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}