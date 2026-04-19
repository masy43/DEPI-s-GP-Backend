import { Router, RequestHandler } from "express";
import { register, login, registerAdmin } from "../controllers/authController";
import { authenticateToken, authorizeRoles, AuthRequest } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// P0: Admin registration is now protected — requires an existing admin JWT
router.post(
  "/admin/register",
  authenticateToken as RequestHandler,
  authorizeRoles("admin") as RequestHandler,
  registerAdmin as RequestHandler
);

router.get("/me", authenticateToken as RequestHandler, (req, res) => {
  const authReq = req as AuthRequest;
  res.json({ customer: authReq.user });
});

export default router;
