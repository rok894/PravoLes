"use client";

import { Fragment, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";

import {
  discountPercentFromSalePriceCents,
  effectivePriceCents,
  salePriceCentsFromDiscountPercent,
} from "@/lib/pricing";

let csrfToken: string | null = null;
async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const res = await fetch("/api/csrf", { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { token?: string } | null;
  csrfToken = data?.token ?? null;
  return csrfToken;
}

async function adminFetch(input: string, init: RequestInit = {}) {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = await getCsrfToken();
    if (token) headers.set("x-csrf-token", token);
  }
  const res = await fetch(input, { ...init, credentials: "include", headers });
  if (res.status === 403 && method !== "GET") {
    csrfToken = null;
    const fresh = await getCsrfToken();
    if (fresh) {
      headers.set("x-csrf-token", fresh);
      return fetch(input, { ...init, credentials: "include", headers });
    }
  }
  return res;
}

type Product = {
  id: string;
  title: string;
  description: string;
  image: string;
  priceCents: number;
  discountPercent: number;
  salePriceCents: number | null;
  currency: string;
  active: boolean;
};

type Variant = {
  id: string;
  color: string | null;
  size: string | null;
  wood: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
};

type Message = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
};

type VisitStats = {
  days: number;
  total: number;
  sources: { source: string; count: number }[];
};

type Analytics = {
  days: number;
  granularity: "day" | "week" | "month";
  sales: {
    series: { bucket: string; orderCount: number; revenueCents: number }[];
    totalCents: number;
    orderCount: number;
    avgOrderCents: number;
    currency: string;
  };
  topProducts: { productId: string; title: string; qty: number; revenueCents: number }[];
  conversionBySource: {
    source: string;
    visits: number;
    carts: number;
    paidOrders: number;
    revenueCents: number;
    conversionPct: number;
  }[];
  funnel: {
    visits: number;
    cartsWithItems: number;
    checkoutStarted: number;
    paid: number;
  };
  landingPages: { path: string; count: number }[];
  geo: { country: string; count: number }[];
  device: { device: string; count: number }[];
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Računalnik",
  mobile: "Mobilni",
  tablet: "Tablica",
  bot: "Bot",
  unknown: "Neznano",
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Neposredno",
  link: "Druga povezava",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  reddit: "Reddit",
  google: "Google",
  search: "Iskalniki",
  email: "Email",
  other: "Ostalo",
};

const SOURCE_COLORS: Record<string, string> = {
  direct: "#7c5e45",
  link: "#a98565",
  facebook: "#1877f2",
  instagram: "#e1306c",
  tiktok: "#010101",
  youtube: "#ff0000",
  twitter: "#1da1f2",
  linkedin: "#0a66c2",
  pinterest: "#bd081c",
  reddit: "#ff4500",
  google: "#34a853",
  search: "#5f6368",
  email: "#b07a4b",
  other: "#999",
};

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [visitDays, setVisitDays] = useState(30);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [statsDays, setStatsDays] = useState(30);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [statsLoading, setStatsLoading] = useState(false);
  const [tab, setTab] = useState<"products" | "messages" | "visits" | "stats">("products");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // new product form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [newPricingMode, setNewPricingMode] = useState<"percent" | "sale">("percent");
  const [saving, setSaving] = useState(false);

  // edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editPricingMode, setEditPricingMode] = useState<"percent" | "sale">("percent");
  const [editActive, setEditActive] = useState(true);

  const [variantsOpenFor, setVariantsOpenFor] = useState<string | null>(null);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, Variant[]>>({});
  const [variantsLoading, setVariantsLoading] = useState<string | null>(null);
  const [newVColor, setNewVColor] = useState("");
  const [newVSize, setNewVSize] = useState("");
  const [newVWood, setNewVWood] = useState("");
  const [newVPrice, setNewVPrice] = useState("");
  const [newVStock, setNewVStock] = useState("0");

  function parseMoneyToCents(value: string) {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return null;
    return Math.max(1, Math.round(num * 100));
  }

  function centsToMoney(cents: number) {
    return (cents / 100).toFixed(2);
  }

  function onEditBasePriceChange(next: string) {
    setEditPrice(next);
    const base = parseMoneyToCents(next);
    if (!base) return;
    if (editPricingMode === "sale") {
      const sale = parseMoneyToCents(editSalePrice);
      if (!sale) return;
      const pct = discountPercentFromSalePriceCents(base, sale);
      setEditDiscount(String(pct));
    } else {
      const pct = Math.round(parseFloat(editDiscount) || 0);
      if (pct <= 0) {
        setEditSalePrice("");
        return;
      }
      const sale = salePriceCentsFromDiscountPercent(base, pct);
      setEditSalePrice(centsToMoney(sale));
    }
  }

  function onEditDiscountChange(next: string) {
    setEditPricingMode("percent");
    setEditDiscount(next);
    const base = parseMoneyToCents(editPrice);
    if (!base) return;
    const pct = Math.round(parseFloat(next) || 0);
    if (pct <= 0) {
      setEditSalePrice("");
      return;
    }
    const sale = salePriceCentsFromDiscountPercent(base, pct);
    setEditSalePrice(centsToMoney(sale));
  }

  function onEditSalePriceChange(next: string) {
    setEditPricingMode("sale");
    setEditSalePrice(next);
    const base = parseMoneyToCents(editPrice);
    const sale = parseMoneyToCents(next);
    if (!base || !sale) return;
    const pct = discountPercentFromSalePriceCents(base, sale);
    setEditDiscount(String(pct));
  }

  function onNewBasePriceChange(next: string) {
    setNewPrice(next);
    const base = parseMoneyToCents(next);
    if (!base) return;
    if (newPricingMode === "sale") {
      const sale = parseMoneyToCents(newSalePrice);
      if (!sale) return;
      const pct = discountPercentFromSalePriceCents(base, sale);
      setNewDiscount(String(pct));
    } else {
      const pct = Math.round(parseFloat(newDiscount) || 0);
      if (pct <= 0) {
        setNewSalePrice("");
        return;
      }
      const sale = salePriceCentsFromDiscountPercent(base, pct);
      setNewSalePrice(centsToMoney(sale));
    }
  }

  function onNewDiscountChange(next: string) {
    setNewPricingMode("percent");
    setNewDiscount(next);
    const base = parseMoneyToCents(newPrice);
    if (!base) return;
    const pct = Math.round(parseFloat(next) || 0);
    if (pct <= 0) {
      setNewSalePrice("");
      return;
    }
    const sale = salePriceCentsFromDiscountPercent(base, pct);
    setNewSalePrice(centsToMoney(sale));
  }

  function onNewSalePriceChange(next: string) {
    setNewPricingMode("sale");
    setNewSalePrice(next);
    const base = parseMoneyToCents(newPrice);
    const sale = parseMoneyToCents(next);
    if (!base || !sale) return;
    const pct = discountPercentFromSalePriceCents(base, sale);
    setNewDiscount(String(pct));
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, mRes, vRes] = await Promise.all([
        adminFetch("/api/admin/products"),
        adminFetch("/api/admin/messages"),
        adminFetch(`/api/admin/visits?days=${visitDays}`),
      ]);
      if (pRes.status === 403 || mRes.status === 403 || vRes.status === 403) {
        setError("Nimate dostopa. Prijavite se kot admin.");
        setLoading(false);
        return;
      }
      const { products } = await pRes.json();
      const { messages } = await mRes.json();
      const visitData = await vRes.json();
      setProducts(products);
      setMessages(messages);
      setVisits(visitData);
    } catch {
      setError("Napaka pri nalaganju.");
    } finally {
      setLoading(false);
    }
  }

  async function reloadStats(days: number, g: "day" | "week" | "month") {
    setStatsDays(days);
    setGranularity(g);
    setStatsLoading(true);
    try {
      const res = await adminFetch(`/api/admin/analytics?days=${days}&granularity=${g}`);
      if (res.ok) setAnalytics(await res.json());
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "stats" && !analytics && !statsLoading) {
      reloadStats(statsDays, granularity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function reloadVisits(days: number) {
    setVisitDays(days);
    try {
      const res = await adminFetch(`/api/admin/visits?days=${days}`);
      if (res.ok) setVisits(await res.json());
    } catch {
      // ignore
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(p: Product) {
    const res = await adminFetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x));
  }

  async function saveEdit(id: string) {
    const baseCents = parseMoneyToCents(editPrice);
    const saleCents = editSalePrice.trim() ? parseMoneyToCents(editSalePrice) : null;
    if (!baseCents) {
      setError("Vnesi veljavno redno ceno.");
      return;
    }
    const res = await adminFetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        priceCents: baseCents,
        discountPercent: Math.round(parseFloat(editDiscount) || 0),
        salePriceCents: saleCents,
        active: editActive,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    setProducts((prev) => prev.map((x) =>
      x.id === id
        ? { ...x, priceCents: Math.round(parseFloat(editPrice) * 100), discountPercent: Math.round(parseFloat(editDiscount) || 0), active: editActive }
        : x,
    ));
    setEditId(null);
  }

  async function addProduct(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    try {
      const baseCents = parseMoneyToCents(newPrice);
      const saleCents = newSalePrice.trim() ? parseMoneyToCents(newSalePrice) : null;
      if (!baseCents) {
        setError("Vnesi veljavno redno ceno.");
        return;
      }
      const res = await adminFetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          image: newImage,
          alt: newAlt,
          priceCents: baseCents,
          discountPercent: Math.round(parseFloat(newDiscount) || 0),
          salePriceCents: saleCents,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Shranjevanje ni uspelo.");
        return;
      }
      const { product } = await res.json();
      setProducts((prev) => [...prev, product]);
      setNewTitle(""); setNewDesc(""); setNewImage(""); setNewAlt(""); setNewPrice(""); setNewDiscount(""); setNewSalePrice("");
    } finally {
      setSaving(false);
    }
  }

  async function openVariants(productId: string) {
    if (variantsOpenFor === productId) {
      setVariantsOpenFor(null);
      return;
    }
    setVariantsOpenFor(productId);
    if (!variantsByProduct[productId]) {
      await loadVariants(productId);
    }
  }

  async function loadVariants(productId: string) {
    setVariantsLoading(productId);
    try {
      const res = await adminFetch(`/api/admin/products/${productId}/variants`);
      if (res.ok) {
        const { variants } = (await res.json()) as { variants: Variant[] };
        setVariantsByProduct((prev) => ({ ...prev, [productId]: variants }));
      }
    } finally {
      setVariantsLoading(null);
    }
  }

  async function addVariant(productId: string) {
    const priceCents = parseMoneyToCents(newVPrice);
    if (priceCents == null) {
      setError("Vnesi ceno variante.");
      return;
    }
    const stock = Math.max(0, Math.round(parseFloat(newVStock) || 0));
    const body = {
      color: newVColor.trim() || null,
      size: newVSize.trim() || null,
      wood: newVWood.trim() || null,
      priceCents,
      stock,
    };
    const res = await adminFetch(`/api/admin/products/${productId}/variants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    setNewVColor("");
    setNewVSize("");
    setNewVWood("");
    setNewVPrice("");
    setNewVStock("0");
    await loadVariants(productId);
  }

  async function patchVariant(productId: string, variantId: string, patch: Partial<Variant>) {
    const res = await adminFetch(`/api/admin/products/${productId}/variants/${variantId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Shranjevanje ni uspelo.");
      return;
    }
    setVariantsByProduct((prev) => ({
      ...prev,
      [productId]: (prev[productId] ?? []).map((v) =>
        v.id === variantId ? { ...v, ...patch } : v,
      ),
    }));
  }

  async function deleteVariant(productId: string, variantId: string) {
    if (!confirm("Izbriši varianto?")) return;
    const res = await adminFetch(`/api/admin/products/${productId}/variants/${variantId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Brisanje ni uspelo.");
      return;
    }
    await loadVariants(productId);
  }

  async function markRead(id: string) {
    await adminFetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
  }

  async function deleteMessage(id: string) {
    if (!confirm("Izbriši sporočilo?")) return;
    await adminFetch("/api/admin/messages", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f1ea", fontFamily: "Arial, sans-serif", color: "#1f1812" }}>
      <header style={{ background: "#2f2117", color: "#f7f0e7", padding: "18px 32px", display: "flex", alignItems: "center", gap: 20 }}>
        <strong style={{ fontSize: "1.2rem" }}>PravoLes Admin</strong>
        <Link href="/" style={{ color: "#c8a882", fontSize: "0.85rem", marginLeft: "auto" }}>
          ← Nazaj na stran
        </Link>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        {loading ? (
          <p>Nalaganje…</p>
        ) : error ? (
          <div style={{ background: "#ffe0e0", border: "1px solid #f0a0a0", borderRadius: 10, padding: "16px 20px", color: "#8b2020" }}>
            {error} — <a href={process.env.NEXT_PUBLIC_FRONTEND_URL ?? "/"} style={{ color: "#8b2020" }}>Pojdi na prijavo</a>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              <button
                onClick={() => setTab("products")}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ccc", background: tab === "products" ? "#2f2117" : "#fff", color: tab === "products" ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontWeight: 700 }}
              >
                Izdelki ({products.length})
              </button>
              <button
                onClick={() => setTab("messages")}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ccc", background: tab === "messages" ? "#2f2117" : "#fff", color: tab === "messages" ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontWeight: 700 }}
              >
                Sporočila {unread > 0 && <span style={{ background: "#c0392b", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: "0.75rem", marginLeft: 4 }}>{unread}</span>}
              </button>
              <button
                onClick={() => setTab("visits")}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ccc", background: tab === "visits" ? "#2f2117" : "#fff", color: tab === "visits" ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontWeight: 700 }}
              >
                Obiski {visits ? `(${visits.total})` : ""}
              </button>
              <button
                onClick={() => setTab("stats")}
                style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ccc", background: tab === "stats" ? "#2f2117" : "#fff", color: tab === "stats" ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontWeight: 700 }}
              >
                Statistika
              </button>
            </div>

            {tab === "products" && (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 36 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #c8a882", textAlign: "left", fontSize: "0.82rem", color: "#7c5e45" }}>
                      <th style={{ padding: "8px 10px" }}>Naziv</th>
                      <th style={{ padding: "8px 10px" }}>Cena</th>
                      <th style={{ padding: "8px 10px" }}>Akcijska cena</th>
                      <th style={{ padding: "8px 10px" }}>Popust</th>
                      <th style={{ padding: "8px 10px" }}>Status</th>
                      <th style={{ padding: "8px 10px" }}>Akcija</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <Fragment key={p.id}>
                      <tr style={{ borderBottom: "1px solid #e4d2bf", opacity: p.active ? 1 : 0.5 }}>
                        <td style={{ padding: "10px 10px" }}>{p.title}</td>
                        <td style={{ padding: "10px 10px" }}>
                          {editId === p.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => onEditBasePriceChange(e.target.value)}
                              style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }}
                            />
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
                              <span style={{ fontWeight: 800, color: "#2f2117" }}>
                                {fmt(effectivePriceCents(p), p.currency)}
                              </span>
                              {p.discountPercent > 0 ? (
                                <span style={{ color: "#7c5e45", textDecoration: "line-through", fontSize: "0.9rem" }}>
                                  {fmt(p.priceCents, p.currency)}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 10px" }}>
                          {editId === p.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editSalePrice}
                              onChange={(e) => onEditSalePriceChange(e.target.value)}
                              placeholder="â€”"
                              style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }}
                            />
                          ) : p.discountPercent > 0 ? (
                            fmt(effectivePriceCents(p), p.currency)
                          ) : (
                            <span style={{ color: "#7c5e45", fontSize: "0.82rem" }}>â€”</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 10px" }}>
                          {editId === p.id ? (
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="99"
                              value={editDiscount}
                              onChange={(e) => onEditDiscountChange(e.target.value)}
                              style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }}
                            />
                          ) : p.discountPercent > 0 ? (
                            <span style={{ background: "rgba(176,80,58,0.12)", color: "#b0503a", border: "1px solid rgba(176,80,58,0.24)", padding: "1px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 800 }}>
                              -{p.discountPercent}%
                            </span>
                          ) : (
                            <span style={{ color: "#7c5e45", fontSize: "0.82rem" }}>â€”</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 10px" }}>
                          {editId === p.id ? (
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                              Aktiven
                            </label>
                          ) : (
                            <span style={{ background: p.active ? "rgba(60,120,60,0.12)" : "#f0e0e0", color: p.active ? "#2d6a2d" : "#8b2020", padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
                              {p.active ? "Aktiven" : "Skrit"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "10px 10px", display: "flex", gap: 6 }}>
                          {editId === p.id ? (
                            <>
                              <button onClick={() => saveEdit(p.id)} style={{ padding: "4px 12px", borderRadius: 6, background: "#2f2117", color: "#f7f0e7", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Shrani</button>
                              <button onClick={() => setEditId(null)} style={{ padding: "4px 12px", borderRadius: 6, background: "#e4d2bf", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Prekliči</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                const base = Math.max(1, Math.trunc(p.priceCents));
                                const sale = effectivePriceCents(p);
                                const pct = sale < base ? discountPercentFromSalePriceCents(base, sale) : 0;
                                setEditPricingMode("percent");
                                setEditId(p.id);
                                setEditPrice((base / 100).toFixed(2));
                                setEditDiscount(String(pct));
                                setEditSalePrice(pct > 0 ? centsToMoney(sale) : "");
                                setEditActive(p.active);
                              }} style={{ padding: "4px 12px", borderRadius: 6, background: "#c8a882", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Uredi</button>
                              <button onClick={() => toggleActive(p)} style={{ padding: "4px 12px", borderRadius: 6, background: p.active ? "#f0e0e0" : "#d0eed0", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>
                                {p.active ? "Skrij" : "Aktiviraj"}
                              </button>
                              <button onClick={() => openVariants(p.id)} style={{ padding: "4px 12px", borderRadius: 6, background: variantsOpenFor === p.id ? "#2f2117" : "#e4d2bf", color: variantsOpenFor === p.id ? "#f7f0e7" : "#1f1812", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>
                                Variante{(variantsByProduct[p.id]?.length ?? 0) > 0 ? ` (${variantsByProduct[p.id]!.length})` : ""}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                      {variantsOpenFor === p.id && (
                        <tr key={`${p.id}-variants`} style={{ background: "#fffaf2", borderBottom: "1px solid #e4d2bf" }}>
                          <td colSpan={6} style={{ padding: "14px 18px" }}>
                            {variantsLoading === p.id ? (
                              <p style={{ margin: 0, color: "#7c5e45" }}>Nalaganje variant…</p>
                            ) : (
                              <>
                                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: "0.85rem" }}>
                                  <thead>
                                    <tr style={{ borderBottom: "1px solid #c8a882", textAlign: "left", color: "#7c5e45" }}>
                                      <th style={{ padding: "6px 8px" }}>Barva</th>
                                      <th style={{ padding: "6px 8px" }}>Velikost</th>
                                      <th style={{ padding: "6px 8px" }}>Les</th>
                                      <th style={{ padding: "6px 8px" }}>Cena (€)</th>
                                      <th style={{ padding: "6px 8px" }}>Zaloga</th>
                                      <th style={{ padding: "6px 8px" }}>Aktivna</th>
                                      <th style={{ padding: "6px 8px" }}></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(variantsByProduct[p.id] ?? []).length === 0 ? (
                                      <tr><td colSpan={7} style={{ padding: "8px", color: "#7c5e45" }}>Ni variant.</td></tr>
                                    ) : (
                                      (variantsByProduct[p.id] ?? []).map((v) => (
                                        <tr key={v.id} style={{ borderBottom: "1px solid #f1e4d3" }}>
                                          <td style={{ padding: "6px 8px" }}>{v.color ?? "—"}</td>
                                          <td style={{ padding: "6px 8px" }}>{v.size ?? "—"}</td>
                                          <td style={{ padding: "6px 8px" }}>{v.wood ?? "—"}</td>
                                          <td style={{ padding: "6px 8px" }}>
                                            <input
                                              type="number"
                                              step="0.01"
                                              defaultValue={(v.priceCents / 100).toFixed(2)}
                                              onBlur={(e) => {
                                                const cents = parseMoneyToCents(e.target.value);
                                                if (cents != null && cents !== v.priceCents) patchVariant(p.id, v.id, { priceCents: cents });
                                              }}
                                              style={{ width: 80, padding: "3px 6px", borderRadius: 5, border: "1px solid #c8a882" }}
                                            />
                                          </td>
                                          <td style={{ padding: "6px 8px" }}>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              defaultValue={v.stock}
                                              onBlur={(e) => {
                                                const n = Math.max(0, Math.round(parseFloat(e.target.value) || 0));
                                                if (n !== v.stock) patchVariant(p.id, v.id, { stock: n });
                                              }}
                                              style={{ width: 60, padding: "3px 6px", borderRadius: 5, border: "1px solid #c8a882" }}
                                            />
                                          </td>
                                          <td style={{ padding: "6px 8px" }}>
                                            <input
                                              type="checkbox"
                                              checked={v.active}
                                              onChange={(e) => patchVariant(p.id, v.id, { active: e.target.checked })}
                                            />
                                          </td>
                                          <td style={{ padding: "6px 8px" }}>
                                            <button onClick={() => deleteVariant(p.id, v.id)} style={{ padding: "3px 8px", borderRadius: 5, background: "#f0e0e0", color: "#8b2020", border: "none", cursor: "pointer", fontSize: "0.75rem" }}>
                                              Izbriši
                                            </button>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                                <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap", background: "#fff", border: "1px solid #e4d2bf", padding: 10, borderRadius: 8 }}>
                                  <label style={{ display: "flex", flexDirection: "column", fontSize: "0.75rem", color: "#544237", gap: 3 }}>
                                    Barva
                                    <input value={newVColor} onChange={(e) => setNewVColor(e.target.value)} style={{ padding: "4px 7px", border: "1px solid #c8a882", borderRadius: 5, width: 100 }} />
                                  </label>
                                  <label style={{ display: "flex", flexDirection: "column", fontSize: "0.75rem", color: "#544237", gap: 3 }}>
                                    Velikost
                                    <input value={newVSize} onChange={(e) => setNewVSize(e.target.value)} style={{ padding: "4px 7px", border: "1px solid #c8a882", borderRadius: 5, width: 80 }} />
                                  </label>
                                  <label style={{ display: "flex", flexDirection: "column", fontSize: "0.75rem", color: "#544237", gap: 3 }}>
                                    Les
                                    <input value={newVWood} onChange={(e) => setNewVWood(e.target.value)} style={{ padding: "4px 7px", border: "1px solid #c8a882", borderRadius: 5, width: 100 }} />
                                  </label>
                                  <label style={{ display: "flex", flexDirection: "column", fontSize: "0.75rem", color: "#544237", gap: 3 }}>
                                    Cena (€)
                                    <input type="number" step="0.01" value={newVPrice} onChange={(e) => setNewVPrice(e.target.value)} style={{ padding: "4px 7px", border: "1px solid #c8a882", borderRadius: 5, width: 80 }} />
                                  </label>
                                  <label style={{ display: "flex", flexDirection: "column", fontSize: "0.75rem", color: "#544237", gap: 3 }}>
                                    Zaloga
                                    <input type="number" min="0" step="1" value={newVStock} onChange={(e) => setNewVStock(e.target.value)} style={{ padding: "4px 7px", border: "1px solid #c8a882", borderRadius: 5, width: 70 }} />
                                  </label>
                                  <button onClick={() => addVariant(p.id)} style={{ padding: "6px 14px", borderRadius: 6, background: "#2f2117", color: "#f7f0e7", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700 }}>
                                    + Dodaj varianto
                                  </button>
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  </tbody>
                </table>

                <h3 style={{ marginBottom: 14, fontSize: "1rem" }}>Dodaj nov izdelek</h3>
                <form onSubmit={addProduct} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e4d2bf" }}>
                  {[
                    ["Naziv", newTitle, setNewTitle, "text"],
                    ["Slika (pot)", newImage, setNewImage, "text"],
                    ["Alt besedilo", newAlt, setNewAlt, "text"],
                    ["Cena (€)", newPrice, onNewBasePriceChange, "number"],
                    ["Akcijska cena (€)", newSalePrice, onNewSalePriceChange, "number"],
                    ["Popust (%)", newDiscount, onNewDiscountChange, "number"],
                  ].map(([label, val, setter, type]) => (
                    <label key={label as string} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", fontWeight: 600, color: "#544237" }}>
                      {label as string}
                      <input
                        type={type as string}
                        step={(label as string) === "Popust (%)" ? "1" : type === "number" ? "0.01" : undefined}
                        min={(label as string) === "Popust (%)" ? 0 : undefined}
                        max={(label as string) === "Popust (%)" ? 99 : undefined}
                        value={val as string}
                        onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        required={(label as string) !== "Popust (%)" && (label as string) !== "Akcijska cena (€)"}
                        style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #c8a882", fontSize: "0.9rem" }}
                      />
                    </label>
                  ))}
                  <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", fontWeight: 600, color: "#544237" }}>
                    Opis
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      required
                      rows={3}
                      style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #c8a882", fontSize: "0.9rem", resize: "vertical" }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ gridColumn: "1 / -1", padding: "10px 24px", background: "#2f2117", color: "#f7f0e7", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}
                  >
                    {saving ? "Shranjujem…" : "Dodaj izdelek"}
                  </button>
                </form>
              </>
            )}

            {tab === "visits" && (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: "1.4rem" }}>
                    Obiski po viru
                  </h2>
                  <span style={{ color: "#7c5e45", fontSize: "0.9rem" }}>
                    Skupaj <strong>{visits?.total ?? 0}</strong> obiskov v zadnjih {visitDays} dneh
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    {[7, 30, 90, 365].map((d) => (
                      <button
                        key={d}
                        onClick={() => reloadVisits(d)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #c8a882", background: visitDays === d ? "#2f2117" : "#fff", color: visitDays === d ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
                      >
                        {d === 365 ? "1 leto" : `${d} dni`}
                      </button>
                    ))}
                  </div>
                </div>

                {!visits || visits.sources.length === 0 ? (
                  <p style={{ color: "#7c5e45" }}>Še ni zabeleženih obiskov.</p>
                ) : (
                  <div style={{ background: "#fff", border: "1px solid #e4d2bf", borderRadius: 12, padding: "20px 24px" }}>
                    {visits.sources.map((s) => {
                      const pct = visits.total > 0 ? (s.count / visits.total) * 100 : 0;
                      const max = visits.sources[0]?.count ?? 1;
                      const barPct = (s.count / max) * 100;
                      const color = SOURCE_COLORS[s.source] ?? "#7c5e45";
                      const label = SOURCE_LABELS[s.source] ?? s.source;
                      return (
                        <div key={s.source} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.88rem" }}>
                            <span style={{ fontWeight: 700, color: "#1f1812" }}>
                              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color, marginRight: 8, verticalAlign: "middle" }} />
                              {label}
                            </span>
                            <span style={{ color: "#7c5e45" }}>
                              <strong style={{ color: "#1f1812" }}>{s.count}</strong> &nbsp;({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div style={{ height: 12, background: "#f1e4d3", borderRadius: 6, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${barPct}%`,
                                height: "100%",
                                background: color,
                                transition: "width 320ms ease",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "stats" && (
              <StatsView
                analytics={analytics}
                days={statsDays}
                granularity={granularity}
                loading={statsLoading}
                onReload={reloadStats}
              />
            )}

            {tab === "messages" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.length === 0 && <p style={{ color: "#7c5e45" }}>Ni sporočil.</p>}
                {messages.map((m) => (
                  <div key={m.id} style={{ background: m.read ? "#fff" : "#fffbf4", border: `1px solid ${m.read ? "#e4d2bf" : "#c8a882"}`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div>
                        <strong>{m.name}</strong> — <a href={`mailto:${m.email}`} style={{ color: "#7c5e45" }}>{m.email}</a>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "#7c5e45" }}>
                          {new Date(m.createdAt).toLocaleDateString("sl-SI")}
                        </span>
                        {!m.read && (
                          <button onClick={() => markRead(m.id)} style={{ padding: "3px 10px", borderRadius: 6, background: "#2f2117", color: "#f7f0e7", border: "none", cursor: "pointer", fontSize: "0.75rem" }}>
                            Prebrano
                          </button>
                        )}
                        <button onClick={() => deleteMessage(m.id)} style={{ padding: "3px 10px", borderRadius: 6, background: "#f0e0e0", color: "#8b2020", border: "none", cursor: "pointer", fontSize: "0.75rem" }}>
                          Izbriši
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: "#1f1812", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.message}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function fmtEur(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

function BarList({
  rows,
  colors,
  labels,
}: {
  rows: { key: string; count: number }[];
  colors?: Record<string, string>;
  labels?: Record<string, string>;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = rows[0]?.count ?? 1;
  if (rows.length === 0) return <p style={{ color: "#7c5e45" }}>Ni podatkov.</p>;
  return (
    <div>
      {rows.map((r) => {
        const pct = total > 0 ? (r.count / total) * 100 : 0;
        const barPct = (r.count / max) * 100;
        const color = colors?.[r.key] ?? "#7c5e45";
        const label = labels?.[r.key] ?? r.key;
        return (
          <div key={r.key} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: "0.85rem" }}>
              <span style={{ fontWeight: 600, color: "#1f1812" }}>{label}</span>
              <span style={{ color: "#7c5e45" }}>
                <strong style={{ color: "#1f1812" }}>{r.count}</strong> ({pct.toFixed(1)}%)
              </span>
            </div>
            <div style={{ height: 10, background: "#f1e4d3", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ width: `${barPct}%`, height: "100%", background: color, transition: "width 320ms ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsView({
  analytics,
  days,
  granularity,
  loading,
  onReload,
}: {
  analytics: Analytics | null;
  days: number;
  granularity: "day" | "week" | "month";
  loading: boolean;
  onReload: (days: number, g: "day" | "week" | "month") => void;
}) {
  const cardStyle: CSSProperties = {
    background: "#fff",
    border: "1px solid #e4d2bf",
    borderRadius: 12,
    padding: "18px 22px",
    marginBottom: 20,
  };
  const h: CSSProperties = { margin: "0 0 14px", fontSize: "1.05rem", color: "#2f2117" };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Statistika</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => onReload(d, granularity)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #c8a882", background: days === d ? "#2f2117" : "#fff", color: days === d ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
            >
              {d === 365 ? "1 leto" : `${d} dni`}
            </button>
          ))}
          <span style={{ width: 10 }} />
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => onReload(days, g)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #c8a882", background: granularity === g ? "#7c5e45" : "#fff", color: granularity === g ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
            >
              {g === "day" ? "Dan" : g === "week" ? "Teden" : "Mesec"}
            </button>
          ))}
        </div>
      </div>

      {loading && !analytics && <p>Nalaganje…</p>}
      {analytics && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <MetricCard label="Skupen promet" value={fmtEur(analytics.sales.totalCents, analytics.sales.currency)} />
            <MetricCard label="Naročila (plačana)" value={String(analytics.sales.orderCount)} />
            <MetricCard label="Povprečna vrednost" value={fmtEur(analytics.sales.avgOrderCents, analytics.sales.currency)} />
            <MetricCard label="Konverzija" value={analytics.funnel.visits > 0 ? `${((analytics.funnel.paid / analytics.funnel.visits) * 100).toFixed(2)}%` : "—"} />
          </div>

          <div style={cardStyle}>
            <h3 style={h}>Prodaja po {granularity === "day" ? "dnevih" : granularity === "week" ? "tednih" : "mesecih"}</h3>
            <SalesChart series={analytics.sales.series} currency={analytics.sales.currency} />
          </div>

          <div style={cardStyle}>
            <h3 style={h}>Funnel</h3>
            <FunnelView funnel={analytics.funnel} />
          </div>

          <div style={cardStyle}>
            <h3 style={h}>Konverzija po viru</h3>
            <ConversionTable rows={analytics.conversionBySource} currency={analytics.sales.currency} />
          </div>

          <div style={cardStyle}>
            <h3 style={h}>Top 10 izdelkov</h3>
            <TopProducts rows={analytics.topProducts} currency={analytics.sales.currency} />
          </div>

          <div style={cardStyle}>
            <h3 style={h}>Landing strani (prvi obisk)</h3>
            <BarList rows={analytics.landingPages.map((p) => ({ key: p.path, count: p.count }))} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={cardStyle}>
              <h3 style={h}>Države</h3>
              <BarList rows={analytics.geo.map((p) => ({ key: p.country, count: p.count }))} />
            </div>
            <div style={cardStyle}>
              <h3 style={h}>Naprave</h3>
              <BarList
                rows={analytics.device.map((p) => ({ key: p.device, count: p.count }))}
                labels={DEVICE_LABELS}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4d2bf", borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ fontSize: "0.78rem", color: "#7c5e45", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1f1812", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function SalesChart({ series, currency }: { series: { bucket: string; orderCount: number; revenueCents: number }[]; currency: string }) {
  if (series.length === 0) return <p style={{ color: "#7c5e45" }}>Ni podatkov.</p>;
  const max = series.reduce((m, s) => Math.max(m, s.revenueCents), 0) || 1;
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 180, overflowX: "auto", paddingBottom: 20 }}>
      {series.map((s) => {
        const h = (s.revenueCents / max) * 160;
        return (
          <div key={s.bucket} title={`${s.bucket}: ${fmtEur(s.revenueCents, currency)} (${s.orderCount})`}
            style={{ minWidth: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: 14, height: Math.max(2, h), background: s.revenueCents > 0 ? "#7c5e45" : "#e4d2bf", borderRadius: 2, transition: "height 300ms ease" }} />
            <div style={{ fontSize: "0.6rem", color: "#7c5e45", transform: "rotate(-45deg)", transformOrigin: "top left", whiteSpace: "nowrap", marginTop: 4 }}>
              {s.bucket.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FunnelView({ funnel }: { funnel: Analytics["funnel"] }) {
  const steps = [
    { label: "Obisk", count: funnel.visits, color: "#c8a882" },
    { label: "Dodano v košarico", count: funnel.cartsWithItems, color: "#a98565" },
    { label: "Začel checkout", count: funnel.checkoutStarted, color: "#7c5e45" },
    { label: "Plačano", count: funnel.paid, color: "#2f2117" },
  ];
  const max = steps[0].count || 1;
  return (
    <div>
      {steps.map((s, i) => {
        const pct = (s.count / max) * 100;
        const prev = i > 0 ? steps[i - 1].count : s.count;
        const dropPct = prev > 0 ? ((prev - s.count) / prev) * 100 : 0;
        return (
          <div key={s.label} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.88rem" }}>
              <span style={{ fontWeight: 700 }}>{s.label}</span>
              <span style={{ color: "#7c5e45" }}>
                <strong style={{ color: "#1f1812" }}>{s.count}</strong>
                {i > 0 && <> &nbsp;<span style={{ color: dropPct > 0 ? "#b0503a" : "#2d6a2d" }}>(-{dropPct.toFixed(1)}%)</span></>}
              </span>
            </div>
            <div style={{ height: 20, background: "#f1e4d3", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: s.color, transition: "width 320ms ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConversionTable({ rows, currency }: { rows: Analytics["conversionBySource"]; currency: string }) {
  if (rows.length === 0) return <p style={{ color: "#7c5e45" }}>Ni podatkov.</p>;
  const cell: CSSProperties = { padding: "8px 10px", fontSize: "0.88rem" };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #c8a882", textAlign: "left", fontSize: "0.78rem", color: "#7c5e45" }}>
          <th style={cell}>Vir</th>
          <th style={cell}>Obiski</th>
          <th style={cell}>Košarice</th>
          <th style={cell}>Naročila</th>
          <th style={cell}>Konverzija</th>
          <th style={cell}>Prihodek</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.source} style={{ borderBottom: "1px solid #e4d2bf" }}>
            <td style={{ ...cell, fontWeight: 700 }}>{r.source}</td>
            <td style={cell}>{r.visits}</td>
            <td style={cell}>{r.carts}</td>
            <td style={cell}>{r.paidOrders}</td>
            <td style={cell}>{r.conversionPct.toFixed(2)}%</td>
            <td style={cell}>{fmtEur(r.revenueCents, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopProducts({ rows, currency }: { rows: Analytics["topProducts"]; currency: string }) {
  if (rows.length === 0) return <p style={{ color: "#7c5e45" }}>Ni podatkov.</p>;
  const cell: CSSProperties = { padding: "8px 10px", fontSize: "0.88rem" };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #c8a882", textAlign: "left", fontSize: "0.78rem", color: "#7c5e45" }}>
          <th style={cell}>Izdelek</th>
          <th style={cell}>Količina</th>
          <th style={cell}>Prihodek</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.productId} style={{ borderBottom: "1px solid #e4d2bf" }}>
            <td style={{ ...cell, fontWeight: 700 }}>{r.title}</td>
            <td style={cell}>{r.qty}</td>
            <td style={cell}>{fmtEur(r.revenueCents, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
