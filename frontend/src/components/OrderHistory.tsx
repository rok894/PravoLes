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

function OrderHistory({ onClose }: Props) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<{ orders: Order[] }>("/api/orders")
      .then((data) => setOrders(data.orders))
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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

        {loading ? (
          <div className="orders-modal__loading">
            <div className="skeleton skeleton--title" style={{ width: "60%", margin: "12px auto" }} />
            <div className="skeleton skeleton--text" style={{ width: "80%", margin: "8px auto" }} />
          </div>
        ) : error ? (
          <p className="orders-modal__empty">{error}</p>
        ) : orders.length === 0 ? (
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
        )}
      </div>
    </div>
  );
}

export default OrderHistory;
