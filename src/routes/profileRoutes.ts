import { Router, RequestHandler } from "express";
import { updateSkinProfile, getSkinProfile } from "../controllers/profileController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticateToken as RequestHandler, getSkinProfile as RequestHandler);
router.put("/skin", authenticateToken as RequestHandler, updateSkinProfile as RequestHandler);

export default router;
