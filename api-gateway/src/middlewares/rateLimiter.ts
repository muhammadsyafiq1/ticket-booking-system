import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "../config/redis";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
  store: new RedisStore({
    // @ts-expect-error — ioredis compatible
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
});

// Limiter LEBIH KETAT khusus untuk endpoint booking — mencegah 1 IP
// mencoba spam reservasi banyak kursi sekaligus secara brutal
export const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many booking attempts, please slow down" },
  store: new RedisStore({
    // @ts-expect-error
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: "rl:booking:",
  }),
});