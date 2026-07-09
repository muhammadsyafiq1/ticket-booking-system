import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { seatModel } from "../models/SeatModel";
import { lockSeat } from "../config/redis";
import { publishToQueue } from "../config/rabbitmq";
import dotenv from "dotenv";
dotenv.config();

export class BookingController {
  async listSeats(req: Request, res: Response): Promise<void> {
    try {
      const eventId = Number(req.params.eventId);
      const seats = await seatModel.findByEventId(eventId);
      res.json({ success: true, data: seats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * INI ENDPOINT TERPENTING — tempat race condition prevention terjadi.
   */
  async reserveSeat(req: Request, res: Response): Promise<void> {
    try {
      const { event_id, seat_code, user_id } = req.body;

      if (!event_id || !seat_code || !user_id) {
        res.status(422).json({ success: false, message: "event_id, seat_code, and user_id are required" });
        return;
      }

      const seat = await seatModel.findBySeatCode(event_id, seat_code);
      if (!seat) {
        res.status(404).json({ success: false, message: "Seat not found" });
        return;
      }

      if (seat.status === "sold") {
        res.status(409).json({ success: false, message: "Seat already sold" });
        return;
      }

      // Atomic operation dari redis, anti race condition
      const lockSuccess = await lockSeat(event_id, seat_code, user_id);

      if (!lockSuccess) {
        // Lock GAGAL — artinya orang lain BARU SAJA lock kursi ini lebih dulu
        res.status(409).json({
          success: false,
          message: "Seat is currently being reserved by someone else, please try another seat",
        });
        return;
      }

      // Lock BERHASIL — generate booking reference, publish ke queue
      const bookingRef = randomUUID();

      await publishToQueue(process.env.BOOKING_CREATE_QUEUE!, {
        booking_ref: bookingRef,
        seat_id: seat.id,
        event_id,
        seat_code,
        user_id,
      });

      res.status(202).json({
        success: true,
        data: {
          booking_ref: bookingRef,
          seat_code,
          expires_in_seconds: Number(process.env.LOCK_TTL_SECONDS) || 600,
        },
        message: "Seat reserved, please complete payment before it expires",
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const bookingController = new BookingController();