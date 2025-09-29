import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Upload, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().optional().transform(val => val === "" ? undefined : val),
  fotoUrl: z.string().optional(),
});

const userManagementSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().optional().transform(val => val === "" ? undefined : val),
  papel: z.enum(["Admin", "Gestor", "Membro"]),
  fotoUrl: z.string().optional(),
});

interface UserProfileDrawerProps {
  isCollapsed: boolean;
}

export function UserProfileDrawer({ isCollapsed }: UserProfileDrawerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: user?.papel === "Admin" && open,
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: user?.nome || "",
      email: user?.email || "",
      senha: "",
      fotoUrl: user?.fotoUrl || "",
    },
  });

  const userForm = useForm<z.infer<typeof userManagementSchema>>({
    resolver: zodResolver(userManagementSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      papel: "Membro",
      fotoUrl: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      return await apiRequest("/api/user/profile", "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
      setOpen(false);
      setPhotoPreview(null);
    },
    onError: () => {
      toast({
        title: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userManagementSchema>) => {
      return await apiRequest("/api/users", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário criado!",
        description: "O novo usuário foi adicionado com sucesso.",
      });
      userForm.reset();
      setPhotoPreview(null);
    },
    onError: () => {
      toast({
        title: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof userManagementSchema> }) => {
      return await apiRequest(`/api/users/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário atualizado!",
        description: "As informações foram salvas com sucesso.",
      });
      setEditingUserId(null);
      userForm.reset();
      setPhotoPreview(null);
    },
    onError: () => {
      toast({
        title: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/users/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário removido.",
        description: "O usuário foi excluído do sistema.",
      });
    },
    onError: () => {
      toast({
        title: "Algo deu errado. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = async (file: File, form: any) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhotoPreview(base64String);
      form.setValue("fotoUrl", base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const handleUserSubmit = (data: z.infer<typeof userManagementSchema>) => {
    if (editingUserId) {
      updateUserMutation.mutate({ id: editingUserId, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEditUser = (selectedUser: User) => {
    setEditingUserId(selectedUser.id);
    userForm.reset({
      nome: selectedUser.nome,
      email: selectedUser.email,
      senha: "",
      papel: selectedUser.papel,
      fotoUrl: selectedUser.fotoUrl || "",
    });
    setPhotoPreview(selectedUser.fotoUrl || null);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    userForm.reset();
    setPhotoPreview(null);
  };

  return (
    <>
      <div
        className={`flex items-center ${isCollapsed ? 'justify-center' : ''} relative group cursor-pointer`}
        onClick={() => setOpen(true)}
        data-testid="user-avatar-trigger"
      >
        <div className="relative">
          <Avatar className="h-9 w-9">
            {user?.fotoUrl ? (
              <AvatarImage src={user.fotoUrl} alt={user.nome} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.nome?.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="h-4 w-4 text-white" />
          </div>
        </div>
        {!isCollapsed && (
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-foreground" data-testid="user-name">
              {user?.nome}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="user-role">
              {user?.papel}
            </p>
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="left" 
          className="w-[400px] sm:w-[540px] p-0 flex flex-col"
          style={{ left: isCollapsed ? "80px" : "256px", bottom: 0, top: "auto", height: "70vh" }}
        >
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Configurações</SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col px-6">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: user?.papel === "Admin" ? "1fr 1fr" : "1fr" }}>
              <TabsTrigger value="profile" data-testid="tab-profile">Perfil</TabsTrigger>
              {user?.papel === "Admin" && (
                <TabsTrigger value="users" data-testid="tab-users">Usuários</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="flex-1 overflow-y-auto mt-4 pb-6">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24">
                      {photoPreview || user?.fotoUrl ? (
                        <AvatarImage src={photoPreview || user?.fotoUrl || ""} alt="Preview" />
                      ) : null}
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {user?.nome?.substring(0, 2).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        id="profile-photo"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file, profileForm);
                        }}
                        data-testid="input-profile-photo"
                      />
                      <Label htmlFor="profile-photo">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span className="cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" />
                            Carregar Foto
                          </span>
                        </Button>
                      </Label>
                    </div>
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-profile-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-profile-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="senha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha (deixe em branco para manter a atual)</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} data-testid="input-profile-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        setPhotoPreview(null);
                        profileForm.reset();
                      }}
                      data-testid="button-profile-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-profile-save"
                    >
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {user?.papel === "Admin" && (
              <TabsContent value="users" className="flex-1 overflow-y-auto mt-4 pb-6">
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingUserId ? "Editar Usuário" : "Novo Usuário"}
                    </h3>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(handleUserSubmit)} className="space-y-4">
                        <div className="flex flex-col items-center space-y-4">
                          <Avatar className="h-20 w-20">
                            {photoPreview ? (
                              <AvatarImage src={photoPreview} alt="Preview" />
                            ) : null}
                            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                              U
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Input
                              type="file"
                              accept="image/jpeg,image/png"
                              className="hidden"
                              id="user-photo"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload(file, userForm);
                              }}
                              data-testid="input-user-photo"
                            />
                            <Label htmlFor="user-photo">
                              <Button type="button" variant="outline" size="sm" asChild>
                                <span className="cursor-pointer">
                                  <Upload className="h-4 w-4 mr-2" />
                                  Carregar Foto
                                </span>
                              </Button>
                            </Label>
                          </div>
                        </div>

                        <FormField
                          control={userForm.control}
                          name="nome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-user-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} data-testid="input-user-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="senha"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Senha {editingUserId && "(deixe em branco para manter a atual)"}
                              </FormLabel>
                              <FormControl>
                                <Input type="password" {...field} data-testid="input-user-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={userForm.control}
                          name="papel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Papel</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-user-role">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Gestor">Gestor</SelectItem>
                                  <SelectItem value="Membro">Membro</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          {editingUserId && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancelEdit}
                              data-testid="button-user-cancel-edit"
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button
                            type="submit"
                            disabled={createUserMutation.isPending || updateUserMutation.isPending}
                            data-testid="button-user-save"
                          >
                            {(createUserMutation.isPending || updateUserMutation.isPending) 
                              ? "Salvando..." 
                              : editingUserId ? "Salvar alterações" : "Criar Usuário"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Papel</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers?.map((u) => (
                          <TableRow 
                            key={u.id}
                            onMouseEnter={() => setHoveredUserId(u.id)}
                            onMouseLeave={() => setHoveredUserId(null)}
                          >
                            <TableCell className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                {u.fotoUrl ? (
                                  <AvatarImage src={u.fotoUrl} alt={u.nome} />
                                ) : null}
                                <AvatarFallback className="text-xs">
                                  {u.nome.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{u.nome}</span>
                            </TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.papel}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUser(u)}
                                  data-testid={`button-edit-user-${u.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {u.id !== user?.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteUserMutation.mutate(u.id)}
                                    disabled={deleteUserMutation.isPending}
                                    data-testid={`button-delete-user-${u.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
