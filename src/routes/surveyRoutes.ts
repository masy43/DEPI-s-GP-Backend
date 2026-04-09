import { Router } from "express";
import { getActiveSurvey, submitSurvey } from "../controllers/surveyController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/active", getActiveSurvey as any);
router.post("/submit", authenticateToken as any, submitSurvey as any);

export default router;
