import { Router } from "express";
import { getCart, addItemToCart, updateCartItem, removeCartItem } from "../controllers/cartController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateToken as any);

router.get("/", getCart as any);
router.post("/items", addItemToCart as any);
router.put("/items/:cartItemId", updateCartItem as any);
router.delete("/items/:cartItemId", removeCartItem as any);

export default router;
