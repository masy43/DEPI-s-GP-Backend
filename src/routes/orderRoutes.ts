import { Router, RequestHandler } from "express";
import { createOrder, getOrders, getOrderById } from "../controllers/orderController";
import { confirmPayment } from "../controllers/paymentController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/orders", authenticateToken as RequestHandler, createOrder as RequestHandler);
router.get("/orders", authenticateToken as RequestHandler, getOrders as RequestHandler);
router.get("/orders/:id", authenticateToken as RequestHandler, getOrderById as RequestHandler);

router.post("/payments/confirm", confirmPayment as RequestHandler);

export default router;
