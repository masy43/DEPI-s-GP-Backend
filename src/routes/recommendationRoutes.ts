import { Router, RequestHandler } from "express";
import { getProfileRecommendations, getSimilarProducts } from "../controllers/recommendationController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/profile", authenticateToken as RequestHandler, getProfileRecommendations as RequestHandler);
router.get("/:productId/similar", getSimilarProducts as RequestHandler);

export default router;
