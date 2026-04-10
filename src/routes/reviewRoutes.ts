import { Router, RequestHandler } from "express";
import { createReview, getProductReviews, deleteReview } from "../controllers/reviewController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/products/:id/reviews", authenticateToken as RequestHandler, createReview as RequestHandler);
router.get("/products/:id/reviews", getProductReviews as RequestHandler);
router.delete("/reviews/:reviewId", authenticateToken as RequestHandler, deleteReview as RequestHandler);

export default router;
