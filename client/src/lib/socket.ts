import { io, Socket } from 'socket.io-client';

// Criar conexão WebSocket com o servidor
// Em desenvolvimento: localhost:5000
// Em produção: mesma origem do site
const socketUrl = import.meta.env.DEV
  ? 'http://localhost:5000'
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
});

// Ping/pong para manter conexão ativa
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping');
  }
}, 25000); // 25 segundos

export default socket;
