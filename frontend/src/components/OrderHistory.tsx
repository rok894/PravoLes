import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchJson } from "../api";

type OrderItem = {
  id: string;
  title: string;
  priceCents: number;
  qty: number;
};

type Order = {
  id: string;
  createdAt: string;
  status: string;
  totalCents: number;
  currency: string;
  items: OrderItem[];
};

type CustomOrderImage = { id: string; path: string; mimeType: string };

type CustomOrderRequest = {
  id: string;
  createdAt: string;
  status: "SUBMITTED" | "QUOTED" | "ACCEPTED" | "PAID" | "REJECTED" | "CANCELED";
  name: string;
  email: string;
  description: string;
  dimensions: string | null;
  quotePriceCents: number | null;
  currency: string;
  quoteMessage: string | null;
  images: CustomOrderImage[];
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Props = { onClose: () => void };

const BACKEND_URL = ((import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "")
  .trim()
  .replace(/\/$/, "");

function resolveImage(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return BACKEND_URL ? `${BACKEND_URL}${path}` : path;
}

function OrderHistory({ onClose }: Props) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"orders" | "custom">("orders");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const errors: string[] = [];
    try {
      const data = await fetchJson<{ orders: Order[] }>("/api/orders");
      setOrders(data.orders);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Error");
    }
    try {
      const data = await fetchJson<{ requests: CustomOrderRequest[] }>("/api/custom-orders");
      setCustomOrders(data.requests);
    } catch {
      // ignore — optional
    }
    if (errors.length > 0) setError(errors.join(" | "));
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function acceptQuote(id: string) {
    setAcceptingId(id);
    try {
      const data = await fetchJson<{ url: string }>(`/api/custom-orders/${id}/accept`, {
        method: "POST",
      });
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setAcceptingId(null);
    }
  }

  async function cancelRequest(id: string) {
    if (!confirm(t("customOrders.my.confirmCancel"))) return;
    try {
      await fetchJson(`/api/custom-orders/${id}/cancel`, { method: "POST" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <div className="orders-overlay" onClick={onClose}>
      <div
        className="orders-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("orders.title")}
      >
        <div className="orders-modal__header">
          <h2>{t("orders.title")}</h2>
          <button type="button" className="orders-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setTab("orders")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #c8a882",
              background: tab === "orders" ? "#2f2117" : "#fff",
              color: tab === "orders" ? "#f7f0e7" : "#1f1812",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            {t("orders.myOrders")} ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid #c8a882",
              background: tab === "custom" ? "#2f2117" : "#fff",
              color: tab === "custom" ? "#f7f0e7" : "#1f1812",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            {t("customOrders.my.tab")} ({customOrders.length})
          </button>
        </div>

        {loading ? (
          <div className="orders-modal__loading">
            <div className="skeleton skeleton--title" style={{ width: "60%", margin: "12px auto" }} />
            <div className="skeleton skeleton--text" style={{ width: "80%", margin: "8px auto" }} />
          </div>
        ) : error ? (
          <p className="orders-modal__empty">{error}</p>
        ) : tab === "orders" ? (
          orders.length === 0 ? (
            <p className="orders-modal__empty">{t("orders.empty")}</p>
          ) : (
            <div className="orders-modal__list">
              {orders.map((order) => (
                <div className="orders-item" key={order.id}>
                  <div className="orders-item__meta">
                    <span className="orders-item__date">{formatDate(order.createdAt)}</span>
                    <span className={`orders-item__status orders-item__status--${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    <strong className="orders-item__total">
                      {formatPrice(order.totalCents, order.currency)}
                    </strong>
                  </div>
                  <ul className="orders-item__products">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.title} × {item.qty} —{" "}
                        {formatPrice(item.priceCents * item.qty, order.currency)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : customOrders.length === 0 ? (
          <p className="orders-modal__empty">{t("customOrders.my.empty")}</p>
        ) : (
          <div className="orders-modal__list">
            {customOrders.map((r) => (
              <div className="orders-item" key={r.id}>
                <div className="orders-item__meta">
                  <span className="orders-item__date">{formatDate(r.createdAt)}</span>
                  <span className={`orders-item__status orders-item__status--${r.status.toLowerCase()}`}>
                    {t(`customOrders.status.${r.status}`)}
                  </span>
                  {r.quotePriceCents != null && (
                    <strong className="orders-item__total">
                      {formatPrice(r.quotePriceCents, r.currency)}
                    </strong>
                  )}
                </div>
                <p style={{ margin: "4px 0 8px", whiteSpace: "pre-wrap" }}>{r.description}</p>
                {r.dimensions && (
                  <p style={{ margin: "0 0 8px", color: "#7c5e45", fontSize: "0.85rem" }}>
                    {t("customOrders.form.dimensions")}: {r.dimensions}
                  </p>
                )}
                {r.quoteMessage && (
                  <div
                    style={{
                      background: "#fffbf4",
                      borderLeft: "3px solid #c8a882",
                      padding: "8px 12px",
                      margin: "6px 0",
                      fontSize: "0.88rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {r.quoteMessage}
                  </div>
                )}
                {r.images.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                    {r.images.map((img) => (
                      <a key={img.id} href={resolveImage(img.path)} target="_blank" rel="noreferrer">
                        <img
                          src={resolveImage(img.path)}
                          alt=""
                          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #e4d2bf" }}
                        />
                      </a>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {r.status === "QUOTED" && r.quotePriceCents && (
                    <button
                      type="button"
                      className="button button--primary button--small"
                      onClick={() => acceptQuote(r.id)}
                      disabled={acceptingId === r.id}
                    >
                      {acceptingId === r.id ? "…" : t("customOrders.my.acceptAndPay")}
                    </button>
                  )}
                  {(r.status === "SUBMITTED" || r.status === "QUOTED") && (
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => cancelRequest(r.id)}
                    >
                      {t("customOrders.my.cancel")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistory;
