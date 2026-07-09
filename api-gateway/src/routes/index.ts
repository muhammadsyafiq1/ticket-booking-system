import { Router } from "express";
import userRoutes from "./userRoutes";
import bookingRoutes from "./bookingRoutes";
import paymentRoutes from "./paymentRoutes";

const router = Router();

router.use(userRoutes);
router.use(bookingRoutes);
router.use(paymentRoutes);

export default router;