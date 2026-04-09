import { NextResponse } from "next/server";

import { getOrCreateCartId } from "@/lib/cart";
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
  let cartId;
  try {
    cartId = await getOrCreateCartId();
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  let cart;
  try {
    cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  if (!cart) {
    return NextResponse.json({ error: "Cart not found" }, { status: 404 });
  }

  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const currency = cart.items[0].product.currency ?? "EUR";
  const totalCents = cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.qty,
    0,
  );

  let order;
  try {
    order = await prisma.order.create({
      data: {
        cartId: cart.id,
        totalCents,
        currency,
        status: "PENDING",
        customerEmail: cart.email ?? null,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            title: item.product.title,
            description: item.product.description,
            image: item.product.image,
            alt: item.product.alt,
            priceCents: item.product.priceCents,
            qty: item.qty,
          })),
        },
        payment: {
          create: {
            status: "REQUIRES_ACTION",
          },
        },
      },
      include: { payment: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.items.map((item) => ({
        quantity: item.qty,
        price_data: {
          currency: item.product.currency ?? currency,
          unit_amount: item.product.priceCents,
          product_data: {
            name: item.product.title,
            description: item.product.description,
          },
        },
      })),
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      customer_email: cart.email ?? undefined,
      metadata: {
        orderId: order.id,
        cartId: cart.id,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 502 },
    );
  }

  try {
    await prisma.payment.update({
      where: { id: order.payment!.id },
      data: { stripeSessionId: session.id },
    });

    await prisma.cart.update({
      where: { id: cart.id },
      data: { status: "CHECKED_OUT" },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ url: session.url });
}
