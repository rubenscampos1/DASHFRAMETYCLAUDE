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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, Database, Building2, Tag, Video } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClienteSchema, insertTagSchema, insertTipoVideoSchema, type Cliente, type InsertCliente, type Tag as TagType, type InsertTag, type TipoVideo, type InsertTipoVideo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { useAuth } from "@/hooks/use-auth";

export default function DatabasePage() {
  const { toast } = useToast();
  const { mainContentClass } = useSidebarLayout();
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  
  // Tag/Category modals
  const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false);
  const [createCategoryDialogOpen, setCreateCategoryDialogOpen] = useState(false);

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
  });

  const { data: tags = [] } = useQuery<TagType[]>({
    queryKey: ["/api/tags"],
  });

  const { data: categorias = [] } = useQuery<TipoVideo[]>({
    queryKey: ["/api/tipos-video"],
  });

  const createForm = useForm<InsertCliente>({
    resolver: zodResolver(insertClienteSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      empresa: "",
    },
  });

  const editForm = useForm<InsertCliente>({
    resolver: zodResolver(insertClienteSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      empresa: "",
    },
  });

  const tagForm = useForm<InsertTag>({
    resolver: zodResolver(insertTagSchema),
    defaultValues: {
      nome: "",
      backgroundColor: "#10b981",
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

  // Tag mutations
  const createTagMutation = useMutation({
    mutationFn: async (data: InsertTag) => {
      const response = await apiRequest("POST", "/api/tags", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setCreateTagDialogOpen(false);
      tagForm.reset();
      toast({
        title: "Tag criada",
        description: "Tag adicionada ao banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tag",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Tag excluída",
        description: "Tag removida do banco de dados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir tag",
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
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Tag/Category handlers
  const onCreateTagSubmit = (data: InsertTag) => {
    createTagMutation.mutate(data);
  };

  const onCreateCategorySubmit = (data: InsertTipoVideo) => {
    createCategoryMutation.mutate(data);
  };

  const handleDeleteTag = (id: string) => {
    deleteTagMutation.mutate(id);
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategoryMutation.mutate(id);
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
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
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
                  <Button variant="outline" data-testid="button-new-tag" onClick={() => setCreateTagDialogOpen(true)}>
                    <Tag className="h-4 w-4 mr-2" />
                    Nova Tag
                  </Button>
                  
                  <Button variant="outline" data-testid="button-new-category" onClick={() => setCreateCategoryDialogOpen(true)}>
                    <Video className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-6 space-y-6">
              
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            <FormLabel>Empresa</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nome da empresa" 
                                {...field} 
                                data-testid="input-create-empresa"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-6 space-y-6">
              
              {/* Stats Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <CardTitle className="text-sm font-medium">Com Email</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="clients-with-email">
                      {clientes.filter(c => c.email).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contatos disponíveis
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Com Empresa</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="clients-with-company">
                      {clientes.filter(c => c.empresa).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clientes corporativos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Clients Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Clientes Cadastrados</CardTitle>
                  <CardDescription>
                    Gerencie todos os clientes do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {clientes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientes.map((cliente) => (
                          <TableRow key={cliente.id} data-testid={`row-client-${cliente.id}`}>
                            <TableCell className="font-medium" data-testid={`text-nome-${cliente.id}`}>
                              {cliente.nome}
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
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

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
                      <FormLabel>Empresa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome da empresa" 
                          {...field} 
                          data-testid="input-edit-empresa"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
    </div>
  );
}