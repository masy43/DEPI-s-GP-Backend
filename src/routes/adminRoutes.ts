import { Router, RequestHandler } from "express";
import {
  createProduct, updateProduct, deleteProduct,
  updateVariantStock, updateVariant, deleteVariant,
  addProductImages, deleteProductImage, addProductVariants,
  createCategory, updateCategory, deleteCategory,
  getAdminOrders, updateOrderStatus, cancelOrder,
  getCustomers, getCustomerById,
  adminLogin,
} from "../controllers/adminController";
import { shipOrder } from "../controllers/shippingController";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";

const router = Router();

// Public ──────────────────────────────────────────────────────────────────────
router.post("/login", adminLogin as RequestHandler);

// All routes below require a valid admin/product_manager JWT ──────────────────
router.use(authenticateToken as RequestHandler, authorizeRoles("admin", "product_manager") as RequestHandler);

// Products ────────────────────────────────────────────────────────────────────
router.post("/products", createProduct as RequestHandler);
router.put("/products/:id", updateProduct as RequestHandler);
router.delete("/products/:id", deleteProduct as RequestHandler);

// Product Images ──────────────────────────────────────────────────────────────
router.post("/products/:id/images", addProductImages as RequestHandler);
router.delete("/images/:imageId", deleteProductImage as RequestHandler);

// Product Variants ────────────────────────────────────────────────────────────
router.post("/products/:id/variants", addProductVariants as RequestHandler);
router.put("/variants/:id/stock", updateVariantStock as RequestHandler);
router.put("/variants/:variantId", updateVariant as RequestHandler);
router.delete("/variants/:variantId", deleteVariant as RequestHandler);

// Categories ──────────────────────────────────────────────────────────────────
router.post("/categories", createCategory as RequestHandler);
router.put("/categories/:id", updateCategory as RequestHandler);
router.delete("/categories/:id", deleteCategory as RequestHandler);

// Orders ──────────────────────────────────────────────────────────────────────
router.get("/orders", getAdminOrders as RequestHandler);
router.put("/orders/:id/status", updateOrderStatus as RequestHandler);
router.put("/orders/:id/cancel", cancelOrder as RequestHandler);
router.put("/orders/:id/ship", shipOrder as RequestHandler);

// Customers ───────────────────────────────────────────────────────────────────
router.get("/customers", getCustomers as RequestHandler);
router.get("/customers/:id", getCustomerById as RequestHandler);

export default router;
