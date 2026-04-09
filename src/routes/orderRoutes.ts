import { Router } from "express";
import { createOrder, getOrders, getOrderById } from "../controllers/orderController";
import { confirmPayment } from "../controllers/paymentController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/orders", authenticateToken as any, createOrder as any);
router.get("/orders", authenticateToken as any, getOrders as any);
router.get("/orders/:id", authenticateToken as any, getOrderById as any);

router.post("/payments/confirm", confirmPayment as any);

export default router;
