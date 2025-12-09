import { io, Socket } from 'socket.io-client';
import { queryClient } from './queryClient';

// Criar conexão WebSocket com o servidor
// Em desenvolvimento: localhost:3000
// Em produção: mesma origem do site
const socketUrl = import.meta.env.DEV
  ? 'http://localhost:3000'
  : window.location.origin;

export const socket: Socket = io(socketUrl, {
  // Reconnection config
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,

  // Connection timeout
  timeout: 20000,

  // Transport
  transports: ['websocket', 'polling'], // Tentar WebSocket primeiro, fallback para polling
});

// Logs de debug
socket.on('connect', () => {
  console.log('[Socket.io] Conectado ao servidor WebSocket');
});

socket.on('disconnect', (reason) => {
  console.log('[Socket.io] Desconectado:', reason);
});

socket.on('connect_error', (error) => {
  console.error('[Socket.io] Erro de conexão:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
  console.log('[Socket.io] Reconectado após', attemptNumber, 'tentativas');

  // ⚠️ OTIMIZAÇÃO: Ao reconectar, invalidar apenas endpoint leve
  // Isso garante que o Kanban seja atualizado com mudanças que possam ter ocorrido durante a desconexão
  // Não fazer refetch para não sobrescrever optimistic updates em andamento
  queryClient.invalidateQueries({ queryKey: ['/api/projetos/light'] });
  console.log('[Socket.io] Cache /api/projetos/light invalidado após reconexão');
});

// Ping/pong para manter conexão ativa
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping');
  }
}, 25000); // 25 segundos

export default socket;
