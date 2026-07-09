import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userModel } from "../models/UserModel";
import dotenv from "dotenv";
import { publishToQueue } from "../config/rabbitmq";
dotenv.config();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        res
          .status(422)
          .json({ success: false, message: "All fields are required" });
        return;
      }

      const existing = await userModel.findByEmail(email);
      if (existing) {
        res
          .status(409)
          .json({ success: false, message: "Email already registered" });
        return;
      }

      //publish ke queue
      await publishToQueue(process.env.USER_CREATE_QUEUE!, {
        name,
        email,
        password,
      });

      res
        .status(201)
        .json({ success: true, message: "Register successful" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await userModel.findByEmail(email);
      if (!user) {
        res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
        return;
      }

      // supaya nanti bisa diambil kembali oleh service lain tanpa perlu query database
      const expiresIn = process.env.JWT_EXPIRES_IN || "24h";

      const token = jwt.sign(
        { user_id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET!,
        { expiresIn } as jwt.SignOptions,
      );

      res.json({
        success: true,
        data: {
          token,
          user: { id: user.id, name: user.name, email: user.email },
        },
        message: "Login successful",
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const authController = new AuthController();
