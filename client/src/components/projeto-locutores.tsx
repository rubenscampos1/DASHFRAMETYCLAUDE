import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mic, Plus, Trash2, Play, Pause, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProjetoLocutorWithRelations, LocutorWithRelations } from "@shared/schema";
import { getLocutorAudioUrl } from "@/lib/storage";

interface ProjetoLocutoresProps {
  projetoId: string;
}

// Interface para os filtros de locutores
interface LocutorFilters {
  generos: string[];       // ["Masculino", "Feminino"]
  faixasEtarias: string[]; // ["Criança", "Jovem", "Adulto", "Madura"]
  valorBusca: string;      // texto livre para filtrar por valorPorMinuto
}

export function ProjetoLocutores({ projetoId }: ProjetoLocutoresProps) {
  const { toast } = useToast();
  const [locutorSelecionado, setLocutorSelecionado] = useState<string>("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

  // Estado dos filtros
  const [filtros, setFiltros] = useState<LocutorFilters>({
    generos: [],
    faixasEtarias: [],
    valorBusca: "",
  });

  // Funções auxiliares para manipular filtros
  const toggleGenero = (genero: string) => {
    setFiltros(prev => ({
      ...prev,
      generos: prev.generos.includes(genero)
        ? prev.generos.filter(g => g !== genero)
        : [...prev.generos, genero]
    }));
  };

  const toggleFaixaEtaria = (faixa: string) => {
    setFiltros(prev => ({
      ...prev,
      faixasEtarias: prev.faixasEtarias.includes(faixa)
        ? prev.faixasEtarias.filter(f => f !== faixa)
        : [...prev.faixasEtarias, faixa]
    }));
  };

  const updateValorBusca = (valor: string) => {
    setFiltros(prev => ({ ...prev, valorBusca: valor }));
  };

  const limparFiltros = () => {
    setFiltros({
      generos: [],
      faixasEtarias: [],
      valorBusca: "",
    });
  };

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
  const locutoresDisponiveisFiltrados = locutoresDisponiveis
    .filter((locutor) => !locutoresProjeto.some((pl) => pl.locutorId === locutor.id))
    .filter((locutor) => {
      // Filtro de gênero
      if (filtros.generos.length > 0 && !filtros.generos.includes(locutor.genero)) {
        return false;
      }

      // Filtro de faixa etária
      if (filtros.faixasEtarias.length > 0 && !filtros.faixasEtarias.includes(locutor.faixaEtaria)) {
        return false;
      }

      // Filtro de valor (busca no texto de valorPorMinuto)
      if (filtros.valorBusca && locutor.valorPorMinuto) {
        const valorLower = locutor.valorPorMinuto.toLowerCase();
        const buscaLower = filtros.valorBusca.toLowerCase();
        if (!valorLower.includes(buscaLower)) {
          return false;
        }
      } else if (filtros.valorBusca && !locutor.valorPorMinuto) {
        // Se tem busca mas o locutor não tem valor, filtrar
        return false;
      }

      return true;
    });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Mic className="h-5 w-5" />
        Locutores do Projeto
      </h3>

      {/* Filtros de Locutores */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4" />
          <h4 className="font-medium">Filtrar Locutores</h4>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Filtro de Gênero */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Gênero
                {filtros.generos.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filtros.generos.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Gênero</h4>
                <div className="space-y-2">
                  {["Masculino", "Feminino"].map((genero) => (
                    <div key={genero} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genero-${genero}`}
                        checked={filtros.generos.includes(genero)}
                        onCheckedChange={() => toggleGenero(genero)}
                      />
                      <Label
                        htmlFor={`genero-${genero}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {genero}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtro de Faixa Etária */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Faixa Etária
                {filtros.faixasEtarias.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filtros.faixasEtarias.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Faixa Etária</h4>
                <div className="space-y-2">
                  {["Criança", "Jovem", "Adulto", "Madura"].map((faixa) => (
                    <div key={faixa} className="flex items-center space-x-2">
                      <Checkbox
                        id={`faixa-${faixa}`}
                        checked={filtros.faixasEtarias.includes(faixa)}
                        onCheckedChange={() => toggleFaixaEtaria(faixa)}
                      />
                      <Label
                        htmlFor={`faixa-${faixa}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {faixa}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtro de Valor */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Valor
                {filtros.valorBusca && (
                  <Badge variant="secondary" className="ml-2">
                    1
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Buscar por Valor</h4>
                <Input
                  placeholder="Ex: R$ 50, 100/min..."
                  value={filtros.valorBusca}
                  onChange={(e) => updateValorBusca(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Digite qualquer texto para buscar no campo valor
                </p>
              </div>
            </PopoverContent>
          </Popover>

          {/* Botão Limpar Filtros */}
          {(filtros.generos.length > 0 || filtros.faixasEtarias.length > 0 || filtros.valorBusca) && (
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Badges de filtros ativos */}
        {(filtros.generos.length > 0 || filtros.faixasEtarias.length > 0 || filtros.valorBusca) && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex gap-2 flex-wrap">
              {/* Badges de Gênero */}
              {filtros.generos.map((genero) => (
                <Badge key={genero} variant="secondary" className="flex items-center gap-1 pr-1">
                  <span className="text-xs">Gênero: {genero}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => toggleGenero(genero)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}

              {/* Badges de Faixa Etária */}
              {filtros.faixasEtarias.map((faixa) => (
                <Badge key={faixa} variant="secondary" className="flex items-center gap-1 pr-1">
                  <span className="text-xs">Faixa: {faixa}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => toggleFaixaEtaria(faixa)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}

              {/* Badge de Valor */}
              {filtros.valorBusca && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  <span className="text-xs">Valor: {filtros.valorBusca}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => updateValorBusca("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </Card>

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
