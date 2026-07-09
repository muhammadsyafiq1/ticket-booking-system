import dotenv from "dotenv";
dotenv.config();

import { consumeQueue, publishToQueue } from "./config/rabbitmq";
import { bookingModel } from "./models/BookingModel";
import { seatModel } from "./models/SeatModel";

interface BookingCreateJob {
  booking_ref: string;
  seat_id: number;
  event_id: number;
  seat_code: string;
  user_id: number;
}

interface BookingExpiredJob {
  event_id: number;
  seat_code: string;
}

async function processBookingCreate(data: BookingCreateJob): Promise<void> {
  console.log(`[Booking Worker] Processing booking ${data.booking_ref}`);

  // Simpan booking dengan status "reserved"
  await bookingModel.create({
    booking_ref: data.booking_ref,
    seat_id: data.seat_id,
    user_id: data.user_id,
  });

  // Update status kursi jadi "reserved" (sebelumnya "available")
  await seatModel.updateStatus(data.seat_id, "reserved");

  console.log(`[Booking Worker] Booking ${data.booking_ref} saved as reserved`);

  // Kasih tahu user, reservasi berhasil dan harus segera bayar
  await publishToQueue(process.env.BOOKING_NOTIFICATION_QUEUE!, {
    booking_ref: data.booking_ref,
    seat_code: data.seat_code,
    user_id: data.user_id,
    event: "booking.reserved",
    message: `Kursi ${data.seat_code} berhasil direservasi, segera lakukan pembayaran`,
  });
}

/**
 * proses kalau ada kursi yang lock-nya expired karena tidak dibayar.
 */
async function processBookingExpired(data: BookingExpiredJob): Promise<void> {
  console.log(
    `[Booking Worker] Releasing expired seat ${data.seat_code} (event ${data.event_id})`,
  );

  // 1. Cari seatnya
  const seat = await seatModel.findBySeatCode(data.event_id, data.seat_code);

  if (!seat) {
    console.warn(`[Booking Worker] Seat ${data.seat_code} not found, skip`);
    return;
  }

  // 2. Validasi status — jgn proses kalau bukan 'reserved'
  if (seat.status !== "reserved") {
    console.log(
      `[Booking Worker] Seat ${data.seat_code} status is '${seat.status}', not 'reserved' anymore — skip`,
    );
    return;
  }

  // 3. SEKARANG baru ambil booking, untuk dapat user_id sebelum statusnya diubah
  const booking = await bookingModel.findActiveBookingBySeatId(seat.id);

  // 4. Update status SETELAH validasi lolos
  await seatModel.updateStatus(seat.id, "available");
  await bookingModel.updateStatusBySeatId(seat.id, "expired");

  console.log(
    `[Booking Worker] Seat ${data.seat_code} released, now available`,
  );

  // 5. HANYA SATU KALI publish
  await publishToQueue(process.env.BOOKING_NOTIFICATION_QUEUE!, {
    seat_code: data.seat_code,
    user_id: booking?.user_id, 
    event: "booking.expired",
    message: `Waktu reservasi untuk kursi ${data.seat_code} telah habis, kursi sudah dilepas`,
  });
}

async function start() {
  console.log("[Booking Worker] Starting...");
  await consumeQueue(process.env.BOOKING_CREATE_QUEUE!, processBookingCreate);
  await consumeQueue(process.env.BOOKING_EXPIRED_QUEUE!, processBookingExpired);
}

start().catch((err) => {
  console.error("[Booking Worker] Failed to start:", err.message);
  process.exit(1);
});
