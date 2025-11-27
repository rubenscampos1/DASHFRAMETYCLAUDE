import { useRealtimeSync } from '@/hooks/use-realtime';
import { useAuth } from '@/hooks/use-auth';

/**
 * Provider que habilita sincronização em tempo real
 * Só ativa quando o usuário está autenticado
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Só ativar realtime se o usuário estiver autenticado
  if (user) {
    useRealtimeSync();
  }

  return <>{children}</>;
}
