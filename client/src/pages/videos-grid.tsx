import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Settings, Folder, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/components/motion-wrapper";

interface ClienteComEstatisticas {
  id: string;
  nome: string;
  empresa: string | null;
  backgroundColor: string;
  textColor: string;
  totalPastas: number;
  totalVideos: number;
  totalStorage: number; // em bytes
  ultimaAtualizacao: Date | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

function formatDate(date: Date | null): string {
  if (!date) return "Nunca";
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

export default function VideosGrid() {
  const { mainContentClass } = useSidebarLayout();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clientes = [], isLoading } = useQuery<ClienteComEstatisticas[]>({
    queryKey: ["/api/videos/clientes"],
    queryFn: async () => {
      const response = await fetch("/api/videos/clientes", { credentials: "include" });
      if (!response.ok) throw new Error("Erro ao carregar clientes");
      return response.json();
    },
  });

  const filteredClientes = clientes.filter((cliente) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(searchLower) ||
      cliente.empresa?.toLowerCase().includes(searchLower)
    );
  });

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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Vídeos</h1>
                <p className="text-muted-foreground mt-1">
                  Organize e gerencie todos os vídeos dos seus clientes
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
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
                  Total de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientes.length}</div>
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
                  {clientes.reduce((acc, c) => acc + c.totalVideos, 0)}
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
                  {formatBytes(clientes.reduce((acc, c) => acc + c.totalStorage, 0))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando clientes...</div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredClientes.length === 0 && (
            <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-12">
              <Folder className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Tente ajustar sua busca" : "Crie pastas de vídeos para começar"}
              </p>
            </motion.div>
          )}

          {/* Clients Grid */}
          {!isLoading && filteredClientes.length > 0 && (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredClientes.map((cliente) => (
                <motion.div key={cliente.id} variants={itemVariants}>
                  <Link href={`/videos/${cliente.id}`}>
                    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      <CardHeader className="space-y-4">
                        {/* Avatar/Logo */}
                        <div className="flex items-center justify-between">
                          <div
                            className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold shadow-sm"
                            style={{
                              backgroundColor: cliente.backgroundColor,
                              color: cliente.textColor,
                            }}
                          >
                            {cliente.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              // TODO: Abrir menu de configurações
                              console.log("Settings clicked for:", cliente.id);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Client Name */}
                        <div>
                          <CardTitle className="text-lg line-clamp-1">{cliente.nome}</CardTitle>
                          {cliente.empresa && (
                            <CardDescription className="mt-1 line-clamp-1">
                              {cliente.empresa}
                            </CardDescription>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Folder className="h-4 w-4" />
                            <span>{cliente.totalPastas} pastas</span>
                          </div>
                          <div className="font-medium">{cliente.totalVideos} vídeos</div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="h-4 w-4" />
                            <span>Armazenamento</span>
                          </div>
                          <div className="font-medium">{formatBytes(cliente.totalStorage)}</div>
                        </div>

                        {/* Last Update */}
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Atualizado {formatDate(cliente.ultimaAtualizacao)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
