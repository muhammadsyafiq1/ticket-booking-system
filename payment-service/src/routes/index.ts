import { Router } from "express";
import { paymentController } from "../controllers/PaymentController";

const router = Router();

router.post("/payments/checkout", (req, res) => paymentController.checkout(req, res));

export default router;