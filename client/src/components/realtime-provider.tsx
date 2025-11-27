import { useAuth } from '@/hooks/use-auth';
// import { useRealtimeSync } from '@/hooks/use-realtime';

/**
 * Provider que habilita sincronização em tempo real
 *
 * NOTA: Temporariamente usando polling inteligente (React Query)
 * em vez de WebSockets do Supabase Realtime.
 *
 * Polling a cada 3 segundos = atualizações quase em tempo real
 * mais confiável que WebSockets para este caso.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Polling inteligente está ativo via React Query (queryClient.ts)
  // Se precisar ativar WebSockets do Supabase no futuro, descomentar:
  // if (user) {
  //   useRealtimeSync();
  // }

  return <>{children}</>;
}
