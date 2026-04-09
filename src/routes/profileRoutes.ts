import { Router } from "express";
import { updateSkinProfile } from "../controllers/profileController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.put("/skin", authenticateToken as any, updateSkinProfile as any);

export default router;
