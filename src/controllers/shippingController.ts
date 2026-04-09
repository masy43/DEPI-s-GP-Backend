import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const shipOrder = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id as string);
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

    const { partner_id, tracking_number } = req.body;

    if (!partner_id || !tracking_number) {
      return res.status(400).json({ error: "partner_id and tracking_number are required" });
    }

    const order = await prisma.order.findUnique({ where: { order_id: orderId } });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === "shipped" || order.status === "delivered" || order.status === "cancelled") {
      return res.status(400).json({ error: `Cannot ship order with status: ${order.status}` });
    }

    // Estimate delivery in 3 days
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 3);

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { order_id: orderId },
        data: { status: "shipped" }
      });

      const ship = await tx.ship.create({
        data: {
          order_id: orderId,
          partner_id: parseInt(partner_id),
          tracking_num: tracking_number,
          est_delivery: estDelivery
        }
      });

      return { order: updatedOrder, ship };
    });

    res.json({ message: "Order shipped", data: result });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Tracking number already exists or order already shipped" });
    }
    console.log("[shipping] shipOrder error:", err);
    res.status(500).json({ error: "Failed to ship order" });
  }
};

export const getOrderTracking = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    const orderId = parseInt(req.params.id as string);
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      include: {
        ship: { include: { partner: true } },
        delivery: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (customerId && order.customer_id !== customerId) {
      return res.status(403).json({ error: "Forbidden. This is not your order." });
    }

    res.json({
      data: {
        status: order.status,
        shipment: order.ship ? {
          partner: order.ship.partner.name,
          tracking_number: order.ship.tracking_num,
          shipped_at: order.ship.shipped_at,
          estimated_delivery: order.ship.est_delivery
        } : null,
        delivery: order.delivery ? {
          status: order.delivery.status,
          delivered_at: order.delivery.delivered_at,
          notes: order.delivery.notes
        } : null
      }
    });

  } catch (err) {
    console.log("[shipping] getOrderTracking error:", err);
    res.status(500).json({ error: "Failed to fetch tracking details" });
  }
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const shipId = parseInt(req.params.shipId as string);
    if (isNaN(shipId)) return res.status(400).json({ error: "Invalid ship ID" });

    const { status, notes } = req.body;

    if (status !== "out_for_delivery" && status !== "delivered") {
      return res.status(400).json({ error: "Invalid status" });
    }

    const ship = await prisma.ship.findUnique({ where: { ship_id: shipId } });
    if (!ship) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.upsert({
        where: { ship_id: shipId },
        update: {
          status,
          notes,
          delivered_at: status === "delivered" ? new Date() : null
        },
        create: {
          order_id: ship.order_id,
          ship_id: shipId,
          status,
          notes,
          delivered_at: status === "delivered" ? new Date() : null
        }
      });

      if (status === "delivered") {
        await tx.order.update({
          where: { order_id: ship.order_id },
          data: { status: "delivered" }
        });
      }

      return delivery;
    });

    res.json({ message: "Delivery updated", data: result });
  } catch (err) {
    console.log("[shipping] updateDeliveryStatus error:", err);
    res.status(500).json({ error: "Failed to update delivery" });
  }
};
