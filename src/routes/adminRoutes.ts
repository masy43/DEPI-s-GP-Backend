import { Router } from "express";
import {
  createProduct, updateProduct, deleteProduct,
  updateVariantStock, getAdminOrders, adminLogin
} from "../controllers/adminController";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", adminLogin as any);

router.use(authenticateToken as any, authorizeRoles("admin", "product_manager") as any);

router.post("/products", createProduct as any);
router.put("/products/:id", updateProduct as any);
router.delete("/products/:id", deleteProduct as any);
router.put("/variants/:id/stock", updateVariantStock as any);
router.get("/orders", getAdminOrders as any);

export default router;
