import { Router, RequestHandler } from "express";
import { getCart, addItemToCart, updateCartItem, removeCartItem } from "../controllers/cartController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateToken as RequestHandler);

router.get("/", getCart as RequestHandler);
router.post("/items", addItemToCart as RequestHandler);
router.put("/items/:cartItemId", updateCartItem as RequestHandler);
router.delete("/items/:cartItemId", removeCartItem as RequestHandler);

export default router;
