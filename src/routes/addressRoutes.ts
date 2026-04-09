import { Router } from "express";
import { getAddresses, addAddress, updateAddress, deleteAddress } from "../controllers/addressController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateToken as any);

router.get("/", getAddresses as any);
router.post("/", addAddress as any);
router.put("/:id", updateAddress as any);
router.delete("/:id", deleteAddress as any);

export default router;
