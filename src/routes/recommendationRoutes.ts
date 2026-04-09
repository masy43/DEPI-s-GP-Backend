import { Router } from "express";
import { getProfileRecommendations, getSimilarProducts } from "../controllers/recommendationController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/profile", authenticateToken as any, getProfileRecommendations as any);
router.get("/:productId/similar", getSimilarProducts as any);

export default router;
