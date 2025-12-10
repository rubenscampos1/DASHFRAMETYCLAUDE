import { io, Socket } from 'socket.io-client';
import { queryClient } from './queryClient';

// Criar conexão WebSocket com o servidor
const socketUrl = import.meta.env.DEV
  ? `http://localhost:${import.meta.env.VITE_PORT || '5000'}`
  : window.location.origin;

console.log('[WebSocket] Conectando em:', socketUrl);

export const socket: Socket = io(socketUrl, {
  // Reconnection config
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,

  // Connection timeout
  timeout: 20000,

  // Transport - priorizar polling em produção para evitar problemas com proxy
  transports: import.meta.env.DEV ? ['websocket', 'polling'] : ['polling', 'websocket'],

  // Path do Socket.io
  path: '/socket.io',
});

// Logs focados em diagnóstico de conexão
socket.on('connect', () => {
  console.log('[WebSocket] ✅ CONECTADO - ID:', socket.id);
  console.log('[WebSocket] Transport:', socket.io.engine.transport.name);
});

socket.on('disconnect', (reason) => {
  console.warn('[WebSocket] ❌ DESCONECTADO - Razão:', reason);
});

socket.on('connect_error', (error) => {
  console.error('[WebSocket] 🔴 ERRO DE CONEXÃO:', error.message);
  console.error('[WebSocket] URL tentada:', socketUrl);
  console.error('[WebSocket] Transports disponíveis:', socket.io.opts.transports);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('[WebSocket] 🔄 RECONECTADO após', attemptNumber, 'tentativas');
  queryClient.invalidateQueries({ queryKey: ['/api/projetos/light'] });
});

// Ping/pong para manter conexão ativa
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping');
  }
}, 25000); // 25 segundos

export default socket;
