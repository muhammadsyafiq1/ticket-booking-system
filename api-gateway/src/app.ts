import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";
import { globalLimiter } from "./middlewares/rateLimiter";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(globalLimiter);

app.use("/", router);

app.get("/health", (_req, res) => res.json({ service: "api-gateway", status: "running" }));

app.listen(PORT, () => {
  console.log(`[API Gateway] running on http://localhost:${PORT}`);
});