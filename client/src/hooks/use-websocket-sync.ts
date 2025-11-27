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

    // Cleanup: remover listeners quando componente desmontar
    return () => {
      console.log('[WebSocket] Limpando listeners');
      socket.off('projeto:updated');
      socket.off('comentario:created');
      socket.off('comentario:deleted');
    };
  }, []);
}
