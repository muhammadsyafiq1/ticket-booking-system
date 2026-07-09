import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "../config/db";

export interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
}

export class UserModel {
  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<User[]>(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
    return rows[0] ?? null;
  }

  async create(data: { name: string; email: string; password: string }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [data.name, data.email, data.password]
    );
    return result.insertId;
  }
}

export const userModel = new UserModel();