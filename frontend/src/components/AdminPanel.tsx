import { useEffect, useState } from "react";
import { fetchJson } from "../api";
import { useAuth } from "../AuthContext";

type Product = {
  id: string;
  title: string;
  description: string;
  image: string;
  priceCents: number;
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

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<"" | "PENDING" | "PAID" | "CANCELED">("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [visitDays, setVisitDays] = useState(30);
  const [tab, setTab] = useState<"products" | "messages" | "visits" | "orders">("visits");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(true);

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
    await fetchJson(`/api/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        priceCents: Math.round(parseFloat(editPrice) * 100),
        active: editActive,
      }),
    });
    setProducts((prev) => prev.map((x) =>
      x.id === id
        ? { ...x, priceCents: Math.round(parseFloat(editPrice) * 100), active: editActive }
        : x,
    ));
    setEditId(null);
  }

  async function addProduct(e: { preventDefault(): void }) {
    e.preventDefault();
    setSaving(true);
    try {
      const { product } = await fetchJson<{ product: Product }>("/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          image: newImage,
          alt: newAlt,
          priceCents: Math.round(parseFloat(newPrice) * 100),
        }),
      });
      setProducts((prev) => [...prev, product]);
      setNewTitle(""); setNewDesc(""); setNewImage(""); setNewAlt(""); setNewPrice("");
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

            {tab === "products" && (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 36 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #c8a882", textAlign: "left", fontSize: "0.82rem", color: "#7c5e45" }}>
                      <th style={{ padding: "8px 10px" }}>Naziv</th>
                      <th style={{ padding: "8px 10px" }}>Cena</th>
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
                            <input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }} />
                          ) : fmt(p.priceCents, p.currency)}
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
                              <button onClick={() => { setEditId(p.id); setEditPrice((p.priceCents / 100).toFixed(2)); setEditActive(p.active); }} style={{ padding: "4px 12px", borderRadius: 6, background: "#c8a882", border: "none", cursor: "pointer", fontSize: "0.8rem" }}>Uredi</button>
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
                    ["Cena (€)", newPrice, setNewPrice, "number"],
                  ] as const).map(([label, val, setter, type]) => (
                    <label key={label} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", fontWeight: 600, color: "#544237" }}>
                      {label}
                      <input type={type} step={type === "number" ? "0.01" : undefined} value={val} onChange={(e) => setter(e.target.value)} required style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #c8a882", fontSize: "0.9rem" }} />
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
