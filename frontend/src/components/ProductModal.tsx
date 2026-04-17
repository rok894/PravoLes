import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCart } from "../cart";
import type { CartProduct } from "../cart";
import { useToast } from "../ToastContext";
import ImageZoom from "./ImageZoom";

type Variant = {
  id: string;
  color: string | null;
  size: string | null;
  wood: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
};

type ModalProduct = {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  priceCents: number;
  currency: string;
  originalPriceCents?: number | null;
  discountPercent?: number;
  variants?: Variant[];
};

type Props = {
  product: ModalProduct;
  onClose: () => void;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

const DIMENSIONS = ["wood", "size", "color"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const DIM_LABEL: Record<Dimension, string> = {
  wood: "Les",
  size: "Velikost",
  color: "Barva",
};

export default function ProductModal({ product, onClose }: Props) {
  const { t } = useTranslation();
  const cart = useCart();
  const { addToast } = useToast();
  const [qty, setQty] = useState(1);

  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((v) => v.active),
    [product.variants],
  );
  const hasVariants = activeVariants.length > 0;

  const usedDimensions = useMemo<Dimension[]>(() => {
    const used: Dimension[] = [];
    for (const d of DIMENSIONS) {
      if (activeVariants.some((v) => v[d] != null && v[d] !== "")) used.push(d);
    }
    return used;
  }, [activeVariants]);

  const [selection, setSelection] = useState<Partial<Record<Dimension, string>>>({});

  useEffect(() => {
    setSelection({});
    setQty(1);
  }, [product.id]);

  const selectedVariant = useMemo<Variant | null>(() => {
    if (!hasVariants) return null;
    if (usedDimensions.some((d) => !selection[d])) return null;
    return (
      activeVariants.find((v) =>
        usedDimensions.every((d) => (v[d] ?? "") === selection[d]),
      ) ?? null
    );
  }, [hasVariants, activeVariants, usedDimensions, selection]);

  function dimensionOptions(dim: Dimension) {
    const values = new Set<string>();
    for (const v of activeVariants) {
      const val = v[dim];
      if (val) values.add(val);
    }
    return Array.from(values);
  }

  function isOptionAvailable(dim: Dimension, value: string): boolean {
    return activeVariants.some((v) => {
      if ((v[dim] ?? "") !== value) return false;
      for (const d of usedDimensions) {
        if (d === dim) continue;
        const chosen = selection[d];
        if (chosen && (v[d] ?? "") !== chosen) return false;
      }
      return v.stock > 0;
    });
  }

  const displayPriceCents = selectedVariant?.priceCents ?? product.priceCents;
  const stock = selectedVariant?.stock ?? Infinity;
  const canAdd = hasVariants ? selectedVariant != null && qty <= selectedVariant.stock : true;

  function handleAdd() {
    if (!canAdd) return;
    const variantLabel = selectedVariant
      ? [selectedVariant.wood, selectedVariant.size, selectedVariant.color]
          .filter(Boolean)
          .join(" · ")
      : null;
    const cartProduct: CartProduct = {
      id: product.id,
      title: product.title,
      description: product.description,
      image: product.image,
      alt: product.alt,
      priceCents: displayPriceCents,
      currency: product.currency,
      variantId: selectedVariant?.id ?? null,
      variantLabel,
    };
    for (let i = 0; i < qty; i++) cart.add(cartProduct);
    addToast(`${qty}× ${t("cart.added")}`);
    onClose();
  }

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

  const maxQty = hasVariants ? Math.min(99, Math.max(1, selectedVariant?.stock ?? 1)) : 99;

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
            <span className="product-card__price-current">
              {formatPrice(displayPriceCents * qty, product.currency)}
            </span>
            {product.originalPriceCents && !selectedVariant ? (
              <span className="product-card__price-meta" style={{ justifyContent: "center" }}>
                <span className="product-card__price-old">
                  {formatPrice(product.originalPriceCents * qty, product.currency)}
                </span>
                <span className="product-card__discount">
                  -{product.discountPercent ?? 0}%
                </span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="product-modal__body">
          <h2 className="product-modal__title">{product.title}</h2>
          <p className="product-modal__desc">{product.description}</p>

          {hasVariants && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
              {usedDimensions.map((dim) => (
                <div key={dim}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 6, color: "#544237" }}>
                    {DIM_LABEL[dim]}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {dimensionOptions(dim).map((val) => {
                      const available = isOptionAvailable(dim, val);
                      const active = selection[dim] === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!available && !active}
                          onClick={() => setSelection((s) => ({ ...s, [dim]: val }))}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 999,
                            border: `1px solid ${active ? "#2f2117" : "#c8a882"}`,
                            background: active ? "#2f2117" : available ? "#fff" : "#f0e6d8",
                            color: active ? "#f7f0e7" : available ? "#1f1812" : "#b0a090",
                            cursor: available || active ? "pointer" : "not-allowed",
                            textDecoration: !available && !active ? "line-through" : "none",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {selectedVariant ? (
                <div style={{ fontSize: "0.8rem", color: "#7c5e45" }}>
                  Na zalogi: <strong>{selectedVariant.stock}</strong>
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "#7c5e45" }}>
                  Izberi {usedDimensions.map((d) => DIM_LABEL[d].toLowerCase()).join(", ")}.
                </div>
              )}
            </div>
          )}

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
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              aria-label={t("cart.increaseQty")}
              disabled={qty >= maxQty}
            >+</button>
          </div>
          <button
            type="button"
            className="button button--primary"
            onClick={handleAdd}
            disabled={!canAdd || (hasVariants && stock < qty)}
          >
            {hasVariants && !selectedVariant ? "Izberi varianto" : t("cart.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
