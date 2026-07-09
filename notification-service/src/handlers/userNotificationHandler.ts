interface UserCreatedEvent {
  email: string;
  name: string;
  event: string;
}

/**
 * Simulasi proses kirim notifikasi.
 * Di real-world, ini bisa diganti kirim email (nodemailer),
 * push notification (FCM), atau SMS (Twilio).
 */
export async function handleUserCreated(data: UserCreatedEvent): Promise<void> {
  console.log("[Notification Service] Processing event:", data.event);

  // Simulasi delay seperti proses kirim email sungguhan (tidak instan)
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(
    `[Notification Service] Notifikasi terkirim ke ${data.email}: ` +
    `"Halo ${data.name} dengan email '${data.email}' user berhasil dibuat!"`
  );
}