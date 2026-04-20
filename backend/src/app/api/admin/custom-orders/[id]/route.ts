import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import { sendEmail } from "@/lib/email";
import {
  customOrderQuoteHtml,
  customOrderRejectedHtml,
} from "@/lib/emailTemplates/customOrder";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  action: z.enum(["quote", "reject", "notes"]),
  quotePriceCents: z.number().int().min(1).optional(),
  currency: z.string().length(3).optional(),
  quoteMessage: z.string().max(4000).optional().nullable(),
  adminNotes: z.string().max(4000).optional().nullable(),
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
  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return withCors(NextResponse.json({ error: "Invalid body" }, { status: 400 }), origin);
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  let current;
  try {
    current = await prisma.customOrderRequest.findUnique({ where: { id } });
  } catch {
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }

  if (!current) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }), origin);
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? process.env.FRONTEND_ORIGIN ?? "";

  try {
    if (body.data.action === "quote") {
      if (!body.data.quotePriceCents) {
        return withCors(
          NextResponse.json({ error: "quotePriceCents is required" }, { status: 400 }),
          origin,
        );
      }
      const updated = await prisma.customOrderRequest.update({
        where: { id },
        data: {
          quotePriceCents: body.data.quotePriceCents,
          currency: body.data.currency ?? current.currency,
          quoteMessage: body.data.quoteMessage ?? null,
          status: "QUOTED",
          quotedAt: new Date(),
        },
      });

      try {
        await sendEmail(
          updated.email,
          "Ponudba za vaše naročilo po meri — PravoLes",
          customOrderQuoteHtml({
            name: updated.name,
            priceCents: updated.quotePriceCents ?? 0,
            currency: updated.currency,
            message: updated.quoteMessage ?? null,
            accountUrl: baseUrl ? `${baseUrl}/?orders=custom` : null,
          }),
        );
      } catch (emailErr) {
        console.error("[custom-orders] quote email failed:", emailErr);
      }

      return withCors(NextResponse.json({ request: updated }), origin);
    }

    if (body.data.action === "reject") {
      const updated = await prisma.customOrderRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNotes: body.data.adminNotes ?? current.adminNotes,
          quoteMessage: body.data.quoteMessage ?? null,
          rejectedAt: new Date(),
        },
      });

      try {
        await sendEmail(
          updated.email,
          "Vaše naročilo po meri — PravoLes",
          customOrderRejectedHtml({
            name: updated.name,
            message: updated.quoteMessage ?? null,
          }),
        );
      } catch (emailErr) {
        console.error("[custom-orders] reject email failed:", emailErr);
      }

      return withCors(NextResponse.json({ request: updated }), origin);
    }

    const updated = await prisma.customOrderRequest.update({
      where: { id },
      data: {
        adminNotes: body.data.adminNotes ?? current.adminNotes,
      },
    });
    return withCors(NextResponse.json({ request: updated }), origin);
  } catch {
    return withCors(NextResponse.json({ error: "DB unavailable" }, { status: 503 }), origin);
  }
}
