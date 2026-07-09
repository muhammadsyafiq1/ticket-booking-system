import { Server } from "socket.io";
import http from "http";

let io: Server | null = null;

// Simpan mapping: user_id → socket_id yang sedang terhubung
// Supaya tahu "kirim notifikasi ini ke socket yang mana"
const connectedUsers = new Map<number, string>();

export function initSocketServer(server: http.Server): Server {
  io = new Server(server, {
    cors: { origin: "*" }, 
  });

  io.on("connection", (socket) => {
    console.log(`🔌 [Socket.io] Client connected: ${socket.id}`);

    // Client harus kirim event "register" dengan user_id mereka,
    // supaya server tahu "socket ini punya user_id berapa"
    socket.on("register", (userId: number) => {
      connectedUsers.set(userId, socket.id);
      console.log(`[Socket.io] User ${userId} registered with socket ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
      // Hapus user dari mapping kalau dia disconnect
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          break;
        }
      }
    });
  });

  return io;
}

/**
 * Kirim notifikasi ke user tertentu saja (kalau dia sedang online/terhubung).
 * Kalau user tidak sedang connect, notifikasi ini TIDAK akan tersimpan/diantri —
 * ini KARAKTERISTIK WebSocket, beda dengan RabbitMQ yang menyimpan pesan.
 */
export function sendToUser(userId: number, event: string, data: object): void {
  if (!io) return;

  const socketId = connectedUsers.get(userId);

  if (!socketId) {
    console.log(`[Socket.io] User ${userId} not connected, notification not delivered real-time`);
    return;
  }

  io.to(socketId).emit(event, data);
  console.log(`[Socket.io] Sent "${event}" to user ${userId}`);
}