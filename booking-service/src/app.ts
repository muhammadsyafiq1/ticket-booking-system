import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";
import { connectRabbitMQ } from "./config/rabbitmq";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use("/", router);

app.get("/health", (_req, res) => {
  res.json({ service: "booking-service", status: "running" });
});

async function start() {
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log(`[Booking Service] running on http://localhost:${PORT}`);
  });
}

start();