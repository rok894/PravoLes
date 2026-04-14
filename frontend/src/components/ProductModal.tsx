import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCart } from "../cart";
import type { CartProduct } from "../cart";
import { useToast } from "../ToastContext";
import ImageZoom from "./ImageZoom";

type Props = {
  product: CartProduct & { alt: string };
  onClose: () => void;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default function ProductModal({ product, onClose }: Props) {
  const { t } = useTranslation();
  const cart = useCart();
  const { addToast } = useToast();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="product-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="product-modal">
        <button
          className="product-modal__close"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          ✕
        </button>

        <div className="product-modal__left">
          <div className="product-modal__image-wrap">
            <ImageZoom src={product.image} alt={product.alt} />
          </div>
          <div className="product-modal__image-footer">
            {formatPrice(product.priceCents * qty, product.currency)}
          </div>
        </div>

        <div className="product-modal__body">
          <h2 className="product-modal__title">{product.title}</h2>
          <p className="product-modal__desc">{product.description}</p>
          <div className="product-modal__qty">
            <button
              type="button"
              className="product-modal__qty-btn"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={t("cart.decreaseQty")}
            >−</button>
            <span className="product-modal__qty-val">{qty}</span>
            <button
              type="button"
              className="product-modal__qty-btn"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              aria-label={t("cart.increaseQty")}
            >+</button>
          </div>
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              for (let i = 0; i < qty; i++) cart.add(product);
              addToast(`${qty}× ${t("cart.added")}`);
              onClose();
            }}
          >
            {t("cart.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
