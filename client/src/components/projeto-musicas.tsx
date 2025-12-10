import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Music, Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProjetoMusica } from "@shared/schema";

interface ProjetoMusicasProps {
  projetoId: string;
}

export function ProjetoMusicas({ projetoId }: ProjetoMusicasProps) {
  const { toast } = useToast();
  const [novaMusica, setNovaMusica] = useState({ titulo: "", musicaUrl: "" });

  // Query para buscar músicas do projeto
  const { data: musicas = [], refetch } = useQuery<ProjetoMusica[]>({
    queryKey: [`/api/projetos/${projetoId}/musicas`],
    enabled: !!projetoId,
    staleTime: 0, // Sempre refetch para garantir dados frescos
    refetchOnMount: true, // Refetch quando componente montar
  });

  // Mutation para adicionar música
  const adicionarMusicaMutation = useMutation({
    mutationFn: async (musica: { titulo: string; musicaUrl: string }) => {
      return await apiRequest("POST", `/api/projetos/${projetoId}/musicas`, musica);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projetos/${projetoId}/musicas`] });
      setNovaMusica({ titulo: "", musicaUrl: "" });
      toast({
        title: "Música adicionada!",
        description: "A música foi adicionada ao projeto com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a música.",
        variant: "destructive",
      });
    },
  });

  // Mutation para remover música
  const removerMusicaMutation = useMutation({
    mutationFn: async (musicaId: string) => {
      return await apiRequest("DELETE", `/api/musicas/${musicaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projetos/${projetoId}/musicas`] });
      toast({
        title: "Música removida!",
        description: "A música foi removida do projeto.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a música.",
        variant: "destructive",
      });
    },
  });

  const handleAdicionarMusica = () => {
    if (!novaMusica.titulo || !novaMusica.musicaUrl) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o link da música.",
        variant: "destructive",
      });
      return;
    }

    adicionarMusicaMutation.mutate(novaMusica);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Music className="h-5 w-5" />
        Músicas do Projeto
      </h3>

      {/* Formulário para adicionar música */}
      <Card className="p-4 mb-4">
        <h4 className="font-medium mb-3">Adicionar Música</h4>
        <div className="space-y-3">
          <Input
            placeholder="Título da música *"
            value={novaMusica.titulo}
            onChange={(e) => setNovaMusica({ ...novaMusica, titulo: e.target.value })}
          />
          <Input
            placeholder="Link da música (Spotify, YouTube, etc) *"
            value={novaMusica.musicaUrl}
            onChange={(e) => setNovaMusica({ ...novaMusica, musicaUrl: e.target.value })}
          />
          <Button
            onClick={handleAdicionarMusica}
            disabled={adicionarMusicaMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Música
          </Button>
        </div>
      </Card>

      {/* Lista de músicas */}
      {musicas.length > 0 ? (
        <div className="space-y-3">
          {musicas.map((musica) => (
            <Card key={musica.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{musica.titulo}</h4>
                  <div className="flex flex-col gap-1 mt-2">
                    <a
                      href={musica.musicaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ouvir música
                    </a>
                  </div>
                  {musica.aprovada !== null && (
                    <div className="mt-2">
                      {musica.aprovada ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✓ Aprovada pelo cliente
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          ✗ Reprovada pelo cliente
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removerMusicaMutation.mutate(musica.id)}
                  disabled={removerMusicaMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhuma música adicionada ainda
        </p>
      )}

      <Separator className="my-6" />
    </div>
  );
}
