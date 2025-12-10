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
    console.log('[WebSocket Sync] 🎯 Hooks de sincronização registrados');
    console.log('[WebSocket Sync] Socket conectado?', socket.connected);
    console.log('[WebSocket Sync] Socket ID:', socket.id);

    // Escutar mudanças em projetos
    socket.on('projeto:updated', (data) => {
      console.log('[WebSocket Sync] 📥 EVENTO RECEBIDO: projeto:updated', data);
      const foiAprovado = data.projeto?.status === 'Aprovado';

      // Invalidar TODAS as queries que começam com '/api/projetos'
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
        },
        refetchType: foiAprovado ? 'all' : 'active'
      });

      // Invalidar métricas
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });
      console.log('[WebSocket Sync] ✅ Queries invalidadas - UI vai atualizar');
    });

    // Escutar quando projeto é criado
    socket.on('projeto:created', (data) => {
      console.log('[WebSocket Sync] 📥 EVENTO RECEBIDO: projeto:created', data);
      // Invalidar TODAS as queries de projetos
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
        },
        refetchType: 'all'
      });

      // Invalidar métricas
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });
      console.log('[WebSocket Sync] ✅ Novo projeto - queries invalidadas');
    });

    // Escutar quando projeto é deletado
    socket.on('projeto:deleted', (data) => {
      console.log('[WebSocket Sync] 📥 EVENTO RECEBIDO: projeto:deleted', data);
      // Invalidar TODAS as queries de projetos
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
        },
        refetchType: 'all'
      });

      // Invalidar métricas
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });
      console.log('[WebSocket Sync] ✅ Projeto deletado - queries invalidadas');
    });

    // Escutar mudanças em comentários
    socket.on('comentario:created', (data) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projetos', data.projetoId, 'comentarios']
      });
    });

    socket.on('comentario:deleted', (data) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projetos', data.projetoId, 'comentarios']
      });
    });

    // Escutar criação de resposta NPS
    socket.on('nps:created', (data) => {
      // Invalidar TODAS as queries de projetos (incluindo finalizados)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
        },
        refetchType: 'all'
      });
    });

    // Escutar mudanças em notas
    socket.on('nota:created', (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notas'] });
    });

    socket.on('nota:updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notas', data.notaId] });
    });

    socket.on('nota:deleted', (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notas'] });
    });

    // Cleanup: remover listeners quando componente desmontar
    return () => {
      console.log('[WebSocket] Limpando listeners');
      socket.off('projeto:created');
      socket.off('projeto:updated');
      socket.off('projeto:deleted');
      socket.off('comentario:created');
      socket.off('comentario:deleted');
      socket.off('nps:created');
      socket.off('nota:created');
      socket.off('nota:updated');
      socket.off('nota:deleted');
    };
  }, []);
}
