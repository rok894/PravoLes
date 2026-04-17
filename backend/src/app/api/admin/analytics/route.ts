import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { corsPreflight, withCors } from "@/lib/cors";
import getPrisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Granularity = "day" | "week" | "month";

function bucketKey(d: Date, g: Granularity): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  if (g === "month") return `${y}-${m}`;
  if (g === "week") {
    // ISO week start (Monday) in UTC
    const copy = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
    const weekday = (copy.getUTCDay() + 6) % 7;
    copy.setUTCDate(copy.getUTCDate() - weekday);
    const wy = copy.getUTCFullYear();
    const wm = String(copy.getUTCMonth() + 1).padStart(2, "0");
    const wd = String(copy.getUTCDate()).padStart(2, "0");
    return `${wy}-${wm}-${wd}`;
  }
  return `${y}-${m}-${day}`;
}

function enumerateBuckets(since: Date, until: Date, g: Granularity): string[] {
  const out: string[] = [];
  const cur = new Date(since);
  if (g === "day") {
    cur.setUTCHours(0, 0, 0, 0);
    while (cur <= until) {
      out.push(bucketKey(cur, g));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (g === "week") {
    cur.setUTCHours(0, 0, 0, 0);
    const weekday = (cur.getUTCDay() + 6) % 7;
    cur.setUTCDate(cur.getUTCDate() - weekday);
    while (cur <= until) {
      out.push(bucketKey(cur, g));
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
  } else {
    cur.setUTCDate(1);
    cur.setUTCHours(0, 0, 0, 0);
    while (cur <= until) {
      out.push(bucketKey(cur, g));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }
  return out;
}

export function OPTIONS(req: Request) {
  return corsPreflight(req.headers.get("origin"));
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const guard = await requireAdmin(origin);
  if (!guard.ok) return guard.response;

  let prisma;
  try {
    prisma = getPrisma();
  } catch {
    return withCors(NextResponse.json({ error: "DB not configured" }, { status: 500 }), origin);
  }

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 1), 365);
  const granularityParam = (url.searchParams.get("granularity") ?? "day").toLowerCase();
  const granularity: Granularity =
    granularityParam === "week" || granularityParam === "month" ? granularityParam : "day";
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    const [visits, carts, paidOrders] = await Promise.all([
      prisma.visit.findMany({
        where: { createdAt: { gte: since } },
        select: {
          createdAt: true,
          source: true,
          sessionId: true,
          path: true,
          device: true,
          country: true,
        },
      }),
      prisma.cart.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          createdAt: true,
          source: true,
          sessionId: true,
          checkoutStartedAt: true,
          items: { select: { id: true } },
          order: { select: { id: true, status: true } },
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: since }, status: "PAID" },
        select: {
          createdAt: true,
          totalCents: true,
          currency: true,
          cart: { select: { source: true } },
          items: {
            select: { productId: true, title: true, qty: true, priceCents: true },
          },
        },
      }),
    ]);

    // Sales over time
    const buckets = enumerateBuckets(since, now, granularity);
    const salesMap = new Map<string, { orderCount: number; revenueCents: number }>();
    for (const b of buckets) salesMap.set(b, { orderCount: 0, revenueCents: 0 });
    let totalCents = 0;
    for (const o of paidOrders) {
      const key = bucketKey(new Date(o.createdAt), granularity);
      const row = salesMap.get(key) ?? { orderCount: 0, revenueCents: 0 };
      row.orderCount += 1;
      row.revenueCents += o.totalCents;
      salesMap.set(key, row);
      totalCents += o.totalCents;
    }
    const salesSeries = buckets.map((b) => ({
      bucket: b,
      orderCount: salesMap.get(b)!.orderCount,
      revenueCents: salesMap.get(b)!.revenueCents,
    }));
    const orderCount = paidOrders.length;
    const avgOrderCents = orderCount > 0 ? Math.round(totalCents / orderCount) : 0;
    const currency = paidOrders[0]?.currency ?? "EUR";

    // Top products
    const productAgg = new Map<string, { title: string; qty: number; revenueCents: number }>();
    for (const o of paidOrders) {
      for (const it of o.items) {
        const key = it.productId ?? `t:${it.title}`;
        const prev = productAgg.get(key) ?? { title: it.title, qty: 0, revenueCents: 0 };
        prev.qty += it.qty;
        prev.revenueCents += it.qty * it.priceCents;
        productAgg.set(key, prev);
      }
    }
    const topProducts = [...productAgg.entries()]
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10);

    // Conversion by source
    const sourceAgg = new Map<
      string,
      { visits: number; carts: number; paidOrders: number; revenueCents: number }
    >();
    const ensure = (s: string) => {
      let v = sourceAgg.get(s);
      if (!v) {
        v = { visits: 0, carts: 0, paidOrders: 0, revenueCents: 0 };
        sourceAgg.set(s, v);
      }
      return v;
    };
    // Visits per source (by session, to avoid overcounting page views)
    const sessionSource = new Map<string, string>();
    for (const v of visits) {
      if (v.sessionId && !sessionSource.has(v.sessionId)) {
        sessionSource.set(v.sessionId, v.source);
      }
    }
    // count unique sessions per source, plus anonymous visits per source
    const sessionsCountedPerSource = new Map<string, number>();
    for (const s of sessionSource.values()) {
      sessionsCountedPerSource.set(s, (sessionsCountedPerSource.get(s) ?? 0) + 1);
    }
    for (const v of visits) {
      if (!v.sessionId) {
        ensure(v.source).visits += 1;
      }
    }
    for (const [s, count] of sessionsCountedPerSource) {
      ensure(s).visits += count;
    }
    for (const c of carts) {
      if (c.items.length > 0) {
        const src = c.source ?? "direct";
        ensure(src).carts += 1;
      }
    }
    for (const o of paidOrders) {
      const src = o.cart?.source ?? "direct";
      const bucket = ensure(src);
      bucket.paidOrders += 1;
      bucket.revenueCents += o.totalCents;
    }
    const conversionBySource = [...sourceAgg.entries()]
      .map(([source, v]) => ({
        source,
        ...v,
        conversionPct: v.visits > 0 ? (v.paidOrders / v.visits) * 100 : 0,
      }))
      .sort((a, b) => b.visits - a.visits);

    // Funnel
    const totalVisits = visits.length;
    const cartsWithItems = carts.filter((c) => c.items.length > 0).length;
    const checkoutStarted = carts.filter((c) => c.checkoutStartedAt != null).length;
    const paid = paidOrders.length;
    const funnel = {
      visits: totalVisits,
      cartsWithItems,
      checkoutStarted,
      paid,
    };

    // Landing pages: first visit per session (path)
    const landingMap = new Map<string, number>();
    const sessionSeen = new Set<string>();
    // Assume visits are not sorted — sort ascending by date
    const sortedVisits = [...visits].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    for (const v of sortedVisits) {
      const key = v.path ?? "/";
      if (v.sessionId) {
        if (sessionSeen.has(v.sessionId)) continue;
        sessionSeen.add(v.sessionId);
      }
      landingMap.set(key, (landingMap.get(key) ?? 0) + 1);
    }
    const landingPages = [...landingMap.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Geo + device
    const geoMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    for (const v of visits) {
      const c = v.country ?? "unknown";
      geoMap.set(c, (geoMap.get(c) ?? 0) + 1);
      const d = v.device ?? "unknown";
      deviceMap.set(d, (deviceMap.get(d) ?? 0) + 1);
    }
    const geo = [...geoMap.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const device = [...deviceMap.entries()]
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);

    return withCors(
      NextResponse.json({
        days,
        granularity,
        sales: {
          series: salesSeries,
          totalCents,
          orderCount,
          avgOrderCents,
          currency,
        },
        topProducts,
        conversionBySource,
        funnel,
        landingPages,
        geo,
        device,
      }),
      origin,
    );
  } catch (err) {
    console.error("[analytics] error:", String(err));
    return withCors(
      NextResponse.json({ error: "Analytics query failed" }, { status: 500 }),
      origin,
    );
  }
}
