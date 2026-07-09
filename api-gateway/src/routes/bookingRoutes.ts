import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { bookingLimiter } from "../middlewares/rateLimiter";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

// Proxy untuk /events (TANPA rate limiter khusus, cukup global limiter)
router.use(
  "/events",
  createProxyMiddleware({
    target: process.env.BOOKING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/events${path}`,
  })
);

// Proxy untuk /bookings — bookingLimiter dipasang SEKALI saja, langsung di sini
router.use(
  "/bookings",
  bookingLimiter,
  createProxyMiddleware({
    target: process.env.BOOKING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/bookings${path}`,
  })
);

export default router;