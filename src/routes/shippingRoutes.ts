import { Router, RequestHandler } from "express";
import { shipOrder, getOrderTracking, updateDeliveryStatus } from "../controllers/shippingController";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

// Admin routes
router.put("/admin/orders/:id/ship", authenticateToken as RequestHandler, authorizeRoles("admin", "product_manager") as RequestHandler, shipOrder as RequestHandler);

// Customer tracking root
router.get("/orders/:id/tracking", authenticateToken as RequestHandler, getOrderTracking as RequestHandler);

// Delivery partner / webhook route (could be protected by a different auth mechanism in prod)
router.put("/delivery/:shipId/update", updateDeliveryStatus as RequestHandler);

export default router;
