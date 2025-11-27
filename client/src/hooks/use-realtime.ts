import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook para sincronização em tempo real com Supabase
 * Escuta mudanças nas tabelas e invalida queries do React Query automaticamente
 */
export function useRealtimeSync() {
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    // Canal para tabela de projetos
    const projetosChannel = supabase
      .channel('projetos-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'projetos',
        },
        (payload) => {
          console.log('[Realtime] Projeto alterado:', payload);

          // Invalidar queries relacionadas a projetos
          queryClient.invalidateQueries({ queryKey: ['/api/projetos'] });
          queryClient.invalidateQueries({ queryKey: ['/api/metricas'] });

          // Se for um projeto específico, invalidar também
          if (payload.new && 'id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.new.id]
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Projetos subscription status:', status);
      });

    channels.push(projetosChannel);

    // Canal para tabela de comentários
    const comentariosChannel = supabase
      .channel('comentarios-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comentarios',
        },
        (payload) => {
          console.log('[Realtime] Comentário alterado:', payload);

          // Invalidar comentários do projeto específico
          if (payload.new && 'projeto_id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.new.projeto_id, 'comentarios']
            });
          }
          if (payload.old && 'projeto_id' in payload.old) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.old.projeto_id, 'comentarios']
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Comentários subscription status:', status);
      });

    channels.push(comentariosChannel);

    // Canal para tabela de logs de status
    const logsChannel = supabase
      .channel('logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'logs_de_status',
        },
        (payload) => {
          console.log('[Realtime] Log de status criado:', payload);

          // Invalidar logs do projeto específico
          if (payload.new && 'projeto_id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.new.projeto_id, 'logs']
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Logs subscription status:', status);
      });

    channels.push(logsChannel);

    // Canal para músicas do projeto
    const musicasChannel = supabase
      .channel('musicas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projeto_musicas',
        },
        (payload) => {
          console.log('[Realtime] Música do projeto alterada:', payload);

          // Invalidar músicas do projeto específico
          if (payload.new && 'projeto_id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.new.projeto_id, 'musicas']
            });
          }
          if (payload.old && 'projeto_id' in payload.old) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.old.projeto_id, 'musicas']
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Músicas subscription status:', status);
      });

    channels.push(musicasChannel);

    // Canal para locutores do projeto
    const locutoresChannel = supabase
      .channel('locutores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projeto_locutores',
        },
        (payload) => {
          console.log('[Realtime] Locutor do projeto alterado:', payload);

          // Invalidar locutores do projeto específico
          if (payload.new && 'projeto_id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.new.projeto_id, 'locutores']
            });
          }
          if (payload.old && 'projeto_id' in payload.old) {
            queryClient.invalidateQueries({
              queryKey: ['/api/projetos', payload.old.projeto_id, 'locutores']
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Locutores subscription status:', status);
      });

    channels.push(locutoresChannel);

    // Cleanup: remover todas as subscriptions quando o componente for desmontado
    return () => {
      console.log('[Realtime] Limpando subscriptions...');
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);
}
