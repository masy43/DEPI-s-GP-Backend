import { Router, RequestHandler } from "express";
import { getAdminDashboard, getCustomerDashboard } from "../controllers/dashboardController";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

router.get("/admin", authenticateToken as RequestHandler, authorizeRoles("admin", "product_manager") as RequestHandler, getAdminDashboard as RequestHandler);
router.get("/customer", authenticateToken as RequestHandler, getCustomerDashboard as RequestHandler);

export default router;
