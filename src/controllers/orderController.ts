import { RequestHandler } from "express";
import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { stripe } from "../config/stripe";

export const createOrder: RequestHandler = async (req, res) => {
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
        return res.status(400).json({ error: `Not enough stock for variant ${item.variant_id}. Available: ${item.variant.stock}` });
      }
      subtotal += Number(item.variant.price) * item.quantity;
    }

    const shipping = 50.00;
    const tax = subtotal * 0.14;
    const total = subtotal + shipping + tax;

    // Run DB work first — create order, atomically decrement stock (race-safe), clear cart
    const newOrder = await prisma.$transaction(async (tx) => {
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

        // Atomic decrement with a guard — prevents stock going negative under concurrency
        const updated = await tx.product_Variant.updateMany({
          where: {
            variant_id: item.variant_id,
            stock: { gte: item.quantity }
          },
          data: { stock: { decrement: item.quantity } }
        });

        if (updated.count === 0) {
          throw new Error(`Stock for variant ${item.variant_id} was depleted by a concurrent order.`);
        }
      }

      await tx.cart_Item.deleteMany({ where: { cart_id: cart.cart_id } });

      return order;
    });

    // Only call Stripe after a successful DB commit
    let paymentIntent;
    const amountInCents = Math.round(Number(total.toString()) * 100);
    console.log("Creating Payment Intent with amount:", amountInCents);

    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: "usd",
        metadata: { customerId: customerId.toString(), orderId: newOrder.order_id.toString() }
      });
    } catch (stripeErr: any) {
      console.error("[order] Stripe API error:", stripeErr.message || stripeErr);
      // Order exists in DB without a Payment record yet. Client can retry payment separately.
      return res.status(202).json({
        message: "Order placed but payment setup failed. Please retry payment.",
        order: newOrder,
        stripe_client_secret: null,
        order_ref: newOrder.order_ref,
        stripe_error: stripeErr.message || "Unknown Stripe error"
      });
    }

    // Now attach the payment record to the committed order
    await prisma.payment.create({
      data: {
        order_id: newOrder.order_id,
        stripe_intent_id: paymentIntent.id,
        amount: total
      }
    });

    res.status(200).json({
      message: "Order created successfully",
      order: newOrder,
      stripe_client_secret: paymentIntent.client_secret,
      order_ref: newOrder.order_ref
    });

  } catch (err: any) {
    if (err.message?.includes("depleted by a concurrent order")) {
      return res.status(409).json({ error: err.message });
    }
    console.log("[order] createOrder error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

export const getOrders: RequestHandler = async (req, res) => {
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

export const getOrderById: RequestHandler = async (req, res) => {
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
