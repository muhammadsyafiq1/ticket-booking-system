import { sendToUser } from "../socket";

interface NotificationEvent {
  booking_ref?: string;
  seat_code: string;
  user_id?: number;
  event: "booking.reserved" | "booking.paid" | "booking.expired";
  message: string;
}

/**
 * Simulasi kirim notifikasi — bisa diganti email (nodemailer),
 * push notification (FCM), atau SMS (Twilio) di production.
 */
async function sendNotification(
  userId: number | undefined,
  message: string,
): Promise<void> {
  // Simulasi delay seperti proses kirim email/SMS sungguhan
  await new Promise((resolve) => setTimeout(resolve, 300));

  const target = userId
    ? `user ${userId}`
    : "user (unknown, kursi sudah dilepas)";
  console.log(`[Notification Service] Sent to ${target}: "${message}"`);
}

export async function handleBookingNotification(
  data: NotificationEvent,
): Promise<void> {
  console.log(`[Notification Service] Processing event: ${data.event}`);

  switch (data.event) {
    case "booking.reserved":
      await sendNotification(data.user_id, data.message);

      if (data.user_id) {
        sendToUser(data.user_id, "notification", {
          event: data.event,
          message: data.message,
          seat_code: data.seat_code,
        });
      }

      console.log(
        `Tipe: Reservasi berhasil, kursi ${data.seat_code}, segera bayar dalam 10 menit`,
      );
      break;

    case "booking.paid":
      await sendNotification(data.user_id, data.message);
      console.log(
        `Tipe: Pembayaran sukses, kursi ${data.seat_code} resmi milik user`,
      );
      break;

    case "booking.expired":
      await sendNotification(data.user_id, data.message);
      console.log(
        `Tipe: Reservasi kadaluarsa, kursi ${data.seat_code} kembali tersedia`,
      );
      break;

    default:
      console.warn(`[Notification Service] Unknown event type: ${data.event}`);
  }
}
