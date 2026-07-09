import { Router } from "express";
import { bookingController } from "../controllers/BookingController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.get("/events/:eventId/seats", authenticate,  (req, res) => bookingController.listSeats(req, res));
router.post("/bookings/reserve",authenticate ,(req, res) => bookingController.reserveSeat(req, res));

export default router;