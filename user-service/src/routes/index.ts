import { Router } from "express";
import { authController } from "../controllers/AuthController";

const router = Router();

router.post("/auth/register", (req, res) => authController.register(req, res));
router.post("/auth/login", (req, res) => authController.login(req, res));

export default router;