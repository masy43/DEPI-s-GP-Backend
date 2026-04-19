import { Router, RequestHandler } from "express";
import {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getSkinProfile,
  updateSkinProfile,
} from "../controllers/profileController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// All profile routes require authentication
router.use(authenticateToken as RequestHandler);

// General user profile
router.get("/me", getMyProfile as RequestHandler);
router.put("/me", updateMyProfile as RequestHandler);
router.put("/change-password", changePassword as RequestHandler);

// Skin profile
router.get("/skin", getSkinProfile as RequestHandler);
router.put("/skin", updateSkinProfile as RequestHandler);

export default router;
