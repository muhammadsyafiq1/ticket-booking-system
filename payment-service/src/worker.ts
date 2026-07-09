import dotenv from "dotenv";
dotenv.config();

import { consumeQueue, publishToQueue } from "./config/rabbitmq";
import { paymentModel } from "./models/PaymentModel";
import { releaseLock } from "./config/redis";

interface PaymentProcessJob {
  booking_ref: string;
  seat_id: number;
  event_id: number;
  seat_code: string;
  user_id: number;
}

async function processPayment(data: PaymentProcessJob): Promise<void> {
  console.log(`[Payment Worker] Processing payment for ${data.booking_ref}`);

  // Simulasi call ke payment gateway eksternal (Midtrans, Xendit, dll)
  // Sengaja dibuat lambat untuk menunjukkan kenapa ini harus diantri,
  // tidak boleh bikin user menunggu di request HTTP langsung
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Update database — booking jadi 'paid', seat jadi 'sold' (dalam 1 transaction)
  await paymentModel.confirmPayment(data.booking_ref, data.seat_id);

  console.log(`[Payment Worker] Payment confirmed for ${data.booking_ref}`);

  // hapus lock Redis secara manual
  // supaya tidak perlu menunggu TTL 600 detik habis sendiri
  await releaseLock(data.event_id, data.seat_code);

  // Kasih tahu user, pembayaran sukses
  await publishToQueue(process.env.BOOKING_NOTIFICATION_QUEUE!, {
    booking_ref: data.booking_ref,
    seat_code: data.seat_code,
    user_id: data.user_id,
    event: "booking.paid",
    message: `Pembayaran untuk kursi ${data.seat_code} berhasil! Tiket kamu sudah dikonfirmasi.`,
  });
}

async function start() {
  console.log("[Payment Worker] Starting...");
  await consumeQueue(process.env.PAYMENT_PROCESS_QUEUE!, processPayment);
}

start().catch((err) => {
  console.error("[Payment Worker] Failed to start:", err.message);
  process.exit(1);
});