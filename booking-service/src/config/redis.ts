import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
});

redis.on("connect", () => console.log("[Booking Service] Redis connected"));
redis.on("error", (err) => console.error("[Booking Service] Redis error:", err.message));

/**
 * Bikin lock kursi — INTI dari pencegahan race condition.
 * Return true kalau berhasil lock, false kalau kursi sudah di-lock orang lain.
 */
export async function lockSeat(eventId: number, seatCode: string, userId: number): Promise<boolean> {
  const lockKey = `kursi:${eventId}:${seatCode}`;
  const ttl = Number(process.env.LOCK_TTL_SECONDS) || 600;

  // "set" dengan opsi NX (only if Not eXists) dan EX (expire dalam X detik)
  // Operasi ini ATOMIC — tidak ada celah waktu antara "cek" dan "set"
  const result = await redis.set(lockKey, userId.toString(), "EX", ttl, "NX");

  // result === "OK" artinya berhasil lock
  // result === null artinya GAGAL — sudah ada yang lock duluan
  return result === "OK";
}

/**
 * Cek siapa yang sedang lock kursi ini (untuk validasi sebelum checkout).
 */
export async function getLockOwner(eventId: number, seatCode: string): Promise<string | null> {
  const lockKey = `kursi:${eventId}:${seatCode}`;
  return redis.get(lockKey);
}

/**
 * Hapus lock secara MANUAL — dipanggil Payment Worker setelah bayar sukses.
 * Supaya tidak perlu nunggu TTL habis sendiri walau sudah dibayar lunas.
 */
export async function releaseLock(eventId: number, seatCode: string): Promise<void> {
  const lockKey = `kursi:${eventId}:${seatCode}`;
  await redis.del(lockKey);
}

/**
 * Subscribe ke Redis Keyspace Notification untuk event "expired".
 * Setiap kali ada key apapun yang expired, callback ini akan dipanggil.
 */
export function subscribeToExpiredKeys(onExpired: (expiredKey: string) => Promise<void>): void {
  //harus buat koneksi redis baru utk subscribe
  const subscriber = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
  });

  // Database 0 (default), channel khusus untuk event "expired"
  subscriber.subscribe("__keyevent@0__:expired", (err) => {
    if (err) {
      console.error("[Expiry Worker] Failed to subscribe:", err.message);
      return;
    }
    console.log("[Expiry Worker] Subscribed to Redis expired events");
  });

  subscriber.on("message", async (_channel, expiredKey) => {
    console.log(`[Expiry Worker] Key expired: ${expiredKey}`);
    try {
      await onExpired(expiredKey); // panggil callback yang dikirim dari expiryWorker.ts, dan mengirim sinyal ke file expiryWorker.ts untuk publish ke RabbitMQ
    } catch (err: any) {
      console.error(`[Expiry Worker] Error handling expired key:`, err.message);
    }
  });
}

export default redis;