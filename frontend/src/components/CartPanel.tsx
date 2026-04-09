import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useCart } from "../cart";

function CartPanel() {
  const { t } = useTranslation();
  const cart = useCart();

  const mailtoHref = useMemo(() => {
    if (cart.items.length === 0) return "mailto:info@pravoles.si";

    const lines = cart.items
      .map((item) => `- ${item.product.title} x ${item.qty}`)
      .join("\n");
    const body = `${t("cart.mailtoIntro")}\n\n${lines}\n\n${t("cart.mailtoOutro")}`;

    const subject = t("cart.mailtoSubject");
    return `mailto:info@pravoles.si?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }, [cart.items, t]);

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
            <div className="cart-panel__item" key={item.product.title}>
              <div className="cart-panel__item-main">
                <div className="cart-panel__item-title">{item.product.title}</div>
                <div className="cart-panel__item-meta">
                  {t("cart.qty")}: {item.qty}
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
                  onClick={() => cart.removeOne(item.product.title)}
                >
                  -
                </button>
                <button
                  type="button"
                  className="cart-panel__btn cart-panel__btn--danger"
                  onClick={() => cart.removeAll(item.product.title)}
                >
                  {t("cart.remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <a className="cart-panel__checkout" href={mailtoHref}>
        {t("cart.checkout")}
      </a>
    </section>
  );
}

export default CartPanel;
