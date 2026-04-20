import { useEffect, useState } from "react";
import { fetchJson } from "../api";
import { useAuth } from "../AuthContext";

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

type Message = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
};

type OrderItem = {
  id: string;
  title: string;
  priceCents: number;
  qty: number;
};

type Payment = {
  id: string;
  status: "REQUIRES_ACTION" | "SUCCEEDED" | "FAILED";
  stripeSessionId: string | null;
};

type Order = {
  id: string;
  createdAt: string;
  status: "PENDING" | "PAID" | "CANCELED";
  totalCents: number;
  currency: string;
  customerEmail: string | null;
  items: OrderItem[];
  payment: Payment | null;
};

type VisitStats = {
  days: number;
  total: number;
  sources: { source: string; count: number }[];
};

type CustomOrderImage = { id: string; path: string; mimeType: string; sizeBytes: number };

type CustomOrderRequest = {
  id: string;
  createdAt: string;
  status: "SUBMITTED" | "QUOTED" | "ACCEPTED" | "PAID" | "REJECTED" | "CANCELED";
  name: string;
  email: string;
  phone: string | null;
  description: string;
  dimensions: string | null;
  quotePriceCents: number | null;
  currency: string;
  quoteMessage: string | null;
  adminNotes: string | null;
  images: CustomOrderImage[];
  payment: Payment | null;
};

const CUSTOM_STATUS_LABELS: Record<CustomOrderRequest["status"], string> = {
  SUBMITTED: "Oddano",
  QUOTED: "Ponudba poslana",
  ACCEPTED: "Sprejeto",
  PAID: "Plačano",
  REJECTED: "Zavrnjeno",
  CANCELED: "Preklicano",
};

const CUSTOM_STATUS_COLORS: Record<CustomOrderRequest["status"], { bg: string; fg: string }> = {
  SUBMITTED: { bg: "#fff3cd", fg: "#856404" },
  QUOTED: { bg: "rgba(60,90,160,0.12)", fg: "#2d3d8a" },
  ACCEPTED: { bg: "rgba(60,120,60,0.12)", fg: "#2d6a2d" },
  PAID: { bg: "rgba(60,120,60,0.22)", fg: "#205020" },
  REJECTED: { bg: "#f0e0e0", fg: "#8b2020" },
  CANCELED: { bg: "#e8e0d8", fg: "#544237" },
};

const ADMIN_BACKEND_URL = ((import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "")
  .trim()
  .replace(/\/$/, "");

function resolveAdminImage(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return ADMIN_BACKEND_URL ? `${ADMIN_BACKEND_URL}${path}` : path;
}

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

function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, Math.trunc(value)));
}

function effectiveSaleCents(product: { priceCents: number; discountPercent?: number }) {
  const base = Math.trunc(product.priceCents);
  const pct = clampDiscountPercent(product.discountPercent ?? 0);
  if (pct <= 0) return Math.max(1, base);
  return Math.max(1, Math.round((base * (100 - pct)) / 100));
}

function salePriceCentsFromDiscountPercent(baseCents: number, discountPercent: number) {
  const base = Math.max(1, Math.trunc(baseCents));
  const pct = clampDiscountPercent(discountPercent);
  if (pct <= 0) return base;
  return Math.max(1, Math.round((base * (100 - pct)) / 100));
}

function discountPercentFromSalePriceCents(baseCents: number, saleCents: number) {
  const base = Math.max(1, Math.trunc(baseCents));
  const sale = Math.max(1, Math.trunc(saleCents));
  if (sale >= base) return 0;
  const pct = Math.round(((base - sale) / base) * 100);
  return clampDiscountPercent(pct);
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<"" | "PENDING" | "PAID" | "CANCELED">("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [visitDays, setVisitDays] = useState(30);
  const [tab, setTab] = useState<"products" | "messages" | "visits" | "orders" | "custom">("visits");
  const [customOrders, setCustomOrders] = useState<CustomOrderRequest[]>([]);
  const [customFilter, setCustomFilter] = useState<"" | CustomOrderRequest["status"]>("");
  const [customExpanded, setCustomExpanded] = useState<string | null>(null);
  const [customQuoteCents, setCustomQuoteCents] = useState<Record<string, string>>({});
  const [customQuoteMessage, setCustomQuoteMessage] = useState<Record<string, string>>({});
  const [customAdminNotes, setCustomAdminNotes] = useState<Record<string, string>>({});
  const [customSavingId, setCustomSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [newSalePrice, setNewSalePrice] = useState("");
  const [newPricingMode, setNewPricingMode] = useState<"percent" | "sale">("percent");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editPricingMode, setEditPricingMode] = useState<"percent" | "sale">("percent");
  const [editActive, setEditActive] = useState(true);

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
      setEditDiscount(String(discountPercentFromSalePriceCents(base, sale)));
    } else {
      const pct = Math.round(parseFloat(editDiscount) || 0);
      if (pct <= 0) {
        setEditSalePrice("");
        return;
      }
      setEditSalePrice(centsToMoney(salePriceCentsFromDiscountPercent(base, pct)));
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
    setEditSalePrice(centsToMoney(salePriceCentsFromDiscountPercent(base, pct)));
  }

  function onEditSalePriceChange(next: string) {
    setEditPricingMode("sale");
    setEditSalePrice(next);
    const base = parseMoneyToCents(editPrice);
    const sale = parseMoneyToCents(next);
    if (!base || !sale) return;
    setEditDiscount(String(discountPercentFromSalePriceCents(base, sale)));
  }

  function onNewBasePriceChange(next: string) {
    setNewPrice(next);
    const base = parseMoneyToCents(next);
    if (!base) return;
    if (newPricingMode === "sale") {
      const sale = parseMoneyToCents(newSalePrice);
      if (!sale) return;
      setNewDiscount(String(discountPercentFromSalePriceCents(base, sale)));
    } else {
      const pct = Math.round(parseFloat(newDiscount) || 0);
      if (pct <= 0) {
        setNewSalePrice("");
        return;
      }
      setNewSalePrice(centsToMoney(salePriceCentsFromDiscountPercent(base, pct)));
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
    setNewSalePrice(centsToMoney(salePriceCentsFromDiscountPercent(base, pct)));
  }

  function onNewSalePriceChange(next: string) {
    setNewPricingMode("sale");
    setNewSalePrice(next);
    const base = parseMoneyToCents(newPrice);
    const sale = parseMoneyToCents(next);
    if (!base || !sale) return;
    setNewDiscount(String(discountPercentFromSalePriceCents(base, sale)));
  }

  async function load() {
    setLoading(true);
    setError(null);
    const errors: string[] = [];
    try {
      const pRes = await fetchJson<{ products: Product[] }>("/api/admin/products");
      setProducts(pRes.products);
    } catch (err) {
      errors.push("products: " + (err instanceof Error ? err.message : String(err)));
    }
    try {
      const mRes = await fetchJson<{ messages: Message[] }>("/api/admin/messages");
      setMessages(mRes.messages);
    } catch (err) {
      errors.push("messages: " + (err instanceof Error ? err.message : String(err)));
    }
    try {
      const oRes = await fetchJson<{ orders: Order[] }>("/api/admin/orders");
      setOrders(oRes.orders);
    } catch (err) {
      errors.push("orders: " + (err instanceof Error ? err.message : String(err)));
    }
    try {
      const vRes = await fetchJson<VisitStats>(`/api/admin/visits?days=${visitDays}`);
      setVisits(vRes);
    } catch (err) {
      errors.push("visits: " + (err instanceof Error ? err.message : String(err)));
    }
    try {
      const cRes = await fetchJson<{ requests: CustomOrderRequest[] }>("/api/admin/custom-orders");
      setCustomOrders(cRes.requests);
    } catch (err) {
      errors.push("custom-orders: " + (err instanceof Error ? err.message : String(err)));
    }
    if (errors.length > 0) {
      setError(errors.join(" | "));
    }
    setLoading(false);
  }

  async function reloadVisits(days: number) {
    setVisitDays(days);
    try {
      const data = await fetchJson<VisitStats>(`/api/admin/visits?days=${days}`);
      setVisits(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(p: Product) {
    await fetchJson(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !p.active }),
    });
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x));
  }

  async function saveEdit(id: string) {
    try {
      const baseCents = parseMoneyToCents(editPrice);
      const saleCents = editSalePrice.trim() ? parseMoneyToCents(editSalePrice) : null;
      if (!baseCents) {
        setError("Vnesi veljavno redno ceno.");
        return;
      }
      await fetchJson(`/api/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          priceCents: baseCents,
          discountPercent: Math.round(parseFloat(editDiscount) || 0),
          salePriceCents: saleCents,
          active: editActive,
        }),
      });
      setProducts((prev) => prev.map((x) =>
        x.id === id
          ? { ...x, priceCents: baseCents, discountPercent: Math.round(parseFloat(editDiscount) || 0), salePriceCents: saleCents, active: editActive }
          : x,
      ));
      setEditId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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
      const { product } = await fetchJson<{ product: Product }>("/api/admin/products", {
        method: "POST",
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
      setProducts((prev) => [...prev, product]);
      setNewTitle(""); setNewDesc(""); setNewImage(""); setNewAlt(""); setNewPrice(""); setNewDiscount(""); setNewSalePrice("");
      setError(null);
    } finally {
      setSaving(false);
    }
  }

  async function markRead(id: string) {
    await fetchJson("/api/admin/messages", {
      method: "PATCH",
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
  }

  async function deleteMessage(id: string) {
    if (!confirm("Izbriši sporočilo?")) return;
    await fetchJson("/api/admin/messages", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function sendCustomQuote(id: string) {
    const raw = customQuoteCents[id];
    const cents = parseMoneyToCents(raw ?? "");
    if (!cents) {
      setError("Vnesi veljavno ceno za ponudbo.");
      return;
    }
    setCustomSavingId(id);
    try {
      const { request } = await fetchJson<{ request: CustomOrderRequest }>(
        `/api/admin/custom-orders/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "quote",
            quotePriceCents: cents,
            quoteMessage: customQuoteMessage[id] ?? null,
          }),
        },
      );
      setCustomOrders((prev) => prev.map((r) => (r.id === id ? { ...r, ...request } : r)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCustomSavingId(null);
    }
  }

  async function rejectCustom(id: string) {
    if (!confirm("Zavrni povpraševanje?")) return;
    setCustomSavingId(id);
    try {
      const { request } = await fetchJson<{ request: CustomOrderRequest }>(
        `/api/admin/custom-orders/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "reject",
            quoteMessage: customQuoteMessage[id] ?? null,
            adminNotes: customAdminNotes[id] ?? null,
          }),
        },
      );
      setCustomOrders((prev) => prev.map((r) => (r.id === id ? { ...r, ...request } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCustomSavingId(null);
    }
  }

  async function saveCustomNotes(id: string) {
    setCustomSavingId(id);
    try {
      await fetchJson(`/api/admin/custom-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "notes",
          adminNotes: customAdminNotes[id] ?? null,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCustomSavingId(null);
    }
  }

  async function updateOrderStatus(id: string, status: Order["status"]) {
    const { order } = await fetchJson<{ order: Order }>("/api/admin/orders", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    setOrders((prev) => prev.map((o) => o.id === id ? order : o));
  }

  const filteredOrders = orderFilter ? orders.filter((o) => o.status === orderFilter) : orders;

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#f7f1ea", overflow: "auto", fontFamily: "Arial, sans-serif", color: "#1f1812" }}>
      <header style={{ background: "#2f2117", color: "#f7f0e7", padding: "18px 32px", display: "flex", alignItems: "center", gap: 20 }}>
        <strong style={{ fontSize: "1.2rem" }}>PravoLes Admin</strong>
        <span style={{ fontSize: "0.85rem", color: "#c8a882" }}>{user?.email}</span>
        <button
          onClick={onClose}
          style={{ marginLeft: "auto", color: "#c8a882", background: "none", border: "1px solid #c8a882", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: "0.85rem" }}
        >
          ← Nazaj na stran
        </button>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
        {loading ? (
          <p>Nalaganje…</p>
        ) : error ? (
          <div style={{ background: "#ffe0e0", border: "1px solid #f0a0a0", borderRadius: 10, padding: "16px 20px", color: "#8b2020" }}>
            {error}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
              {([
                ["visits", `Obiski ${visits ? `(${visits.total})` : ""}`],
                ["orders", `Naročila (${orders.length})`],
                ["custom", `Povpraševanja (${customOrders.length})`],
                ["products", `Izdelki (${products.length})`],
                ["messages", `Sporočila`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as any)}
                  style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ccc", background: tab === key ? "#2f2117" : "#fff", color: tab === key ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontWeight: 700 }}
                >
                  {label}
                  {key === "messages" && unread > 0 && <span style={{ background: "#c0392b", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: "0.75rem", marginLeft: 4 }}>{unread}</span>}
                </button>
              ))}
            </div>

            {tab === "visits" && (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Obiski po viru</h2>
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
                            <div style={{ width: `${barPct}%`, height: "100%", background: color, transition: "width 320ms ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "orders" && (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Naročila</h2>
                  <span style={{ color: "#7c5e45", fontSize: "0.9rem" }}>
                    Skupaj <strong>{orders.length}</strong> naročil
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    {([["", "Vsa"], ["PENDING", "V obdelavi"], ["PAID", "Plačana"], ["CANCELED", "Preklicana"]] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setOrderFilter(val as typeof orderFilter)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #c8a882", background: orderFilter === val ? "#2f2117" : "#fff", color: orderFilter === val ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <p style={{ color: "#7c5e45" }}>Ni naročil.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredOrders.map((o) => {
                      const statusLabel = o.status === "PAID" ? "Plačano" : o.status === "CANCELED" ? "Preklicano" : "V obdelavi";
                      const statusBg = o.status === "PAID" ? "rgba(60,120,60,0.12)" : o.status === "CANCELED" ? "#f0e0e0" : "#fff3cd";
                      const statusColor = o.status === "PAID" ? "#2d6a2d" : o.status === "CANCELED" ? "#8b2020" : "#856404";
                      const payLabel = o.payment?.status === "SUCCEEDED" ? "Uspešno" : o.payment?.status === "FAILED" ? "Neuspešno" : "Čaka";
                      const payColor = o.payment?.status === "SUCCEEDED" ? "#2d6a2d" : o.payment?.status === "FAILED" ? "#8b2020" : "#856404";
                      const expanded = expandedOrder === o.id;

                      return (
                        <div key={o.id} style={{ background: "#fff", border: "1px solid #e4d2bf", borderRadius: 12, padding: "14px 18px" }}>
                          <div
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                            onClick={() => setExpandedOrder(expanded ? null : o.id)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontSize: "0.75rem", color: "#7c5e45" }}>
                                {new Date(o.createdAt).toLocaleDateString("sl-SI")}
                              </span>
                              <span style={{ fontWeight: 700 }}>{fmt(o.totalCents, o.currency)}</span>
                              <span style={{ background: statusBg, color: statusColor, padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
                                {statusLabel}
                              </span>
                              {o.payment && (
                                <span style={{ fontSize: "0.75rem", color: payColor, fontWeight: 600 }}>
                                  Plačilo: {payLabel}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: "0.82rem", color: "#7c5e45" }}>
                                {o.customerEmail ?? "—"}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "#c8a882" }}>{expanded ? "▲" : "▼"}</span>
                            </div>
                          </div>

                          {expanded && (
                            <div style={{ marginTop: 14, borderTop: "1px solid #e4d2bf", paddingTop: 14 }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid #e4d2bf", fontSize: "0.78rem", color: "#7c5e45", textAlign: "left" }}>
                                    <th style={{ padding: "6px 8px" }}>Artikel</th>
                                    <th style={{ padding: "6px 8px" }}>Kol.</th>
                                    <th style={{ padding: "6px 8px" }}>Cena</th>
                                    <th style={{ padding: "6px 8px" }}>Skupaj</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {o.items.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f1e4d3", fontSize: "0.88rem" }}>
                                      <td style={{ padding: "8px 8px" }}>{item.title}</td>
                                      <td style={{ padding: "8px 8px" }}>{item.qty}</td>
                                      <td style={{ padding: "8px 8px" }}>{fmt(item.priceCents, o.currency)}</td>
                                      <td style={{ padding: "8px 8px", fontWeight: 600 }}>{fmt(item.priceCents * item.qty, o.currency)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ display: "flex", gap: 8, fontSize: "0.82rem" }}>
                                <span style={{ color: "#7c5e45" }}>Spremeni status:</span>
                                {(["PENDING", "PAID", "CANCELED"] as const).filter((s) => s !== o.status).map((s) => {
                                  const btnLabel = s === "PAID" ? "Plačano" : s === "CANCELED" ? "Preklicano" : "V obdelavi";
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => updateOrderStatus(o.id, s)}
                                      style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #c8a882", background: "#f7f1ea", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
                                    >
                                      {btnLabel}
                                    </button>
                                  );
                                })}
                              </div>

                              <div style={{ marginTop: 10, fontSize: "0.75rem", color: "#999" }}>
                                ID: {o.id}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "custom" && (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Povpraševanja po meri</h2>
                  <span style={{ color: "#7c5e45", fontSize: "0.9rem" }}>
                    Skupaj <strong>{customOrders.length}</strong>
                  </span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {([
                      ["", "Vsa"],
                      ["SUBMITTED", "Oddano"],
                      ["QUOTED", "Ponudba"],
                      ["ACCEPTED", "Sprejeto"],
                      ["PAID", "Plačano"],
                      ["REJECTED", "Zavrnjeno"],
                      ["CANCELED", "Preklicano"],
                    ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setCustomFilter(val as typeof customFilter)}
                        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #c8a882", background: customFilter === val ? "#2f2117" : "#fff", color: customFilter === val ? "#f7f0e7" : "#1f1812", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const list = customFilter ? customOrders.filter((r) => r.status === customFilter) : customOrders;
                  if (list.length === 0) {
                    return <p style={{ color: "#7c5e45" }}>Ni povpraševanj.</p>;
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {list.map((r) => {
                        const colors = CUSTOM_STATUS_COLORS[r.status];
                        const expanded = customExpanded === r.id;
                        const quoteRaw = customQuoteCents[r.id] ?? (r.quotePriceCents != null ? (r.quotePriceCents / 100).toFixed(2) : "");
                        const msgRaw = customQuoteMessage[r.id] ?? r.quoteMessage ?? "";
                        const notesRaw = customAdminNotes[r.id] ?? r.adminNotes ?? "";
                        return (
                          <div key={r.id} style={{ background: "#fff", border: "1px solid #e4d2bf", borderRadius: 12, padding: "14px 18px" }}>
                            <div
                              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", flexWrap: "wrap", gap: 8 }}
                              onClick={() => setCustomExpanded(expanded ? null : r.id)}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.75rem", color: "#7c5e45" }}>
                                  {new Date(r.createdAt).toLocaleDateString("sl-SI")}
                                </span>
                                <strong>{r.name}</strong>
                                <a href={`mailto:${r.email}`} style={{ color: "#7c5e45", fontSize: "0.85rem" }} onClick={(e) => e.stopPropagation()}>
                                  {r.email}
                                </a>
                                <span style={{ background: colors.bg, color: colors.fg, padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
                                  {CUSTOM_STATUS_LABELS[r.status]}
                                </span>
                                {r.quotePriceCents != null && (
                                  <span style={{ fontWeight: 700 }}>{fmt(r.quotePriceCents, r.currency)}</span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "#c8a882" }}>{expanded ? "▲" : "▼"}</span>
                            </div>

                            {expanded && (
                              <div style={{ marginTop: 14, borderTop: "1px solid #e4d2bf", paddingTop: 14 }}>
                                {r.phone && (
                                  <p style={{ margin: "0 0 6px", fontSize: "0.88rem" }}>
                                    <strong>Telefon:</strong> {r.phone}
                                  </p>
                                )}
                                <p style={{ margin: "0 0 8px", whiteSpace: "pre-wrap" }}>{r.description}</p>
                                {r.dimensions && (
                                  <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "#544237" }}>
                                    <strong>Dimenzije / material:</strong> {r.dimensions}
                                  </p>
                                )}
                                {r.images.length > 0 && (
                                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                                    {r.images.map((img) => (
                                      <a key={img.id} href={resolveAdminImage(img.path)} target="_blank" rel="noreferrer">
                                        <img
                                          src={resolveAdminImage(img.path)}
                                          alt=""
                                          style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 6, border: "1px solid #e4d2bf" }}
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {(r.status === "SUBMITTED" || r.status === "QUOTED") && (
                                  <div style={{ background: "#f7f1ea", padding: 12, borderRadius: 8, marginTop: 10 }}>
                                    <h4 style={{ margin: "0 0 8px", fontSize: "0.95rem" }}>Pošlji ponudbo</h4>
                                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", fontWeight: 600 }}>
                                        Cena (€)
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0.01"
                                          value={quoteRaw}
                                          onChange={(e) => setCustomQuoteCents((p) => ({ ...p, [r.id]: e.target.value }))}
                                          style={{ width: 120, padding: "6px 10px", borderRadius: 6, border: "1px solid #c8a882" }}
                                        />
                                      </label>
                                      <label style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", fontWeight: 600 }}>
                                        Sporočilo kupcu (neobvezno)
                                        <textarea
                                          value={msgRaw}
                                          onChange={(e) => setCustomQuoteMessage((p) => ({ ...p, [r.id]: e.target.value }))}
                                          rows={2}
                                          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #c8a882", resize: "vertical" }}
                                        />
                                      </label>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                      <button
                                        onClick={() => sendCustomQuote(r.id)}
                                        disabled={customSavingId === r.id}
                                        style={{ padding: "6px 14px", borderRadius: 6, background: "#2f2117", color: "#f7f0e7", border: "none", cursor: "pointer", fontWeight: 700 }}
                                      >
                                        {customSavingId === r.id ? "…" : r.status === "QUOTED" ? "Posodobi ponudbo" : "Pošlji ponudbo"}
                                      </button>
                                      <button
                                        onClick={() => rejectCustom(r.id)}
                                        disabled={customSavingId === r.id}
                                        style={{ padding: "6px 14px", borderRadius: 6, background: "#f0e0e0", color: "#8b2020", border: "none", cursor: "pointer", fontWeight: 700 }}
                                      >
                                        Zavrni
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div style={{ marginTop: 12 }}>
                                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", fontWeight: 600 }}>
                                    Interne opombe
                                    <textarea
                                      value={notesRaw}
                                      onChange={(e) => setCustomAdminNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                                      rows={2}
                                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #c8a882", resize: "vertical" }}
                                    />
                                  </label>
                                  <button
                                    onClick={() => saveCustomNotes(r.id)}
                                    disabled={customSavingId === r.id}
                                    style={{ marginTop: 6, padding: "4px 12px", borderRadius: 6, background: "#c8a882", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                                  >
                                    Shrani opombe
                                  </button>
                                </div>

                                <div style={{ marginTop: 10, fontSize: "0.75rem", color: "#999" }}>ID: {r.id}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

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
                      <tr key={p.id} style={{ borderBottom: "1px solid #e4d2bf", opacity: p.active ? 1 : 0.5 }}>
                        <td style={{ padding: "10px 10px" }}>{p.title}</td>
                        <td style={{ padding: "10px 10px" }}>
                          {editId === p.id ? (
                            <input type="number" step="0.01" value={editPrice} onChange={(e) => onEditBasePriceChange(e.target.value)} style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }} />
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
                              <span style={{ fontWeight: 800, color: "#2f2117" }}>
                                {fmt(p.salePriceCents ?? effectiveSaleCents(p), p.currency)}
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
                            <input type="number" step="0.01" value={editSalePrice} onChange={(e) => onEditSalePriceChange(e.target.value)} placeholder="â€”" style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }} />
                          ) : p.discountPercent > 0 ? (
                            fmt(p.salePriceCents ?? effectiveSaleCents(p), p.currency)
                          ) : (
                            <span style={{ color: "#7c5e45", fontSize: "0.82rem" }}>â€”</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 10px" }}>
                          {editId === p.id ? (
                            <input type="number" step="1" min="0" max="99" value={editDiscount} onChange={(e) => onEditDiscountChange(e.target.value)} style={{ width: 70, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }} />
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
                                const sale = p.salePriceCents ?? effectiveSaleCents(p);
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
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={{ marginBottom: 14, fontSize: "1rem" }}>Dodaj nov izdelek</h3>
                <form onSubmit={addProduct} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e4d2bf" }}>
                  {([
                    ["Naziv", newTitle, setNewTitle, "text"],
                    ["Slika (pot)", newImage, setNewImage, "text"],
                    ["Alt besedilo", newAlt, setNewAlt, "text"],
                    ["Cena (€)", newPrice, onNewBasePriceChange, "number"],
                    ["Akcijska cena (€)", newSalePrice, onNewSalePriceChange, "number"],
                    ["Popust (%)", newDiscount, onNewDiscountChange, "number"],
                  ] as const).map(([label, val, setter, type]) => (
                    <label key={label} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", fontWeight: 600, color: "#544237" }}>
                      {label}
                      <input type={type} step={label === "Popust (%)" ? "1" : type === "number" ? "0.01" : undefined} min={label === "Popust (%)" ? 0 : undefined} max={label === "Popust (%)" ? 99 : undefined} value={val} onChange={(e) => setter(e.target.value)} required={label !== "Popust (%)" && label !== "Akcijska cena (€)"} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #c8a882", fontSize: "0.9rem" }} />
                    </label>
                  ))}
                  <label style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", fontWeight: 600, color: "#544237" }}>
                    Opis
                    <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} required rows={3} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #c8a882", fontSize: "0.9rem", resize: "vertical" }} />
                  </label>
                  <button type="submit" disabled={saving} style={{ gridColumn: "1 / -1", padding: "10px 24px", background: "#2f2117", color: "#f7f0e7", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.95rem" }}>
                    {saving ? "Shranjujem…" : "Dodaj izdelek"}
                  </button>
                </form>
              </>
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
