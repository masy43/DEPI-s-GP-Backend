import { RequestHandler } from "express";
import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAdminDashboard = async (_req: Request, res: Response) => {
  try {
    const totalOrders = await prisma.order.count();

    const revenueResult = await prisma.order.aggregate({
      where: { status: { in: ["delivered", "shipped"] } },
      _sum: { total: true },
    });
    const totalRevenue = revenueResult._sum.total ? Number(revenueResult._sum.total) : 0;

    const lowStockAlerts = await prisma.product_Variant.count({
      where: { stock: { lte: 10 } },
    });

    const recent5Orders = await prisma.order.findMany({
      orderBy: { created_at: "desc" },
      take: 5,
      include: { customer: { select: { email: true, first_name: true, last_name: true } } },
    });

    const topItems = await prisma.order_Item.groupBy({
      by: ["variant_id"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    const variantIds = topItems.map((item: any) => item.variant_id);
    const variants = await prisma.product_Variant.findMany({
      where: { variant_id: { in: variantIds } },
      include: { product: true },
    });

    const top5Products = topItems.map((item: any) => {
      const variant = variants.find((v) => v.variant_id === item.variant_id);
      return {
        variant_id: item.variant_id,
        product_name: variant?.product.product_name || "Unknown Product",
        size: variant?.size || "Unknown Size",
        total_sold: item._sum.quantity || 0,
      };
    });

    res.json({
      data: {
        totalRevenue,
        totalOrders,
        lowStockAlerts,
        top5Products,
        recent5Orders,
      },
    });
  } catch (err) {
    console.log("[dashboard] getAdminDashboard error:", err);
    res.status(500).json({ error: "Failed to fetch admin dashboard stats" });
  }
};

export const getCustomerDashboard: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const customer = await prisma.customer.findUnique({
      where: { customer_id: customerId },
      select: { loyalty_points: true },
    });

    const loyaltyPoints = customer?.loyalty_points || 0;

    const totalOrders = await prisma.order.count({
      where: { customer_id: customerId },
    });

    const recent3Orders = await prisma.order.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: "desc" },
      take: 3,
      select: { order_id: true, order_ref: true, status: true, total: true, created_at: true },
    });

    const cart = await prisma.cart.findUnique({
      where: { customer_id: customerId },
      include: { _count: { select: { items: true } } },
    });
    const activeCartCount = cart?._count.items || 0;

    res.json({
      data: {
        loyaltyPoints,
        totalOrders,
        recent3Orders,
        activeCartCount,
      },
    });
  } catch (err) {
    console.log("[dashboard] getCustomerDashboard error:", err);
    res.status(500).json({ error: "Failed to fetch customer dashboard stats" });
  }
};
