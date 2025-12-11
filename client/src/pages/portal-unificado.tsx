import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  User,
  Music,
  Mic,
  Video,
  FileText,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  MessageCircle,
  Instagram,
  Globe,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { ProjetoMusica, ProjetoLocutorWithRelations } from "@shared/schema";
import { QuestionarioNps } from "@/components/questionario-nps";
import { getLocutorAudioUrl } from "@/lib/storage";

interface ProjetoCliente {
  id: string;
  sequencialId: number;
  titulo: string;
  descricao: string;
  status: string;
  dataCriacao: string;
  dataPrevistaEntrega: string | null;
  statusChangedAt: string;
  tipoVideo: {
    nome: string;
    backgroundColor: string;
    textColor: string;
  };
  empreendimento: {
    nome: string;
  } | null;
  linkFrameIo: string | null;
  clientToken: string;
  musicas: ProjetoMusica[];
  locutores: ProjetoLocutorWithRelations[];
  musicaUrl: string | null;
  musicaAprovada: boolean | null;
  musicaFeedback: string | null;
  musicaDataAprovacao: string | null;
  locucaoUrl: string | null;
  locucaoAprovada: boolean | null;
  locucaoFeedback: string | null;
  locucaoDataAprovacao: string | null;
  videoFinalUrl: string | null;
  videoFinalAprovado: boolean | null;
  videoFinalFeedback: string | null;
  videoFinalDataAprovacao: string | null;
}

interface ClienteData {
  cliente: {
    nome: string;
    empresa: string | null;
    backgroundColor: string;
    textColor: string;
  };
  projetos: ProjetoCliente[];
}

export default function PortalUnificado() {
  const { clientToken } = useParams<{ clientToken: string }>();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Extrair projeto selecionado da URL (?projeto=:projetoId)
  const urlParams = new URLSearchParams(window.location.search);
  const projetoIdFromUrl = urlParams.get('projeto');

  // Estados de reprodução de áudio
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [mostrarQuestionarioNps, setMostrarQuestionarioNps] = useState(false);
  const [npsJaVerificado, setNpsJaVerificado] = useState(false);

  // Query para buscar dados do cliente e todos os projetos
  const { data: clienteData, isLoading, error } = useQuery<ClienteData>({
    queryKey: [`/api/portal/cliente/${clientToken}`],
    // Retry inteligente: apenas para erros temporários de rede
    // NÃO retry se backend retornar 504 (timeout do portal com muitos projetos)
    retry: (failureCount, error) => {
      return error?.status !== 504 && failureCount < 3;
    },
    // Backoff exponencial: 1s → 2s → 4s (max 10s)
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // Selecionar projeto (primeiro por padrão, ou o da URL)
  const [projetoSelecionadoId, setProjetoSelecionadoId] = useState<string | null>(null);

  // Quando os dados carregam, define o projeto selecionado
  useEffect(() => {
    if (clienteData?.projetos && clienteData.projetos.length > 0) {
      if (projetoIdFromUrl && clienteData.projetos.find(p => p.id === projetoIdFromUrl)) {
        setProjetoSelecionadoId(projetoIdFromUrl);
      } else {
        // Seleciona o primeiro projeto por padrão
        setProjetoSelecionadoId(clienteData.projetos[0].id);
      }
    }
  }, [clienteData, projetoIdFromUrl]);

  // Projeto atualmente selecionado (precisa estar antes do useEffect do NPS)
  const projeto = clienteData?.projetos.find(p => p.id === projetoSelecionadoId);

  // Verificar se deve abrir questionário NPS automaticamente
  useEffect(() => {
    const verificarNPS = async () => {
      // Só verificar uma vez
      if (npsJaVerificado || !projeto || !projeto.clientToken) return;

      // Se o projeto está Aprovado, verificar se já respondeu o NPS
      if (projeto.status === "Aprovado") {
        try {
          const response = await fetch(`/api/cliente/projeto/${projeto.clientToken}/nps/verificar`);
          const data = await response.json();

          // Se não existe resposta NPS, abrir o questionário imediatamente
          if (!data.jaRespondeu) {
            setMostrarQuestionarioNps(true);
          }
        } catch (error) {
          console.error("Erro ao verificar NPS:", error);
        }
      }

      setNpsJaVerificado(true);
    };

    verificarNPS();
  }, [projeto, npsJaVerificado]);

  // Função para mudar projeto selecionado
  const selecionarProjeto = (projetoId: string) => {
    setProjetoSelecionadoId(projetoId);
    // Atualizar URL
    const newUrl = `/portal/cliente/${clientToken}?projeto=${projetoId}`;
    window.history.pushState({}, '', newUrl);
  };

  // Estados para seleção de música e locutor (novo sistema)
  const [musicaSelecionada, setMusicaSelecionada] = useState<string | null>(null);
  const [locutorSelecionado, setLocutorSelecionado] = useState<string | null>(null);
  const [feedbackGeral, setFeedbackGeral] = useState("");

  // Estados para feedback dos itens antigos (sistema legado)
  const [musicaFeedback, setMusicaFeedback] = useState("");
  const [locucaoFeedback, setLocucaoFeedback] = useState("");
  const [videoFeedback, setVideoFeedback] = useState("");

  // Função para abrir música em popup (desktop) ou nova aba (mobile)
  const abrirMusicaPopup = (url: string) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(url, '_blank');
    } else {
      const width = 800;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        url,
        'MusicaPopup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
      );
    }
  };

  // Mutation para enviar seleções (música, locutor ou ambos)
  const enviarSelecoesMutation = useMutation({
    mutationFn: async () => {
      // Validação: Pelo menos UM deve estar selecionado
      if (!musicaSelecionada && !locutorSelecionado) {
        throw new Error("Selecione pelo menos uma música ou um locutor");
      }

      if (!projeto) {
        throw new Error("Projeto não encontrado");
      }

      const results = [];

      // Aprovar a música selecionada (se houver)
      if (musicaSelecionada) {
        const musicaResponse = await fetch(`/api/cliente/projeto/${projeto.clientToken}/musicas/${musicaSelecionada}/aprovar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aprovado: true, feedback: feedbackGeral }),
        });
        if (!musicaResponse.ok) throw new Error("Erro ao aprovar música");
        results.push("música");
      }

      // Aprovar o locutor selecionado (se houver)
      if (locutorSelecionado) {
        const locutorResponse = await fetch(`/api/cliente/projeto/${projeto.clientToken}/locutores/${locutorSelecionado}/aprovar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aprovado: true, feedback: feedbackGeral }),
        });
        if (!locutorResponse.ok) throw new Error("Erro ao aprovar locutor");
        results.push("locutor");
      }

      return { success: true, approved: results };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portal/cliente/${clientToken}`] });
      setMusicaSelecionada(null);
      setLocutorSelecionado(null);
      setFeedbackGeral("");
      toast({
        title: "Resposta enviada!",
        description: "Suas escolhas foram registradas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutations antigas para aprovações (mantidas para compatibilidade)
  const aprovarMusicaMutation = useMutation({
    mutationFn: async ({ aprovado, feedback }: { aprovado: boolean; feedback?: string }) => {
      if (!projeto) throw new Error("Projeto não encontrado");
      const response = await fetch(`/api/cliente/projeto/${projeto.clientToken}/aprovar-musica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portal/cliente/${clientToken}`] });
      setMusicaFeedback("");
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
      });
    },
  });

  const aprovarLocucaoMutation = useMutation({
    mutationFn: async ({ aprovado, feedback }: { aprovado: boolean; feedback?: string }) => {
      if (!projeto) throw new Error("Projeto não encontrado");
      const response = await fetch(`/api/cliente/projeto/${projeto.clientToken}/aprovar-locucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/portal/cliente/${clientToken}`] });
      setLocucaoFeedback("");
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
      });
    },
  });

  const aprovarVideoMutation = useMutation({
    mutationFn: async ({ aprovado, feedback }: { aprovado: boolean; feedback?: string }) => {
      if (!projeto) throw new Error("Projeto não encontrado");
      const response = await fetch(`/api/cliente/projeto/${projeto.clientToken}/aprovar-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/portal/cliente/${clientToken}`] });
      setVideoFeedback("");
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
      });

      // Se o vídeo foi aprovado, abrir questionário NPS após 1 segundo
      if (variables.aprovado) {
        setTimeout(() => {
          setMostrarQuestionarioNps(true);
        }, 1000);
      }
    },
  });

  const handlePlayAudio = (audioId: string, audioUrl: string) => {
    const audioElement = document.getElementById(`audio-${audioId}`) as HTMLAudioElement;

    if (playingAudio === audioId) {
      audioElement?.pause();
      setPlayingAudio(null);
    } else {
      // Pausar qualquer áudio que esteja tocando
      if (playingAudio) {
        const currentAudio = document.getElementById(`audio-${playingAudio}`) as HTMLAudioElement;
        currentAudio?.pause();
      }
      audioElement?.play();
      setPlayingAudio(audioId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando informações do projeto...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !clienteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Link inválido</AlertTitle>
              <AlertDescription>
                Este link não é válido ou expirou. Por favor, entre em contato conosco para obter um novo link.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando projeto...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular dias no status atual (usa statusChangedAt, fallback para dataCriacao se não existir)
  const statusDate = projeto.statusChangedAt && new Date(projeto.statusChangedAt).getTime() > 0
    ? new Date(projeto.statusChangedAt)
    : new Date(projeto.dataCriacao);
  const diasNoStatusAtual = differenceInDays(new Date(), statusDate);

  // Calcular dias desde a criação
  const diasDesdeCriacao = differenceInDays(new Date(), new Date(projeto.dataCriacao));

  // Timeline de status do projeto
  const statusTimeline = [
    { nome: "Briefing", cor: "bg-slate-500", ordem: 1 },
    { nome: "Roteiro", cor: "bg-blue-500", ordem: 2 },
    { nome: "Captação", cor: "bg-purple-500", ordem: 3 },
    { nome: "Edição", cor: "bg-orange-500", ordem: 4 },
    { nome: "Aguardando Aprovação", cor: "bg-yellow-500", ordem: 5 },
    { nome: "Entrega", cor: "bg-green-500", ordem: 6 },
  ];

  // Encontrar posição atual na timeline
  const statusAtualIndex = statusTimeline.findIndex(s => s.nome === projeto.status);
  const progressoPercentual = projeto.status === "Aprovado"
    ? 100  // Projeto finalizado = 100%
    : statusAtualIndex >= 0
    ? ((statusAtualIndex + 1) / statusTimeline.length) * 100
    : 0;

  const ApprovalStatus = ({ approved }: { approved: boolean | null }) => {
    if (approved === null) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Aguardando
        </Badge>
      );
    }
    if (approved) {
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Aprovado
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Alterações solicitadas
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted overflow-x-hidden w-full">
      <div className="container max-w-4xl mx-auto p-3 sm:p-4 space-y-3 overflow-x-hidden">
        {/* Header */}
        <Card className="border-none shadow bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <CardHeader className="p-3 sm:p-4">
            {/* Cliente Info */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 text-primary">
                <User className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <p className="font-bold text-base sm:text-xl">{clienteData.cliente.nome}</p>
              </div>
              {clienteData.cliente.empresa && (
                <div className="flex items-center gap-2 text-primary">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <p className="font-bold text-base sm:text-xl">{clienteData.cliente.empresa}</p>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Project Selector - Separado por status */}
        {clienteData.projetos.length > 1 && (() => {
          const projetosEmAndamento = clienteData.projetos.filter(p => p.status !== "Aprovado");
          const projetosConcluidos = clienteData.projetos.filter(p => p.status === "Aprovado");
          const projetoAtual = projeto;
          const isProjetoEmAndamento = projetoAtual && projetoAtual.status !== "Aprovado";

          return (
            <Card>
              <CardHeader className="p-4 space-y-1">
                <CardTitle className="text-base">Selecione o Projeto</CardTitle>
                <CardDescription className="text-xs">
                  {projetosEmAndamento.length > 0 && `${projetosEmAndamento.length} em andamento`}
                  {projetosEmAndamento.length > 0 && projetosConcluidos.length > 0 && " • "}
                  {projetosConcluidos.length > 0 && `${projetosConcluidos.length} concluído${projetosConcluidos.length > 1 ? 's' : ''}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {/* Indicador Visual do Projeto Selecionado */}
                {projetoAtual && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Visualizando agora:</p>
                        <p className="font-semibold text-sm text-primary">
                          {projetoAtual.titulo}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {projetoAtual.tipoVideo.nome}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Projetos em Andamento */}
                {projetosEmAndamento.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Em Andamento ({projetosEmAndamento.length})
                    </label>
                    <Select
                      value={isProjetoEmAndamento ? projetoSelecionadoId || undefined : ""}
                      onValueChange={selecionarProjeto}
                    >
                      <SelectTrigger className={`w-full ${isProjetoEmAndamento ? 'border-primary/50' : ''}`}>
                        <SelectValue placeholder="Escolher projeto em andamento..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-md border-2">
                        {projetosEmAndamento.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id}>
                            <div className="flex items-center gap-2 w-full">
                              <span className="flex-1 text-sm">
                                {proj.titulo}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {proj.tipoVideo.nome}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Projetos Concluídos */}
                {projetosConcluidos.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Concluídos ({projetosConcluidos.length})
                    </label>
                    <Select
                      value={!isProjetoEmAndamento && projetoSelecionadoId ? projetoSelecionadoId : ""}
                      onValueChange={selecionarProjeto}
                    >
                      <SelectTrigger className={`w-full ${!isProjetoEmAndamento && projetoSelecionadoId ? 'border-green-500/50' : ''}`}>
                        <SelectValue placeholder="Escolher projeto concluído..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-md border-2">
                        {projetosConcluidos.map((proj) => (
                          <SelectItem key={proj.id} value={proj.id}>
                            <div className="flex items-center gap-2 w-full">
                              <span className="flex-1 text-sm">
                                {proj.titulo}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {proj.tipoVideo.nome}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Barra de Progresso do Projeto */}
        <Card>
          <CardHeader className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Progresso do Projeto</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Status atual: <strong>{projeto.status}</strong>
                </p>
              </div>
              {projeto.status !== "Aprovado" && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{diasNoStatusAtual}</div>
                  <p className="text-xs text-muted-foreground">
                    {diasNoStatusAtual === 1 ? 'dia' : 'dias'} neste status
                  </p>
                </div>
              )}
            </div>

            {/* Barra de progresso visual */}
            <div className="space-y-2">
              <div className="relative">
                {/* Barra de fundo */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  {/* Barra de progresso */}
                  <div
                    className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-500 ease-out"
                    style={{ width: `${progressoPercentual}%` }}
                  />
                </div>

                {/* Marcadores de status */}
                <div className="flex justify-between mt-3">
                  {statusTimeline.map((status, index) => {
                    const isAtual = status.nome === projeto.status;
                    // Se o projeto está aprovado, todos os status estão concluídos
                    const isConcluido = projeto.status === "Aprovado" ? true : index < statusAtualIndex;
                    const isProximo = index === statusAtualIndex + 1;

                    return (
                      <div
                        key={status.nome}
                        className="flex flex-col items-center flex-1"
                      >
                        {/* Círculo do status */}
                        <div
                          className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center mb-1 transition-all
                            ${isAtual
                              ? 'border-primary bg-primary scale-110 shadow-lg shadow-primary/50'
                              : isConcluido
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/30 bg-background'
                            }
                          `}
                        >
                          {isConcluido && (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          )}
                          {isAtual && (
                            <Clock className="h-3 w-3 text-white animate-pulse" />
                          )}
                        </div>

                        {/* Nome do status */}
                        <span
                          className={`
                            text-[10px] sm:text-xs text-center font-medium transition-all
                            ${isAtual
                              ? 'text-primary font-semibold'
                              : isConcluido
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }
                          `}
                        >
                          {status.nome}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Informações adicionais */}
              <div className="pt-2 border-t border-dashed">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    Projeto criado há <strong>{diasDesdeCriacao} dias</strong>
                  </span>
                  {projeto.dataPrevistaEntrega && (
                    <span className="text-muted-foreground">
                      Previsão: <strong>{format(new Date(projeto.dataPrevistaEntrega), "dd/MM/yyyy", { locale: ptBR })}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Botão para visualizar vídeo no Frame.io */}
        {projeto.linkFrameIo && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <Button
                size="default"
                className="w-full gap-2 shadow-lg sm:text-base text-sm"
                onClick={() => window.open(projeto.linkFrameIo!, '_blank')}
              >
                <Video className="h-4 w-4" />
                Clique e veja seu vídeo
                <ExternalLink className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Músicas para aprovação (novo sistema) */}
        {projeto.musicas && projeto.musicas.length > 0 && (
          <Card>
            <CardHeader className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Music className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Músicas para Aprovação</CardTitle>
                  <CardDescription className="text-xs">Clique no play para ouvir cada música</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {projeto.musicas.map((musica) => (
                  <div
                    key={musica.id}
                    className={`border rounded-lg p-4 transition-all ${
                      musicaSelecionada === musica.id
                        ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox visual para seleção */}
                      {musica.aprovada === null && (
                        <div
                          onClick={() => {
                            // Toggle: se já está selecionada, desmarca; senão, seleciona
                            setMusicaSelecionada(musicaSelecionada === musica.id ? null : musica.id);
                          }}
                          className={`
                            w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0
                            ${musicaSelecionada === musica.id
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300 hover:border-green-400'
                            }
                          `}
                        >
                          {musicaSelecionada === musica.id && (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>
                      )}

                      {/* Info da música */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Music className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{musica.titulo}</span>
                          <ApprovalStatus approved={musica.aprovada} />
                        </div>
                      </div>

                      {/* Botão de Play - no canto direito */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => abrirMusicaPopup(musica.musicaUrl)}
                        className="h-9 w-9 flex-shrink-0"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Feedback e data (se já foi aprovado) */}
                    {musica.aprovada !== null && (
                      <div className="mt-3 space-y-2 pt-3 border-t">
                        {musica.feedback && (
                          <Alert className="p-3">
                            <FileText className="h-3 w-3" />
                            <AlertTitle className="text-sm">Seu comentário</AlertTitle>
                            <AlertDescription className="text-xs">{musica.feedback}</AlertDescription>
                          </Alert>
                        )}
                        {musica.dataAprovacao && (
                          <p className="text-xs text-muted-foreground text-center">
                            Resposta enviada em {format(new Date(musica.dataAprovacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locutores para aprovação (novo sistema) */}
        {projeto.locutores && projeto.locutores.length > 0 && (
          <Card>
            <CardHeader className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Locutores para Aprovação</CardTitle>
                  <CardDescription className="text-xs">Clique no play para ouvir cada locutor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {projeto.locutores.map((projetoLocutor) => {
                  const locutor = projetoLocutor.locutor;
                  const amostraDestaque = locutor.amostras?.find(a => a.destaque) || locutor.amostras?.[0];

                  return (
                    <div
                      key={projetoLocutor.id}
                      className={`border rounded-lg p-4 transition-all ${
                        locutorSelecionado === projetoLocutor.id
                          ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox visual para seleção */}
                        {projetoLocutor.aprovado === null && (
                          <div
                            onClick={() => {
                              // Toggle: se já está selecionado, desmarca; senão, seleciona
                              setLocutorSelecionado(locutorSelecionado === projetoLocutor.id ? null : projetoLocutor.id);
                            }}
                            className={`
                              w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 mt-1
                              ${locutorSelecionado === projetoLocutor.id
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 hover:border-green-400'
                              }
                            `}
                          >
                            {locutorSelecionado === projetoLocutor.id && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                        )}

                        {/* Info do locutor */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Mic className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="font-medium text-sm">{locutor.nomeFicticio}</span>
                            <Badge variant="outline" className="text-xs">{locutor.genero}</Badge>
                            <Badge variant="outline" className="text-xs">{locutor.faixaEtaria}</Badge>
                            <ApprovalStatus approved={projetoLocutor.aprovado} />
                          </div>
                        </div>

                        {/* Botão de Play para áudio - no canto direito */}
                        {amostraDestaque && (
                          <Button
                            variant={playingAudio === `locutor-${projetoLocutor.id}` ? "default" : "outline"}
                            size="icon"
                            onClick={() => handlePlayAudio(`locutor-${projetoLocutor.id}`, amostraDestaque.arquivoUrl)}
                            className="h-9 w-9 flex-shrink-0"
                          >
                            {playingAudio === `locutor-${projetoLocutor.id}` ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Audio element (hidden) */}
                        {amostraDestaque && (
                          <audio
                            id={`audio-locutor-${projetoLocutor.id}`}
                            src={getLocutorAudioUrl(amostraDestaque.arquivoUrl)}
                            onEnded={() => setPlayingAudio(null)}
                            className="hidden"
                          />
                        )}
                      </div>

                      {/* Feedback e data (se já foi aprovado) */}
                      {projetoLocutor.aprovado !== null && (
                        <div className="mt-3 space-y-2 pt-3 border-t">
                          {projetoLocutor.feedback && (
                            <Alert className="p-3">
                              <FileText className="h-3 w-3" />
                              <AlertTitle className="text-sm">Seu comentário</AlertTitle>
                              <AlertDescription className="text-xs">{projetoLocutor.feedback}</AlertDescription>
                            </Alert>
                          )}
                          {projetoLocutor.dataAprovacao && (
                            <p className="text-xs text-muted-foreground text-center">
                              Resposta enviada em {format(new Date(projetoLocutor.dataAprovacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botão de envio de respostas (novo sistema) */}
        {/* Só mostra o botão se: */}
        {/* 1. Existem músicas E locutores */}
        {/* 2. Pelo menos UM deles ainda NÃO foi aprovado pelo cliente */}
        {/* 3. Card desaparece apenas quando AMBOS já foram aprovados */}
        {projeto.musicas && projeto.musicas.length > 0 && projeto.locutores && projeto.locutores.length > 0 && (
          // Verifica se pelo menos UM ainda NÃO foi aprovado (música OU locutor)
          !projeto.musicas.some(m => m.aprovada === true) || !projeto.locutores.some(l => l.aprovado === true)
        ) && (
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Comentário ou sugestões (opcional)
                  </label>
                  <Textarea
                    placeholder="Deixe um comentário geral sobre suas escolhas..."
                    value={feedbackGeral}
                    onChange={(e) => setFeedbackGeral(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {(!musicaSelecionada && !locutorSelecionado) && (
                    <Alert className="p-3">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Selecione pelo menos uma música ou um locutor antes de enviar sua resposta
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={() => enviarSelecoesMutation.mutate()}
                    disabled={(!musicaSelecionada && !locutorSelecionado) || enviarSelecoesMutation.isPending}
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
                  >
                    {enviarSelecoesMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Enviar Resposta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aprovação de Música (sistema antigo - mantido para compatibilidade) */}
        {projeto.musicaUrl && (
          <Card>
            <CardHeader className="p-4 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Music className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Música</CardTitle>
                    <CardDescription className="text-xs">Ouça e aprove a música selecionada</CardDescription>
                  </div>
                </div>
                <ApprovalStatus approved={projeto.musicaAprovada} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              <div className="bg-muted/50 rounded-lg p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={playingAudio === 'musica' ? "default" : "secondary"}
                    size="sm"
                    onClick={() => handlePlayAudio('musica', projeto.musicaUrl!)}
                    className="flex-shrink-0"
                  >
                    {playingAudio === 'musica' ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3 ml-0.5" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {playingAudio === 'musica' ? "Reproduzindo..." : "Clique para ouvir"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {projeto.musicaUrl}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirMusicaPopup(projeto.musicaUrl!)}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <audio
                  id="audio-musica"
                  src={projeto.musicaUrl}
                  onEnded={() => setPlayingAudio(null)}
                  className="hidden"
                />
              </div>

              {projeto.musicaAprovada === null ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Comentários ou sugestões sobre a música (opcional)"
                    value={musicaFeedback}
                    onChange={(e) => setMusicaFeedback(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => aprovarMusicaMutation.mutate({ aprovado: true, feedback: musicaFeedback })}
                      disabled={aprovarMusicaMutation.isPending}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {aprovarMusicaMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-2" />
                      )}
                      Aprovar Música
                    </Button>
                    <Button
                      onClick={() => aprovarMusicaMutation.mutate({ aprovado: false, feedback: musicaFeedback })}
                      disabled={aprovarMusicaMutation.isPending || !musicaFeedback.trim()}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      {aprovarMusicaMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2" />
                      )}
                      Solicitar Alteração
                    </Button>
                  </div>
                  {!musicaFeedback.trim() && (
                    <p className="text-xs text-muted-foreground text-center">
                      Para solicitar alteração, é necessário deixar um comentário
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {projeto.musicaFeedback && (
                    <Alert className="p-3">
                      <FileText className="h-3 w-3" />
                      <AlertTitle className="text-sm">Seu comentário</AlertTitle>
                      <AlertDescription className="text-xs">{projeto.musicaFeedback}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    Resposta enviada em {format(new Date(projeto.musicaDataAprovacao!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Aprovação de Locução (sistema antigo) */}
        {projeto.locucaoUrl && (
          <Card>
            <CardHeader className="p-4 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Mic className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Locução</CardTitle>
                    <CardDescription className="text-xs">Ouça e aprove a locução gravada</CardDescription>
                  </div>
                </div>
                <ApprovalStatus approved={projeto.locucaoAprovada} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              <div className="bg-muted/50 rounded-lg p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={playingAudio === 'locucao' ? "default" : "secondary"}
                    size="sm"
                    onClick={() => handlePlayAudio('locucao', projeto.locucaoUrl!)}
                    className="flex-shrink-0"
                  >
                    {playingAudio === 'locucao' ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3 ml-0.5" />
                    )}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {playingAudio === 'locucao' ? "Reproduzindo..." : "Clique para ouvir"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {projeto.locucaoUrl}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(projeto.locucaoUrl!, '_blank')}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <audio
                  id="audio-locucao"
                  src={projeto.locucaoUrl}
                  onEnded={() => setPlayingAudio(null)}
                  className="hidden"
                />
              </div>

              {projeto.locucaoAprovada === null ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Comentários ou sugestões sobre a locução (opcional)"
                    value={locucaoFeedback}
                    onChange={(e) => setLocucaoFeedback(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => aprovarLocucaoMutation.mutate({ aprovado: true, feedback: locucaoFeedback })}
                      disabled={aprovarLocucaoMutation.isPending}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {aprovarLocucaoMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-2" />
                      )}
                      Aprovar Locução
                    </Button>
                    <Button
                      onClick={() => aprovarLocucaoMutation.mutate({ aprovado: false, feedback: locucaoFeedback })}
                      disabled={aprovarLocucaoMutation.isPending || !locucaoFeedback.trim()}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      {aprovarLocucaoMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2" />
                      )}
                      Solicitar Alteração
                    </Button>
                  </div>
                  {!locucaoFeedback.trim() && (
                    <p className="text-xs text-muted-foreground text-center">
                      Para solicitar alteração, é necessário deixar um comentário
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {projeto.locucaoFeedback && (
                    <Alert className="p-3">
                      <FileText className="h-3 w-3" />
                      <AlertTitle className="text-sm">Seu comentário</AlertTitle>
                      <AlertDescription className="text-xs">{projeto.locucaoFeedback}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    Resposta enviada em {format(new Date(projeto.locucaoDataAprovacao!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Aprovação de Vídeo Final */}
        {projeto.videoFinalUrl && (
          <Card>
            <CardHeader className="p-4 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Vídeo Final</CardTitle>
                    <CardDescription className="text-xs">Assista e aprove a versão final do vídeo</CardDescription>
                  </div>
                </div>
                <ApprovalStatus approved={projeto.videoFinalAprovado} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    controls
                    className="w-full h-full"
                    src={projeto.videoFinalUrl}
                  >
                    Seu navegador não suporta vídeos.
                  </video>
                </div>
              </div>

              {projeto.videoFinalAprovado === null ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Comentários ou sugestões sobre o vídeo (opcional)"
                    value={videoFeedback}
                    onChange={(e) => setVideoFeedback(e.target.value)}
                    rows={2}
                    className="resize-none text-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => aprovarVideoMutation.mutate({ aprovado: true, feedback: videoFeedback })}
                      disabled={aprovarVideoMutation.isPending}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {aprovarVideoMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-2" />
                      )}
                      Aprovar Vídeo
                    </Button>
                    <Button
                      onClick={() => aprovarVideoMutation.mutate({ aprovado: false, feedback: videoFeedback })}
                      disabled={aprovarVideoMutation.isPending || !videoFeedback.trim()}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      {aprovarVideoMutation.isPending ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-2" />
                      )}
                      Solicitar Alteração
                    </Button>
                  </div>
                  {!videoFeedback.trim() && (
                    <p className="text-xs text-muted-foreground text-center">
                      Para solicitar alteração, é necessário deixar um comentário
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {projeto.videoFinalFeedback && (
                    <Alert className="p-3">
                      <FileText className="h-3 w-3" />
                      <AlertTitle className="text-sm">Seu comentário</AlertTitle>
                      <AlertDescription className="text-xs">{projeto.videoFinalFeedback}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    Resposta enviada em {format(new Date(projeto.videoFinalDataAprovacao!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

            {/* Footer com informações de contato */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Dúvidas? Entre em contato conosco
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </a>
                    <a href="https://website.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
      </div>

      {/* Questionário NPS */}
      {projeto && projeto.clientToken && (
        <QuestionarioNps
          isOpen={mostrarQuestionarioNps}
          onClose={() => setMostrarQuestionarioNps(false)}
          projetoId={projeto.id}
          token={projeto.clientToken}
        />
      )}
    </div>
  );
}
