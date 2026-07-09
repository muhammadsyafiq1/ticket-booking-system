import dotenv from "dotenv";
dotenv.config();

import { subscribeToExpiredKeys } from "./config/redis";
import { publishToQueue, connectRabbitMQ } from "./config/rabbitmq";

/**
 * Parse nama key Redis untuk dapatkan event_id dan seat_code.
 * Format key: "kursi:1:A1" → { eventId: 1, seatCode: "A1" }
 */
function parseLockKey(key: string): { eventId: number; seatCode: string } | null {
  const parts = key.split(":");

  // Pastikan formatnya benar: ["kursi", "1", "A1"] — harus 3 bagian
  if (parts.length !== 3 || parts[0] !== "kursi") {
    return null; // bukan key untuk lock kursi, mungkin key lain yang juga expired
  }

  return {
    eventId: Number(parts[1]),
    seatCode: parts[2],
  };
}

async function handleExpiredKey(expiredKey: string): Promise<void> {
  const parsed = parseLockKey(expiredKey);

  if (!parsed) {
    // Bukan key yang kita pedulikan, abaikan saja
    console.log(`[Expiry Worker] Ignoring unrelated key: ${expiredKey}`);
    return;
  }

  console.log(`[Expiry Worker] Seat ${parsed.seatCode} (event ${parsed.eventId}) lock expired`);

  await publishToQueue(process.env.BOOKING_EXPIRED_QUEUE!, {
    event_id: parsed.eventId,
    seat_code: parsed.seatCode,
  });
}

async function start() {
  console.log("[Expiry Worker] Starting...");

  // Pastikan RabbitMQ connection siap dan queue sudah dibuat
  await connectRabbitMQ();

  // Mulai dengarkan Redis Keyspace Notification
  // titipkan instruksi handleExpiryKey ke subscribeToExpiredKeys pada file redis.ts
  subscribeToExpiredKeys(handleExpiredKey);
}

start().catch((err) => {
  console.error("[Expiry Worker] Failed to start:", err.message);
  process.exit(1);
});