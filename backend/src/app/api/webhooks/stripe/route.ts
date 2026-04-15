import { NextResponse } from "next/server";

import { sendEmail, orderConfirmationHtml } from "@/lib/email";
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

  // Idempotency: atomically claim this event id. If it already exists, skip.
  try {
    await prisma.webhookEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    // Duplicate delivery — acknowledge without reprocessing.
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = (session.metadata?.orderId as string | undefined) ?? null;
      const paymentIntent =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      if (!orderId) break;

      try {
        await prisma.order.updateMany({
          where: { id: orderId },
          data: { status: "PAID" },
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
      } catch {
        return NextResponse.json(
          { error: "Database is unavailable" },
          { status: 503 },
        );
      }

      // Send order confirmation email
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
        if (order?.customerEmail) {
          await sendEmail(
            order.customerEmail,
            "Potrdilo naročila — PravoLes",
            orderConfirmationHtml({
              email: order.customerEmail,
              orderId: order.id,
              items: order.items.map((i) => ({
                title: i.title,
                qty: i.qty,
                priceCents: i.priceCents,
              })),
              totalCents: order.totalCents,
              currency: order.currency,
            }),
          );
        }
      } catch (emailErr) {
        // Email failure must not affect webhook response
        console.error("[webhook] order email failed:", emailErr);
      }

      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = (session.metadata?.orderId as string | undefined) ?? null;
      if (!orderId) break;
      try {
        await prisma.order.updateMany({
          where: { id: orderId },
          data: { status: "CANCELED" },
        });
        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: "FAILED" },
        });
      } catch {
        return NextResponse.json(
          { error: "Database is unavailable" },
          { status: 503 },
        );
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
