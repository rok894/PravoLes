import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchJson } from "../api";
import ImageZoom from "./ImageZoom";
import { useCart } from "../cart";
import type { CartProduct } from "../cart";

type BackendProduct = {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  priceCents: number;
  currency: string;
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
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [loading, setLoading] = useState(true);

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
            const cartProduct: CartProduct = {
              id: product.id,
              title: product.title,
              description: product.description,
              image: product.image,
              alt: product.alt,
              priceCents: product.priceCents,
              currency: product.currency,
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
                  <h3>{product.title}</h3>
                  <p>{product.description}</p>
                  <div className="product-card__price">
                    {formatPrice(product.priceCents, product.currency)}
                  </div>
                  <div className="product-card__actions">
                    <button
                      type="button"
                      className="button button--primary button--small"
                      onClick={() => cart.add(cartProduct)}
                    >
                      {t("cart.add")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ProductShowcase;
