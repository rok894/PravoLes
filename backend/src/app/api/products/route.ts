import { NextResponse } from "next/server";

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
    });
  } catch {
    return NextResponse.json(
      { error: "Database is unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ products });
}
