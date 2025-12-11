import { useState, useEffect } from "react";
import { useParams } from "wouter";
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
  cliente: {
    nome: string;
    empresa: string | null;
  } | null;
  empreendimento: {
    nome: string;
  } | null;
  // Link do Frame.io para visualizar o vídeo
  linkFrameIo: string | null;
  // Novo sistema com múltiplas músicas e locutores
  musicas: ProjetoMusica[];
  locutores: ProjetoLocutorWithRelations[];
  // Campos antigos mantidos para compatibilidade
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

export default function ClientePortal() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Novo sistema de seleção única (radio buttons)
  const [musicaSelecionada, setMusicaSelecionada] = useState<string | null>(null);
  const [locutorSelecionado, setLocutorSelecionado] = useState<string | null>(null);
  const [feedbackGeral, setFeedbackGeral] = useState("");

  // Estados para feedback dos itens antigos (sistema legado)
  const [musicaFeedback, setMusicaFeedback] = useState("");
  const [locucaoFeedback, setLocucaoFeedback] = useState("");
  const [videoFeedback, setVideoFeedback] = useState("");

  // Estado para controlar questionário NPS
  const [mostrarQuestionarioNps, setMostrarQuestionarioNps] = useState(false);
  const [npsJaVerificado, setNpsJaVerificado] = useState(false);

  // Função para abrir música em popup (desktop) ou nova aba (mobile)
  const abrirMusicaPopup = (url: string) => {
    // Detectar se é mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // No mobile, abre em nova aba normal
      window.open(url, '_blank');
    } else {
      // No desktop, abre popup estilizada
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

  // Query para buscar dados do projeto
  const { data: projeto, isLoading, error } = useQuery<ProjetoCliente>({
    queryKey: [`/api/cliente/projeto/${token}`],
    retry: false,
  });

  // Verificar se deve abrir questionário NPS automaticamente
  useEffect(() => {
    const verificarNPS = async () => {
      // Só verificar uma vez
      if (npsJaVerificado || !projeto || !token) return;

      // Se o projeto está Aprovado, verificar se já respondeu o NPS
      if (projeto.status === "Aprovado") {
        try {
          const response = await fetch(`/api/cliente/projeto/${token}/nps/verificar`);
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
  }, [projeto, token, npsJaVerificado]);

  // Mutation para enviar seleções (música, locutor ou ambos)
  const enviarSelecoesMutation = useMutation({
    mutationFn: async () => {
      // Validação: Pelo menos UM deve estar selecionado
      if (!musicaSelecionada && !locutorSelecionado) {
        throw new Error("Selecione pelo menos uma música ou um locutor");
      }

      const results = [];

      // Aprovar a música selecionada (se houver)
      if (musicaSelecionada) {
        const musicaResponse = await fetch(`/api/cliente/projeto/${token}/musicas/${musicaSelecionada}/aprovar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aprovado: true, feedback: feedbackGeral }),
        });
        if (!musicaResponse.ok) throw new Error("Erro ao aprovar música");
        results.push("música");
      }

      // Aprovar o locutor selecionado (se houver)
      if (locutorSelecionado) {
        const locutorResponse = await fetch(`/api/cliente/projeto/${token}/locutores/${locutorSelecionado}/aprovar`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/cliente/projeto/${token}`] });
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
      const response = await fetch(`/api/cliente/projeto/${token}/aprovar-musica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cliente/projeto/${token}`] });
      setMusicaFeedback("");
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
      });
    },
  });

  const aprovarLocucaoMutation = useMutation({
    mutationFn: async ({ aprovado, feedback }: { aprovado: boolean; feedback?: string }) => {
      const response = await fetch(`/api/cliente/projeto/${token}/aprovar-locucao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cliente/projeto/${token}`] });
      setLocucaoFeedback("");
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
      });
    },
  });

  const aprovarVideoMutation = useMutation({
    mutationFn: async ({ aprovado, feedback }: { aprovado: boolean; feedback?: string }) => {
      const response = await fetch(`/api/cliente/projeto/${token}/aprovar-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/cliente/projeto/${token}`] });
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

  if (error || !projeto) {
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Briefing": "bg-slate-500",
      "Roteiro": "bg-blue-500",
      "Captação": "bg-purple-500",
      "Edição": "bg-orange-500",
      "Entrega": "bg-green-500",
      "Aprovado": "bg-emerald-500",
      "Aguardando Aprovação": "bg-yellow-500",
    };
    return colors[status] || "bg-gray-500";
  };

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
            {/* Empreendimento e Cliente em destaque */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {projeto.empreendimento && (
                <div className="flex items-center gap-2 text-primary">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <p className="font-bold text-base sm:text-xl">{projeto.empreendimento.nome}</p>
                </div>
              )}

              {projeto.cliente && (
                <div className="flex items-center gap-2 text-primary">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <p className="font-bold text-base sm:text-xl">{projeto.cliente.nome}</p>
                </div>
              )}

              {/* Categoria do vídeo */}
              <Badge variant="outline" className="text-xs sm:text-sm px-3 py-1">
                {projeto.tipoVideo.nome}
              </Badge>
            </div>

            {/* Descrição se existir */}
            {projeto.descricao && (
              <CardDescription className="text-xs sm:text-sm pt-1">{projeto.descricao}</CardDescription>
            )}
          </CardHeader>
        </Card>

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

        {/* Mensagem se não houver itens para aprovação */}
        {!projeto.musicaUrl &&
          !projeto.locucaoUrl &&
          !projeto.videoFinalUrl &&
          (!projeto.musicas || projeto.musicas.length === 0) &&
          (!projeto.locutores || projeto.locutores.length === 0) && (
            <Card>
              <CardContent className="p-4">
                <Alert className="p-3">
                  <AlertCircle className="h-3 w-3" />
                  <AlertTitle className="text-sm">Aguardando conteúdo</AlertTitle>
                  <AlertDescription className="text-xs">
                    Ainda não há itens disponíveis para aprovação. Você receberá uma notificação quando houver novos materiais para revisar.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

        {/* Footer */}
        <Card className="border-dashed">
          <CardContent className="p-4 text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Dúvidas? Entre em contato:
            </p>

            <div className="flex justify-center gap-2">
              <a
                href="https://wa.me/message/EB53ZVPWQAXWO1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-green-600 border border-muted hover:border-green-600 rounded-md transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </a>

              <a
                href="https://instagram.com/frametyfilmes"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-pink-600 border border-muted hover:border-pink-600 rounded-md transition-colors"
              >
                <Instagram className="h-3.5 w-3.5" />
                <span>Instagram</span>
              </a>

              <a
                href="https://framety.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-blue-600 border border-muted hover:border-blue-600 rounded-md transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Site</span>
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Este link é exclusivo para você. Não compartilhe com terceiros.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Questionário NPS */}
      {projeto && token && (
        <QuestionarioNps
          isOpen={mostrarQuestionarioNps}
          onClose={() => setMostrarQuestionarioNps(false)}
          projetoId={projeto.id}
          token={token}
        />
      )}
    </div>
  );
}
