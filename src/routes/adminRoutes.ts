import { Router, RequestHandler } from "express";
import {
  createProduct, updateProduct, deleteProduct,
  updateVariantStock, getAdminOrders, adminLogin
} from "../controllers/adminController";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", adminLogin as RequestHandler);

router.use(authenticateToken as RequestHandler, authorizeRoles("admin", "product_manager") as RequestHandler);

router.post("/products", createProduct as RequestHandler);
router.put("/products/:id", updateProduct as RequestHandler);
router.delete("/products/:id", deleteProduct as RequestHandler);
router.put("/variants/:id/stock", updateVariantStock as RequestHandler);
router.get("/orders", getAdminOrders as RequestHandler);

export default router;
