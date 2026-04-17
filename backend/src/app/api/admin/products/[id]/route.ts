import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import { clampDiscountPercent, discountPercentFromSalePriceCents, salePriceCentsFromDiscountPercent } from "@/lib/pricing";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().min(1).max(2000).trim().optional(),
  image: z.string().min(1).max(500).trim().optional(),
  alt: z.string().min(1).max(300).trim().optional(),
  priceCents: z.number().int().min(1).optional(),
  discountPercent: z.number().int().min(0).max(99).optional(),
  salePriceCents: z.number().int().min(1).nullable().optional(),
  currency: z.string().length(3).optional(),
  active: z.boolean().optional(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = updateSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    const needsPricing =
      body.data.priceCents !== undefined ||
      body.data.discountPercent !== undefined ||
      body.data.salePriceCents !== undefined;

    let data = body.data;
    if (needsPricing) {
      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
      }

      const base = body.data.priceCents ?? existing.priceCents;
      let nextSale: number | null | undefined = body.data.salePriceCents;
      let nextPct: number | undefined = body.data.discountPercent;

      if (nextSale !== undefined) {
        // Explicit sale price wins; null/invalid => remove discount.
        if (nextSale === null || nextSale >= base) {
          nextSale = null;
          nextPct = 0;
        } else {
          nextPct = discountPercentFromSalePriceCents(base, nextSale);
        }
      } else if (nextPct !== undefined) {
        nextPct = clampDiscountPercent(nextPct);
        if (nextPct <= 0) {
          nextPct = 0;
          nextSale = null;
        } else {
          nextSale = salePriceCentsFromDiscountPercent(base, nextPct);
        }
      } else if (body.data.priceCents !== undefined) {
        // Only base price changed: keep whichever mode was previously in use.
        if (existing.salePriceCents != null && existing.salePriceCents < base) {
          nextSale = existing.salePriceCents;
          nextPct = discountPercentFromSalePriceCents(base, nextSale);
        } else {
          const pct = clampDiscountPercent(existing.discountPercent ?? 0);
          nextPct = pct;
          nextSale = pct > 0 ? salePriceCentsFromDiscountPercent(base, pct) : null;
        }
      }

      data = {
        ...body.data,
        discountPercent: nextPct ?? existing.discountPercent,
        salePriceCents: nextSale ?? null,
      };
    }

    const product = await prisma.product.update({ where: { id }, data });
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
    return withCors(
      NextResponse.json({ error: "Not found or DB unavailable" }, { status: 404 }),
      origin,
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let prisma;
  try { prisma = getPrisma(); } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  try {
    await prisma.product.update({ where: { id }, data: { active: false } });
    return withCors(NextResponse.json({ ok: true }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "Not found or DB unavailable" }, { status: 404 }), origin);
  }
}
