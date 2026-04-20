import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";
import { checkRateLimitDetailed, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const fieldsSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  email: z.string().email().max(200).trim(),
  phone: z.string().max(60).trim().optional().nullable(),
  description: z.string().min(5).max(4000).trim(),
  dimensions: z.string().max(500).trim().optional().nullable(),
  website: z.string().max(200).optional().nullable(),
});

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

async function parseFormData(req: Request) {
  const formData = await req.formData();
  const fields = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: formData.get("phone") ? String(formData.get("phone")) : null,
    description: String(formData.get("description") ?? ""),
    dimensions: formData.get("dimensions") ? String(formData.get("dimensions")) : null,
    website: formData.get("website") ? String(formData.get("website")) : null,
  };

  const images: File[] = [];
  for (const entry of formData.getAll("images")) {
    if (entry instanceof File && entry.size > 0) images.push(entry);
  }
  return { fields, images };
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  const ip = getClientIp(req);
  const limit = checkRateLimitDetailed(`custom-orders:${ip}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    const res = NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
    res.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return withCors(res, origin);
  }

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is not configured" }, { status: 500 }),
      origin,
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let rawFields: Record<string, unknown>;
  let images: File[] = [];
  if (contentType.includes("multipart/form-data")) {
    try {
      const parsed = await parseFormData(req);
      rawFields = parsed.fields;
      images = parsed.images;
    } catch {
      return withCors(
        NextResponse.json({ error: "Invalid form data" }, { status: 400 }),
        origin,
      );
    }
  } else {
    rawFields = (await req.json().catch(() => null)) as Record<string, unknown>;
  }

  const body = fieldsSchema.safeParse(rawFields);
  if (!body.success) {
    return withCors(
      NextResponse.json({ error: "Invalid body" }, { status: 400 }),
      origin,
    );
  }

  if (body.data.website?.trim()) {
    return withCors(NextResponse.json({ ok: true }), origin);
  }

  if (images.length > MAX_IMAGES) {
    return withCors(
      NextResponse.json({ error: `Največ ${MAX_IMAGES} slik.` }, { status: 400 }),
      origin,
    );
  }

  for (const file of images) {
    if (file.size > MAX_IMAGE_BYTES) {
      return withCors(
        NextResponse.json({ error: "Slika presega 5 MB." }, { status: 400 }),
        origin,
      );
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return withCors(
        NextResponse.json({ error: "Nepodprta vrsta slike." }, { status: 400 }),
        origin,
      );
    }
  }

  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // guests allowed
  }

  let created;
  try {
    created = await prisma.customOrderRequest.create({
      data: {
        name: body.data.name,
        email: body.data.email,
        phone: body.data.phone ?? null,
        description: body.data.description,
        dimensions: body.data.dimensions ?? null,
        userId: user?.id ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("no such table") || message.includes("customOrderRequest")) {
      return withCors(
        NextResponse.json(
          { error: "Database schema is out of date. Run prisma migrate/generate and restart the server." },
          { status: 500 },
        ),
        origin,
      );
    }
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }

  if (images.length > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "custom-orders", created.id);
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch {
      return withCors(
        NextResponse.json({ error: "Storage is unavailable" }, { status: 503 }),
        origin,
      );
    }

    for (const file of images) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = (file.type.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 10) || "bin";
      const fileName = `${crypto.randomBytes(10).toString("hex")}.${ext}`;
      const diskPath = path.join(uploadsDir, fileName);
      try {
        await fs.writeFile(diskPath, buffer);
      } catch {
        continue;
      }
      try {
        await prisma.customOrderImage.create({
          data: {
            requestId: created.id,
            path: `/uploads/custom-orders/${created.id}/${fileName}`,
            mimeType: file.type,
            sizeBytes: file.size,
          },
        });
      } catch {
        try {
          await fs.unlink(diskPath);
        } catch {
          // ignore
        }
      }
    }
  }

  return withCors(NextResponse.json({ ok: true, id: created.id }), origin);
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is not configured" }, { status: 500 }),
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

  try {
    const requests = await prisma.customOrderRequest.findMany({
      where: {
        OR: [{ userId: user.id }, { email: user.email }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        images: { select: { id: true, path: true, mimeType: true } },
        payment: true,
      },
    });

    return withCors(NextResponse.json({ requests }), origin);
  } catch {
    return withCors(
      NextResponse.json({ error: "Database is unavailable" }, { status: 503 }),
      origin,
    );
  }
}
