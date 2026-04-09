import { NextResponse } from "next/server";

import getPrisma from "@/lib/prisma";
import getStripe from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 500 },
    );
  }
  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 },
    );
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = (session.metadata?.orderId as string | undefined) ?? null;
      const paymentIntent =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      if (!orderId) break;

      await prisma.order.updateMany({
        where: { id: orderId },
        data: {
          status: "PAID",
        },
      });

      await prisma.payment.updateMany({
        where: { stripeSessionId: session.id },
        data: {
          status: "SUCCEEDED",
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
          stripePaymentIntentId: paymentIntent,
        },
      });
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = (session.metadata?.orderId as string | undefined) ?? null;
      if (!orderId) break;
      await prisma.order.updateMany({
        where: { id: orderId },
        data: { status: "CANCELED" },
      });
      await prisma.payment.updateMany({
        where: { stripeSessionId: session.id },
        data: { status: "FAILED" },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
