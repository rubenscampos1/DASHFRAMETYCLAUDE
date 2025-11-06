import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Download, 
  FileText, 
  Calendar as CalendarIcon, 
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { ProjetoWithRelations } from "@shared/schema";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";

export default function Relatorios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mainContentClass } = useSidebarLayout();
  const [filters, setFilters] = useState({
    status: "all",
    responsavelId: "all",
    tipoVideoId: "all",
    cliente: "",
    search: "",
    dataInicioAprovacao: undefined as Date | undefined,
    dataFimAprovacao: undefined as Date | undefined,
  });

  const { data: projetos = [], isLoading, refetch } = useQuery<ProjetoWithRelations[]>({
    queryKey: ["/api/projetos", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && typeof value === "string") {
          params.append(key, value);
        } else if (value instanceof Date) {
          params.append(key, value.toISOString());
        }
      });
      
      const response = await fetch(`/api/projetos?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Erro ao carregar projetos");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const { data: tiposVideo = [] } = useQuery<any[]>({
    queryKey: ["/api/tipos-video"],
  });

  const handleFilterChange = (key: string, value: string | Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      responsavelId: "all",
      tipoVideoId: "all",
      cliente: "",
      search: "",
      dataInicioAprovacao: undefined,
      dataFimAprovacao: undefined,
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Título",
      "Status", 
      "Responsável",
      "Tipo de Vídeo",
      "Cliente",
      "Data de Criação",
      "Data Prevista de Entrega",
      "Data de Aprovação",
      "Tags",
      "Atrasado"
    ];

    const csvData = projetos.map(projeto => [
      projeto.titulo,
      projeto.status,
      projeto.responsavel?.nome || "",
      projeto.tipoVideo?.nome || "",
      projeto.cliente || "",
      projeto.dataCriacao ? format(new Date(projeto.dataCriacao), "dd/MM/yyyy", { locale: ptBR }) : "",
      projeto.dataPrevistaEntrega ? format(new Date(projeto.dataPrevistaEntrega), "dd/MM/yyyy", { locale: ptBR }) : "",
      projeto.dataAprovacao ? format(new Date(projeto.dataAprovacao), "dd/MM/yyyy", { locale: ptBR }) : "",
      projeto.tags?.join(", ") || "",
      (projeto.dataPrevistaEntrega && 
       isPast(new Date(projeto.dataPrevistaEntrega)) && 
       !["Aprovado", "Cancelado"].includes(projeto.status)) ? "Sim" : "Não"
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-projetos-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Relatório exportado!",
      description: "O arquivo CSV foi baixado com sucesso.",
    });
  };

  const exportToPDF = async () => {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && typeof value === "string") {
          params.append(key, value);
        } else if (value instanceof Date) {
          params.append(key, value.toISOString());
        }
      });

      const response = await fetch(`/api/relatorios/pdf?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erro ao gerar PDF");
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `relatorio-projetos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Relatório exportado!",
        description: "O arquivo PDF foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar PDF",
        description: "Ocorreu um erro ao gerar o relatório em PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Calculate statistics
  const totalProjetos = projetos.length;
  const projetosPorStatus = projetos.reduce((acc, projeto) => {
    acc[projeto.status] = (acc[projeto.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projetosPorResponsavel = projetos.reduce((acc, projeto) => {
    const nome = projeto.responsavel?.nome || "Sem responsável";
    acc[nome] = (acc[nome] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projetosPorTipo = projetos.reduce((acc, projeto) => {
    const tipo = projeto.tipoVideo?.nome || "Sem tipo";
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const projetosAtrasados = projetos.filter(p => 
    p.dataPrevistaEntrega && 
    isPast(new Date(p.dataPrevistaEntrega)) && 
    !["Aprovado", "Cancelado"].includes(p.status)
  ).length;

  const canViewAll = user?.papel === "Admin" || user?.papel === "Gestor";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
          <div className="flex-1 px-6 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-foreground" data-testid="relatorios-title">
                Relatórios
              </h1>
              <Badge className="bg-chart-1 text-white" data-testid="projects-count">
                {totalProjetos} projetos
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                data-testid="refresh-button"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Atualizar
              </Button>
              
              <Button
                onClick={exportToCSV}
                data-testid="export-csv-button"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              
              <Button
                variant="outline"
                onClick={exportToPDF}
                data-testid="export-pdf-button"
              >
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filtros Avançados</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  data-testid="search-input"
                />
              </div>
              
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value)}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Briefing">Briefing</SelectItem>
                  <SelectItem value="Roteiro">Roteiro</SelectItem>
                  <SelectItem value="Captação">Captação</SelectItem>
                  <SelectItem value="Edição">Edição</SelectItem>
                  <SelectItem value="Aguardando Aprovação">Aguardando Aprovação</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Em Pausa">Em Pausa</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              
              {canViewAll && (
                <Select value={filters.responsavelId} onValueChange={(value) => handleFilterChange("responsavelId", value === "all" ? "" : value)}>
                  <SelectTrigger data-testid="filter-responsavel">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={filters.tipoVideoId} onValueChange={(value) => handleFilterChange("tipoVideoId", value === "all" ? "" : value)}>
                <SelectTrigger data-testid="filter-tipo">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposVideo.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Cliente"
                value={filters.cliente}
                onChange={(e) => handleFilterChange("cliente", e.target.value)}
                data-testid="filter-cliente"
              />

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !filters.dataInicioAprovacao && "text-muted-foreground"
                    )}
                    data-testid="filter-data-inicio"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataInicioAprovacao ? (
                      format(filters.dataInicioAprovacao, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      "Data inicial"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataInicioAprovacao}
                    onSelect={(date) => handleFilterChange("dataInicioAprovacao", date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !filters.dataFimAprovacao && "text-muted-foreground"
                    )}
                    data-testid="filter-data-fim"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dataFimAprovacao ? (
                      format(filters.dataFimAprovacao, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      "Data final"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataFimAprovacao}
                    onSelect={(date) => handleFilterChange("dataFimAprovacao", date)}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {Object.values(filters).some(Boolean) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="clear-filters"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-full mx-auto px-6 space-y-6">
              
              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-1" data-testid="summary-total">
                      {totalProjetos}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive" data-testid="summary-overdue">
                      {projetosAtrasados}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-3" data-testid="summary-in-progress">
                      {totalProjetos - (projetosPorStatus["Aprovado"] || 0) - (projetosPorStatus["Cancelado"] || 0)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-4" data-testid="summary-completed">
                      {projetosPorStatus["Aprovado"] || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Projetos Detalhados</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : totalProjetos === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium text-foreground">Nenhum projeto encontrado</p>
                      <p className="text-sm text-muted-foreground">Ajuste os filtros para ver mais projetos.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Prazo</TableHead>
                            <TableHead>Data Aprovação</TableHead>
                            <TableHead>Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projetos.map((projeto) => {
                            const isOverdue = projeto.dataPrevistaEntrega && 
                              isPast(new Date(projeto.dataPrevistaEntrega)) && 
                              !["Aprovado", "Cancelado"].includes(projeto.status);
                            
                            return (
                              <TableRow key={projeto.id} data-testid={`project-row-${projeto.id}`}>
                                <TableCell className="font-medium" data-testid="cell-title">
                                  {projeto.titulo}
                                </TableCell>
                                <TableCell data-testid="cell-status">
                                  <Badge variant="outline">{projeto.status}</Badge>
                                </TableCell>
                                <TableCell data-testid="cell-responsible">
                                  {projeto.responsavel?.nome}
                                </TableCell>
                                <TableCell data-testid="cell-type">
                                  {projeto.tipoVideo?.nome}
                                </TableCell>
                                <TableCell data-testid="cell-client">
                                  {projeto.cliente?.nome || "-"}
                                </TableCell>
                                <TableCell data-testid="cell-created">
                                  {format(new Date(projeto.dataCriacao), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell data-testid="cell-due-date">
                                  {projeto.dataPrevistaEntrega 
                                    ? format(new Date(projeto.dataPrevistaEntrega), "dd/MM/yyyy", { locale: ptBR })
                                    : "-"
                                  }
                                </TableCell>
                                <TableCell data-testid="cell-approval-date">
                                  {projeto.dataAprovacao 
                                    ? format(new Date(projeto.dataAprovacao), "dd/MM/yyyy", { locale: ptBR })
                                    : "-"
                                  }
                                </TableCell>
                                <TableCell data-testid="cell-status-indicator">
                                  {isOverdue ? (
                                    <Badge variant="destructive">Atrasado</Badge>
                                  ) : projeto.status === "Aprovado" ? (
                                    <Badge className="bg-chart-4 text-white">Finalizado</Badge>
                                  ) : (
                                    <Badge variant="outline">No prazo</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
