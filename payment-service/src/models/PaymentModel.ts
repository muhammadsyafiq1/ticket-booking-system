import { RowDataPacket } from "mysql2";
import pool from "../config/db";

export interface BookingWithSeat extends RowDataPacket {
  id: number;
  booking_ref: string;
  seat_id: number;
  user_id: number;
  status: string;
  event_id: number;
  seat_code: string;
}

export class PaymentModel {
  /**
   * Ambil booking LENGKAP dengan info kursi (perlu event_id dan seat_code
   * untuk tahu key Redis mana yang harus di-release nanti).
   */
  async findBookingForPayment(bookingRef: string): Promise<BookingWithSeat | null> {
    const [rows] = await pool.query<BookingWithSeat[]>(
      `SELECT b.*, s.event_id, s.seat_code
       FROM bookings b
       INNER JOIN seats s ON b.seat_id = s.id
       WHERE b.booking_ref = ?
       LIMIT 1`,
      [bookingRef]
    );
    return rows[0] ?? null;
  }

  async confirmPayment(bookingRef: string, seatId: number): Promise<void> {
    // Pakai TRANSACTION — update bookings dan seats harus SUKSES BERSAMA,
    // tidak boleh salah satu berhasil tapi yang lain gagal (data jadi tidak konsisten)
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE bookings SET status = 'paid', paid_at = NOW() WHERE booking_ref = ?`,
        [bookingRef]
      );

      await conn.query(`UPDATE seats SET status = 'sold' WHERE id = ?`, [seatId]);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

export const paymentModel = new PaymentModel();