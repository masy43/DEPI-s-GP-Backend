import { RequestHandler } from "express";
import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { generateRecommendations, findSimilarProducts } from "../services/recommendationService";

export const getProfileRecommendations: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await prisma.skin_Profile.findUnique({
      where: { customer_id: customerId },
    });

    if (!profile) {
      return res.status(400).json({ error: "Please complete your skin profile first" });
    }

    const recommendations = await generateRecommendations(customerId, profile);

    res.json({ data: recommendations });
  } catch (err) {
    console.log("[recommendations] getProfileRecommendations error:", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};

export const getSimilarProducts: RequestHandler = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const similar = await findSimilarProducts(productId);

    if (similar === null) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ data: similar });
  } catch (err) {
    console.log("[recommendations] getSimilarProducts error:", err);
    res.status(500).json({ error: "Failed to find similar products" });
  }
};
