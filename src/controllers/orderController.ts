import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { stripe } from "../config/stripe";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const cart = await prisma.cart.findUnique({
      where: { customer_id: customerId },
      include: {
        items: {
          include: { variant: true }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let subtotal = 0;
    for (const item of cart.items) {
      if (item.variant.stock < item.quantity) {
        return res.status(400).json({ error: `Not enough stock for variant ${item.variant_id}` });
      }
      subtotal += Number(item.variant.price) * item.quantity;
    }

    const shipping = 50.00;
    const tax = subtotal * 0.14; 
    const total = subtotal + shipping + tax;

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: "usd",
        metadata: { customerId: customerId.toString() }
      });
    } catch (stripeErr) {
      console.log("[order] Stripe error:", stripeErr);
      return res.status(500).json({ error: "Failed to communicate with Stripe" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customer_id: customerId,
          subtotal,
          tax,
          shipping,
          total,
        }
      });

      for (const item of cart.items) {
        await tx.order_Item.create({
          data: {
            order_id: order.order_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            price: item.variant.price
          }
        });

        await tx.product_Variant.update({
          where: { variant_id: item.variant_id },
          data: { stock: { decrement: item.quantity } }
        });
      }

      await tx.payment.create({
        data: {
          order_id: order.order_id,
          stripe_intent_id: paymentIntent.id,
          amount: total
        }
      });

      await tx.cart_Item.deleteMany({
        where: { cart_id: cart.cart_id }
      });

      return order;
    });

    res.status(201).json({
      message: "Order created successfully",
      order: result,
      stripe_client_secret: paymentIntent.client_secret,
      order_ref: result.order_ref
    });

  } catch (err) {
    console.log("[order] createOrder error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const orders = await prisma.order.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: "desc" },
      include: {
        payment: true,
      }
    });

    res.json({ data: orders });
  } catch (err) {
    console.log("[order] getOrders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const orderId = parseInt(req.params.id as string);
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      include: {
        items: {
          include: { variant: { include: { product: true } } }
        },
        payment: true
      }
    });

    if (!order || order.customer_id !== customerId) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ data: order });
  } catch (err) {
    console.log("[order] getOrderById error:", err);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
};
