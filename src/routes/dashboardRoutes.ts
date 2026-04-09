import { Router } from "express";
import { getAdminDashboard, getCustomerDashboard } from "../controllers/dashboardController";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

router.get("/admin", authenticateToken as any, authorizeRoles("admin", "product_manager") as any, getAdminDashboard as any);
router.get("/customer", authenticateToken as any, getCustomerDashboard as any);

export default router;
