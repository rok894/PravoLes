"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<"products" | "messages">("products");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // new product form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch("/api/admin/products", { credentials: "include" }),
        fetch("/api/admin/messages", { credentials: "include" }),
      ]);
      if (pRes.status === 403 || mRes.status === 403) {
        setError("Nimate dostopa. Prijavite se kot admin.");
        setLoading(false);
        return;
      }
      const { products } = await pRes.json();
      const { messages } = await mRes.json();
      setProducts(products);
      setMessages(messages);
    } catch {
      setError("Napaka pri nalaganju.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(p: Product) {
    await fetch(`/api/admin/products/${p.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x));
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
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
      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          image: newImage,
          alt: newAlt,
          priceCents: Math.round(parseFloat(newPrice) * 100),
        }),
      });
      const { product } = await res.json();
      setProducts((prev) => [...prev, product]);
      setNewTitle(""); setNewDesc(""); setNewImage(""); setNewAlt(""); setNewPrice("");
    } finally {
      setSaving(false);
    }
  }

  async function markRead(id: string) {
    await fetch("/api/admin/messages", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
  }

  async function deleteMessage(id: string) {
    if (!confirm("Izbriši sporočilo?")) return;
    await fetch("/api/admin/messages", {
      method: "DELETE",
      credentials: "include",
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
            </div>

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
                            <input
                              type="number"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: "1px solid #c8a882" }}
                            />
                          ) : (
                            fmt(p.priceCents, p.currency)
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
                  {[
                    ["Naziv", newTitle, setNewTitle, "text"],
                    ["Slika (pot)", newImage, setNewImage, "text"],
                    ["Alt besedilo", newAlt, setNewAlt, "text"],
                    ["Cena (€)", newPrice, setNewPrice, "number"],
                  ].map(([label, val, setter, type]) => (
                    <label key={label as string} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", fontWeight: 600, color: "#544237" }}>
                      {label as string}
                      <input
                        type={type as string}
                        step={type === "number" ? "0.01" : undefined}
                        value={val as string}
                        onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                        required
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
