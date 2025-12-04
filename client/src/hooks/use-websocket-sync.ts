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
    console.log('🔵 [DEBUG NPS] Socket conectado?', socket.connected);
    console.log('🔵 [DEBUG NPS] Socket ID:', socket.id);

    // Escutar mudanças em projetos
    socket.on('projeto:updated', (data) => {
      console.log('🟠 [DEBUG DRAG] Evento projeto:updated RECEBIDO!');
      console.log('🟠 [DEBUG DRAG] Dados:', data);
      console.log('🟠 [DEBUG DRAG] ProjetoId:', data.id);
      console.log('🟠 [DEBUG DRAG] Status do projeto:', data.projeto?.status);

      // Listar TODAS as queries no cache antes de invalidar
      const allQueries = queryClient.getQueryCache().getAll();
      console.log('🟠 [DEBUG DRAG] Total de queries no cache:', allQueries.length);

      const projetoQueries = allQueries.filter(q => {
        const key = q.queryKey;
        return Array.isArray(key) && key[0] === '/api/projetos';
      });

      console.log('🟠 [DEBUG DRAG] Queries de projetos encontradas:', projetoQueries.length);
      projetoQueries.forEach(q => {
        console.log('🟠 [DEBUG DRAG]   - QueryKey:', JSON.stringify(q.queryKey));
      });

      // Invalidar TODAS as queries que começam com '/api/projetos'
      // Isso inclui dashboard, finalizados, relatórios, minha fila, etc
      console.log('🟠 [DEBUG DRAG] Invalidando queries de projetos...');
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          const matches = Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
          if (matches) {
            console.log('🟠 [DEBUG DRAG]   ✓ Invalidando:', JSON.stringify(queryKey));
          }
          return matches;
        },
        refetchType: 'all' // 🔥 FORÇA refetch de queries ATIVAS e INATIVAS (componentes não montados)
      });

      // Invalidar métricas
      console.log('🟠 [DEBUG DRAG] Invalidando métricas...');
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });

      console.log('🟠 [DEBUG DRAG] Invalidação completa!');
    });

    // Escutar quando projeto é criado
    socket.on('projeto:created', (data) => {
      console.log('🟢 [DEBUG CREATE] Evento projeto:created RECEBIDO!');
      console.log('🟢 [DEBUG CREATE] Dados:', data);
      console.log('🟢 [DEBUG CREATE] ProjetoId:', data.id);
      console.log('🟢 [DEBUG CREATE] Projeto completo:', {
        id: data.projeto?.id,
        nome: data.projeto?.nome,
        tipoVideoId: data.projeto?.tipoVideoId,
        status: data.projeto?.status,
        temTipoVideo: !!data.projeto?.tipoVideo,
        tipoVideoNome: data.projeto?.tipoVideo?.nome
      });

      // Listar TODAS as queries no cache antes de invalidar
      const allQueries = queryClient.getQueryCache().getAll();
      console.log('🟢 [DEBUG CREATE] Total de queries no cache:', allQueries.length);

      const projetoQueries = allQueries.filter(q => {
        const key = q.queryKey;
        return Array.isArray(key) && key[0] === '/api/projetos';
      });

      console.log('🟢 [DEBUG CREATE] Queries de projetos encontradas:', projetoQueries.length);
      projetoQueries.forEach(q => {
        console.log('🟢 [DEBUG CREATE]   - QueryKey:', JSON.stringify(q.queryKey));
      });

      // Invalidar TODAS as queries de projetos
      console.log('🟢 [DEBUG CREATE] Invalidando queries de projetos...');
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          const matches = Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
          if (matches) {
            console.log('🟢 [DEBUG CREATE]   ✓ Invalidando:', JSON.stringify(queryKey));
          }
          return matches;
        },
        refetchType: 'all' // 🔥 FORÇA refetch de queries ATIVAS e INATIVAS
      });

      // Invalidar métricas
      console.log('🟢 [DEBUG CREATE] Invalidando métricas...');
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });

      console.log('🟢 [DEBUG CREATE] Invalidação completa!');
    });

    // Escutar quando projeto é deletado
    socket.on('projeto:deleted', (data) => {
      console.log('🔴 [DEBUG DELETE] Evento projeto:deleted RECEBIDO!');
      console.log('🔴 [DEBUG DELETE] ProjetoId deletado:', data.id);

      // Invalidar TODAS as queries de projetos
      console.log('🔴 [DEBUG DELETE] Invalidando queries de projetos...');
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          const matches = Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
          if (matches) {
            console.log('🔴 [DEBUG DELETE]   ✓ Invalidando:', JSON.stringify(queryKey));
          }
          return matches;
        },
        refetchType: 'all' // 🔥 FORÇA refetch de queries ATIVAS e INATIVAS
      });

      // Invalidar métricas
      console.log('🔴 [DEBUG DELETE] Invalidando métricas...');
      queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });

      console.log('🔴 [DEBUG DELETE] Invalidação completa!');
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
      console.log('🟢 [DEBUG NPS] Evento nps:created RECEBIDO!');
      console.log('🟢 [DEBUG NPS] Dados:', data);
      console.log('🟢 [DEBUG NPS] ProjetoId:', data.projetoId, 'Categoria:', data.categoria);

      // Listar TODAS as queries no cache antes de invalidar
      const allQueries = queryClient.getQueryCache().getAll();
      console.log('🟢 [DEBUG NPS] Total de queries no cache:', allQueries.length);

      const projetoQueries = allQueries.filter(q => {
        const key = q.queryKey;
        return Array.isArray(key) && key[0] === '/api/projetos';
      });

      console.log('🟢 [DEBUG NPS] Queries de projetos encontradas:', projetoQueries.length);
      projetoQueries.forEach(q => {
        console.log('🟢 [DEBUG NPS]   - QueryKey:', JSON.stringify(q.queryKey));
      });

      // Invalidar TODAS as queries de projetos (incluindo finalizados)
      console.log('🟢 [DEBUG NPS] Invalidando queries de projetos...');
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          const matches = Array.isArray(queryKey) && queryKey[0] === '/api/projetos';
          if (matches) {
            console.log('🟢 [DEBUG NPS]   ✓ Invalidando:', JSON.stringify(queryKey));
          }
          return matches;
        },
        refetchType: 'all' // 🔥 FORÇA refetch de queries ATIVAS e INATIVAS (componentes não montados)
      });

      console.log('🟢 [DEBUG NPS] Invalidação completa!');
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
