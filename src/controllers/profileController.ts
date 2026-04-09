import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

const VALID_SKIN_TYPES = ['oily', 'dry', 'combination', 'sensitive', 'normal'];

export const updateSkinProfile = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const { skin_type, concerns, sensitivity_level, climate } = req.body;

    if (!skin_type || !VALID_SKIN_TYPES.includes(skin_type.toLowerCase())) {
      return res.status(400).json({ error: `Invalid skin_type. Options: ${VALID_SKIN_TYPES.join(', ')}` });
    }

    const concernsArray = Array.isArray(concerns) ? concerns : [];

    const profile = await prisma.skin_Profile.upsert({
      where: { customer_id: customerId },
      update: {
        skin_type: skin_type.toLowerCase(),
        concerns: concernsArray,
        sensitivity_level: sensitivity_level || "Not specified",
        climate: climate || "Not specified"
      },
      create: {
        customer_id: customerId,
        skin_type: skin_type.toLowerCase(),
        concerns: concernsArray,
        sensitivity_level: sensitivity_level || "Not specified",
        climate: climate || "Not specified"
      }
    });

    res.json({ message: "Skin profile saved successfully", data: profile });
  } catch (err) {
    console.log("[profile] updateSkinProfile error:", err);
    res.status(500).json({ error: "Failed to save skin profile" });
  }
};
