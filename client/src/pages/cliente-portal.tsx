import { useState } from "react";
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

interface ProjetoCliente {
  id: string;
  sequencialId: number;
  titulo: string;
  descricao: string;
  status: string;
  dataCriacao: string;
  dataPrevistaEntrega: string | null;
  updatedAt: string;
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

  // Estados para feedback de músicas individuais
  const [musicasFeedback, setMusicasFeedback] = useState<{ [key: string]: string }>({});

  // Estados para feedback de locutores individuais
  const [locutoresFeedback, setLocutoresFeedback] = useState<{ [key: string]: string }>({});

  // Estados para feedback dos itens antigos
  const [musicaFeedback, setMusicaFeedback] = useState("");
  const [locucaoFeedback, setLocucaoFeedback] = useState("");
  const [videoFeedback, setVideoFeedback] = useState("");

  // Query para buscar dados do projeto
  const { data: projeto, isLoading, error } = useQuery<ProjetoCliente>({
    queryKey: [`/api/cliente/projeto/${token}`],
    retry: false,
  });

  // Mutations para aprovar músicas individuais
  const aprovarMusicaIndividualMutation = useMutation({
    mutationFn: async ({ musicaId, aprovado, feedback }: { musicaId: string; aprovado: boolean; feedback?: string }) => {
      const response = await fetch(`/api/cliente/projeto/${token}/musicas/${musicaId}/aprovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cliente/projeto/${token}`] });
      setMusicasFeedback({});
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
      });
    },
  });

  // Mutations para aprovar locutores individuais
  const aprovarLocutorIndividualMutation = useMutation({
    mutationFn: async ({ locutorId, aprovado, feedback }: { locutorId: string; aprovado: boolean; feedback?: string }) => {
      const response = await fetch(`/api/cliente/projeto/${token}/locutores/${locutorId}/aprovar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprovado, feedback }),
      });
      if (!response.ok) throw new Error("Erro ao processar aprovação");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cliente/projeto/${token}`] });
      setLocutoresFeedback({});
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cliente/projeto/${token}`] });
      setVideoFeedback("");
      toast({
        title: "Sucesso!",
        description: "Sua resposta foi registrada",
      });
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

  // Calcular dias desde a última atualização
  const diasSemAtualizacao = differenceInDays(new Date(), new Date(projeto.updatedAt));

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container max-w-4xl mx-auto p-3 sm:p-4 space-y-3">
        {/* Header */}
        <Card className="border-none shadow bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <CardHeader className="space-y-2 p-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="font-mono text-xs">
                    #{projeto.sequencialId.toString().padStart(4, '0')}
                  </Badge>
                  <Badge
                    className={`${getStatusColor(projeto.status)} text-white text-sm px-2 py-0.5`}
                  >
                    {projeto.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl sm:text-2xl">{projeto.titulo}</CardTitle>
                {projeto.descricao && (
                  <CardDescription className="text-sm">{projeto.descricao}</CardDescription>
                )}
              </div>
            </div>

            {/* Alerta de dias sem atualização */}
            {diasSemAtualizacao > 3 && (
              <Alert className="bg-yellow-50 border-yellow-200 p-3">
                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                <AlertTitle className="text-yellow-800 text-sm">Atenção</AlertTitle>
                <AlertDescription className="text-yellow-700 text-xs">
                  Este projeto está há <strong>{diasSemAtualizacao} dias</strong> sem atualização.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
              {projeto.cliente && (
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{projeto.cliente.nome}</p>
                    {projeto.cliente.empresa && (
                      <p className="text-xs text-muted-foreground truncate">{projeto.cliente.empresa}</p>
                    )}
                  </div>
                </div>
              )}

              {projeto.empreendimento && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{projeto.empreendimento.nome}</p>
                    <p className="text-xs text-muted-foreground">Empreendimento</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-xs">
                    {format(new Date(projeto.dataCriacao), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">Data de criação</p>
                </div>
              </div>

              {projeto.dataPrevistaEntrega && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-xs">
                      {format(new Date(projeto.dataPrevistaEntrega), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">Previsão de entrega</p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

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
                  <CardDescription className="text-xs">Clique para expandir e ouvir cada música</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {projeto.musicas.map((musica, index) => (
                  <AccordionItem key={musica.id} value={`musica-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-2 flex-1 text-left">
                        <Music className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-sm">{musica.titulo}</span>
                        <ApprovalStatus approved={musica.aprovada} />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-2">
                      <div className="space-y-3">
                        {/* Links da música */}
                        <div className="bg-muted/50 rounded-lg p-2 space-y-1">
                          <a
                            href={musica.musicaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ouvir música
                          </a>
                          {musica.artistaUrl && (
                            <a
                              href={musica.artistaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver artista
                            </a>
                          )}
                        </div>

                        {musica.aprovada === null ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Comentários ou sugestões sobre esta música (opcional)"
                              value={musicasFeedback[musica.id] || ""}
                              onChange={(e) => setMusicasFeedback({ ...musicasFeedback, [musica.id]: e.target.value })}
                              rows={2}
                              className="resize-none text-sm"
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                onClick={() => aprovarMusicaIndividualMutation.mutate({
                                  musicaId: musica.id,
                                  aprovado: true,
                                  feedback: musicasFeedback[musica.id]
                                })}
                                disabled={aprovarMusicaIndividualMutation.isPending}
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              >
                                {aprovarMusicaIndividualMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 mr-2" />
                                )}
                                Aprovar
                              </Button>
                              <Button
                                onClick={() => aprovarMusicaIndividualMutation.mutate({
                                  musicaId: musica.id,
                                  aprovado: false,
                                  feedback: musicasFeedback[musica.id]
                                })}
                                disabled={aprovarMusicaIndividualMutation.isPending || !musicasFeedback[musica.id]?.trim()}
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                              >
                                {aprovarMusicaIndividualMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-2" />
                                )}
                                Solicitar Alteração
                              </Button>
                            </div>
                            {!musicasFeedback[musica.id]?.trim() && (
                              <p className="text-xs text-muted-foreground text-center">
                                Para solicitar alteração, é necessário deixar um comentário
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
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
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
                  <CardDescription className="text-xs">Clique para expandir e ouvir cada locutor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Accordion type="single" collapsible className="w-full space-y-2">
                {projeto.locutores.map((projetoLocutor, index) => {
                  const locutor = projetoLocutor.locutor;
                  const amostraDestaque = locutor.amostras?.find(a => a.destaque) || locutor.amostras?.[0];

                  return (
                    <AccordionItem key={projetoLocutor.id} value={`locutor-${index}`} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-2 flex-1 text-left flex-wrap">
                          <Mic className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium text-sm">{locutor.nome}</span>
                          <Badge variant="outline" className="text-xs">{locutor.genero}</Badge>
                          <Badge variant="outline" className="text-xs">{locutor.regiao}</Badge>
                          <ApprovalStatus approved={projetoLocutor.aprovado} />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-2">
                        <div className="space-y-3">
                          {locutor.biografia && (
                            <p className="text-xs text-gray-600">{locutor.biografia}</p>
                          )}

                          {/* Amostra de áudio */}
                          {amostraDestaque && (
                            <div className="bg-muted/50 rounded-lg p-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={playingAudio === `locutor-${projetoLocutor.id}` ? "default" : "secondary"}
                                  size="sm"
                                  onClick={() => handlePlayAudio(`locutor-${projetoLocutor.id}`, amostraDestaque.arquivoUrl)}
                                >
                                  {playingAudio === `locutor-${projetoLocutor.id}` ? (
                                    <Pause className="h-3 w-3" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                </Button>
                                <span className="text-xs font-medium">{amostraDestaque.titulo}</span>
                              </div>
                              <audio
                                id={`audio-locutor-${projetoLocutor.id}`}
                                src={amostraDestaque.arquivoUrl}
                                onEnded={() => setPlayingAudio(null)}
                                className="hidden"
                              />
                            </div>
                          )}

                          {projetoLocutor.aprovado === null ? (
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Comentários ou sugestões sobre este locutor (opcional)"
                                value={locutoresFeedback[projetoLocutor.id] || ""}
                                onChange={(e) => setLocutoresFeedback({ ...locutoresFeedback, [projetoLocutor.id]: e.target.value })}
                                rows={2}
                                className="resize-none text-sm"
                              />
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                  onClick={() => aprovarLocutorIndividualMutation.mutate({
                                    locutorId: projetoLocutor.id,
                                    aprovado: true,
                                    feedback: locutoresFeedback[projetoLocutor.id]
                                  })}
                                  disabled={aprovarLocutorIndividualMutation.isPending}
                                  size="sm"
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {aprovarLocutorIndividualMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 mr-2" />
                                  )}
                                  Aprovar
                                </Button>
                                <Button
                                  onClick={() => aprovarLocutorIndividualMutation.mutate({
                                    locutorId: projetoLocutor.id,
                                    aprovado: false,
                                    feedback: locutoresFeedback[projetoLocutor.id]
                                  })}
                                  disabled={aprovarLocutorIndividualMutation.isPending || !locutoresFeedback[projetoLocutor.id]?.trim()}
                                  variant="destructive"
                                  size="sm"
                                  className="flex-1"
                                >
                                  {aprovarLocutorIndividualMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3 w-3 mr-2" />
                                  )}
                                  Solicitar Alteração
                                </Button>
                              </div>
                              {!locutoresFeedback[projetoLocutor.id]?.trim() && (
                                <p className="text-xs text-muted-foreground text-center">
                                  Para solicitar alteração, é necessário deixar um comentário
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
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
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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
                    onClick={() => window.open(projeto.musicaUrl!, '_blank')}
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
          <CardContent className="p-4 text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              Dúvidas? Entre em contato conosco através dos canais oficiais
            </p>
            <p className="text-xs text-muted-foreground">
              Este link é exclusivo para você. Não compartilhe com terceiros.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
