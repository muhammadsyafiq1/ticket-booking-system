import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";

export interface Booking extends RowDataPacket {
  id: number;
  booking_ref: string;
  seat_id: number;
  user_id: number;
  status: "reserved" | "paid" | "expired" | "cancelled";
}

export class BookingModel {
  async create(data: {
    booking_ref: string;
    seat_id: number;
    user_id: number;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO bookings (booking_ref, seat_id, user_id, status) VALUES (?, ?, ?, 'reserved')`,
      [data.booking_ref, data.seat_id, data.user_id],
    );
    return result.insertId;
  }

  async findActiveBookingBySeatId(seatId: number): Promise<Booking | null> {
    const [rows] = await pool.query<Booking[]>(
      `SELECT * FROM bookings WHERE seat_id = ? AND status = 'reserved' LIMIT 1`,
      [seatId],
    );
    return rows[0] ?? null;
  }

  async updateStatusBySeatId(
    seatId: number,
    status: Booking["status"],
  ): Promise<void> {
    await pool.query(
      `UPDATE bookings SET status = ? WHERE seat_id = ? AND status = 'reserved'`,
      [status, seatId],
    );
  }

  async findByRef(bookingRef: string): Promise<Booking | null> {
    const [rows] = await pool.query<Booking[]>(
      `SELECT * FROM bookings WHERE booking_ref = ? LIMIT 1`,
      [bookingRef],
    );
    return rows[0] ?? null;
  }

  async updateStatus(
    bookingRef: string,
    status: Booking["status"],
  ): Promise<void> {
    const paidAt = status === "paid" ? ", paid_at = NOW()" : "";
    await pool.query(
      `UPDATE bookings SET status = ?${paidAt} WHERE booking_ref = ?`,
      [status, bookingRef],
    );
  }
}

export const bookingModel = new BookingModel();
