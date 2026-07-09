import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

router.use(
  "/payments",
  createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/payments${path}`,
    on: {
      proxyReq: (_proxyReq, req) => {
        console.log(`[Gateway] Forwarding ${req.method} ${req.url} → Payment Service`);
      },
    },
  })
);

export default router;