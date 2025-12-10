import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { log } from "./vite";

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Configurações de performance e compatibilidade
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    // Permitir todos os transports (polling e websocket)
    transports: ['polling', 'websocket'],
    // Permitir upgrades de polling para websocket
    allowUpgrades: true,
  });

  // Contador de conexões ativas
  let connectionCount = 0;

  io.on("connection", (socket) => {
    connectionCount++;
    const transport = socket.conn.transport.name;
    log(`[WebSocket] ✅ Cliente conectado via ${transport} | ID: ${socket.id} | Total: ${connectionCount}`);

    // Log de upgrade de transport
    socket.conn.on('upgrade', (newTransport) => {
      log(`[WebSocket] 🔄 Transport upgrade: ${transport} → ${newTransport.name} | ID: ${socket.id}`);
    });

    // Entrar na sala global de projetos
    socket.join("projetos");

    // Quando desconectar
    socket.on("disconnect", (reason) => {
      connectionCount--;
      log(`[WebSocket] ❌ Cliente desconectado | Razão: ${reason} | ID: ${socket.id} | Total: ${connectionCount}`);
    });

    // Ping/pong para manter conexão ativa
    socket.on("ping", () => {
      socket.emit("pong");
    });

    // Log de erros
    socket.on("error", (error) => {
      log(`[WebSocket] 🔴 Erro no socket ${socket.id}: ${error.message}`);
    });
  });

  // Log de erros do servidor
  io.engine.on("connection_error", (err) => {
    log(`[WebSocket] 🔴 Erro de conexão: ${err.message}`);
  });

  // Função helper para emitir eventos de mudança
  const emitChange = (event: string, data: any) => {
    const clientsCount = io.sockets.adapter.rooms.get("projetos")?.size || 0;
    log(`[WebSocket] 📢 Emitindo "${event}" para ${clientsCount} cliente(s)`);
    io.to("projetos").emit(event, data);
  };

  return {
    io,
    emitChange,
  };
}

export type WebSocketServer = ReturnType<typeof setupWebSocket>;
