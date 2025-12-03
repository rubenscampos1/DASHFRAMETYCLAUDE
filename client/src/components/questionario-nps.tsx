import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Star, ThumbsUp, Sparkles, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface QuestionarioNpsProps {
  isOpen: boolean;
  onClose: () => void;
  projetoId: string;
  token: string;
}

export function QuestionarioNps({ isOpen, onClose, projetoId, token }: QuestionarioNpsProps) {
  const { toast } = useToast();
  const [notaServicos, setNotaServicos] = useState<number | null>(null);
  const [notaAtendimento, setNotaAtendimento] = useState<number | null>(null);
  const [notaIndicacao, setNotaIndicacao] = useState<number | null>(null);
  const [comentario, setComentario] = useState<string>("");
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);

  const enviarRespostaMutation = useMutation({
    mutationFn: async () => {
      if (notaServicos === null || notaAtendimento === null || notaIndicacao === null) {
        throw new Error("Por favor, responda todas as perguntas");
      }

      const response = await fetch(`/api/cliente/projeto/${token}/nps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notaServicos,
          notaAtendimento,
          notaIndicacao,
          comentario: comentario.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao enviar resposta");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Obrigado pelo seu feedback! 🎉",
        description: "Sua opinião é muito importante para nós.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProximaEtapa = () => {
    if (etapa === 1 && notaServicos !== null) {
      setEtapa(2);
    } else if (etapa === 2 && notaAtendimento !== null) {
      setEtapa(3);
    } else if (etapa === 3 && notaIndicacao !== null) {
      setEtapa(4);
    } else if (etapa === 4) {
      enviarRespostaMutation.mutate();
    }
  };

  const podeAvancar =
    (etapa === 1 && notaServicos !== null) ||
    (etapa === 2 && notaAtendimento !== null) ||
    (etapa === 3 && notaIndicacao !== null) ||
    (etapa === 4); // Comentário é opcional

  const BotaoNota = ({ nota, notaSelecionada, onSelect }: {
    nota: number;
    notaSelecionada: number | null;
    onSelect: (n: number) => void;
  }) => {
    const selecionado = notaSelecionada === nota;
    const cor = nota <= 6 ? "bg-red-500" : nota <= 8 ? "bg-yellow-500" : "bg-green-500";

    return (
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelect(nota)}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-lg font-bold text-lg
          transition-all duration-200 border-2
          ${selecionado
            ? `${cor} text-white border-white shadow-lg scale-110`
            : 'bg-white/50 dark:bg-slate-800/50 text-foreground border-border hover:border-primary'
          }
        `}
      >
        {nota}
      </motion.button>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-2 border-primary/20 shadow-2xl">
            <CardHeader className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-background">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute right-4 top-4"
              >
                <X className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  {etapa === 4 ? (
                    <MessageSquare className="h-6 w-6 text-primary" />
                  ) : etapa === 3 ? (
                    <Sparkles className="h-6 w-6 text-primary" />
                  ) : etapa === 2 ? (
                    <ThumbsUp className="h-6 w-6 text-primary" />
                  ) : (
                    <Star className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {etapa === 4 ? "Quase lá! 🎉" : "Sua opinião é importante!"}
                  </CardTitle>
                  <CardDescription>
                    {etapa === 4 ? "Comentários (opcional)" : `Pergunta ${etapa} de 3`}
                  </CardDescription>
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${(etapa / 4) * 100}%` }}
                  className="h-full bg-primary"
                  transition={{ duration: 0.3 }}
                />
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <AnimatePresence mode="wait">
                {/* Pergunta 1: Serviços */}
                {etapa === 1 && (
                  <motion.div
                    key="pergunta-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">
                        Em uma escala de 0 a 10, como você avalia nossos serviços prestados?
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        0 = Muito insatisfeito | 10 = Totalmente satisfeito
                      </p>
                    </div>

                    <div className="flex justify-center gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
                        <BotaoNota
                          key={nota}
                          nota={nota}
                          notaSelecionada={notaServicos}
                          onSelect={setNotaServicos}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Pergunta 2: Atendimento */}
                {etapa === 2 && (
                  <motion.div
                    key="pergunta-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">
                        Em uma escala de 0 a 10, como você avalia nosso atendimento?
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        0 = Muito insatisfeito | 10 = Totalmente satisfeito
                      </p>
                    </div>

                    <div className="flex justify-center gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
                        <BotaoNota
                          key={nota}
                          nota={nota}
                          notaSelecionada={notaAtendimento}
                          onSelect={setNotaAtendimento}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Pergunta 3: Indicação */}
                {etapa === 3 && (
                  <motion.div
                    key="pergunta-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">
                        Qual a probabilidade de indicar o Grupo Skyline a um parceiro?
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        0 = Não indicaria | 10 = Indicaria com certeza
                      </p>
                    </div>

                    <div className="flex justify-center gap-2 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((nota) => (
                        <BotaoNota
                          key={nota}
                          nota={nota}
                          notaSelecionada={notaIndicacao}
                          onSelect={setNotaIndicacao}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Etapa 4: Comentários (opcional) */}
                {etapa === 4 && (
                  <motion.div
                    key="comentarios"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold">
                        Gostaria de deixar algum comentário?
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Compartilhe sua experiência conosco (opcional)
                      </p>
                    </div>

                    <Textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Escreva aqui seus comentários, sugestões ou elogios..."
                      className="min-h-[120px] resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {comentario.length}/500 caracteres
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botões de navegação */}
              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <div
                      key={num}
                      className={`h-2 w-8 rounded-full transition-colors ${
                        num < etapa ? "bg-green-500" :
                        num === etapa ? "bg-primary" :
                        "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {etapa > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setEtapa((e) => (e - 1) as 1 | 2 | 3 | 4)}
                    >
                      Voltar
                    </Button>
                  )}

                  <Button
                    onClick={handleProximaEtapa}
                    disabled={!podeAvancar || enviarRespostaMutation.isPending}
                    className="min-w-[120px]"
                  >
                    {enviarRespostaMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          ⏳
                        </motion.div>
                        Enviando...
                      </span>
                    ) : etapa === 4 ? (
                      <span className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Enviar
                      </span>
                    ) : (
                      "Próxima →"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
