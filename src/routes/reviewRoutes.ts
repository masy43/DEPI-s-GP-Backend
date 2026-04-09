import { Router } from "express";
import { createReview, getProductReviews, deleteReview } from "../controllers/reviewController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/products/:id/reviews", authenticateToken as any, createReview as any);
router.get("/products/:id/reviews", getProductReviews as any);
router.delete("/reviews/:reviewId", authenticateToken as any, deleteReview as any);

export default router;
