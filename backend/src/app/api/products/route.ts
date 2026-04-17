import { NextResponse } from "next/server";

import { publicProduct } from "@/lib/pricing";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 500 },
    );
  }
  let products;
  try {
    products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      include: {
        variants: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            color: true,
            size: true,
            wood: true,
            priceCents: true,
            stock: true,
          },
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  const out = products.map((p) => {
    const base = publicProduct(p);
    const variants = p.variants ?? [];
    if (variants.length === 0) {
      return { ...base, variants: [], priceFromCents: base.priceCents };
    }
    const prices = variants.map((v) => v.priceCents);
    const priceFrom = Math.min(...prices);
    return {
      ...base,
      priceFromCents: priceFrom,
      variants,
    };
  });

  return NextResponse.json({ products: out });
}
