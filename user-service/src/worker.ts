import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

import { consumeQueue, publishToQueue } from "./config/rabbitmq";
import { userModel } from "./models/UserModel";

interface UserCreateJob {
  name: string;
  email: string;
  password: string;
}

async function processUserCreate(data: UserCreateJob): Promise<void> {
  console.log(`[User Worker] Processing create user ${data.email}`);

  // Simpan user ke db
  const hashedPassword = await bcrypt.hash(data.password, 10);
  await userModel.create({
    name: data.name,
    email: data.email,
    password: hashedPassword,
  });

  console.log(`[User Worker] User ${data.email} saved as create`);

  await publishToQueue(process.env.USER_CREATED_QUEUE!, {
    name: data.name,
    email: data.email,
    event:"user.created",
    message: `user ${data.email} berhasil dibuat`,
  });
}

async function start() {
  console.log("[User Worker] Starting...");
  await consumeQueue(process.env.USER_CREATE_QUEUE!, processUserCreate);
}

start().catch((err) => {
  console.error("[User Worker] Failed to start:", err);
  process.exit(1);
});
