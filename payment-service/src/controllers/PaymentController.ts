import { Request, Response } from "express";
import { paymentModel } from "../models/PaymentModel";
import { publishToQueue } from "../config/rabbitmq";
import dotenv from "dotenv";
dotenv.config();

export class PaymentController {
  async checkout(req: Request, res: Response): Promise<void> {
    try {
      const { booking_ref } = req.body;

      if (!booking_ref) {
        res.status(422).json({ success: false, message: "booking_ref is required" });
        return;
      }

      const booking = await paymentModel.findBookingForPayment(booking_ref);

      if (!booking) {
        res.status(404).json({ success: false, message: "Booking not found" });
        return;
      }

      if (booking.status === "paid") {
        res.status(409).json({ success: false, message: "Booking already paid" });
        return;
      }

      if (booking.status !== "reserved") {
        res.status(409).json({
          success: false,
          message: `Booking cannot be paid, current status: ${booking.status}`,
        });
        return;
      }

      // Validasi lolos — publish ke queue untuk diproses worker
      await publishToQueue(process.env.PAYMENT_PROCESS_QUEUE!, {
        booking_ref: booking.booking_ref,
        seat_id: booking.seat_id,
        event_id: booking.event_id,
        seat_code: booking.seat_code,
        user_id: booking.user_id,
      });

      res.status(202).json({
        success: true,
        message: "Payment is being processed",
        data: { booking_ref: booking.booking_ref },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const paymentController = new PaymentController();