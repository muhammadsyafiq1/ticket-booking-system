import { RowDataPacket } from "mysql2";
import pool from "../config/db";

export interface Seat extends RowDataPacket {
  id: number;
  event_id: number;
  seat_code: string;
  price: number;
  status: "available" | "reserved" | "sold";
}

export class SeatModel {
  async findByEventId(eventId: number): Promise<Seat[]> {
    const [rows] = await pool.query<Seat[]>(
      `SELECT * FROM seats WHERE event_id = ? ORDER BY seat_code`,
      [eventId],
    );
    return rows;
  }

  async findBySeatCode(
    eventId: number,
    seatCode: string,
  ): Promise<Seat | null> {
    const [rows] = await pool.query<Seat[]>(
      `SELECT * FROM seats WHERE event_id = ? AND seat_code = ? LIMIT 1`,
      [eventId, seatCode],
    );
    return rows[0] ?? null;
  }

  async updateStatus(
    seatId: number,
    status: "available" | "reserved" | "sold",
  ): Promise<void> {
    await pool.query(`UPDATE seats SET status = ? WHERE id = ?`, [
      status,
      seatId,
    ]);
  }
}

export const seatModel = new SeatModel();
