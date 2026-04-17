import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchJson } from "../api";
import { useCart, lineKey } from "../cart";

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function CartPanel() {
  const { t } = useTranslation();
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setBusy(true);
    setError(null);
    try {
      await fetchJson("/api/cart/items", { method: "DELETE", body: "{}" });
      for (const item of cart.items) {
        await fetchJson("/api/cart/items", {
          method: "POST",
          body: JSON.stringify({
            productId: item.product.id,
            variantId: item.product.variantId ?? null,
            qty: item.qty,
          }),
        });
      }
      const { url } = await fetchJson<{ url: string }>("/api/checkout", {
        method: "POST",
      });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cart.checkoutError"));
      setBusy(false);
    }
  }

  const currency = cart.items[0]?.product.currency ?? "EUR";

  return (
    <section className="cart-panel" aria-label={t("cart.title")}>
      <div className="cart-panel__header">
        <div className="cart-panel__title">
          {t("cart.title")}{" "}
          <span className="cart-panel__count">{cart.totalCount}</span>
        </div>
        <button
          type="button"
          className="cart-panel__clear"
          onClick={() => cart.clear()}
          disabled={cart.items.length === 0}
        >
          {t("cart.clear")}
        </button>
      </div>

      {cart.items.length === 0 ? (
        <p className="cart-panel__empty">{t("cart.empty")}</p>
      ) : (
        <div className="cart-panel__items">
          {cart.items.map((item) => (
            <div className="cart-panel__item" key={lineKey(item.product.id, item.product.variantId)}>
              <div className="cart-panel__item-main">
                <div className="cart-panel__item-title">
                  {item.product.title}
                  {item.product.variantLabel ? (
                    <span style={{ color: "#7c5e45", fontWeight: 400, fontSize: "0.85em" }}>
                      {" "}— {item.product.variantLabel}
                    </span>
                  ) : null}
                </div>
                <div className="cart-panel__item-meta">
                  {t("cart.qty")}: {item.qty} &times;{" "}
                  {formatPrice(item.product.priceCents, item.product.currency)}
                </div>
              </div>
              <div className="cart-panel__item-actions">
                <button
                  type="button"
                  className="cart-panel__btn"
                  onClick={() => cart.add(item.product)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="cart-panel__btn"
                  onClick={() => cart.removeOne(item.product.id, item.product.variantId)}
                >
                  -
                </button>
                <button
                  type="button"
                  className="cart-panel__btn cart-panel__btn--danger"
                  onClick={() => cart.removeAll(item.product.id, item.product.variantId)}
                >
                  {t("cart.remove")}
                </button>
              </div>
            </div>
          ))}

          <div className="cart-panel__total">
            <span>{t("cart.total")}</span>
            <strong>{formatPrice(cart.totalPriceCents, currency)}</strong>
          </div>
        </div>
      )}

      {error && <p className="cart-panel__error">{error}</p>}

      <button
        type="button"
        className="cart-panel__checkout"
        onClick={handleCheckout}
        disabled={cart.items.length === 0 || busy}
      >
        {busy ? "…" : t("cart.payNow")}
      </button>
    </section>
  );
}

export default CartPanel;
