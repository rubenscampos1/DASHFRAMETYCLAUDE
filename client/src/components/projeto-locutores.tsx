import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mic, Plus, Trash2, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProjetoLocutorWithRelations, LocutorWithRelations } from "@shared/schema";
import { getLocutorAudioUrl } from "@/lib/storage";

interface ProjetoLocutoresProps {
  projetoId: string;
}

export function ProjetoLocutores({ projetoId }: ProjetoLocutoresProps) {
  const { toast } = useToast();
  const [locutorSelecionado, setLocutorSelecionado] = useState<string>("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

  // Query para buscar todos os locutores disponíveis
  const { data: locutoresDisponiveis = [] } = useQuery<LocutorWithRelations[]>({
    queryKey: ["/api/locutores"],
  });

  // Query para buscar locutores do projeto
  const { data: locutoresProjeto = [], refetch } = useQuery<ProjetoLocutorWithRelations[]>({
    queryKey: [`/api/projetos/${projetoId}/locutores`],
    enabled: !!projetoId,
    staleTime: 0, // Sempre refetch para garantir dados frescos
    refetchOnMount: true, // Refetch quando componente montar
  });

  // Mutation para adicionar locutor
  const adicionarLocutorMutation = useMutation({
    mutationFn: async (locutorId: string) => {

      const url = `/api/projetos/${projetoId}/locutores`;
      const body = { locutorId, ordem: locutoresProjeto.length };


      const result = await apiRequest("POST", url, body);

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projetos/${projetoId}/locutores`] });
      setLocutorSelecionado("");
      toast({
        title: "Locutor adicionado!",
        description: "O locutor foi adicionado ao projeto com sucesso.",
      });
    },
    onError: (error) => {
      console.error("[FRONTEND] onError chamado com erro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o locutor.",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover locutor
  const removerLocutorMutation = useMutation({
    mutationFn: async (projetoLocutorId: string) => {
      return await apiRequest("DELETE", `/api/projeto-locutores/${projetoLocutorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projetos/${projetoId}/locutores`] });
      toast({
        title: "Locutor removido!",
        description: "O locutor foi removido do projeto.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o locutor.",
        variant: "destructive",
      });
    },
  });

  const handleAdicionarLocutor = () => {
    if (!locutorSelecionado) {
      toast({
        title: "Selecione um locutor",
        description: "Escolha um locutor para adicionar ao projeto.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se o locutor já está no projeto
    if (locutoresProjeto.some(pl => pl.locutorId === locutorSelecionado)) {
      toast({
        title: "Locutor já adicionado",
        description: "Este locutor já está no projeto.",
        variant: "destructive",
      });
      return;
    }

    adicionarLocutorMutation.mutate(locutorSelecionado);
  };

  const handlePlayAudio = (audioUrl: string) => {
    // Parar todos os áudios
    Object.values(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
      return;
    }

    // Criar ou obter o elemento de áudio
    let audio = audioElements[audioUrl];
    if (!audio) {
      audio = new Audio(getLocutorAudioUrl(audioUrl)); // 🔥 Converte path relativo para URL do Supabase
      setAudioElements({ ...audioElements, [audioUrl]: audio });
    }

    audio.play();
    setPlayingAudio(audioUrl);

    audio.onended = () => {
      setPlayingAudio(null);
    };
  };

  // Filtrar locutores disponíveis (não adicionados ao projeto)
  const locutoresDisponiveisFiltrados = locutoresDisponiveis.filter(
    (locutor) => !locutoresProjeto.some((pl) => pl.locutorId === locutor.id)
  );

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Mic className="h-5 w-5" />
        Locutores do Projeto
      </h3>

      {/* Formulário para adicionar locutor */}
      <Card className="p-4 mb-4">
        <h4 className="font-medium mb-3">Adicionar Locutor</h4>
        <div className="flex gap-2">
          <Select value={locutorSelecionado} onValueChange={setLocutorSelecionado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um locutor" />
            </SelectTrigger>
            <SelectContent>
              {locutoresDisponiveisFiltrados.map((locutor) => (
                <SelectItem key={locutor.id} value={locutor.id}>
                  {locutor.nomeFicticio} - {locutor.genero} - {locutor.faixaEtaria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAdicionarLocutor}
            disabled={adicionarLocutorMutation.isPending || !locutorSelecionado}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </Card>

      {/* Lista de locutores do projeto */}
      {locutoresProjeto.length > 0 ? (
        <div className="space-y-3">
          {locutoresProjeto.map((projetoLocutor) => {
            const locutor = projetoLocutor.locutor;
            const amostraDestaque = locutor.amostras?.find(a => a.destaque) || locutor.amostras?.[0];

            return (
              <Card key={projetoLocutor.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{locutor.nomeFicticio}</h4>
                      <Badge variant="outline">{locutor.genero}</Badge>
                      <Badge variant="outline">{locutor.faixaEtaria}</Badge>
                    </div>

                    {/* Amostra de áudio */}
                    {amostraDestaque && (
                      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePlayAudio(amostraDestaque.arquivoUrl)}
                        >
                          {playingAudio === amostraDestaque.arquivoUrl ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <span className="text-sm">{amostraDestaque.titulo}</span>
                      </div>
                    )}

                    {projetoLocutor.aprovado !== null && (
                      <div className="mt-2">
                        {projetoLocutor.aprovado ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            ✓ Aprovado pelo cliente
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            ✗ Reprovado pelo cliente
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerLocutorMutation.mutate(projetoLocutor.id)}
                    disabled={removerLocutorMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhum locutor adicionado ainda
        </p>
      )}

      <Separator className="my-6" />
    </div>
  );
}
