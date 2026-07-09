import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT) || 6379,
});

redis.on("connect", () => console.log("[Payment Service] Redis connected"));
redis.on("error", (err) => console.error("[Payment Service] Redis error:", err.message));

/**
 * Hapus lock kursi secara MANUAL — dipanggil setelah pembayaran sukses.
 * Format key HARUS SAMA PERSIS dengan yang dibuat Booking Service,
 * supaya Redis tahu key mana yang harus dihapus.
 */
export async function releaseLock(eventId: number, seatCode: string): Promise<void> {
  const lockKey = `kursi:${eventId}:${seatCode}`;
  const deletedCount = await redis.del(lockKey);

  if (deletedCount > 0) {
    console.log(`Payment Service] Lock released: ${lockKey}`);
  } else {
    // Ini bisa terjadi kalau lock SUDAH expired sendiri sebelum sempat di-release manual
    console.warn(`[Payment Service] Lock ${lockKey} was already gone (expired naturally)`);
  }
}

export default redis;