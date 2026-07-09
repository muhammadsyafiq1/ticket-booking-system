import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { consumeQueue } from "./config/rabbitmq";
import { handleBookingNotification } from "./handlers/notificationHandler";
import { handleUserCreated } from "./handlers/userNotificationHandler";
import { initSocketServer } from "./socket";

const SOCKET_PORT = process.env.SOCKET_PORT || 5004;

async function start() {
  console.log("[Notification Service] Worker starting...");

  const app = express();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(SOCKET_PORT, () => {
    console.log(`[Socket.io] Listening on port ${SOCKET_PORT}`);
  });

  await consumeQueue(process.env.BOOKING_NOTIFICATION_QUEUE!, handleBookingNotification);
  await consumeQueue(process.env.USER_CREATED_QUEUE!, handleUserCreated);
}

start().catch((err) => {
  console.error("[Notification Service] Failed to start:", err);
  process.exit(1);
});