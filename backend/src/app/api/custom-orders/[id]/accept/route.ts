import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import getStripe from "@/lib/stripe";

export const dynamic = "force-dynamic";

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const { id } = await params;

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is not configured" }, { status: 500 }),
      origin,
    );
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return withCors(
      NextResponse.json({ error: "Stripe is not configured" }, { status: 500 }),
      origin,
    );
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  if (!user) {
    return withCors(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      origin,
    );
  }

  let request;
  try {
    request = await prisma.customOrderRequest.findUnique({
      where: { id },
      include: { payment: true },
    });
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  if (!request) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
  }

  const ownsRequest =
    (request.userId && request.userId === user.id) ||
    request.email.toLowerCase() === user.email.toLowerCase();

  if (!ownsRequest) {
    return withCors(NextResponse.json({ error: "Forbidden" }, { status: 403 }), origin);
  }

  if (request.status !== "QUOTED" && request.status !== "ACCEPTED") {
    return withCors(
      NextResponse.json({ error: "Request is not ready for payment." }, { status: 400 }),
      origin,
    );
  }

  if (!request.quotePriceCents || request.quotePriceCents < 1) {
    return withCors(
      NextResponse.json({ error: "No quote price set." }, { status: 400 }),
      origin,
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.FRONTEND_ORIGIN;
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    return withCors(
      NextResponse.json({ error: "Server is not configured (missing base URL)" }, { status: 500 }),
      origin,
    );
  }

  let payment = request.payment;
  try {
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          status: "REQUIRES_ACTION",
          customOrderId: request.id,
        },
      });
    }
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: request.currency.toLowerCase(),
            unit_amount: request.quotePriceCents,
            product_data: {
              name: `Naročilo po meri — ${request.name}`,
              description: request.description.slice(0, 200),
            },
          },
        },
      ],
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      customer_email: request.email,
      metadata: {
        customOrderId: request.id,
      },
    });
  } catch {
    return withCors(
      NextResponse.json({ error: "Stripe checkout failed" }, { status: 502 }),
      origin,
    );
  }

  try {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: session.id },
    });
    await prisma.customOrderRequest.update({
      where: { id: request.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: request.acceptedAt ?? new Date(),
      },
    });
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  return withCors(NextResponse.json({ url: session.url }), origin);
}
