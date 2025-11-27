import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { log } from "./vite";

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Em produção, especificar o domínio exato
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Configurações de performance
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Contador de conexões ativas
  let connectionCount = 0;

  io.on("connection", (socket) => {
    connectionCount++;
    log(`[WebSocket] Cliente conectado. Total: ${connectionCount}`);

    // Entrar na sala global de projetos
    socket.join("projetos");

    // Quando desconectar
    socket.on("disconnect", () => {
      connectionCount--;
      log(`[WebSocket] Cliente desconectado. Total: ${connectionCount}`);
    });

    // Ping/pong para manter conexão ativa
    socket.on("ping", () => {
      socket.emit("pong");
    });
  });

  // Função helper para emitir eventos de mudança
  const emitChange = (event: string, data: any) => {
    log(`[WebSocket] Emitindo evento: ${event}`);
    io.to("projetos").emit(event, data);
  };

  return {
    io,
    emitChange,
  };
}

export type WebSocketServer = ReturnType<typeof setupWebSocket>;
