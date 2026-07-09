import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
});

redis.on("connect", () => console.log("[API Gateway] Redis connected"));
redis.on("error", (err) => console.error("[API Gateway] Redis error:", err.message));

export default redis;