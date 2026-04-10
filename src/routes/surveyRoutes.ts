import { Router, RequestHandler } from "express";
import { getActiveSurvey, submitSurvey } from "../controllers/surveyController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/active", getActiveSurvey as RequestHandler);
router.post("/submit", authenticateToken as RequestHandler, submitSurvey as RequestHandler);

export default router;
