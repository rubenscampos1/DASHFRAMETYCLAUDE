import { useEffect } from 'react';
import socket from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

/**
 * Hook para sincronização em tempo real via WebSocket
 * Escuta mudanças no servidor e invalida queries do React Query automaticamente
 *
 * Resultado: Sincronização INSTANTÂNEA (< 100ms) entre todos os usuários!
 */
export function useWebSocketSync() {
  useEffect(() => {
    console.log('[WebSocket] Iniciando sincronização em tempo real');

    // Escutar mudanças em projetos
    socket.on('projeto:updated', (data) => {
      console.log('[WebSocket] Projeto atualizado:', data.id);

      // Invalidar todas as queries de projetos para forçar refetch
      queryClient.invalidateQueries({ queryKey: ['/api/projetos'] });

      // Invalidar projeto específico
      queryClient.invalidateQueries({ queryKey: ['/api/projetos', data.id] });

      // Invalidar métricas
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });
    });

    // Escutar mudanças em comentários
    socket.on('comentario:created', (data) => {
      console.log('[WebSocket] Comentário criado no projeto:', data.projetoId);
      queryClient.invalidateQueries({
        queryKey: ['/api/projetos', data.projetoId, 'comentarios']
      });
    });

    socket.on('comentario:deleted', (data) => {
      console.log('[WebSocket] Comentário deletado do projeto:', data.projetoId);
      queryClient.invalidateQueries({
        queryKey: ['/api/projetos', data.projetoId, 'comentarios']
      });
    });

    // Escutar criação de resposta NPS
    socket.on('nps:created', (data) => {
      console.log('[WebSocket] NPS respondido para projeto:', data.projetoId, 'Categoria:', data.categoria);

      // Invalidar todas as queries de projetos para atualizar badges e informações
      queryClient.invalidateQueries({ queryKey: ['/api/projetos'] });

      // Invalidar projeto específico
      queryClient.invalidateQueries({ queryKey: ['/api/projetos', data.projetoId] });
    });

    // Escutar mudanças em notas
    socket.on('nota:created', (data) => {
      console.log('[WebSocket] Nova nota criada:', data.notaId);
      queryClient.invalidateQueries({ queryKey: ['/api/notas'] });
    });

    socket.on('nota:updated', (data) => {
      console.log('[WebSocket] Nota atualizada:', data.notaId);
      queryClient.invalidateQueries({ queryKey: ['/api/notas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notas', data.notaId] });
    });

    socket.on('nota:deleted', (data) => {
      console.log('[WebSocket] Nota deletada:', data.notaId);
      queryClient.invalidateQueries({ queryKey: ['/api/notas'] });
    });

    // Cleanup: remover listeners quando componente desmontar
    return () => {
      console.log('[WebSocket] Limpando listeners');
      socket.off('projeto:updated');
      socket.off('comentario:created');
      socket.off('comentario:deleted');
      socket.off('nps:created');
      socket.off('nota:created');
      socket.off('nota:updated');
      socket.off('nota:deleted');
    };
  }, []);
}
