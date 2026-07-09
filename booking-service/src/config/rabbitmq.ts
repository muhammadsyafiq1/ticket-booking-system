import amqp, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import dotenv from "dotenv";
dotenv.config();

let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<Channel> {
  if (channel) return channel;

  const connection: ChannelModel = await amqp.connect(process.env.RABBITMQ_URL!);
  channel = await connection.createChannel();

  await channel.assertQueue(process.env.BOOKING_CREATE_QUEUE!, { durable: true });
  await channel.assertQueue(process.env.BOOKING_NOTIFICATION_QUEUE!, { durable: true });
  await channel.assertQueue(process.env.BOOKING_EXPIRED_QUEUE!, { durable: true }); 

  console.log("[Booking Service] RabbitMQ connected");
  return channel;
}

export async function publishToQueue(queueName: string, message: object): Promise<void> {
  const ch = await connectRabbitMQ();
  ch.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
  console.log(`[Booking Service] Published to ${queueName}`);
}

export async function consumeQueue(
  queueName: string,
  onMessage: (data: any) => Promise<void>
): Promise<void> {
  const ch = await connectRabbitMQ();
  await ch.assertQueue(queueName, { durable: true });
  ch.prefetch(1);

  console.log(`[Booking Service] Worker listening to: ${queueName}`);

  ch.consume(queueName, async (msg: ConsumeMessage | null) => {
    if (!msg) return;
    try {
      const data = JSON.parse(msg.content.toString());
      await onMessage(data);
      ch.ack(msg);
    } catch (err: any) {
      console.error(`[Booking Service] Worker error:`, err.message);
      ch.nack(msg, false, false);
    }
  });
}