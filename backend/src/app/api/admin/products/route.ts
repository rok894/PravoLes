import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import { clampDiscountPercent, discountPercentFromSalePriceCents, salePriceCentsFromDiscountPercent } from "@/lib/pricing";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(2000).trim(),
  image: z.string().min(1).max(500).trim(),
  alt: z.string().min(1).max(300).trim(),
  priceCents: z.number().int().min(1),
  discountPercent: z.number().int().min(0).max(99).default(0),
  salePriceCents: z.number().int().min(1).nullable().optional(),
  currency: z.string().length(3).default("EUR"),
  active: z.boolean().default(true),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  return withCors(NextResponse.json({ products }), origin);
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const base = body.data.priceCents;
    let sale = body.data.salePriceCents ?? null;
    let pct = clampDiscountPercent(body.data.discountPercent);

    if (sale != null) {
      if (sale >= base) {
        sale = null;
        pct = 0;
      } else {
        pct = discountPercentFromSalePriceCents(base, sale);
      }
    } else {
      if (pct <= 0) {
        sale = null;
        pct = 0;
      } else {
        sale = salePriceCentsFromDiscountPercent(base, pct);
      }
    }

    const product = await prisma.product.create({
      data: {
        ...body.data,
        discountPercent: pct,
        salePriceCents: sale,
      },
    });
    return withCors(NextResponse.json({ product }), origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("no such column") ||
      message.includes("Unknown argument") ||
      message.includes("discountPercent")
    ) {
      return withCors(
        NextResponse.json(
          { error: "Database schema is out of date. Run prisma migrate/generate and restart the server." },
          { status: 500 },
        ),
        origin,
      );
    }
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }
}
