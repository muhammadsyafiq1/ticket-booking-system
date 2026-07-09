import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors());
app.use(express.json());
app.use("/", router);

app.get("/health", (_req, res) => res.json({ service: "user-service", status: "running" }));

app.listen(PORT, () => {
  console.log(`[User Service] running on http://localhost:${PORT}`);
});