import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { CreateReviewSchema } from "../utils/schemas";

export const createReview = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const parsed = CreateReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { rating, comment } = parsed.data;

    // Check if user purchased this product
    const hasPurchased = await prisma.order_Item.findFirst({
      where: {
        variant: { product_id: productId },
        order: { customer_id: customerId, status: { not: "cancelled" } }
      }
    });

    if (!hasPurchased) {
      return res.status(400).json({ error: "Cannot review product not purchased" });
    }

    // Check for duplicate review
    const existingReview = await prisma.review.findUnique({
      where: { customer_id_product_id: { customer_id: customerId, product_id: productId } }
    });

    if (existingReview) {
      return res.status(400).json({ error: "Duplicate review" });
    }

    const review = await prisma.review.create({
      data: {
        customer_id: customerId,
        product_id: productId,
        rating,
        comment: comment || null
      },
      include: {
        customer: { select: { first_name: true, last_name: true } }
      }
    });

    res.status(201).json({ message: "Review submitted", data: review });
  } catch (err) {
    console.log("[reviews] createReview error:", err);
    res.status(500).json({ error: "Failed to submit review" });
  }
};

export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const reviews = await prisma.review.findMany({
      where: { product_id: productId },
      orderBy: { created_at: "desc" },
      include: {
        customer: { select: { first_name: true, last_name: true } }
      }
    });

    const reviewsCount = reviews.length;
    const avgRating = reviewsCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount) * 10) / 10
      : 0;

    res.json({
      meta: { avg_rating: avgRating, reviews_count: reviewsCount },
      data: reviews
    });
  } catch (err) {
    console.log("[reviews] getProductReviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

export const deleteReview = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const reviewId = parseInt(req.params.reviewId as string);
    if (isNaN(reviewId)) return res.status(400).json({ error: "Invalid review ID" });

    const review = await prisma.review.findUnique({ where: { review_id: reviewId } });

    if (!review || review.customer_id !== customerId) {
      return res.status(404).json({ error: "Review not found" });
    }

    await prisma.review.delete({ where: { review_id: reviewId } });

    res.json({ message: "Review deleted" });
  } catch (err) {
    console.log("[reviews] deleteReview error:", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
};
