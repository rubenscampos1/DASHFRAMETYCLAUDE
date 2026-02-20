import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Folder, Film, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  frameIoProjectId: string | null;
  totalPastas: number;
  totalVideos: number;
  totalStorage: number;
  ultimaAtualizacao: Date | null;
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Videos</h1>
              <p className="text-muted-foreground mt-1">
                {clientes.length} clientes com projetos no Frame.io
              </p>
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

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando clientes...</div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredClientes.length === 0 && (
            <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-12">
              <Film className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Tente ajustar sua busca" : "Nenhum cliente vinculado ao Frame.io"}
              </p>
            </motion.div>
          )}

          {/* Clients Grid */}
          {!isLoading && filteredClientes.length > 0 && (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {filteredClientes.map((cliente) => (
                <motion.div key={cliente.id} variants={itemVariants}>
                  <Link href={`/videos/${cliente.id}`}>
                    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group border-2 border-transparent hover:border-primary/20 overflow-hidden">
                      {/* Color Banner */}
                      <div
                        className="h-2 w-full"
                        style={{ backgroundColor: cliente.backgroundColor }}
                      />
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm flex-shrink-0"
                            style={{
                              backgroundColor: cliente.backgroundColor,
                              color: cliente.textColor,
                            }}
                          >
                            {cliente.nome.substring(0, 2).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm line-clamp-1">{cliente.nome}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Folder className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {cliente.totalPastas} pastas
                              </span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
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
