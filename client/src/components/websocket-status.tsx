import { useEffect, useState } from 'react';
import socket from '@/lib/socket';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Indicador visual do status da conexão WebSocket
 * Verde = Conectado | Vermelho = Desconectado | Amarelo = Reconectando
 */
export function WebSocketStatus() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onReconnecting = () => {
      setIsReconnecting(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnecting);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnecting);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
          transition-all duration-300
          ${isConnected ? 'bg-green-500 text-white' : ''}
          ${isReconnecting ? 'bg-yellow-500 text-white' : ''}
          ${!isConnected && !isReconnecting ? 'bg-red-500 text-white' : ''}
        `}
      >
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-xs font-medium">Sincronização ativa</span>
          </>
        ) : isReconnecting ? (
          <>
            <Wifi className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-medium">Reconectando...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-xs font-medium">Desconectado</span>
          </>
        )}
      </div>
    </div>
  );
}
