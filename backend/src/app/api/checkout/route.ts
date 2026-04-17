import { NextResponse } from "next/server";

import { getOrCreateCartId } from "@/lib/cart";
import { effectivePriceCents } from "@/lib/pricing";
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
    cartId = await getOrCreateCartId(req.headers);
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
          include: { product: true, variant: true },
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

  if (!cart.checkoutStartedAt) {
    try {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { checkoutStartedAt: new Date() },
      });
    } catch {
      // best-effort
    }
  }

  // Validate stock + variant consistency before charging
  for (const item of cart.items) {
    if (item.variant) {
      if (!item.variant.active || item.variant.productId !== item.productId) {
        return NextResponse.json({ error: "Cart contains an invalid variant" }, { status: 400 });
      }
      if (item.qty > item.variant.stock) {
        return NextResponse.json(
          { error: `Not enough stock for ${item.product.title}` },
          { status: 400 },
        );
      }
    }
  }

  const currency = cart.items[0].product.currency ?? "EUR";
  const pricedItems = cart.items.map((item) => {
    const variantLabel = item.variant
      ? [item.variant.wood, item.variant.size, item.variant.color].filter(Boolean).join(", ")
      : null;
    return {
      ...item,
      unitPriceCents: item.variant?.priceCents ?? effectivePriceCents(item.product),
      variantLabel,
    };
  });

  const totalCents = pricedItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.qty,
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
          create: pricedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            title: item.product.title,
            description: item.product.description,
            image: item.product.image,
            alt: item.product.alt,
            priceCents: item.unitPriceCents,
            qty: item.qty,
            variantColor: item.variant?.color ?? null,
            variantSize: item.variant?.size ?? null,
            variantWood: item.variant?.wood ?? null,
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

  // Do not trust the Host header — Stripe success/cancel URLs must come from a trusted env.
  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.FRONTEND_ORIGIN;
  if (!origin || !/^https?:\/\//.test(origin)) {
    return NextResponse.json(
      { error: "Server is not configured (missing base URL)" },
      { status: 500 },
    );
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: pricedItems.map((item) => ({
        quantity: item.qty,
        price_data: {
          currency: item.product.currency ?? currency,
          unit_amount: item.unitPriceCents,
          product_data: {
            name: item.variantLabel
              ? `${item.product.title} — ${item.variantLabel}`
              : item.product.title,
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
