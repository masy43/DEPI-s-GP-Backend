import { RequestHandler } from "express";
import { Request, Response } from "express";
import prisma from "../config/prisma";
import { stripe } from "../config/stripe";

export const confirmPayment: RequestHandler = async (req, res) => {
  try {
    const { payment_intent_id } = req.body;
    if (!payment_intent_id) {
      return res.status(400).json({ error: "payment_intent_id is required" });
    }

    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (!intent) {
      return res.status(404).json({ error: "Payment intent not found in Stripe" });
    }

    const paymentRecord = await prisma.payment.findUnique({
      where: { stripe_intent_id: payment_intent_id },
      include: { order: true }
    });

    if (!paymentRecord) {
      return res.status(404).json({ error: "Payment record not found in database" });
    }

    let status = paymentRecord.status;
    let orderStatus = paymentRecord.order.status;

    if (intent.status === 'succeeded') {
      status = 'succeeded';
      orderStatus = 'paid';
    } else if (intent.status === 'requires_payment_method' || intent.status === 'canceled') {
      status = 'failed';
      orderStatus = 'cancelled';
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { payment_id: paymentRecord.payment_id },
        data: { status }
      });

      await tx.order.update({
        where: { order_id: paymentRecord.order_id },
        data: { status: orderStatus }
      });
    });

    res.json({ message: "Payment status updated", data: { payment_status: status, order_status: orderStatus } });

  } catch (err) {
    console.log("[payment] confirmPayment error:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
};
