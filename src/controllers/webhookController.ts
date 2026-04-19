import { Request, Response } from "express";
import prisma from "../config/prisma";
import { stripe } from "../config/stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!WEBHOOK_SECRET) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set — webhook validation skipped");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;
  try {
    // req.body must be the raw Buffer (set by express.raw() in webhookRoutes)
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as { id: string };
      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { stripe_intent_id: intent.id },
        });
        if (!payment) return; // no matching record — ignore

        await tx.payment.update({
          where: { payment_id: payment.payment_id },
          data: { status: "succeeded" },
        });
        await tx.order.update({
          where: { order_id: payment.order_id },
          data: { status: "paid" },
        });
      });
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as { id: string };
      const payment = await prisma.payment.findUnique({
        where: { stripe_intent_id: intent.id },
      });
      if (payment) {
        await prisma.payment.update({
          where: { payment_id: payment.payment_id },
          data: { status: "failed" },
        });
      }
    }
    // Other event types are acknowledge but not handled
  } catch (err) {
    console.error("[webhook] Error processing Stripe event:", err);
    // Still return 200 to Stripe so it doesn't keep retrying for non-critical errors
  }

  res.json({ received: true });
};
