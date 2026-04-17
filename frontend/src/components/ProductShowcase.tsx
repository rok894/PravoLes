import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchJson } from "../api";
import ImageZoom from "./ImageZoom";
import { useCart } from "../cart";
import type { CartProduct } from "../cart";
import ProductModal from "./ProductModal";
import { useToast } from "../ToastContext";

type Variant = {
  id: string;
  color: string | null;
  size: string | null;
  wood: string | null;
  priceCents: number;
  stock: number;
  active: boolean;
};

type BackendProduct = {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  priceCents: number;
  priceFromCents?: number | null;
  originalPriceCents?: number | null;
  discountPercent?: number;
  currency: string;
  variants?: Variant[];
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function ProductShowcase() {
  const { t } = useTranslation();
  const cart = useCart();
  const { addToast } = useToast();
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BackendProduct | null>(null);

  useEffect(() => {
    fetchJson<{ products: BackendProduct[] }>("/api/products")
      .then((data) => setProducts(data.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="panel" id="products">
      <div className="section-heading">
        <span>{t("productsSection.eyebrow")}</span>
        <h2>{t("productsSection.title")}</h2>
      </div>

      {loading ? (
        <div className="product-grid">
          {[1, 2, 3].map((i) => (
            <div className="product-card product-card--skeleton" key={i}>
              <div className="skeleton skeleton--image" />
              <div className="product-card__body">
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--text" />
                <div className="skeleton skeleton--btn" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="cart-panel__empty">{t("productsSection.unavailable")}</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            const activeVariants = (product.variants ?? []).filter((v) => v.active);
            const hasVariants = activeVariants.length > 0;
            const variantPrices = activeVariants.map((v) => v.priceCents);
            const minVariantPrice = variantPrices.length ? Math.min(...variantPrices) : product.priceCents;
            const maxVariantPrice = variantPrices.length ? Math.max(...variantPrices) : product.priceCents;
            const priceVaries = hasVariants && minVariantPrice !== maxVariantPrice;
            const displayPrice = hasVariants ? minVariantPrice : product.priceCents;
            const cartProduct: CartProduct = {
              id: product.id,
              title: product.title,
              description: product.description,
              image: product.image,
              alt: product.alt,
              priceCents: product.priceCents,
              currency: product.currency,
              variantId: null,
              variantLabel: null,
            };
            return (
              <article className="product-card" key={product.id}>
                <div className="product-card__image">
                  <ImageZoom
                    src={product.image}
                    alt={product.alt}
                    caption={product.title}
                  />
                </div>
                <div className="product-card__body">
                  <h3 className="product-card__title-link">
                    {product.title}
                  </h3>
                  <p>{product.description}</p>
                  <div className="product-card__price">
                    <span className="product-card__price-current">
                      {priceVaries ? "od " : ""}{formatPrice(displayPrice, product.currency)}
                    </span>
                    {!hasVariants && product.originalPriceCents ? (
                      <span className="product-card__price-meta">
                        <span className="product-card__price-old">
                          {formatPrice(product.originalPriceCents, product.currency)}
                        </span>
                        <span className="product-card__discount">
                          -{product.discountPercent ?? 0}%
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <div className="product-card__actions">
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => setSelected(product)}
                    >
                      {t("productsSection.details")}
                    </button>
                    <button
                      type="button"
                      className="button button--primary button--small"
                      onClick={() => {
                        if (hasVariants) {
                          setSelected(product);
                        } else {
                          cart.add(cartProduct);
                          addToast(t("cart.added"));
                        }
                      }}
                    >
                      {hasVariants ? "Izberi varianto" : t("cart.add")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

export default ProductShowcase;
