import { useAuth } from '@/hooks/use-auth';
import { useWebSocketSync } from '@/hooks/use-websocket-sync';

/**
 * Provider que habilita sincronização em tempo real via WebSocket
 *
 * Utiliza Socket.io para comunicação bidirecional instantânea
 * Resultado: Atualizações em < 100ms entre todos os usuários!
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Ativar WebSocket sync apenas para usuários autenticados
  if (user) {
    useWebSocketSync();
  }

  return <>{children}</>;
}
