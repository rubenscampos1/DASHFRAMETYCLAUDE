/*
 * Ajustes implementados (Outubro 2025):
 * 1. Removido overlay preto do hover (cursor: 'auto' no Tooltip)
 * 2. Aplicado filtro de projetos ativos (exclui: Aprovado, Briefing, Em Pausa, Cancelado)
 * 3. Implementado Top 10 na visão padrão (sem scroll); modo expandido mostra todos
 * 4. Corrigido erro TypeScript (type assertion para count)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSidebarLayout } from "@/hooks/use-sidebar-layout";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Users, Video, AlertTriangle, Maximize2 } from "lucide-react";

const CHART_COLOR = "hsl(var(--chart-1))";

interface ChartData {
  name: string;
  value: number;
  fullName?: string;
}

interface ExpandedChartProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  data: ChartData[];
  dataKey: string;
}

function ExpandedChartDialog({ isOpen, onClose, title, description, data, dataKey }: ExpandedChartProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col" data-testid="expanded-chart-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <ResponsiveContainer width="100%" height={Math.max(400, data.length * 50)}>
            <BarChart data={data} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={150}
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip 
                cursor={false}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HorizontalBarChartProps {
  title: string;
  description: string;
  data: ChartData[];
  dataKey: string;
  testId?: string;
}

function HorizontalBarChartCard({ title, description, data, dataKey, testId }: HorizontalBarChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Ordenar do maior para o menor
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Top 10 para visão padrão (sem scroll)
  const displayData = sortedData.slice(0, 10);

  // Truncar nomes longos e guardar nome completo
  const processedDisplayData = displayData.map(item => ({
    ...item,
    fullName: item.name,
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
  }));

  const processedAllData = sortedData.map(item => ({
    ...item,
    fullName: item.name,
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
  }));

  return (
    <>
      <Card data-testid={testId}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description} (Considera somente projetos ativos)</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="ml-2"
              data-testid={`expand-${testId}`}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(300, processedDisplayData.length * 40)}>
            <BarChart data={processedDisplayData} layout="horizontal" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120}
                className="text-xs"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip 
                cursor={false}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item?.fullName || label;
                }}
              />
              <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
                {processedDisplayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <ExpandedChartDialog
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={title}
        description={description}
        data={processedAllData}
        dataKey={dataKey}
      />
    </>
  );
}

export default function Metrics() {
  const { mainContentClass } = useSidebarLayout();
  const { data: metricas, isLoading } = useQuery<any>({
    queryKey: ["/api/metricas"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className={`${mainContentClass} flex flex-col flex-1 transition-all duration-300`}>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dados já vêm filtrados do backend (apenas projetos ativos)
  const statusData: ChartData[] = Object.entries(metricas?.projetosPorStatus || {}).map(([status, count]) => ({
    name: status,
    value: count as number,
  }));

  const responsavelData: ChartData[] = Object.entries(metricas?.projetosPorResponsavel || {}).map(([responsavel, count]) => ({
    name: responsavel,
    value: count as number,
  }));

  const tipoData: ChartData[] = Object.entries(metricas?.projetosPorTipo || {}).map(([tipo, count]) => ({
    name: tipo,
    value: count as number,
  }));

  const clienteData: ChartData[] = Object.entries(metricas?.videosPorCliente || {}).map(([cliente, count]) => ({
    name: cliente,
    value: count as number,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`${mainContentClass} flex flex-col flex-1 overflow-hidden transition-all duration-300`}>
        {/* Header */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-card border-b border-border shadow-sm">
          <div className="flex-1 px-6 flex items-center">
            <h1 className="text-2xl font-semibold text-foreground" data-testid="metrics-title">
              Métricas
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-6 space-y-6">
              
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
                    <Video className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="total-projects">
                      {metricas?.totalProjetos || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Excluindo aprovados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projetos Aprovados</CardTitle>
                    <TrendingUp className="h-4 w-4 text-chart-4" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-4" data-testid="approved-projects">
                      {metricas?.projetosAprovados || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Projetos finalizados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
                    <Users className="h-4 w-4 text-chart-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-1" data-testid="active-projects">
                      {metricas?.projetosAtivos || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Em produção
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projetos Atrasados</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive" data-testid="overdue-projects">
                      {metricas?.projetosAtrasados || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Precisam de atenção
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                    <TrendingUp className="h-4 w-4 text-chart-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-2" data-testid="completion-rate">
                      {(metricas?.totalProjetos || 0) + (metricas?.projetosAprovados || 0) > 0 
                        ? Math.round(((metricas?.projetosAprovados || 0) / ((metricas?.totalProjetos || 0) + (metricas?.projetosAprovados || 0))) * 100)
                        : 0
                      }%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Taxa geral
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
                    <Users className="h-4 w-4 text-chart-3" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-chart-3" data-testid="active-members">
                      {Object.keys(metricas?.projetosPorResponsavel || {}).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Produtividade
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Status Distribution */}
                <HorizontalBarChartCard
                  title="Distribuição por Status"
                  description="Quantidade de projetos em cada etapa"
                  data={statusData}
                  dataKey="value"
                  testId="chart-status"
                />

                {/* Projects by Responsible */}
                <HorizontalBarChartCard
                  title="Projetos por Responsável"
                  description="Distribuição de trabalho na equipe"
                  data={responsavelData}
                  dataKey="value"
                  testId="chart-responsavel"
                />

                {/* Projects by Type */}
                <HorizontalBarChartCard
                  title="Projetos por Tipo de Vídeo"
                  description="Tipos de conteúdo mais produzidos"
                  data={tipoData}
                  dataKey="value"
                  testId="chart-tipo"
                />

                {/* Videos by Client */}
                <HorizontalBarChartCard
                  title="Vídeos por Cliente"
                  description="Distribuição de projetos por cliente"
                  data={clienteData}
                  dataKey="value"
                  testId="chart-cliente"
                />

                {/* Status Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo por Status</CardTitle>
                    <CardDescription>
                      Visão detalhada do pipeline de projetos (somente ativos)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(metricas?.projetosPorStatus || {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{status}</span>
                          <Badge variant="secondary" data-testid={`status-count-${status}`}>
                            {count as number}
                          </Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
