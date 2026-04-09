import { Router } from "express";
import { shipOrder, getOrderTracking, updateDeliveryStatus } from "../controllers/shippingController";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

// Admin routes
router.put("/admin/orders/:id/ship", authenticateToken as any, authorizeRoles("admin", "product_manager") as any, shipOrder as any);

// Customer tracking root
router.get("/orders/:id/tracking", authenticateToken as any, getOrderTracking as any);

// Delivery partner / webhook route (could be protected by a different auth mechanism in prod)
router.put("/delivery/:shipId/update", updateDeliveryStatus as any);

export default router;
