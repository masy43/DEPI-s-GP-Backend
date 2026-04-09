import { Router } from "express";
import { register, login } from "../controllers/authController";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authenticateToken, (req, res) => {
  const authReq = req as AuthRequest;
  res.json({ customer: authReq.user });
});

export default router;
