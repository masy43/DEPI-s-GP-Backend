import { Router, RequestHandler } from "express";
import { getAddresses, addAddress, updateAddress, deleteAddress } from "../controllers/addressController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticateToken as RequestHandler);

router.get("/", getAddresses as RequestHandler);
router.post("/", addAddress as RequestHandler);
router.put("/:id", updateAddress as RequestHandler);
router.delete("/:id", deleteAddress as RequestHandler);

export default router;
